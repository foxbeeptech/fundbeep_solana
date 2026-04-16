use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("4A3kQJgnUcQfMj9ikjndovHTS2DKX3gocenLuxuSjfJQ");

pub const ESCROW_SEED: &[u8] = b"escrow";
pub const CONTRIB_SEED: &[u8] = b"contrib";
pub const WITHDRAW_DEFAULT_FEE_BPS: u64 = 50; // fallback only — overridden per-escrow
pub const WITHDRAW_PENALTY_BPS: u64 = 500;  // 5% penalty for early contributor withdrawal

#[program]
pub mod fundbeep_escrow {
    use super::*;

    /// Called when a campaign is created.
    /// Charges the listing fee and initialises the escrow PDA.
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        campaign_id: [u8; 32],
        goal_lamports: u64,
        end_timestamp: i64,
        creator_wallet: Pubkey,
        listing_fee_lamports: u64,
        contribution_fee_bps: u16,
        claim_fee_m1_bps: u16,
        claim_fee_m2_bps: u16,
        claim_fee_m3_bps: u16,
        claim_fee_final_bps: u16,
    ) -> Result<()> {
        require!(goal_lamports > 0, EscrowError::InvalidAmount);
        require!(end_timestamp > 0, EscrowError::InvalidTimestamp);
        require!(contribution_fee_bps <= 2000, EscrowError::FeeTooHigh); // max 20%
        require!(claim_fee_m1_bps    <= 5000, EscrowError::FeeTooHigh);
        require!(claim_fee_m2_bps    <= 5000, EscrowError::FeeTooHigh);
        require!(claim_fee_m3_bps    <= 5000, EscrowError::FeeTooHigh);
        require!(claim_fee_final_bps <= 5000, EscrowError::FeeTooHigh);

        if listing_fee_lamports > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.creator.to_account_info(),
                        to:   ctx.accounts.admin_wallet.to_account_info(),
                    },
                ),
                listing_fee_lamports,
            )?;
        }

        let escrow = &mut ctx.accounts.escrow;
        escrow.campaign_id          = campaign_id;
        escrow.creator              = ctx.accounts.creator.key();
        escrow.creator_wallet       = creator_wallet;
        escrow.admin_wallet         = ctx.accounts.admin_wallet.key();
        escrow.goal_lamports        = goal_lamports;
        escrow.total_raised         = 0;
        escrow.end_timestamp        = end_timestamp;
        escrow.milestone_claimed    = 0;
        escrow.listing_fee_lamports = listing_fee_lamports;
        escrow.contribution_fee_bps = contribution_fee_bps;
        escrow.claim_fee_m1_bps     = claim_fee_m1_bps;
        escrow.claim_fee_m2_bps     = claim_fee_m2_bps;
        escrow.claim_fee_m3_bps     = claim_fee_m3_bps;
        escrow.claim_fee_final_bps  = claim_fee_final_bps;
        escrow.bump                 = ctx.bumps.escrow;

        msg!("Escrow created. Goal: {} lamports. Listing fee: {} lamports. Ends: {}.",
            goal_lamports, listing_fee_lamports, end_timestamp);
        Ok(())
    }

    /// Contributor sends SOL to the campaign escrow.
    /// 0.5% fee deducted immediately to admin wallet. Net held in escrow.
    /// Contributions blocked after campaign end date.
    pub fn contribute(
        ctx: Context<Contribute>,
        _campaign_id: [u8; 32],
        amount_lamports: u64,
    ) -> Result<()> {
        require!(amount_lamports > 0, EscrowError::InvalidAmount);

        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp < ctx.accounts.escrow.end_timestamp,
            EscrowError::CampaignEnded
        );
        require!(
            ctx.accounts.escrow.milestone_claimed < 4,
            EscrowError::CampaignComplete
        );

        let fee = amount_lamports
            .checked_mul(ctx.accounts.escrow.contribution_fee_bps as u64).ok_or(EscrowError::Overflow)?
            .checked_div(10_000).ok_or(EscrowError::Overflow)?;
        let net = amount_lamports.checked_sub(fee).ok_or(EscrowError::Overflow)?;

        if fee > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.contributor.to_account_info(),
                        to:   ctx.accounts.admin_wallet.to_account_info(),
                    },
                ),
                fee,
            )?;
        }

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.contributor.to_account_info(),
                    to:   ctx.accounts.escrow.to_account_info(),
                },
            ),
            net,
        )?;

        let escrow_key      = ctx.accounts.escrow.key();
        let contributor_key = ctx.accounts.contributor.key();
        let contrib_bump    = ctx.bumps.contribution;

        let escrow = &mut ctx.accounts.escrow;
        // Track GROSS so milestone thresholds match what contributors see.
        // 1 SOL contributed = total_raised += 1 SOL = 100% = M4 unlocked.
        escrow.total_raised = escrow.total_raised
            .checked_add(amount_lamports).ok_or(EscrowError::Overflow)?;

        let total = escrow.total_raised;
        drop(escrow);

        let rec = &mut ctx.accounts.contribution;
        if rec.contributor == Pubkey::default() {
            rec.escrow      = escrow_key;
            rec.contributor = contributor_key;
            rec.bump        = contrib_bump;
        }
        rec.amount = rec.amount.checked_add(net).ok_or(EscrowError::Overflow)?;

        msg!("Contribution: {} lamports net (fee: {}). Total raised: {}.", net, fee, total);
        Ok(())
    }

    /// Fundraiser claims a milestone payout.
    ///
    /// Each milestone is an UNLOCK THRESHOLD — once reached, the creator sweeps
    /// ALL available funds in escrow (not a fixed amount). Fee is taken from
    /// the sweep and sent to admin. Rest goes to creator. One transaction.
    ///
    /// milestone=1 : total_raised >= 25% of goal  (first claim, sequential)
    /// milestone=2 : total_raised >= 50% of goal  (M1 must be claimed first)
    /// milestone=3 : total_raised >= 75% of goal  (M2 must be claimed first)
    /// milestone=4 : total_raised >= 100% OR end date passed (M1 must be claimed)
    ///               sweeps all remaining balance
    ///
    /// No time locks. Payout = everything in escrow at claim time.
    pub fn claim(
        ctx: Context<Claim>,
        _campaign_id: [u8; 32],
        milestone: u8,
    ) -> Result<()> {
        require!(milestone >= 1 && milestone <= 4, EscrowError::InvalidMilestone);

        let now = Clock::get()?.unix_timestamp;

        require!(ctx.accounts.creator.key()        == ctx.accounts.escrow.creator,        EscrowError::Unauthorized);
        require!(ctx.accounts.creator_wallet.key() == ctx.accounts.escrow.creator_wallet, EscrowError::InvalidWallet);
        require!(ctx.accounts.admin_wallet.key()   == ctx.accounts.escrow.admin_wallet,   EscrowError::InvalidWallet);

        let escrow_lamports = ctx.accounts.escrow.to_account_info().lamports();
        let escrow = &mut ctx.accounts.escrow;

        // Check milestone unlock conditions
        // No strict sequential order for M1-M3 — creator can claim any reached milestone
        // as long as they haven't already claimed it or a higher one.
        // M4 still requires at least M1 to have been claimed.
        match milestone {
            1 => {
                require!(escrow.milestone_claimed < 1, EscrowError::MilestoneAlreadyClaimed);
                require!(
                    escrow.total_raised >= escrow.goal_lamports / 4,
                    EscrowError::MilestoneLocked
                );
            }
            2 => {
                require!(escrow.milestone_claimed < 2, EscrowError::MilestoneAlreadyClaimed);
                require!(
                    escrow.total_raised >= escrow.goal_lamports / 2,
                    EscrowError::MilestoneLocked
                );
            }
            3 => {
                require!(escrow.milestone_claimed < 3, EscrowError::MilestoneAlreadyClaimed);
                require!(
                    escrow.total_raised >= escrow.goal_lamports * 3 / 4,
                    EscrowError::MilestoneLocked
                );
            }
            4 => {
                // M1 threshold must be reached before final sweep
                require!(
                    escrow.total_raised >= escrow.goal_lamports / 4,
                    EscrowError::M1NotReached
                );
                require!(escrow.milestone_claimed < 4, EscrowError::MilestoneAlreadyClaimed);
                require!(
                    escrow.total_raised >= escrow.goal_lamports || now >= escrow.end_timestamp,
                    EscrowError::CampaignNotEnded
                );
            }
            _ => return Err(EscrowError::InvalidMilestone.into()),
        }

        // Sweep available balance.
        // M1-M3: keep rent reserve so the account stays open for future claims.
        // M4 (final): sweep everything including rent — account is done and will be GC'd.
        let rent_min = Rent::get()?.minimum_balance(8 + CampaignEscrow::INIT_SPACE);
        let payout = if milestone == 4 {
            escrow_lamports // return rent to creator too
        } else {
            require!(escrow_lamports > rent_min, EscrowError::InsufficientFunds);
            escrow_lamports - rent_min
        };

        // Fee = sum of all milestone fee rates from last claimed+1 up to current milestone.
        // This ensures skipping milestones never saves on fees — total fee is always the same.
        // e.g. skip M1+M2 and claim M3 directly → pays M1_bps + M2_bps + M3_bps combined.
        let fee_bps_total: u32 = {
            let from = escrow.milestone_claimed + 1;
            let to   = milestone;
            let mut total: u32 = 0;
            for m in from..=to {
                total += match m {
                    1 => escrow.claim_fee_m1_bps as u32,
                    2 => escrow.claim_fee_m2_bps as u32,
                    3 => escrow.claim_fee_m3_bps as u32,
                    _ => escrow.claim_fee_final_bps as u32,
                };
            }
            total
        };

        let fee = (payout as u128)
            .checked_mul(fee_bps_total as u128).ok_or(EscrowError::Overflow)?
            .checked_div(10_000).ok_or(EscrowError::Overflow)? as u64;
        let net = payout.saturating_sub(fee);

        drop(escrow);

        // Transfer net to creator wallet
        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= net;
        **ctx.accounts.creator_wallet.try_borrow_mut_lamports()?           += net;

        // Transfer fee to admin wallet
        if fee > 0 {
            **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= fee;
            **ctx.accounts.admin_wallet.try_borrow_mut_lamports()?              += fee;
        }

        // Record highest milestone claimed (creator may skip lower ones)
        let escrow = &mut ctx.accounts.escrow;
        escrow.milestone_claimed = milestone;

        msg!("Milestone {} claimed. Swept: {} lamports. Fee: {} lamports. Net to creator: {} lamports.",
            milestone, payout, fee, net);
        Ok(())
    }

    /// Contributor withdraws before end date (5% penalty).
    /// Only allowed if M1 (25%) has NOT been reached.
    pub fn withdraw_contribution(
        ctx: Context<WithdrawContribution>,
        _campaign_id: [u8; 32],
    ) -> Result<()> {
        let clock  = Clock::get()?;
        let escrow = &ctx.accounts.escrow;

        require!(clock.unix_timestamp < escrow.end_timestamp, EscrowError::CampaignEnded);
        require!(
            escrow.total_raised < escrow.goal_lamports / 4,
            EscrowError::M1AlreadyReached
        );
        require!(ctx.accounts.admin_wallet.key() == escrow.admin_wallet, EscrowError::InvalidWallet);

        let amount = ctx.accounts.contribution.amount;
        require!(amount > 0, EscrowError::NothingToWithdraw);

        let penalty = amount
            .checked_mul(WITHDRAW_PENALTY_BPS).ok_or(EscrowError::Overflow)?
            .checked_div(10_000).ok_or(EscrowError::Overflow)?;
        let net = amount.checked_sub(penalty).ok_or(EscrowError::Overflow)?;

        let rent_min  = Rent::get()?.minimum_balance(8 + CampaignEscrow::INIT_SPACE);
        let available = ctx.accounts.escrow.to_account_info().lamports().saturating_sub(rent_min);
        require!(available >= amount, EscrowError::InsufficientFunds);

        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= net;
        **ctx.accounts.contributor.try_borrow_mut_lamports()?               += net;

        if penalty > 0 {
            **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= penalty;
            **ctx.accounts.admin_wallet.try_borrow_mut_lamports()?              += penalty;
        }

        ctx.accounts.escrow.total_raised =
            ctx.accounts.escrow.total_raised.saturating_sub(amount);
        ctx.accounts.contribution.amount = 0;

        msg!("Early withdrawal: {} lamports returned, {} penalty to admin.", net, penalty);
        Ok(())
    }

    /// Contributor claims full penalty-free refund after campaign ends.
    /// Only if M1 (25%) was NEVER reached.
    pub fn refund_contribution(
        ctx: Context<RefundContribution>,
        _campaign_id: [u8; 32],
    ) -> Result<()> {
        let clock  = Clock::get()?;
        let escrow = &ctx.accounts.escrow;

        require!(clock.unix_timestamp >= escrow.end_timestamp, EscrowError::CampaignNotEnded);
        require!(
            escrow.total_raised < escrow.goal_lamports / 4,
            EscrowError::M1AlreadyReached
        );

        let amount = ctx.accounts.contribution.amount;
        require!(amount > 0, EscrowError::NothingToWithdraw);

        let rent_min  = Rent::get()?.minimum_balance(8 + CampaignEscrow::INIT_SPACE);
        let available = ctx.accounts.escrow.to_account_info().lamports().saturating_sub(rent_min);
        require!(available >= amount, EscrowError::InsufficientFunds);

        **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.contributor.try_borrow_mut_lamports()?               += amount;

        ctx.accounts.escrow.total_raised =
            ctx.accounts.escrow.total_raised.saturating_sub(amount);
        ctx.accounts.contribution.amount = 0;

        msg!("Penalty-free refund: {} lamports returned.", amount);
        Ok(())
    }
}

