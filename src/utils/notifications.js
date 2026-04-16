// ============================================================
//  FundBeep — Email Notifications via Resend + Supabase Edge Functions
//
//  SETUP:
//  1. Sign up at https://resend.com (free: 3000 emails/month)
//  2. Get your API key from Resend dashboard
//  3. Add to Supabase Edge Function secrets:
//       supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
//       supabase secrets set APP_URL=https://fundbeep.vercel.app
//  4. Deploy the edge functions below
// ============================================================


// ── SUPABASE EDGE FUNCTION: Send contribution notification ───────────────────
// Create file: supabase/functions/notify-contribution/index.ts
// Then deploy with: npx supabase functions deploy notify-contribution

/*
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL        = Deno.env.get("APP_URL") || "https://fundbeep.vercel.app";

serve(async (req) => {
  const { campaign, contribution, creatorEmail, creatorName } = await req.json();

  const solUSD = 148;
  const usdValue = (contribution.amount_sol * solUSD).toLocaleString("en-US", { maximumFractionDigits: 0 });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Helvetica Neue', sans-serif; background: #09080F; color: #F0ECF8; margin: 0; padding: 0; }
        .container { max-width: 560px; margin: 40px auto; background: #110F1C; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,.1); }
        .header { background: linear-gradient(135deg, #7C3AED, #E8B904); padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; color: #fff; font-weight: 900; }
        .header p { margin: 8px 0 0; color: rgba(255,255,255,.8); font-size: 14px; }
        .body { padding: 32px; }
        .amount-box { background: rgba(232,185,4,.1); border: 1px solid rgba(232,185,4,.3); border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0; }
        .amount { font-size: 36px; font-weight: 900; color: #E8B904; }
        .amount-usd { font-size: 14px; color: rgba(240,236,248,.5); margin-top: 4px; }
        .stat { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,.07); font-size: 14px; }
        .stat-label { color: rgba(240,236,248,.5); }
        .stat-value { font-weight: 700; }
        .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7C3AED, #E8B904); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 15px; margin-top: 24px; }
        .footer { padding: 20px 32px; text-align: center; font-size: 12px; color: rgba(240,236,248,.3); border-top: 1px solid rgba(255,255,255,.07); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>◎ FundBeep</h1>
          <p>You received a new contribution! 🎉</p>
        </div>
        <div class="body">
          <p style="font-size: 16px;">Hi <b>${creatorName}</b>,</p>
          <p style="color: rgba(240,236,248,.7); line-height: 1.6;">Someone just backed your campaign <b>"${campaign.title}"</b> on FundBeep!</p>

          <div class="amount-box">
            <div class="amount">+${contribution.amount_sol} SOL</div>
            <div class="amount-usd">≈ $${usdValue} USD</div>
          </div>

          <div class="stat"><span class="stat-label">Campaign</span><span class="stat-value">${campaign.title}</span></div>
          <div class="stat"><span class="stat-label">Total Raised</span><span class="stat-value" style="color: #E8B904;">${(+campaign.raised_sol + +contribution.amount_sol).toFixed(4)} SOL</span></div>
          <div class="stat"><span class="stat-label">Goal</span><span class="stat-value">${campaign.goal_sol} SOL</span></div>
          <div class="stat"><span class="stat-label">Progress</span><span class="stat-value">${(((+campaign.raised_sol + +contribution.amount_sol) / +campaign.goal_sol) * 100).toFixed(1)}%</span></div>
          <div class="stat"><span class="stat-label">From Wallet</span><span class="stat-value" style="font-family: monospace; font-size: 12px;">${contribution.wallet_from?.slice(0, 8)}…${contribution.wallet_from?.slice(-6)}</span></div>

          <div style="text-align: center;">
            <a href="${APP_URL}" class="btn">View Dashboard</a>
          </div>
        </div>
        <div class="footer">FundBeep · Solana Fundraising · You're receiving this because you created a campaign.</div>
      </div>
    </body>
    </html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "FundBeep <notifications@fundbeep.com>",
      to: creatorEmail,
      subject: `🎉 You received ${contribution.amount_sol} SOL for "${campaign.title}"`,
      html,
    }),
  });

  return new Response(JSON.stringify({ ok: res.ok }), { headers: { "Content-Type": "application/json" } });
});
*/


