/**
 * FundBeep Escrow — Frontend utilities for the Solana milestone escrow program.
 * Program ID: 4A3kQJgnUcQfMj9ikjndovHTS2DKX3gocenLuxuSjfJQ
 *
 * Instruction discriminators are Anchor-standard: sha256("global:<name>")[0:8]
 * Borsh encoding is done manually — no @coral-xyz/anchor dependency needed.
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

// ── Config ─────────────────────────────────────────────────────────────────────

const RPC_URL = import.meta.env.VITE_HELIUS_RPC_URL?.startsWith("http")
  ? import.meta.env.VITE_HELIUS_RPC_URL
  : "https://api.mainnet-beta.solana.com";

const ESCROW_SEED = new TextEncoder().encode("escrow");
const CONTRIB_SEED = new TextEncoder().encode("contrib");
const SYSTEM_PROGRAM_ID = new PublicKey("11111111111111111111111111111111");

export function isEscrowEnabled() {
  return !!import.meta.env.VITE_PROGRAM_ID;
}

function getProgramId() {
  const id = import.meta.env.VITE_PROGRAM_ID;
  if (!id) throw new Error("Smart contract not yet deployed. Set VITE_PROGRAM_ID in .env");
  return new PublicKey(id);
}

function getConn() {
  return new Connection(RPC_URL, "confirmed");
}

// ── Borsh helpers ─────────────────────────────────────────────────────────────

/** Compute Anchor instruction discriminator: sha256("global:<name>")[0:8] */
async function discriminator(name) {
  const buf = new TextEncoder().encode(`global:${name}`);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return new Uint8Array(hash).slice(0, 8);
}

/** Write u64 as little-endian 8 bytes */
function u64LE(val) {
  const b = new Uint8Array(8);
  let n = BigInt(Math.round(Number(val)));
  for (let i = 0; i < 8; i++) { b[i] = Number(n & 0xffn); n >>= 8n; }
  return b;
}

/** Write i64 as little-endian 8 bytes (same as u64 for positive values) */
function i64LE(val) { return u64LE(val); }

/** Write u16 as little-endian 2 bytes */
function u16LE(val) {
  return new Uint8Array([val & 0xff, (val >> 8) & 0xff]);
}

/** Write u8 as single byte */
function u8(val) {
  return new Uint8Array([val & 0xff]);
}

/** Convert Supabase UUID string → 32-byte Uint8Array (UUID = 16 bytes, zero-padded) */
function uuidToBytes32(uuid) {
  const hex = uuid.replace(/-/g, "");
  const b = new Uint8Array(32);
  for (let i = 0; i < 16; i++) b[i] = parseInt(hex.substr(i * 2, 2), 16);
  return b;
}