// ── Account structs ───────────────────────────────────────────────────────────

#[account]
#[derive(InitSpace)]
pub struct CampaignEscrow {
    pub campaign_id:          [u8; 32],
    pub creator:              Pubkey,
    pub creator_wallet:       Pubkey,
    pub admin_wallet:         Pubkey,
    pub goal_lamports:        u64,
    pub total_raised:         u64,      // cumulative net SOL received (never decreases)
    pub end_timestamp:        i64,
    pub milestone_claimed:    u8,       // 0–4: milestones claimed so far
    pub listing_fee_lamports: u64,
    pub contribution_fee_bps: u16,  // % fee charged to contributor on each contribution
    pub claim_fee_m1_bps:     u16,
    pub claim_fee_m2_bps:     u16,
    pub claim_fee_m3_bps:     u16,
    pub claim_fee_final_bps:  u16,
    pub bump:                 u8,
}

#[account]
#[derive(InitSpace)]
pub struct ContributionRecord {
    pub escrow:      Pubkey,
    pub contributor: Pubkey,
    pub amount:      u64,
    pub bump:        u8,
}

// ── Instruction contexts ──────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(campaign_id: [u8; 32])]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + CampaignEscrow::INIT_SPACE,
        seeds = [ESCROW_SEED, &campaign_id],
        bump
    )]
    pub escrow: Account<'info, CampaignEscrow>,

    /// CHECK: listing fee destination
    #[account(mut)]
    pub admin_wallet: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(campaign_id: [u8; 32])]