// ── SUPABASE EDGE FUNCTION: Campaign approved notification ───────────────────
// supabase/functions/notify-approval/index.ts

/*
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const APP_URL = Deno.env.get("APP_URL") || "https://fundbeep.vercel.app";

serve(async (req) => {
  const { campaign, creatorEmail, creatorName, approved, rejectReason } = await req.json();

  const subject = approved
    ? `✅ Your campaign "${campaign.title}" is now live!`
    : `❌ Your campaign "${campaign.title}" was not approved`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head><style>
      body { font-family: 'Helvetica Neue', sans-serif; background: #09080F; color: #F0ECF8; margin: 0; }
      .container { max-width: 560px; margin: 40px auto; background: #110F1C; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,.1); }
      .header { background: ${approved ? "linear-gradient(135deg, #7C3AED, #E8B904)" : "linear-gradient(135deg, #7f1d1d, #991b1b)"}; padding: 32px; text-align: center; }
      .header h1 { margin: 0; font-size: 28px; color: #fff; font-weight: 900; }
      .body { padding: 32px; line-height: 1.7; font-size: 15px; }
      .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #7C3AED, #E8B904); color: #fff; text-decoration: none; border-radius: 10px; font-weight: 800; }
      .footer { padding: 20px; text-align: center; font-size: 12px; color: rgba(240,236,248,.3); }
    </style></head>
    <body>
      <div class="container">
        <div class="header"><h1>${approved ? "🎉 Campaign Approved!" : "❌ Campaign Not Approved"}</h1></div>
        <div class="body">
          <p>Hi <b>${creatorName}</b>,</p>
          ${approved
            ? `<p>Great news! Your campaign <b>"${campaign.title}"</b> has been reviewed and approved. It's now live on FundBeep and ready to receive contributions.</p><div style="text-align:center;margin-top:24px"><a href="${APP_URL}" class="btn">View Campaign</a></div>`
            : `<p>Unfortunately, your campaign <b>"${campaign.title}"</b> was not approved at this time.</p><p style="background:rgba(224,112,112,.1);border:1px solid rgba(224,112,112,.3);border-radius:10px;padding:16px;color:#e07070"><b>Reason:</b> ${rejectReason}</p><p>You can update your campaign and resubmit for review.</p>`
          }
        </div>
        <div class="footer">FundBeep · Solana Fundraising</div>
      </div>
    </body></html>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "FundBeep <notifications@fundbeep.com>", to: creatorEmail, subject, html }),
  });

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
*/


// ── HOW TO CALL EDGE FUNCTIONS FROM YOUR REACT APP ───────────────────────────
/*
// In your supabase.js, add:

export const sendContributionNotification = async ({ campaign, contribution, creatorEmail, creatorName }) => {
  await supabase.functions.invoke("notify-contribution", {
    body: { campaign, contribution, creatorEmail, creatorName },
  });
};

export const sendApprovalNotification = async ({ campaign, creatorEmail, creatorName, approved, rejectReason }) => {
  await supabase.functions.invoke("notify-approval", {
    body: { campaign, creatorEmail, creatorName, approved, rejectReason },
  });
};

// Then call after recording a contribution:
await sendContributionNotification({
  campaign,
  contribution: { amount_sol: +amount, wallet_from: walletAddress },
  creatorEmail: campaign.profiles?.email,
  creatorName: campaign.profiles?.full_name,
});

// And after admin approves/rejects:
await sendApprovalNotification({
  campaign,
  creatorEmail: campaign.creator_email,
  creatorName: campaign.creator_name,
  approved: true,
});
*/


// ── DEPLOY EDGE FUNCTIONS ─────────────────────────────────────────────────────
/*
STEP 1: Install Supabase CLI
  npm install -g supabase

STEP 2: Login and link project
  npx supabase login
  npx supabase link --project-ref absvvivaaduftsszzuew

STEP 3: Create function files
  mkdir -p supabase/functions/notify-contribution
  mkdir -p supabase/functions/notify-approval

  (copy the code above into index.ts files)

STEP 4: Set secrets
  npx supabase secrets set RESEND_API_KEY=re_your_key_here
  npx supabase secrets set APP_URL=https://fundbeep.vercel.app

STEP 5: Deploy
  npx supabase functions deploy notify-contribution
  npx supabase functions deploy notify-approval

STEP 6: Verify in Supabase dashboard → Edge Functions
*/