/** Concatenate Uint8Arrays */
function concat(...arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

// ── Read helpers ──────────────────────────────────────────────────────────────

function readU64(data, offset) {
  let n = 0n;
  for (let i = 0; i < 8; i++) n |= BigInt(data[offset + i]) << BigInt(i * 8);
  return n;
}

function readI64(data, offset) {
  return readU64(data, offset); // positive timestamps safe as u64
}

function readU16(data, offset) {
  return data[offset] | (data[offset + 1] << 8);
}

// ── PDA helpers ───────────────────────────────────────────────────────────────

export function getEscrowPDA(campaignId) {
  const PROGRAM_ID = getProgramId();
  const idBytes = uuidToBytes32(campaignId);
  return PublicKey.findProgramAddressSync([ESCROW_SEED, idBytes], PROGRAM_ID);
}

export function getContribPDA(escrowPubkey, contributorPubkey) {
  const PROGRAM_ID = getProgramId();
  return PublicKey.findProgramAddressSync(
    [CONTRIB_SEED, escrowPubkey.toBytes(), contributorPubkey.toBytes()],
    PROGRAM_ID,
  );
}

// ── Send transaction helper ───────────────────────────────────────────────────

async function sendTx(walletProvider, fromAddress, ixs) {
  if (!walletProvider) throw new Error("No wallet connected.");
  const conn = getConn();
  const feePayer = new PublicKey(fromAddress);
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.feePayer = feePayer;
  ixs.forEach(ix => tx.add(ix));
  const { signature } = await walletProvider.signAndSendTransaction(tx);
  const result = await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  if (result.value.err) {
    throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}. Signature: ${signature}`);
  }
  return signature;
}

// ── 1. Initialize Escrow ──────────────────────────────────────────────────────
/**
 * Called when a campaign is created.
 * Pays the listing fee to admin wallet and deploys the escrow PDA on-chain.
 *
 * @param fromAddress       creator's connected wallet (signer + fee payer)
 * @param campaignId        Supabase campaign UUID
 * @param goalSol           fundraising goal in SOL
 * @param endDate           campaign end date (Date | ISO string)
 * @param creatorWallet     SOL address where milestone payouts go
 * @param adminWallet       SOL address where all fees go
 * @param listingFeeSol     flat listing fee in SOL (paid at creation, admin-set)
 * @param claimFeeM1Bps     M1 claim fee in basis points (e.g. 200 = 2%)
 * @param claimFeeM2Bps     M2 claim fee in basis points
 * @param claimFeeM3Bps     M3 claim fee in basis points
 * @param claimFeeFinalbps  Final claim fee in basis points
 * @returns { signature, escrowPda }
 */
export async function initializeEscrow(
  walletProvider,
  fromAddress,
  campaignId,
  goalSol,
  endDate,
  creatorWallet,
  adminWallet,
  listingFeeSol = 0,
  contributionFeeBps = 50,
  claimFeeM1Bps = 200,
  claimFeeM2Bps = 200,
  claimFeeM3Bps = 200,
  claimFeeFinalbps = 200,
) {
  const PROGRAM_ID = getProgramId();
  const fromPubkey      = new PublicKey(fromAddress);
  const creatorPubkey   = new PublicKey(creatorWallet);
  const adminPubkey     = new PublicKey(adminWallet);
  const idBytes         = uuidToBytes32(campaignId);
  const [escrowPda]     = PublicKey.findProgramAddressSync([ESCROW_SEED, idBytes], PROGRAM_ID);
  const goalLamports    = BigInt(Math.round(goalSol * LAMPORTS_PER_SOL));
  const listingLamports = BigInt(Math.round(listingFeeSol * LAMPORTS_PER_SOL));
  const endTs           = endDate ? BigInt(Math.floor(new Date(endDate).getTime() / 1000)) : BigInt(Math.floor(Date.now() / 1000) + 86400 * 365);

  const disc = await discriminator("initialize_escrow");
  const data = concat(
    disc,
    idBytes,
    u64LE(goalLamports),
    i64LE(endTs),
    creatorPubkey.toBytes(),
    u64LE(listingLamports),
    u16LE(contributionFeeBps),
    u16LE(claimFeeM1Bps),
    u16LE(claimFeeM2Bps),
    u16LE(claimFeeM3Bps),
    u16LE(claimFeeFinalbps),
  );

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: fromPubkey,    isSigner: true,  isWritable: true  },
      { pubkey: escrowPda,     isSigner: false, isWritable: true  },
      { pubkey: adminPubkey,   isSigner: false, isWritable: true  },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  const signature = await sendTx(walletProvider, fromAddress, [ix]);
  return { signature, escrowPda: escrowPda.toBase58() };
}

// ── 2. Contribute ─────────────────────────────────────────────────────────────
/**
 * Contributor sends SOL to the campaign escrow.
 * 0.5% fee is deducted on-chain and sent to admin wallet.
 */
export async function contributeToEscrow(walletProvider, fromAddress, campaignId, amountSol, escrowPdaStr, adminWallet) {
  const PROGRAM_ID     = getProgramId();
  const fromPubkey     = new PublicKey(fromAddress);
  const escrowPubkey   = new PublicKey(escrowPdaStr);
  const adminPubkey    = new PublicKey(adminWallet);
  const idBytes        = uuidToBytes32(campaignId);
  const [contribPda]   = PublicKey.findProgramAddressSync(
    [CONTRIB_SEED, escrowPubkey.toBytes(), fromPubkey.toBytes()],
    PROGRAM_ID,
  );
  const lamports = BigInt(Math.round(amountSol * LAMPORTS_PER_SOL));

  const disc = await discriminator("contribute");
  const data = concat(disc, idBytes, u64LE(lamports));

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: fromPubkey,       isSigner: true,  isWritable: true  },
      { pubkey: escrowPubkey,     isSigner: false, isWritable: true  },
      { pubkey: contribPda,       isSigner: false, isWritable: true  },
      { pubkey: adminPubkey,      isSigner: false, isWritable: true  },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  const signature = await sendTx(walletProvider, fromAddress, [ix]);
  return { signature };
}

// ── 3. Claim Milestone ────────────────────────────────────────────────────────
/**
 * Creator claims a milestone payout.
 *
 * milestone=1 : 25% goal + 30 min wait → pays goal/4 at M1 fee rate
 * milestone=2 : 50% goal + 30 min wait → pays goal/4 at M2 fee rate
 * milestone=3 : 75% goal + 30 min wait → pays goal/4 at M3 fee rate
 * milestone=4 : after end date         → pays all remaining balance at final fee rate
 *
 * M1 must always be reached before any claim.
 */
export async function claimEscrow(
  walletProvider,
  fromAddress,
  campaignId,
  escrowPdaStr,
  creatorWallet,
  adminWallet,
  milestone,        // 1, 2, 3, or 4
) {
  const PROGRAM_ID          = getProgramId();
  const fromPubkey          = new PublicKey(fromAddress);
  const escrowPubkey        = new PublicKey(escrowPdaStr);
  const creatorWalletPubkey = new PublicKey(creatorWallet);
  const adminWalletPubkey   = new PublicKey(adminWallet);
  const idBytes             = uuidToBytes32(campaignId);

  const disc = await discriminator("claim");
  const data = concat(disc, idBytes, u8(milestone));

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: fromPubkey,           isSigner: true,  isWritable: false },
      { pubkey: escrowPubkey,         isSigner: false, isWritable: true  },
      { pubkey: creatorWalletPubkey,  isSigner: false, isWritable: true  },
      { pubkey: adminWalletPubkey,    isSigner: false, isWritable: true  },
    ],
    data,
  });

  const signature = await sendTx(walletProvider, fromAddress, [ix]);
  return { signature };
}

// ── 4. Withdraw Contribution (early, with 5% penalty) ─────────────────────────
/**
 * Contributor withdraws before end date.
 * Only allowed if M1 (25%) has NOT been reached.
 * 5% penalty goes to admin wallet; contributor receives 95%.
 */
export async function withdrawFromEscrow(walletProvider, fromAddress, campaignId, escrowPdaStr, adminWallet) {
  const PROGRAM_ID   = getProgramId();
  const fromPubkey   = new PublicKey(fromAddress);
  const escrowPubkey = new PublicKey(escrowPdaStr);
  const adminPubkey  = new PublicKey(adminWallet);
  const idBytes      = uuidToBytes32(campaignId);
  const [contribPda] = PublicKey.findProgramAddressSync(
    [CONTRIB_SEED, escrowPubkey.toBytes(), fromPubkey.toBytes()],
    PROGRAM_ID,
  );

  const disc = await discriminator("withdraw_contribution");
  const data = concat(disc, idBytes);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: fromPubkey,       isSigner: true,  isWritable: true  },
      { pubkey: escrowPubkey,     isSigner: false, isWritable: true  },
      { pubkey: contribPda,       isSigner: false, isWritable: true  },
      { pubkey: adminPubkey,      isSigner: false, isWritable: true  },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  const signature = await sendTx(walletProvider, fromAddress, [ix]);
  return { signature };
}

// ── 5. Refund Contribution (after campaign end, no penalty) ───────────────────
/**
 * Contributor claims a full penalty-free refund after campaign ends.
 * Only available if M1 (25%) was NEVER reached — fundraiser gets nothing.
 */
export async function refundFromEscrowNoPenalty(walletProvider, fromAddress, campaignId, escrowPdaStr) {
  const PROGRAM_ID   = getProgramId();
  const fromPubkey   = new PublicKey(fromAddress);
  const escrowPubkey = new PublicKey(escrowPdaStr);
  const idBytes      = uuidToBytes32(campaignId);
  const [contribPda] = PublicKey.findProgramAddressSync(
    [CONTRIB_SEED, escrowPubkey.toBytes(), fromPubkey.toBytes()],
    PROGRAM_ID,
  );

  const disc = await discriminator("refund_contribution");
  const data = concat(disc, idBytes);

  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: fromPubkey,       isSigner: true,  isWritable: true  },
      { pubkey: escrowPubkey,     isSigner: false, isWritable: true  },
      { pubkey: contribPda,       isSigner: false, isWritable: true  },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  const signature = await sendTx(walletProvider, fromAddress, [ix]);
  return { signature };
}

// ── 6. Read On-Chain Escrow State ─────────────────────────────────────────────
/**
 * Fetch and decode the CampaignEscrow account for a campaign.
 * Returns null if the escrow hasn't been initialised yet.
 *
 * Layout (after 8-byte discriminator):
 *   campaign_id          [u8;32]  32
 *   creator              Pubkey   32
 *   creator_wallet       Pubkey   32
 *   admin_wallet         Pubkey   32
 *   goal_lamports        u64       8
 *   total_raised         u64       8
 *   end_timestamp        i64       8
 *   milestone_claimed    u8        1
 *   listing_fee_lamports u64       8
 *   contribution_fee_bps u16       2
 *   claim_fee_m1_bps     u16       2
 *   claim_fee_m2_bps     u16       2
 *   claim_fee_m3_bps     u16       2
 *   claim_fee_final_bps  u16       2
 *   bump                 u8        1
 */
export async function getEscrowState(campaignId) {
  try {
    const PROGRAM_ID = getProgramId();
    const conn       = getConn();
    const idBytes    = uuidToBytes32(campaignId);
    const [escrowPda] = PublicKey.findProgramAddressSync([ESCROW_SEED, idBytes], PROGRAM_ID);
    const info = await conn.getAccountInfo(escrowPda);
    if (!info || !info.data) return null;
    const d = info.data;

    let off = 8 + 32; // skip discriminator + campaign_id
    const creator       = new PublicKey(d.slice(off, off + 32)).toBase58(); off += 32;
    const creatorWallet = new PublicKey(d.slice(off, off + 32)).toBase58(); off += 32;
    const adminWallet   = new PublicKey(d.slice(off, off + 32)).toBase58(); off += 32;
    const goalLamports  = readU64(d, off); off += 8;
    const totalRaised   = readU64(d, off); off += 8;
    const endTimestamp  = readI64(d, off); off += 8;
    const milestoneClaimed      = d[off]; off += 1;
    const listingFeeLamports    = readU64(d, off); off += 8;
    const contributionFeeBps    = readU16(d, off); off += 2;
    const claimFeeM1Bps         = readU16(d, off); off += 2;
    const claimFeeM2Bps       = readU16(d, off); off += 2;
    const claimFeeM3Bps       = readU16(d, off); off += 2;
    const claimFeeFinalbps    = readU16(d, off); off += 2;
    const bump                = d[off];

    return {
      escrowPda:         escrowPda.toBase58(),
      creator,
      creatorWallet,
      adminWallet,
      goalSol:           Number(goalLamports) / LAMPORTS_PER_SOL,
      totalRaisedSol:    Number(totalRaised)  / LAMPORTS_PER_SOL,
      endTimestamp:      Number(endTimestamp),
      milestoneClaimed,
      listingFeeSol:      Number(listingFeeLamports) / LAMPORTS_PER_SOL,
      contributionFeeBps,
      claimFeeM1Bps,
      claimFeeM2Bps,
      claimFeeM3Bps,
      claimFeeFinalbps,
      bump,
    };
  } catch {
    return null;
  }
}

// ── 7. Get Contributor's On-Chain Amount ──────────────────────────────────────
/**
 * Returns how much SOL a contributor has deposited into this campaign's escrow.
 * Returns 0 if no record found.
 */
export async function getContributionAmount(campaignId, contributorAddress) {
  try {
    const PROGRAM_ID       = getProgramId();
    const conn             = getConn();
    const idBytes          = uuidToBytes32(campaignId);
    const [escrowPda]      = PublicKey.findProgramAddressSync([ESCROW_SEED, idBytes], PROGRAM_ID);
    const contributorPubkey = new PublicKey(contributorAddress);
    const [contribPda]     = PublicKey.findProgramAddressSync(
      [CONTRIB_SEED, escrowPda.toBytes(), contributorPubkey.toBytes()],
      PROGRAM_ID,
    );
    const info = await conn.getAccountInfo(contribPda);
    if (!info || !info.data) return 0;
    // Layout: 8 (disc) + 32 (escrow) + 32 (contributor) = skip 72, read u64
    const amount = readU64(info.data, 72);
    return Number(amount) / LAMPORTS_PER_SOL;
  } catch {
    return 0;
  }
}