pub struct Contribute<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, &campaign_id],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, CampaignEscrow>,

    #[account(
        init_if_needed,
        payer = contributor,
        space = 8 + ContributionRecord::INIT_SPACE,
        seeds = [CONTRIB_SEED, escrow.key().as_ref(), contributor.key().as_ref()],
        bump
    )]
    pub contribution: Account<'info, ContributionRecord>,

    /// CHECK: 0.5% fee destination
    #[account(mut, constraint = admin_wallet.key() == escrow.admin_wallet @ EscrowError::InvalidWallet)]
    pub admin_wallet: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(campaign_id: [u8; 32])]
pub struct Claim<'info> {
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, &campaign_id],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, CampaignEscrow>,

    /// CHECK: payout destination
    #[account(mut)]
    pub creator_wallet: UncheckedAccount<'info>,

    /// CHECK: fee destination
    #[account(mut)]
    pub admin_wallet: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(campaign_id: [u8; 32])]
pub struct WithdrawContribution<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, &campaign_id],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, CampaignEscrow>,

    #[account(
        mut,
        seeds = [CONTRIB_SEED, escrow.key().as_ref(), contributor.key().as_ref()],
        bump = contribution.bump,
        constraint = contribution.contributor == contributor.key() @ EscrowError::Unauthorized
    )]
    pub contribution: Account<'info, ContributionRecord>,

    /// CHECK: penalty destination
    #[account(mut)]
    pub admin_wallet: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(campaign_id: [u8; 32])]
pub struct RefundContribution<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, &campaign_id],
        bump = escrow.bump
    )]
    pub escrow: Account<'info, CampaignEscrow>,

    #[account(
        mut,
        seeds = [CONTRIB_SEED, escrow.key().as_ref(), contributor.key().as_ref()],
        bump = contribution.bump,
        constraint = contribution.contributor == contributor.key() @ EscrowError::Unauthorized
    )]
    pub contribution: Account<'info, ContributionRecord>,

    pub system_program: Program<'info, System>,
}

// ── Errors ────────────────────────────────────────────────────────────────────

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("End timestamp must be set")]
    InvalidTimestamp,
    #[msg("Unauthorized: signer is not the registered creator")]
    Unauthorized,
    #[msg("Wallet address does not match escrow record")]
    InvalidWallet,
    #[msg("Invalid milestone index — must be 1, 2, 3, or 4")]
    InvalidMilestone,
    #[msg("M1 (25% goal) has not been reached — no claims allowed")]
    M1NotReached,
    #[msg("M1 must be claimed before the final sweep")]
    M1NotClaimed,
    #[msg("M1 (25% goal) has been reached — early withdrawal is locked")]
    M1AlreadyReached,
    #[msg("Milestone already claimed, or previous milestone must be claimed first")]
    MilestoneAlreadyClaimed,
    #[msg("Milestone locked: fundraising threshold not yet reached")]
    MilestoneLocked,
    #[msg("Insufficient funds in escrow")]
    InsufficientFunds,
    #[msg("No contribution to withdraw")]
    NothingToWithdraw,
    #[msg("Campaign has already ended")]
    CampaignEnded,
    #[msg("Campaign is complete — all milestones claimed, no further contributions accepted")]
    CampaignComplete,
    #[msg("Campaign has not ended yet and goal not fully reached")]
    CampaignNotEnded,
    #[msg("Fee cannot exceed 50%")]
    FeeTooHigh,
    #[msg("Arithmetic overflow")]
    Overflow,
}
