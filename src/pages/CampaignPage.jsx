import { useState, useEffect, useRef, useCallback } from "react";
import { getCampaign, getCampaignContributions, recordContribution, awardContributorBadge, getCampaignContributorBadges, getCampaignFollowState, followCampaign, unfollowCampaign, getCreatorFollowState, followCreator, unfollowCreator, getCampaignUpdates, postCampaignUpdate, deleteCampaignUpdate, getProofOfUse, addProofOfUse, deleteProofOfUse, autoAddProofOfUse, updateProofDescription, declareProof, adminDeleteProofOfUse, getCampaignComments, addCampaignComment, deleteCampaignComment, boostCampaign, getPlatformSetting, supabase, submitCampaignReport, getMyReport, updateCampaign } from "../supabase";
import usePageMeta from "../hooks/usePageMeta";
import ImpactReport from "../components/ImpactReport";
import { sendSol, getSolBalance, fetchOutgoingSOLTransactions } from "../utils/solana";
import { contributeToEscrow, claimEscrow, withdrawFromEscrow, refundFromEscrowNoPenalty, getContributionAmount, getEscrowState, isEscrowEnabled } from "../utils/escrow";
import { useWallet } from "../context/WalletContext";
import { useIsMobile } from "../hooks/useIsMobile";

const BADGE_META = {
  seed:     { emoji: "🌱", name: "Seed Backer",  desc: "First-ever contribution",     color: "#15803D", bg: "rgba(21,128,61,.12)" },
  early:    { emoji: "⚡", name: "Early Backer",  desc: "Among the first 10 backers",  color: "#D97706", bg: "rgba(217,119,6,.12)"  },
  flame:    { emoji: "🔥", name: "Flame",         desc: "Contributed 5+ SOL",          color: "#DC2626", bg: "rgba(220,38,38,.12)"  },
  diamond:  { emoji: "💎", name: "Diamond",       desc: "Contributed 10+ SOL",         color: "#2563EB", bg: "rgba(37,99,235,.12)"  },
  champion: { emoji: "🏆", name: "Champion",      desc: "Backed 3+ campaigns",         color: "#7C3AED", bg: "rgba(124,58,237,.12)" },
};

const C = {
  purple:       "#6D28D9",
  purpleLight:  "#7C3AED",
  purpleSoft:   "rgba(109,40,217,.07)",
  purpleBorder: "rgba(109,40,217,.2)",
  bg:           "#F5F3FF",
  surface:      "#FFFFFF",
  panel:        "#EDE9FE",
  border:       "#DDD6FE",
  text:         "#1E0A4C",
  textSub:      "#4C1D95",
  muted:        "#6B7280",
  faint:        "#9CA3AF",
  green:        "#15803D",
  greenDim:     "rgba(21,128,61,.1)",
  greenBorder:  "rgba(21,128,61,.2)",
  red:          "#B91C1C",
  redDim:       "rgba(185,28,28,.06)",
};

const SOL_USD = 148;
const toUSD   = (s) => (s * SOL_USD).toLocaleString("en-US", { maximumFractionDigits: 0 });
const short   = (a) => a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "";

const Spinner = ({ color = "#fff", size = 14 }) => (
  <span style={{ width: size, height: size, border: `2px solid rgba(109,40,217,.12)`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite", flexShrink: 0 }} />
);

function Bar({ pct, color }) {
  return (
    <div style={{ height: 8, borderRadius: 99, background: "rgba(0,0,0,.08)", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${color}cc, ${color})`, transition: "width 1.2s ease", boxShadow: `0 0 10px ${color}66` }} />
    </div>
  );
}

// Extract YouTube video ID from any YouTube URL
function getYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const SOCIAL_META = {
  social_twitter:   { icon: "𝕏",  label: "Twitter",   color: "#000" },
  social_telegram:  { icon: "✈",  label: "Telegram",  color: "#229ED9" },
  social_discord:   { icon: "◈",  label: "Discord",   color: "#5865F2" },
  social_facebook:  { icon: "f",  label: "Facebook",  color: "#1877F2" },
  social_instagram: { icon: "◉",  label: "Instagram", color: "#C13584" },
  social_website:   { icon: "⊕",  label: "Website",   color: "#6D28D9" },
  social_youtube:   { icon: "▶",  label: "YouTube",   color: "#FF0000" },
};

const REPORT_REASONS = [
  { value: "scam",        label: "🚨 Scam / Fraud",             desc: "Creator is attempting to steal funds" },
  { value: "fake",        label: "🎭 Fake Project",             desc: "Project or creator identity is fake" },
  { value: "misleading",  label: "⚠️ Misleading Information",   desc: "Claims are false or exaggerated" },
  { value: "spam",        label: "📢 Spam",                     desc: "Duplicate or spam campaign" },
  { value: "inappropriate", label: "🚫 Inappropriate Content",  desc: "Violates community guidelines" },
  { value: "other",       label: "📝 Other",                    desc: "Something else" },
];

function ReportModal({ campaignId, campaignTitle, reporterId, existingReport, onClose }) {
  const [reason,  setReason]  = useState(existingReport?.reason || "");
  const [details, setDetails] = useState("");
  const [busy,    setBusy]    = useState(false);
  const [done,    setDone]    = useState(!!existingReport);
  const [err,     setErr]     = useState("");

  const submit = async () => {
    if (!reason) { setErr("Please select a reason."); return; }
    setBusy(true); setErr("");
    try {
      await submitCampaignReport(reporterId, campaignId, reason, details);
      setDone(true);
    } catch (e) {
      setErr(e.message?.includes("duplicate") || e.code === "23505"
        ? "You have already reported this campaign."
        : "Failed to submit report. Please try again.");
    }
    setBusy(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(15,7,40,.7)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 18, padding: "28px 26px", width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,.25)" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 8 }}>Report Submitted</div>
            <div style={{ fontSize: 14, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
              Our team will review this campaign. Thank you for helping keep FundBeep safe.
            </div>
            <button onClick={onClose} style={{ padding: "10px 28px", borderRadius: 9, border: "none", background: C.purple, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              Close
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <span style={{ fontSize: 22 }}>🚨</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>Report Campaign</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>{campaignTitle}</div>
              </div>
              <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", fontSize: 20, color: C.faint, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ fontSize: 13, fontWeight: 700, color: C.muted, marginBottom: 10 }}>Why are you reporting this campaign?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {REPORT_REASONS.map(r => (
                <label key={r.value} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  borderRadius: 10, border: `1.5px solid ${reason === r.value ? C.purple : "#E5E7EB"}`,
                  background: reason === r.value ? "rgba(109,40,217,.06)" : "#fff",
                  cursor: "pointer", transition: "all .12s",
                }}>
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => { setReason(r.value); setErr(""); }}
                    style={{ accentColor: C.purple, width: 16, height: 16, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{r.label}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{r.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Additional details (optional) - include any evidence, links, or context…"
              rows={3}
              style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1.5px solid #E5E7EB", fontFamily: "inherit", fontSize: 13, color: C.text, resize: "vertical", outline: "none", marginBottom: 16, boxSizing: "border-box" }}
            />

            {err && <div style={{ fontSize: 13, color: "#DC2626", marginBottom: 12, padding: "8px 12px", background: "rgba(220,38,38,.06)", borderRadius: 8, border: "1px solid rgba(220,38,38,.2)" }}>{err}</div>}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid #E5E7EB", background: "transparent", color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={submit} disabled={busy || !reason} style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: busy || !reason ? "#E5E7EB" : "#DC2626", color: busy || !reason ? C.faint : "#fff", fontWeight: 800, fontSize: 13, cursor: busy || !reason ? "default" : "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                {busy ? "Submitting…" : "Submit Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CampaignPage({ campaignId, onBack, onViewUser }) {
  const isMobile = useIsMobile();
  const { user, profile, walletAddress, walletProvider, connectWallet } = useWallet();
  const isAdmin = profile?.role === "superadmin";
  const [campaign, setCampaign]             = useState(null);
  const [contributions, setContributions]   = useState([]);
  const [loading, setLoading]               = useState(true);
  const [amount, setAmount]                 = useState("");
  const [step, setStep]                     = useState("idle");
  const [txSig, setTxSig]                   = useState("");
  const [errMsg, setErrMsg]                 = useState("");
  const [copied, setCopied]                 = useState(false);
  const [imgError, setImgError]             = useState(false);
  const [badgesMap, setBadgesMap]           = useState({});
  const [newBadges, setNewBadges]           = useState([]);
  const [toasts, setToasts]                 = useState([]);
  const toastIdRef                          = useRef(0);
  // follow states
  const [campFollow, setCampFollow]         = useState({ count: 0, isFollowing: false, loading: false });
  const [creatorFollow, setCreatorFollow]   = useState({ count: 0, isFollowing: false, loading: false });
  // campaign updates
  const [updates, setUpdates]               = useState([]);
  const [updateTitle, setUpdateTitle]       = useState("");
  const [updateContent, setUpdateContent]   = useState("");
  const [postingUpdate, setPostingUpdate]   = useState(false);
  const [updateErr, setUpdateErr]           = useState("");
  // live wallet balance
  const [walletBal, setWalletBal]           = useState(null);
  // comments
  const [comments, setComments]             = useState([]);
  const [commentText, setCommentText]       = useState("");
  const [postingComment, setPostingComment] = useState(false);
  // boost
  const [boostStep, setBoostStep]           = useState("idle"); // idle | paying | done | error
  const [boostErr, setBoostErr]             = useState("");
  const [embedCopied, setEmbedCopied]       = useState(false);
  const [platformWallet, setPlatformWallet] = useState("");
  const [boostPrices, setBoostPrices]       = useState({ "24": "0.05", "48": "0.10" });
  // proof of use
  const [proofs, setProofs]                 = useState([]);
  const [proofEditId, setProofEditId]       = useState(null);
  const [proofEditDesc, setProofEditDesc]   = useState("");
  const [declaringId, setDeclaringId]       = useState(null);
  // escrow withdrawal
  const [myEscrowAmount,  setMyEscrowAmount]  = useState(null); // null = not loaded yet
  const [claimStep,       setClaimStep]       = useState("idle"); // idle | signing | done | error
  const [claimErr,        setClaimErr]        = useState("");
  const [withdrawStep,    setWithdrawStep]    = useState("idle"); // idle | confirm | pending | done | error
  const [withdrawErr,     setWithdrawErr]     = useState("");
  const [campaignEscrowState, setCampaignEscrowState] = useState(null);
  const [contractAdminWallet, setContractAdminWallet] = useState("6coG2GcQV1uAkuzHFMqYAk5piGrn2ivoMeAcSQEMHQ56");
  // scam report
  const [showReport, setShowReport]         = useState(false);
  const [myReport,   setMyReport]           = useState(null);
  // platform setting: show/hide contributions list
  const [showContribList, setShowContribList] = useState(true);
  const [fetchingTxns, setFetchingTxns]     = useState(false);
  const [proofVisible, setProofVisible]     = useState(5);
  const [contribVisible, setContribVisible] = useState(10);
  const [countdown, setCountdown]           = useState("");

  const pushToast = useCallback((contrib) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev.slice(-2), { id, ...contrib }]); // max 3 visible
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const camp = await getCampaign(campaignId);
        setCampaign(camp);
        // Load supporting data — each fails silently so campaign always shows
        const [contribs, bmap, upds, pofs, comms] = await Promise.all([
          getCampaignContributions(campaignId).catch(() => []),
          getCampaignContributorBadges(campaignId).catch(() => ({})),
          getCampaignUpdates(campaignId).catch(() => []),
          getProofOfUse(campaignId).catch(() => []),
          getCampaignComments(campaignId).catch(() => []),
        ]);
        setContributions(contribs);
        setBadgesMap(bmap);
        setUpdates(upds);
        setProofs(pofs);
        setComments(comms);
        // Load boost settings from platform_settings
        Promise.all([
          getPlatformSetting("platform_wallet").catch(() => null),
          getPlatformSetting("boost_24h_price_sol").catch(() => null),
          getPlatformSetting("boost_48h_price_sol").catch(() => null),
          getPlatformSetting("show_contributions").catch(() => null),
          getPlatformSetting("contract_admin_wallet").catch(() => null),
        ]).then(([pw, b24, b48, sc, caw]) => {
          if (pw) setPlatformWallet(pw);
          setBoostPrices({ "24": b24 || "0.05", "48": b48 || "0.10" });
          setShowContribList(sc === null ? true : sc !== "false");
          if (caw) setContractAdminWallet(caw);
        });
        // Background: wallet balance + follow states
        if (camp?.wallet) getSolBalance(camp.wallet).then(b => setWalletBal(b)).catch(() => {});
        const uid = user?.id || null;
        getCampaignFollowState(uid, campaignId).then(s => setCampFollow(p => ({ ...p, ...s }))).catch(() => {});
        if (camp?.creator_id) {
          getCreatorFollowState(uid, camp.creator_id).then(s => setCreatorFollow(p => ({ ...p, ...s }))).catch(() => {});
        }
        if (uid) {
          getMyReport(uid, campaignId).then(setMyReport).catch(() => {});
        }
      } catch (_) {}
      finally { setLoading(false); }
    })();
  }, [campaignId, user]);

  // Real-time subscription for this campaign's contributions
  useEffect(() => {
    const channel = supabase
      .channel(`campaign-contributions-${campaignId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "contributions",
        filter: `campaign_id=eq.${campaignId}`,
      }, (payload) => {
        const c = payload.new;
        // Skip own contribution (they already see the success screen)
        if (c.contributor_id && c.contributor_id === user?.id) return;
        // Update raised amount + contributor count + list
        setCampaign(prev => prev ? ({
          ...prev,
          raised_sol: +prev.raised_sol + +c.amount_sol,
          contributor_count: (prev.contributor_count || 0) + 1,
        }) : prev);
        setContributions(prev => [c, ...prev]);
        pushToast(c);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campaignId, pushToast]);

  // Load on-chain contribution amount for withdrawal UI
  useEffect(() => {
    if (!walletAddress || !campaign?.contract_pda || !isEscrowEnabled()) return;
    getContributionAmount(campaign.id, walletAddress)
      .then(setMyEscrowAmount)
      .catch(() => setMyEscrowAmount(0));
  }, [walletAddress, campaign?.id, campaign?.contract_pda]);

  // Load on-chain escrow state to check if M1 is reached (locks early withdrawal)
  useEffect(() => {
    if (!campaign?.contract_pda || !isEscrowEnabled()) return;
    getEscrowState(campaign.id).then(state => { if (state) setCampaignEscrowState(state); }).catch(() => {});
  }, [campaign?.id, campaign?.contract_pda]);

  // Live countdown
  useEffect(() => {
    if (!campaign?.end_date) return;
    const pad = (n) => String(n).padStart(2, "0");
    const tick = () => {
      const diff = new Date(campaign.end_date) - Date.now();
      if (diff <= 0) { setCountdown("Ended"); return; }
      const days = Math.floor(diff / 86400000);
      const hrs  = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdown(days > 0 ? `${days}d ${pad(hrs)}:${pad(mins)}:${pad(secs)}` : `${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [campaign?.end_date]);

  const accent  = campaign?.accent_color || C.purple;
  const displayRaised = +campaign?.raised_sol || 0;
  const pct     = campaign ? Math.min((displayRaised / +campaign.goal_sol) * 100, 100) : 0;
  const ytId    = getYouTubeId(campaign?.social_youtube);
  const hasImg  = campaign?.image_url && !imgError;
  const socials = campaign ? Object.entries(SOCIAL_META).filter(([k]) => campaign[k]) : [];

  const handleContribute = async () => {
    if (!amount || +amount <= 0) return;
    if (!walletAddress) { await connectWallet(); return; }
    // Cap at remaining goal
    const remaining = Math.max(0, (+campaign.goal_sol || 0) - (+campaign.raised_sol || 0));
    if (remaining <= 0) { setErrMsg("This campaign has already reached its goal."); return; }
    if (+amount > remaining) {
      setErrMsg(`Max you can contribute is ${remaining.toFixed(4)} SOL (remaining to goal).`);
      return;
    }
    setStep("signing"); setErrMsg("");
    try {
      const bal = await getSolBalance(walletAddress);
      // Fee is charged ON TOP of the donation amount
      const feeBps = (campaign.contract_pda && isEscrowEnabled())
        ? (campaignEscrowState?.contributionFeeBps ?? 50)
        : 0;
      const feeSol  = +amount * feeBps / 10_000;
      const totalSol = +amount + feeSol;           // total deducted from wallet
      if (bal < totalSol + 0.000005)
        throw new Error(`Insufficient balance. You have ${bal.toFixed(4)} SOL, need ${totalSol.toFixed(6)} SOL (${amount} + ${feeSol.toFixed(6)} fee).`);
      let sig;
      if (campaign.contract_pda && isEscrowEnabled()) {
        // Send the gross amount (donation + fee) — contract splits it internally
        const res = await contributeToEscrow(walletProvider, walletAddress, campaign.id, totalSol, campaign.contract_pda, contractAdminWallet);
        sig = res.signature;
      } else {
        // Legacy direct flow — funds go straight to creator's wallet
        sig = await sendSol(walletProvider, walletAddress, campaign.wallet, +amount);
      }
      setTxSig(sig);
      setStep("confirming");
      const contrib = await recordContribution({
        campaign_id: campaign.id,
        contributor_id: user?.id || null,
        amount_sol: +amount,
        tx_signature: sig,
        wallet_from: walletAddress,
        status: "confirmed",
      });
      setContributions(p => [contrib, ...p]);
      const prevContribCount = campaign.contributor_count || 0;
      setCampaign(p => ({ ...p, raised_sol: +p.raised_sol + +amount, contributor_count: prevContribCount + 1 }));

      // ── Award badges ──────────────────────────────────────────
      if (user) {
        const earned = [];

        // Seed: first-ever contribution across all campaigns
        const { count: totalContribs } = await supabase
          .from("contributions").select("*", { count: "exact", head: true })
          .eq("contributor_id", user.id);
        if (totalContribs === 1) earned.push("seed");

        // Early backer: among first 10 to this campaign
        if (prevContribCount < 10) earned.push("early");

        // Amount-based
        if (+amount >= 10) { earned.push("flame"); earned.push("diamond"); }
        else if (+amount >= 5) earned.push("flame");

        // Champion: backed 3+ distinct campaigns
        const { data: campRows } = await supabase
          .from("contributions").select("campaign_id")
          .eq("contributor_id", user.id);
        const uniqueCamps = new Set((campRows || []).map(r => r.campaign_id));
        if (uniqueCamps.size >= 3) earned.push("champion");

        if (earned.length) {
          await Promise.all(earned.map(t => awardContributorBadge(user.id, campaign.id, t)));
          setBadgesMap(prev => ({ ...prev, [user.id]: [...new Set([...(prev[user.id] || []), ...earned])] }));
          setNewBadges(earned);
        }
      }

      setStep("done");
      // Refresh on-chain contribution amount (for withdrawal UI)
      if (campaign.contract_pda && isEscrowEnabled()) {
        getContributionAmount(campaign.id, walletAddress).then(setMyEscrowAmount).catch(() => {});
      }
    } catch (e) { setErrMsg(e.message); setStep("error"); }
  };

  // True when campaign ended with < 25% raised and no milestone claimed — full refund, no penalty
  // Creator claims all remaining funds (M4 final sweep) from campaign page
  const handleCreatorClaim = async () => {
    if (!campaign?.contract_pda || !walletAddress) return;
    setClaimStep("signing"); setClaimErr("");
    try {
      const { signature } = await claimEscrow(
        walletProvider, walletAddress,
        campaign.id, campaign.contract_pda,
        campaign.wallet, contractAdminWallet,
        4,
      );
      await updateCampaign(campaign.id, { milestone_claimed: 4, final_claim_tx: signature });
      setCampaignEscrowState(prev => prev ? { ...prev, milestoneClaimed: 4 } : prev);
      setCampaign(prev => ({ ...prev, milestone_claimed: 4, final_claim_tx: signature }));
      setClaimStep("done");
    } catch (e) {
      setClaimErr(e.message);
      setClaimStep("error");
    }
  };

  const isCancelledNoPenalty = campaign?.contract_pda && isEscrowEnabled() && (
    campaign.status === "cancelled" || (
      campaign.end_date &&
      new Date(campaign.end_date) <= Date.now() &&
      (campaign.milestone_claimed || 0) === 0 &&
      (+campaign.raised_sol || 0) < (+campaign.goal_sol || 0) * 0.25
    )
  );

  const handleWithdraw = async () => {
    if (!campaign?.contract_pda || !walletAddress || !isEscrowEnabled()) return;
    setWithdrawStep("pending"); setWithdrawErr("");
    try {
      if (isCancelledNoPenalty) {
        await refundFromEscrowNoPenalty(walletProvider, walletAddress, campaign.id, campaign.contract_pda);
      } else {
        await withdrawFromEscrow(walletProvider, walletAddress, campaign.id, campaign.contract_pda, contractAdminWallet);
      }
      setMyEscrowAmount(0);
      setWithdrawStep("done");
    } catch (e) {
      setWithdrawErr(e.message || "Withdrawal failed. Please try again.");
      setWithdrawStep("error");
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFollowCampaign = async () => {
    if (!user || campFollow.loading) return;
    setCampFollow(p => ({ ...p, loading: true }));
    try {
      if (campFollow.isFollowing) {
        await unfollowCampaign(user.id, campaign.id);
        setCampFollow(p => ({ isFollowing: false, count: Math.max(0, p.count - 1), loading: false }));
      } else {
        await followCampaign(user.id, campaign.id);
        setCampFollow(p => ({ isFollowing: true, count: p.count + 1, loading: false }));
      }
    } catch { setCampFollow(p => ({ ...p, loading: false })); }
  };

  const toggleFollowCreator = async () => {
    if (!user || creatorFollow.loading || !campaign?.creator_id) return;
    setCreatorFollow(p => ({ ...p, loading: true }));
    try {
      if (creatorFollow.isFollowing) {
        await unfollowCreator(user.id, campaign.creator_id);
        setCreatorFollow(p => ({ isFollowing: false, count: Math.max(0, p.count - 1), loading: false }));
      } else {
        await followCreator(user.id, campaign.creator_id);
        setCreatorFollow(p => ({ isFollowing: true, count: p.count + 1, loading: false }));
      }
    } catch { setCreatorFollow(p => ({ ...p, loading: false })); }
  };

  // Dynamic SEO meta per campaign
  usePageMeta({
    title: campaign?.title || "Campaign",
    description: campaign?.description ? campaign.description.slice(0, 155) : undefined,
    url: `https://fundbeep.com/campaign/${campaignId}`,
    image: campaign?.image_url || undefined,
  });

  const handlePostComment = async () => {
    if (!commentText.trim() || !user || postingComment) return;
    setPostingComment(true);
    try {
      const c = await addCampaignComment(campaignId, user.id, commentText);
      setComments(prev => [...prev, c]);
      setCommentText("");
    } catch (_) {}
    finally { setPostingComment(false); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user) return;
    try {
      await deleteCampaignComment(commentId, user.id);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (_) {}
  };

  const handleBoost = async (durationHours) => {
    if (!walletAddress || !platformWallet) return;
    setBoostStep("paying"); setBoostErr("");
    const feeSOL = parseFloat(boostPrices[String(durationHours)] || (durationHours === 24 ? 0.05 : 0.10));
    try {
      await sendSol(walletProvider, walletAddress, platformWallet, feeSOL);
      await boostCampaign(campaignId, user?.id || campaign.creator_id, durationHours);
      const boostedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
      setCampaign(prev => ({ ...prev, is_boosted: true, boosted_until: boostedUntil }));
      setBoostStep("done");
    } catch (e) {
      setBoostErr(e.message || "Transaction failed");
      setBoostStep("error");
    }
  };

  const embedCode = `<iframe\n  src="https://fundbeep.com/#embed/${campaignId}"\n  width="320" height="260"\n  frameborder="0"\n  style="border-radius:14px;border:none;"\n  loading="lazy"\n></iframe>`;

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode).catch(() => {});
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  // ── Auto-fetch outgoing SOL txns from creator wallet ─────────────────────
  useEffect(() => {
    if (!campaign?.wallet || !user || user.id !== campaign.creator_id) return;
    const run = async () => {
      setFetchingTxns(true);
      try {
        const txns = await fetchOutgoingSOLTransactions(campaign.wallet);
        // merge: only add txns not already in proofs list
        setProofs(prev => {
          const existingSigs = new Set(prev.map(p => p.tx_signature));
          const newTxns = txns.filter(t => !existingSigs.has(t.signature));
          if (newTxns.length === 0) return prev;
          // fire-and-forget inserts; update state as each resolves
          newTxns.forEach(t => {
            autoAddProofOfUse(campaignId, user.id, t.signature, t.amount_sol, t.wallet_to, t.timestamp)
              .then(p => setProofs(cur => cur.find(x => x.id === p.id) ? cur : [...cur, p]))
              .catch(() => {});
          });
          return prev;
        });
      } catch (_) {}
      finally { setFetchingTxns(false); }
    };
    run();
    const interval = setInterval(run, 60 * 60 * 1000); // every 1 hour
    return () => clearInterval(interval);
  }, [campaign?.id, user?.id]); // eslint-disable-line

  const handleManualRefresh = async () => {
    if (!campaign?.wallet || !user || fetchingTxns) return;
    setFetchingTxns(true);
    try {
      const txns = await fetchOutgoingSOLTransactions(campaign.wallet);
      setProofs(prev => {
        const existingSigs = new Set(prev.map(p => p.tx_signature));
        txns.filter(t => !existingSigs.has(t.signature)).forEach(t => {
          autoAddProofOfUse(campaignId, user.id, t.signature, t.amount_sol, t.wallet_to, t.timestamp)
            .then(p => setProofs(cur => cur.find(x => x.id === p.id) ? cur : [...cur, p]))
            .catch(() => {});
        });
        return prev;
      });
    } catch (_) {}
    finally { setFetchingTxns(false); }
  };

  const handleEditProofSave = async (proofId) => {
    if (!proofEditDesc.trim()) return;
    try {
      const updated = await updateProofDescription(proofId, user.id, proofEditDesc);
      setProofs(prev => prev.map(p => p.id === proofId ? { ...p, ...updated } : p));
      setProofEditId(null); setProofEditDesc("");
    } catch (e) { alert(e.message || "Failed to save"); }
  };

  const handleDeclareProof = async (proofId) => {
    try {
      const updated = await declareProof(proofId, user.id);
      setProofs(prev => prev.map(p => p.id === proofId ? { ...p, ...updated } : p));
      setDeclaringId(null);
    } catch (e) { alert(e.message || "Failed to declare"); }
  };

  const handleAdminDeleteProof = async (proofId) => {
    try {
      await adminDeleteProofOfUse(proofId);
      setProofs(prev => prev.filter(p => p.id !== proofId));
    } catch (e) { alert(e.message || "Failed to delete"); }
  };

  const handleDeleteProof = async (proofId) => {
    if (!user) return;
    try {
      await deleteProofOfUse(proofId, user.id);
      setProofs(prev => prev.filter(p => p.id !== proofId));
    } catch (_) {}
  };

  const handlePostUpdate = async () => {
    if (!updateContent.trim() || postingUpdate || !user || !campaign) return;
    setPostingUpdate(true); setUpdateErr("");
    try {
      const upd = await postCampaignUpdate(campaign.id, user.id, updateTitle, updateContent);
      setUpdates(prev => [upd, ...prev]);
      setUpdateTitle(""); setUpdateContent("");
    } catch (e) { setUpdateErr(e.message); }
    finally { setPostingUpdate(false); }
  };

  const handleDeleteUpdate = async (updateId) => {
    if (!user) return;
    try {
      await deleteCampaignUpdate(updateId, user.id);
      setUpdates(prev => prev.filter(u => u.id !== updateId));
    } catch (_) {}
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <Spinner color={C.purple} size={36} />
    </div>
  );

  if (!campaign) return (
    <div style={{ textAlign: "center", padding: 100 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
      <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8, color: C.text }}>Campaign not found</div>
      <button onClick={onBack} style={{ padding: "10px 22px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>← Back</button>
    </div>
  );

  const daysLeft = campaign.end_date
    ? Math.max(0, Math.ceil((new Date(campaign.end_date) - Date.now()) / 86400000))
    : null;
  const isEnded = campaign.end_date && new Date(campaign.end_date) <= Date.now();

  return (
  <>
    <div style={{ background: C.bg, minHeight: "100vh", animation: "fadeUp .4s ease both" }}>

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div style={{ position: "relative", height: isMobile ? 220 : 320, overflow: "hidden", background: `linear-gradient(135deg, ${accent}22 0%, ${C.panel} 100%)` }}>
        {hasImg && (
          <img
            src={campaign.image_url}
            alt={campaign.title}
            onError={() => setImgError(true)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {/* Gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: hasImg
          ? "linear-gradient(to bottom, rgba(0,0,0,.18) 0%, rgba(0,0,0,.65) 100%)"
          : `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)` }} />

        {/* Back button */}
        <button onClick={onBack} style={{ position: "absolute", top: 20, left: 24, padding: "7px 16px", borderRadius: 99, border: `1px solid ${hasImg ? "rgba(255,255,255,.35)" : C.border}`, background: hasImg ? "rgba(0,0,0,.35)" : C.surface, backdropFilter: "blur(8px)", color: hasImg ? "#fff" : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
          ← Back
        </button>

        {/* Hero content */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: isMobile ? "0 14px 18px" : "0 32px 28px" }}>
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            {/* Category + status row */}
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 5 : 8, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 800, letterSpacing: .8, textTransform: "uppercase", background: `${accent}`, color: "#fff" }}>
                {campaign.category}
              </span>
              <span style={{ padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: campaign.status === "active" ? "rgba(21,128,61,.9)" : "rgba(180,83,9,.9)", color: "#fff" }}>
                ● {campaign.status === "active" ? "Live" : campaign.status}
              </span>
              {countdown && (
                <span style={{ padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: isEnded ? "rgba(109,40,217,.85)" : daysLeft !== null && daysLeft <= 3 ? "rgba(185,28,28,.85)" : "rgba(30,10,76,.75)", color: "#fff", fontFamily: "monospace", letterSpacing: .5 }}>
                  {isEnded ? "⏹ Ended" : `⏱ ${countdown}`}
                </span>
              )}
              {campaign.kyc_verified && (
                <span style={{ padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 800, background: "rgba(37,99,235,.85)", color: "#fff", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 4 }}>
                  🪪 KYC Verified
                </span>
              )}
              {campaign.org_verified && (
                <span style={{ padding: "3px 12px", borderRadius: 99, fontSize: 11, fontWeight: 800, background: "rgba(6,95,70,.85)", color: "#fff", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 4 }}>
                  🏢 Org Verified
                </span>
              )}
            </div>

            <h1 style={{ fontWeight: 900, fontSize: isMobile ? 20 : 30, lineHeight: 1.2, color: hasImg ? "#fff" : C.text, margin: "0 0 8px", textShadow: hasImg ? "0 2px 12px rgba(0,0,0,.4)" : "none" }}>
              {campaign.title}
            </h1>

            {/* Creator */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: hasImg ? "rgba(255,255,255,.8)" : C.muted, fontSize: 13, flexWrap: "wrap" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, color: "#fff", flexShrink: 0 }}>
                {campaign.profiles?.full_name?.[0]?.toUpperCase() || "C"}
              </div>
              <span>by{" "}
                <b
                  style={{ color: hasImg ? "#fff" : C.text, cursor: onViewUser ? "pointer" : "default", textDecoration: onViewUser ? "underline dotted" : "none", textUnderlineOffset: 3 }}
                  onClick={() => onViewUser?.(campaign.creator_id)}
                >{campaign.profiles?.full_name || "Creator"}</b>
              </span>
              {campaign.profiles?.is_verified && <span style={{ fontSize: 13 }}>✅</span>}
              {campaign.profiles?.wallet_verified && (
                <span title="Wallet ownership verified on-chain" style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 800, background: "rgba(21,128,61,.85)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", backdropFilter: "blur(4px)", letterSpacing: .3 }}>
                  ✓ Verified Wallet
                </span>
              )}
              {creatorFollow.count > 0 && (
                <span style={{ fontSize: 11, color: hasImg ? "rgba(255,255,255,.55)" : C.faint }}>{creatorFollow.count} followers</span>
              )}
              {user && campaign.creator_id !== user.id && (
                <button onClick={toggleFollowCreator} disabled={creatorFollow.loading}
                  style={{ padding: "3px 12px", borderRadius: 99, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", transition: "all .18s",
                    border: `1px solid ${creatorFollow.isFollowing ? (hasImg ? "rgba(255,255,255,.5)" : accent + "60") : (hasImg ? "rgba(255,255,255,.35)" : C.border)}`,
                    background: creatorFollow.isFollowing ? (hasImg ? "rgba(255,255,255,.15)" : `${accent}15`) : (hasImg ? "rgba(0,0,0,.25)" : "transparent"),
                    color: creatorFollow.isFollowing ? (hasImg ? "#fff" : accent) : (hasImg ? "rgba(255,255,255,.8)" : C.muted),
                    backdropFilter: "blur(4px)",
                  }}>
                  {creatorFollow.isFollowing ? "✓ Following" : "+ Follow"}
                </button>
              )}
              {/* Report button — only for non-creators */}
              {user && campaign.creator_id !== user.id && (
                <button onClick={() => setShowReport(true)}
                  title={myReport ? `Already reported: ${myReport.reason}` : "Report this campaign"}
                  style={{ padding: "3px 10px", borderRadius: 99, fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                    border: `1px solid ${myReport ? "rgba(220,38,38,.4)" : hasImg ? "rgba(255,255,255,.25)" : "rgba(220,38,38,.25)"}`,
                    background: myReport ? "rgba(220,38,38,.15)" : hasImg ? "rgba(220,38,38,.25)" : "rgba(220,38,38,.06)",
                    color: myReport ? "#EF4444" : hasImg ? "rgba(255,200,200,.9)" : "#EF4444",
                    backdropFilter: "blur(4px)",
                  }}>
                  🚨 {myReport ? "Reported" : "Report"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Emoji fallback centered when no image */}
        {!hasImg && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -60%)", fontSize: 72, lineHeight: 1, opacity: .35 }}>
            {campaign.image_emoji || "🚀"}
          </div>
        )}
      </div>

      {/* ── Body ────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: isMobile ? "16px 12px 80px" : "32px 24px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 360px", gap: isMobile ? 16 : 28, alignItems: "start" }}>

          {/* ── LEFT ──────────────────────────────────────── */}
          <div>

            {/* Social links */}
            {socials.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
                {socials.map(([key, meta]) => (
                  <a key={key} href={campaign[key]} target="_blank" rel="noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 99, border: `1px solid ${meta.color}30`, background: `${meta.color}0d`, color: meta.color, fontSize: 12, fontWeight: 700, textDecoration: "none", transition: "all .15s" }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${meta.color}20`; e.currentTarget.style.borderColor = `${meta.color}60`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${meta.color}0d`; e.currentTarget.style.borderColor = `${meta.color}30`; }}>
                    <span style={{ fontSize: 13 }}>{meta.icon}</span> {meta.label}
                  </a>
                ))}
                <button onClick={copyLink}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 99, border: `1px solid ${C.border}`, background: copied ? C.purpleSoft : "transparent", color: copied ? C.purple : C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                  {copied ? "✅ Copied!" : "🔗 Share"}
                </button>

                {/* Follow Campaign */}
                <button onClick={toggleFollowCampaign} disabled={!user || campFollow.loading}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 99, fontWeight: 700, fontSize: 12, cursor: user ? "pointer" : "default", fontFamily: "inherit", transition: "all .18s",
                    border: `1px solid ${campFollow.isFollowing ? accent + "60" : C.border}`,
                    background: campFollow.isFollowing ? `${accent}15` : "transparent",
                    color: campFollow.isFollowing ? accent : C.muted,
                  }}>
                  {campFollow.isFollowing ? "★" : "☆"} {campFollow.isFollowing ? "Following" : "Follow Campaign"}
                  {campFollow.count > 0 && <span style={{ background: campFollow.isFollowing ? `${accent}25` : "#F3F4F6", padding: "0 6px", borderRadius: 99, fontSize: 11 }}>{campFollow.count}</span>}
                </button>
              </div>
            )}

            {/* ── Boost Campaign (creator only) ─────────────── */}
            {(user?.id === campaign.creator_id || (walletAddress && walletAddress === campaign.profiles?.wallet)) && (
              <div style={{ background: C.surface, border: `1px solid rgba(234,179,8,.35)`, borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ height: 3, background: "linear-gradient(90deg, #F59E0B, #EAB308)" }} />
                <div style={{ padding: "18px 22px" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4, display: "flex", alignItems: "center", gap: 7 }}>
                    🚀 Boost Campaign
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
                    Pay SOL to pin your campaign at the top of Explore for 24 or 48 hours. Boosts increase visibility and backers.
                  </div>

                  {campaign.is_boosted && campaign.boosted_until && new Date(campaign.boosted_until) > Date.now() && boostStep !== "done" && (
                    <div style={{ background: "rgba(234,179,8,.1)", border: "1px solid rgba(234,179,8,.3)", borderRadius: 9, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#92400E", fontWeight: 600 }}>
                      ✅ Currently boosted - expires {new Date(campaign.boosted_until).toLocaleString()}
                    </div>
                  )}
                  {boostStep === "done" && (
                    <div style={{ background: "rgba(21,128,61,.08)", border: "1px solid rgba(21,128,61,.2)", borderRadius: 9, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.green, fontWeight: 700 }}>
                      🚀 Boost activated! Your campaign is now pinned at the top of Explore.
                    </div>
                  )}
                  {boostErr && (
                    <div style={{ background: C.redDim, border: "1px solid rgba(185,28,28,.2)", borderRadius: 9, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: C.red }}>{boostErr}</div>
                  )}

                  {boostStep !== "done" && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[{ hours: 24, label: "24 Hours" }, { hours: 48, label: "48 Hours" }].map(opt => {
                        const sol = boostPrices[String(opt.hours)] || (opt.hours === 24 ? "0.05" : "0.10");
                        const disabled = boostStep === "paying" || !platformWallet;
                        return (
                          <button key={opt.hours}
                            onClick={() => handleBoost(opt.hours)}
                            disabled={disabled}
                            style={{
                              padding: "12px 0", borderRadius: 10, fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer",
                              border: "1px solid rgba(234,179,8,.4)", background: disabled ? "#FEF9C3" : "rgba(234,179,8,.1)",
                              transition: "all .15s", textAlign: "center", opacity: disabled && !platformWallet ? .5 : 1,
                            }}
                            onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = "rgba(234,179,8,.2)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = disabled ? "#FEF9C3" : "rgba(234,179,8,.1)"; }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#92400E" }}>{opt.label}</div>
                            <div style={{ fontSize: 12, color: "#A16207", marginTop: 2 }}>{sol} SOL</div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {boostStep === "paying" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: C.muted }}>
                      <span style={{ width: 12, height: 12, border: "2px solid #E5E7EB", borderTopColor: "#F59E0B", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
                      Waiting for wallet confirmation…
                    </div>
                  )}

                  {!platformWallet && (
                    <div style={{ marginTop: 10, fontSize: 11, color: C.faint }}>⚠️ Admin must set the platform wallet in Settings to enable boosts.</div>
                  )}
                </div>
              </div>
            )}

            {/* Description card */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: isMobile ? "16px 16px" : "24px 28px", marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: .6, textTransform: "uppercase", color: C.faint, marginBottom: 14 }}>About this campaign</div>
              <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.85, margin: 0, whiteSpace: "pre-wrap" }}>{campaign.description}</p>
            </div>

            {/* YouTube embed */}
            {ytId && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 26, height: 26, borderRadius: 8, background: "#FF000015", border: "1px solid #FF000030", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#FF0000", fontSize: 11 }}>▶</span>
                    Campaign Video
                  </span>
                </div>
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1`}
                    title="Campaign video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
                  />
                </div>
              </div>
            )}

            {/* Milestones */}
            {campaign.milestones?.length > 0 && (() => {
              const sorted = [...campaign.milestones].sort((a, b) => +a.target_sol - +b.target_sol);
              const raised = +campaign.raised_sol || 0;
              const currentIdx = sorted.findIndex(m => raised < +m.target_sol);
              return (
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
                  <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>🏁 Milestones</span>
                    <span style={{ fontSize: 12, color: C.faint }}>{sorted.filter(m => raised > 0 && +m.target_sol > 0 && raised >= +m.target_sol).length}/{sorted.length} reached</span>
                  </div>
                  <div style={{ padding: "8px 0" }}>
                    {sorted.map((m, i) => {
                      const reached  = raised > 0 && +m.target_sol > 0 && raised >= +m.target_sol;
                      const isCurrent = i === currentIdx;
                      const mPct = Math.min(100, (raised / +m.target_sol) * 100);
                      return (
                        <div key={i} style={{ padding: "14px 22px", borderBottom: i < sorted.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", gap: 14, alignItems: "flex-start" }}>
                          {/* Icon */}
                          <div style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800,
                            background: reached ? C.greenDim : isCurrent ? C.purpleSoft : "#F3F4F6",
                            border: `2px solid ${reached ? C.green : isCurrent ? accent : C.border}`,
                            color: reached ? C.green : isCurrent ? accent : C.faint,
                            boxShadow: isCurrent ? `0 0 0 4px ${accent}18` : "none",
                          }}>
                            {reached ? "✓" : isCurrent ? "◎" : i + 1}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: reached ? C.green : isCurrent ? C.text : C.muted }}>
                                {m.title}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: reached ? C.green : isCurrent ? accent : C.faint, flexShrink: 0, marginLeft: 12 }}>
                                {m.target_sol} SOL
                              </span>
                            </div>
                            {m.description && (
                              <div style={{ fontSize: 12, color: C.faint, marginBottom: isCurrent && !reached ? 8 : 0, lineHeight: 1.5 }}>{m.description}</div>
                            )}
                            {isCurrent && !reached && (
                              <>
                                <div style={{ height: 5, borderRadius: 99, background: "#E9ECF0", overflow: "hidden", marginTop: m.description ? 0 : 6 }}>
                                  <div style={{ height: "100%", width: `${mPct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${accent}99, ${accent})`, transition: "width 1s ease" }} />
                                </div>
                                <div style={{ fontSize: 11, color: accent, marginTop: 4, fontWeight: 600 }}>
                                  {raised.toFixed(2)} / {m.target_sol} SOL · {mPct.toFixed(0)}%
                                </div>
                              </>
                            )}
                            {reached && (
                              <div style={{ fontSize: 11, color: C.green, fontWeight: 600, marginTop: 2 }}>✓ Milestone reached!</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* ── Campaign Updates ─────────────────────── */}
            {(updates.length > 0 || (user && campaign.creator_id === user.id)) && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>
                <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>📢 Updates</span>
                  <span style={{ fontSize: 12, color: C.faint }}>{updates.length} post{updates.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Post form — creator only */}
                {user && campaign.creator_id === user.id && (
                  <div style={{ padding: "18px 22px", borderBottom: updates.length > 0 ? `1px solid ${C.border}` : "none", background: `${accent}05` }}>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .6, textTransform: "uppercase", color: accent, marginBottom: 10 }}>Post an Update</div>
                    <input
                      value={updateTitle}
                      onChange={e => setUpdateTitle(e.target.value)}
                      placeholder="Update title (optional)"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 8 }}
                      onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}15`; }}
                      onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                    />
                    <textarea
                      value={updateContent}
                      onChange={e => setUpdateContent(e.target.value)}
                      placeholder="Share progress, news, or a thank-you with your backers…"
                      rows={4}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6, marginBottom: updateErr ? 8 : 12 }}
                      onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}15`; }}
                      onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                    />
                    {updateErr && (
                      <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{updateErr}</div>
                    )}
                    <button onClick={handlePostUpdate} disabled={!updateContent.trim() || postingUpdate}
                      style={{ padding: "9px 22px", borderRadius: 9, border: "none", fontWeight: 800, fontSize: 13, cursor: !updateContent.trim() || postingUpdate ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7, transition: "all .15s",
                        background: !updateContent.trim() || postingUpdate ? C.panel : `linear-gradient(135deg, ${C.purple}, ${accent})`,
                        color: !updateContent.trim() || postingUpdate ? C.faint : "#fff",
                        boxShadow: !updateContent.trim() || postingUpdate ? "none" : `0 4px 14px ${accent}30`,
                      }}>
                      {postingUpdate ? <><Spinner size={12} /> Posting…</> : "📢 Post Update"}
                    </button>
                  </div>
                )}

                {/* Updates list */}
                {updates.length === 0 ? (
                  <div style={{ padding: "28px 22px", textAlign: "center", color: C.faint, fontSize: 13 }}>No updates yet. Stay tuned!</div>
                ) : (
                  <div>
                    {updates.map((u, i) => (
                      <div key={u.id} style={{ padding: "18px 22px", borderBottom: i < updates.length - 1 ? `1px solid ${C.border}` : "none" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: u.title ? 6 : 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                            <div style={{ width: 30, height: 30, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}30, ${accent}60)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>📢</div>
                            <div style={{ minWidth: 0 }}>
                              {u.title && <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{u.title}</div>}
                              <div style={{ fontSize: 11, color: C.faint }}>{new Date(u.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
                            </div>
                          </div>
                          {user && campaign.creator_id === user.id && (
                            <button onClick={() => handleDeleteUpdate(u.id)}
                              title="Delete update"
                              style={{ border: "none", background: "none", color: C.faint, fontSize: 13, cursor: "pointer", padding: "2px 6px", borderRadius: 6, flexShrink: 0, transition: "color .12s" }}
                              onMouseEnter={e => e.currentTarget.style.color = C.red}
                              onMouseLeave={e => e.currentTarget.style.color = C.faint}>
                              ✕
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap", paddingLeft: 38 }}>{u.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Proof of Use ─────────────────────────── */}
            {(proofs.length > 0 || (user && campaign.creator_id === user.id)) && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 24 }}>

                {/* Header */}
                <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>🔍 Proof of Use</span>
                    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 800, background: C.greenDim, color: C.green, border: `1px solid ${C.greenBorder}` }}>ON-CHAIN</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {user && campaign.creator_id === user.id && (
                      <button onClick={handleManualRefresh} disabled={fetchingTxns}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, fontWeight: 700, cursor: fetchingTxns ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                        {fetchingTxns ? <Spinner size={10} color={C.muted} /> : "↺"} Refresh
                      </button>
                    )}
                    <span style={{ fontSize: 12, color: C.faint }}>{proofs.length} record{proofs.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>

                {/* Auto-fetch info banner — creator only */}
                {user && campaign.creator_id === user.id && (
                  <div style={{ padding: "8px 22px", background: "rgba(21,128,61,.04)", borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>⚡</span>
                    <span>Outgoing SOL transactions from your wallet are auto-detected every hour. Add a reason, then <b>Declare</b> to publish. Declared items cannot be removed.</span>
                  </div>
                )}

                {/* List */}
                {proofs.length === 0 ? (
                  <div style={{ padding: "32px 22px", textAlign: "center", color: C.faint, fontSize: 13 }}>
                    {user && campaign.creator_id === user.id ? "No outgoing transactions detected yet. Refresh to check." : "No on-chain proof submitted yet."}
                  </div>
                ) : (
                  <div>
                    {proofs.slice(0, proofVisible).map((p, i) => {
                      const isDeclared  = p.status === "declared";
                      const isEditing   = proofEditId === p.id;
                      const hasDesc     = p.description?.trim();
                      const isCreatorRow = user && campaign.creator_id === user.id;
                      const showDeclare  = declaringId === p.id;

                      return (
                        <div key={p.id} style={{ padding: "16px 22px", borderBottom: i < proofs.length - 1 ? `1px solid ${C.border}` : "none", background: isDeclared ? "rgba(21,128,61,.02)" : "transparent" }}>

                          {/* Row: icon + badges + actions */}
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0,
                                background: isDeclared ? C.greenDim : p.source === "auto" ? "#FEF9C3" : C.greenDim,
                                border: `1px solid ${isDeclared ? C.greenBorder : p.source === "auto" ? "rgba(234,179,8,.35)" : C.greenBorder}`,
                                color: isDeclared ? C.green : p.source === "auto" ? "#92400E" : C.green,
                              }}>
                                {isDeclared ? "✓" : p.source === "auto" ? "↗" : "✓"}
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  {p.amount_sol && <span style={{ fontWeight: 800, fontSize: 13, color: isDeclared ? C.green : C.text }}>{p.amount_sol} SOL</span>}
                                  {isDeclared
                                    ? <span style={{ fontSize: 10, fontWeight: 800, background: C.greenDim, color: C.green, padding: "1px 7px", borderRadius: 99, border: `1px solid ${C.greenBorder}` }}>✓ DECLARED</span>
                                    : <span style={{ fontSize: 10, fontWeight: 700, background: C.redDim, color: C.red, padding: "1px 7px", borderRadius: 99, border: `1px solid rgba(185,28,28,.2)` }}>Not Declared Yet</span>
                                  }
                                </div>
                                <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>
                                  {isDeclared && p.declared_at
                                    ? `Declared ${new Date(p.declared_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                                    : p.tx_timestamp
                                      ? new Date(p.tx_timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                      : new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                  }
                                </div>
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                              <a href={`https://solscan.io/tx/${p.tx_signature}`} target="_blank" rel="noreferrer"
                                style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, color: C.purple, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, textDecoration: "none" }}>
                                ◈ Solscan ↗
                              </a>

                              {/* Creator actions — pending only */}
                              {isCreatorRow && !isDeclared && !isEditing && !showDeclare && (
                                <>
                                  <button onClick={() => { setProofEditId(p.id); setProofEditDesc(p.description || ""); setDeclaringId(null); }}
                                    style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                                    {hasDesc ? "Edit" : "Add Reason"}
                                  </button>
                                  {hasDesc && (
                                    <button onClick={() => { setDeclaringId(p.id); setProofEditId(null); }}
                                      style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.greenBorder}`, background: C.greenDim, color: C.green, fontSize: 11, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
                                      Declare
                                    </button>
                                  )}
                                  <button onClick={() => handleDeleteProof(p.id)} title="Remove"
                                    style={{ border: "none", background: "none", color: C.faint, fontSize: 13, cursor: "pointer", padding: "2px 6px", borderRadius: 6 }}
                                    onMouseEnter={e => e.currentTarget.style.color = C.red}
                                    onMouseLeave={e => e.currentTarget.style.color = C.faint}>✕</button>
                                </>
                              )}

                              {/* Superadmin can delete even declared */}
                              {isAdmin && isDeclared && (
                                <button onClick={() => handleAdminDeleteProof(p.id)} title="Remove (admin)"
                                  style={{ border: "none", background: "none", color: C.faint, fontSize: 13, cursor: "pointer", padding: "2px 6px", borderRadius: 6 }}
                                  onMouseEnter={e => e.currentTarget.style.color = C.red}
                                  onMouseLeave={e => e.currentTarget.style.color = C.faint}>✕</button>
                              )}
                            </div>
                          </div>

                          {/* Description text */}
                          {!isEditing && hasDesc && (
                            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, margin: "0 0 6px", paddingLeft: 40, whiteSpace: "pre-wrap" }}>{p.description}</p>
                          )}
                          {!isEditing && !hasDesc && isCreatorRow && !isDeclared && (
                            <p style={{ fontSize: 12, color: C.faint, fontStyle: "italic", margin: "0 0 4px", paddingLeft: 40 }}>No reason yet. Click "Add Reason" to explain this transaction.</p>
                          )}

                          {/* Inline edit form */}
                          {isEditing && (
                            <div style={{ paddingLeft: 40, marginBottom: 8 }}>
                              <textarea value={proofEditDesc} onChange={e => setProofEditDesc(e.target.value)}
                                placeholder="What were these funds used for? (e.g. Bought equipment, paid developer…)"
                                rows={2} autoFocus
                                style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${C.green}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6, marginBottom: 8 }}
                              />
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => handleEditProofSave(p.id)} disabled={!proofEditDesc.trim()}
                                  style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: proofEditDesc.trim() ? "linear-gradient(135deg,#15803D,#16a34a)" : C.panel, color: proofEditDesc.trim() ? "#fff" : C.faint, fontWeight: 700, fontSize: 12, cursor: proofEditDesc.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                                  Save
                                </button>
                                <button onClick={() => { setProofEditId(null); setProofEditDesc(""); }}
                                  style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Declare confirmation warning */}
                          {showDeclare && (
                            <div style={{ marginLeft: 40, marginTop: 4, marginBottom: 8, padding: "12px 14px", background: "rgba(234,179,8,.07)", border: "1px solid rgba(234,179,8,.3)", borderRadius: 9 }}>
                              <div style={{ fontWeight: 800, fontSize: 12, color: "#92400E", marginBottom: 6 }}>⚠️ Confirm Declaration</div>
                              <div style={{ fontSize: 12, color: "#A16207", lineHeight: 1.65, marginBottom: 10 }}>
                                Once declared, this transaction and its reason <b>cannot be edited or removed by you</b>. Only a superadmin can delete declared items. This publicly signals how funds were spent and builds donor trust.
                              </div>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => handleDeclareProof(p.id)}
                                  style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#15803D,#16a34a)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                  ✓ Yes, Declare It
                                </button>
                                <button onClick={() => setDeclaringId(null)}
                                  style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* TX signature */}
                          <div style={{ paddingLeft: 40, marginTop: 2 }}>
                            <span style={{ fontFamily: "monospace", fontSize: 10, color: C.faint, wordBreak: "break-all" }}>{p.tx_signature}</span>
                          </div>
                        </div>
                      );
                    })}

                    {/* View More / Show Less */}
                    {proofs.length > 5 && (
                      <div style={{ padding: "12px 22px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: C.faint }}>
                          Showing {Math.min(proofVisible, proofs.length)} of {proofs.length}
                        </span>
                        <div style={{ display: "flex", gap: 8 }}>
                          {proofVisible > 5 && (
                            <button onClick={() => setProofVisible(v => Math.max(5, v - 5))}
                              style={{ padding: "5px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              Show Less
                            </button>
                          )}
                          {proofVisible < proofs.length && (
                            <button onClick={() => setProofVisible(v => v + 5)}
                              style={{ padding: "5px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              View More ({Math.min(5, proofs.length - proofVisible)} more)
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Receiving wallet */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 22px", marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, textTransform: "uppercase", color: C.faint, marginBottom: 8 }}>◎ Receiving Wallet</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, color: C.text, wordBreak: "break-all", lineHeight: 1.6 }}>{campaign.wallet}</div>
              {campaign.contract_pda && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, textTransform: "uppercase", color: C.faint, marginBottom: 6 }}>⬡ Escrow Contract</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "monospace", fontSize: 12, color: C.text, wordBreak: "break-all", flex: 1 }}>{campaign.contract_pda}</span>
                    <button onClick={() => navigator.clipboard.writeText(campaign.contract_pda)} style={{ flexShrink: 0, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>Copy</button>
                    <a href={`https://solscan.io/account/${campaign.contract_pda}`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, padding: "3px 8px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 11, textDecoration: "none", fontWeight: 600 }}>View ↗</a>
                  </div>
                </div>
              )}
            </div>

            {/* Contributions */}
            {showContribList && <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>💸 Contributions</span>
                <span style={{ fontSize: 12, color: C.faint }}>{contributions.length} total</span>
              </div>
              {contributions.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🌱</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>No contributions yet</div>
                  <div style={{ fontSize: 13, color: C.muted }}>Be the first to back this campaign!</div>
                </div>
              ) : (
                <div>
                  {contributions.slice(0, contribVisible).map((c, i) => (
                    <div key={c.id} style={{ padding: "14px 22px", borderBottom: i < Math.min(contribVisible, contributions.length) - 1 ? `1px solid ${C.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}22, ${accent}44)`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>◎</div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{c.wallet_from ? short(c.wallet_from) : "Anonymous"}</span>
                            {c.wallet_from && (
                              <a href={`https://solscan.io/account/${c.wallet_from}`} target="_blank" rel="noopener noreferrer"
                                title="View wallet on Solscan"
                                style={{ fontSize: 10, fontWeight: 700, color: C.purple, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 5, padding: "1px 6px", textDecoration: "none", lineHeight: 1.6, flexShrink: 0 }}>
                                Solscan ↗
                              </a>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{new Date(c.created_at).toLocaleString()}</div>
                          {c.contributor_id && badgesMap[c.contributor_id]?.length > 0 && (
                            <div style={{ display: "flex", gap: 4, marginTop: 5, flexWrap: "wrap" }}>
                              {badgesMap[c.contributor_id].map(t => {
                                const m = BADGE_META[t];
                                if (!m) return null;
                                return (
                                  <span key={t} title={`${m.name} — ${m.desc}`} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, border: `1px solid ${m.color}25`, cursor: "default" }}>
                                    {m.emoji} {m.name}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 900, fontSize: 15, color: accent }}>{c.amount_sol} SOL</div>
                        <div style={{ fontSize: 11, color: C.faint }}>≈ ${toUSD(c.amount_sol)}</div>
                      </div>
                    </div>
                  ))}
                  {/* View more / show less */}
                  {contributions.length > 10 && (
                    <div style={{ padding: "12px 22px", borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                      {contribVisible < contributions.length && (
                        <button onClick={() => setContribVisible(v => v + 10)}
                          style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.purple, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = C.purpleBorder; e.currentTarget.style.background = C.purpleSoft; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.bg; }}>
                          View {Math.min(10, contributions.length - contribVisible)} more ↓
                        </button>
                      )}
                      {contribVisible > 10 && (
                        <button onClick={() => setContribVisible(10)}
                          style={{ flex: 1, padding: "9px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
                          onMouseLeave={e => { e.currentTarget.style.color = C.muted; }}>
                          Show less ↑
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>}

            {/* ── Impact Report ─────────────────────────────── */}
            <ImpactReport
              campaignId={campaignId}
              creatorId={campaign.creator_id}
              isCreator={user?.id === campaign.creator_id || (walletAddress && walletAddress === campaign.profiles?.wallet)}
              campaignEnded={campaign.status === "completed" || (campaign.end_date && new Date(campaign.end_date) < new Date())}
            />


            {/* ── Embed Widget (creator only) ───────────────── */}
            {(user?.id === campaign.creator_id || (walletAddress && walletAddress === campaign.profiles?.wallet)) && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginTop: 16 }}>
                <div style={{ padding: "18px 22px" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>🔗 Embed on Your Website</div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 14, lineHeight: 1.6 }}>
                    Add a live progress widget to your blog, portfolio, or website. Shows real-time funding progress with a watermark.
                  </div>
                  <div style={{ position: "relative", background: "#1E1B2E", borderRadius: 10, padding: "12px 14px", marginBottom: 10 }}>
                    <pre style={{ fontSize: 11, color: "#C4B5FD", fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.7, margin: 0 }}>{embedCode}</pre>
                  </div>
                  <button onClick={copyEmbed}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: `1px solid ${embedCopied ? C.green + "50" : C.border}`, background: embedCopied ? C.greenDim : "transparent", color: embedCopied ? C.green : C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                    {embedCopied ? "✅ Copied!" : "📋 Copy Embed Code"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT sticky card ─────────────────────────── */}
          <div style={{ position: isMobile ? "static" : "sticky", top: 24, order: isMobile ? -1 : 0 }}>
            <div style={{ background: C.surface, border: `1px solid ${accent}25`, borderRadius: 20, overflow: "hidden", boxShadow: `0 8px 40px ${accent}14` }}>

              {/* Accent top stripe */}
              <div style={{ height: 4, background: `linear-gradient(90deg, ${accent}, ${C.purpleLight})` }} />

              <div style={{ padding: "24px 24px 0" }}>
                {/* Raised amount */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, color: accent, lineHeight: 1 }}>{displayRaised.toFixed(3)}</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: C.muted }}>SOL</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.faint, marginBottom: 14 }}>
                    raised of <b style={{ color: C.text }}>{campaign.goal_sol} SOL</b> goal · ≈ ${toUSD(displayRaised)}
                  </div>
                  <Bar pct={pct} color={accent} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: accent }}>{pct.toFixed(1)}%</span>
                    <span style={{ fontSize: 12, color: C.faint }}>👥 {campaign.contributor_count || 0} backers</span>
                  </div>
                </div>

                {/* Funds claimed banner — visible to everyone */}
                {(() => {
                  const mc  = campaignEscrowState?.milestoneClaimed ?? campaign.milestone_claimed ?? 0;
                  const tx  = campaign.final_claim_tx;
                  if (mc < 4) return null;
                  return (
                    <div style={{ background: "rgba(5,150,105,.08)", border: "1px solid rgba(5,150,105,.25)", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: tx ? 8 : 0 }}>
                        <span style={{ fontSize: 20 }}>✅</span>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: "#059669" }}>Fundraiser has claimed all donations</div>
                          <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>All funds have been successfully paid out to the campaign creator.</div>
                        </div>
                      </div>
                      {tx && (
                        <a href={`https://solscan.io/tx/${tx}`} target="_blank" rel="noreferrer"
                          style={{ display: "block", fontFamily: "monospace", fontSize: 10, color: "#059669", wordBreak: "break-all", background: "rgba(5,150,105,.08)", border: "1px solid rgba(5,150,105,.15)", padding: "6px 10px", borderRadius: 7, textDecoration: "none" }}>
                          TX: {tx.slice(0, 24)}…{tx.slice(-8)} ↗
                        </a>
                      )}
                    </div>
                  );
                })()}

                {/* Stats row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
                  {[
                    { label: "Goal",    value: `${campaign.goal_sol} SOL` },
                    { label: "Backers", value: campaign.contributor_count || 0 },
                    { label: "Raised",  value: `${(+campaign.raised_sol || 0).toFixed(3)} SOL` },
                    { label: campaign.end_date ? "Time Left" : "Deadline", value: campaign.end_date ? (countdown || "—") : "—", mono: !!campaign.end_date },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: C.faint, fontWeight: 600, letterSpacing: .4, marginBottom: 3 }}>{s.label}</div>
                      <div style={{ fontWeight: 800, fontSize: s.mono ? 12 : 14, color: C.text, fontFamily: s.mono ? "monospace" : "inherit", letterSpacing: s.mono ? .5 : 0 }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Start / End dates */}
                {(campaign.created_at || campaign.end_date) && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
                    <div style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px" }}>
                      <div style={{ fontSize: 10, color: C.faint, fontWeight: 600, letterSpacing: .4, marginBottom: 3 }}>Started</div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: C.text }}>{campaign.created_at ? new Date(campaign.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</div>
                    </div>
                    <div style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "9px 12px" }}>
                      <div style={{ fontSize: 10, color: C.faint, fontWeight: 600, letterSpacing: .4, marginBottom: 3 }}>Ends</div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: isEnded ? C.red : C.text }}>{campaign.end_date ? new Date(campaign.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</div>
                    </div>
                  </div>
                )}

                <div style={{ height: 1, background: C.border, marginBottom: 20 }} />
              </div>

              {/* Contribute section */}
              <div style={{ padding: "0 24px 24px" }}>
                {/* Creator sees claim button or management shortcut */}
                {user?.id === campaign.creator_id ? (
                  (() => {
                    const escrow = campaignEscrowState;
                    const milestoneClaimed = escrow?.milestoneClaimed ?? campaign.milestone_claimed ?? 0;
                    const totalRaised = escrow?.totalRaisedSol ?? +campaign.raised_sol ?? 0;
                    const goal = escrow?.goalSol ?? +campaign.goal_sol ?? 0;
                    const now = Date.now() / 1000;
                    const ended = campaign.end_date && now >= new Date(campaign.end_date).getTime() / 1000;
                    const m1Reached = goal > 0 && totalRaised >= goal / 4;
                    const m4Claimable = milestoneClaimed < 4 && m1Reached && (totalRaised >= goal || ended);
                    const alreadyClaimed = milestoneClaimed >= 4;

                    if (campaign.contract_pda && isEscrowEnabled() && (m4Claimable || alreadyClaimed)) {
                      return (
                        <div style={{ padding: "18px 16px", background: alreadyClaimed ? "rgba(21,128,61,.06)" : "rgba(109,40,217,.06)", border: `1px solid ${alreadyClaimed ? "rgba(21,128,61,.2)" : "rgba(109,40,217,.18)"}`, borderRadius: 12, textAlign: "center" }}>
                          {alreadyClaimed ? (
                            <>
                              <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#15803D", marginBottom: 4 }}>All funds claimed</div>
                              <div style={{ fontSize: 12, color: "#166534" }}>Your escrow has been fully swept including the account rent.</div>
                            </>
                          ) : claimStep === "done" ? (
                            <>
                              <div style={{ fontSize: 22, marginBottom: 6 }}>🎉</div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#15803D", marginBottom: 4 }}>Funds claimed successfully!</div>
                              <div style={{ fontSize: 12, color: "#166534" }}>All SOL (including account rent) has been sent to your wallet.</div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#6D28D9", marginBottom: 6 }}>
                                {ended ? "Campaign ended" : "Goal reached"}. Ready to claim
                              </div>
                              <div style={{ fontSize: 12, color: "#4C1D95", marginBottom: 12, lineHeight: 1.6 }}>
                                Sweep all remaining funds ({totalRaised.toFixed(4)} SOL) plus account rent to your wallet.
                              </div>
                              {claimErr && <div style={{ fontSize: 12, color: "#DC2626", background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.2)", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>{claimErr}</div>}
                              <button onClick={handleCreatorClaim} disabled={claimStep === "signing"}
                                style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#6D28D9,#7C3AED)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: claimStep === "signing" ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8 }}>
                                {claimStep === "signing" ? "Signing…" : "◎ Claim All Funds"}
                              </button>
                            </>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div style={{ padding: "14px 16px", background: "rgba(109,40,217,.06)", border: "1px solid rgba(109,40,217,.18)", borderRadius: 12, textAlign: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#6D28D9", marginBottom: 8 }}>This is your campaign</div>
                        <div style={{ fontSize: 12, color: "#4C1D95", marginBottom: 12, lineHeight: 1.6 }}>Claim milestone payouts and manage your campaign from the My Campaign page.</div>
                        <button onClick={() => window.location.hash = "dashboard"} style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6D28D9,#7C3AED)", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                          ▤ Go to My Campaign
                        </button>
                      </div>
                    );
                  })()
                ) : step !== "done" ? (
                  <>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 12 }}>💸 Back This Campaign</div>

                    {!walletAddress && (
                      <div style={{ fontSize: 12, color: C.purple, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
                        ⚠️ Connect wallet to contribute
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8, marginBottom: 10 }}>
                      {[0.5, 1, 5, 10].filter(v => v <= Math.max(0, (+campaign.goal_sol || 0) - (+campaign.raised_sol || 0))).map(v => (
                        <button key={v} onClick={() => setAmount(String(v))}
                          style={{ padding: "9px 0", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer", background: +amount === v ? `${accent}20` : C.panel, border: `1px solid ${+amount === v ? accent : C.border}`, color: +amount === v ? accent : C.muted, fontFamily: "inherit", transition: "all .12s" }}>
                          {v} SOL
                        </button>
                      ))}
                    </div>

                    <input
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="Custom amount (SOL)"
                      type="number"
                      style={{ width: "100%", padding: "11px 14px", borderRadius: 10, marginBottom: 8, background: C.panel, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                      onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}18`; }}
                      onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                    />

                    {amount && +amount > 0 && (
                      <div style={{ fontSize: 12, color: C.faint, marginBottom: 10 }}>≈ ${toUSD(+amount)} USD</div>
                    )}

                    {errMsg && (
                      <div style={{ fontSize: 12, color: C.red, background: C.redDim, border: `1px solid rgba(185,28,28,.2)`, padding: "8px 12px", borderRadius: 8, marginBottom: 10 }}>{errMsg}</div>
                    )}

                    <button onClick={handleContribute}
                      disabled={(step !== "idle" && step !== "error") || !amount || +amount <= 0}
                      style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", fontWeight: 900, fontSize: 15, cursor: (step !== "idle" && step !== "error") || !amount || +amount <= 0 ? "not-allowed" : "pointer", background: (step !== "idle" && step !== "error") || !amount || +amount <= 0 ? C.panel : `linear-gradient(135deg, ${C.purple}, ${accent})`, color: (step !== "idle" && step !== "error") || !amount || +amount <= 0 ? C.faint : "#fff", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s", boxShadow: amount && +amount > 0 && step === "idle" ? `0 6px 20px ${accent}40` : "none" }}>
                      {step === "signing"    && <><Spinner /> Waiting for wallet…</>}
                      {step === "confirming" && <><Spinner /> Confirming on-chain…</>}
                      {(step === "idle" || step === "error") && (walletAddress ? `◎ Donate ${amount || "0"} SOL` : "👻 Connect Wallet")}
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
                    <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
                    <div style={{ fontWeight: 900, fontSize: 18, color: accent, marginBottom: 6 }}>Thank you!</div>
                    <div style={{ fontSize: 13, color: C.muted, marginBottom: newBadges.length ? 14 : 0 }}>{amount} SOL sent successfully</div>
                    {newBadges.length > 0 && (
                      <div style={{ background: "linear-gradient(135deg, #FFF9E6, #FFF3CC)", border: "1px solid #F59E0B40", borderRadius: 12, padding: "12px 14px", marginBottom: 14, textAlign: "left" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#92400E", letterSpacing: .5, marginBottom: 8 }}>🏅 BADGES EARNED</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {newBadges.map(t => {
                            const m = BADGE_META[t];
                            return (
                              <div key={t} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, background: m.bg, border: `1px solid ${m.color}30` }}>
                                <span style={{ fontSize: 14 }}>{m.emoji}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: m.color }}>{m.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noreferrer"
                      style={{ display: "block", fontFamily: "monospace", fontSize: 10, color: C.purple, wordBreak: "break-all", background: C.purpleSoft, padding: "8px 10px", borderRadius: 8, marginBottom: 14, textDecoration: "none" }}>
                      TX: {txSig.slice(0, 20)}…{txSig.slice(-8)} ↗
                    </a>
                    <button onClick={() => { setStep("idle"); setAmount(""); }}
                      style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
                      Contribute again
                    </button>
                  </div>
                )}

                {/* Live on-chain balance */}
                {walletBal !== null && (
                  <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "rgba(21,128,61,.05)", border: "1px solid rgba(21,128,61,.2)", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13 }}>🔗</span>
                      <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Live wallet balance</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 900, fontSize: 14, color: C.green }}>{walletBal.toFixed(4)} SOL</span>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", animation: "pulse 2s ease infinite", flexShrink: 0 }} />
                    </div>
                  </div>
                )}

                {/* Non-custodial note */}
                <div style={{ marginTop: 16, display: "flex", alignItems: "flex-start", gap: 7, padding: "10px 12px", background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 9 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
                  <span style={{ fontSize: 11, color: C.green, lineHeight: 1.5 }}>
                    {campaign.contract_pda
                      ? "Funds held in a milestone escrow smart contract. Creators unlock funds at 25% intervals."
                      : "Non-custodial · funds go directly on-chain to the creator's wallet. 0% platform fee."}
                  </span>
                </div>

                {/* Escrow contract address */}
                {campaign.contract_pda && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(109,40,217,.05)", border: "1px solid rgba(109,40,217,.15)", borderRadius: 9 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#6D28D9", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>Escrow Contract</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#4C1D95", fontFamily: "monospace", wordBreak: "break-all", flex: 1 }}>{campaign.contract_pda}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(campaign.contract_pda); }}
                        title="Copy address"
                        style={{ flexShrink: 0, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(109,40,217,.25)", background: "rgba(109,40,217,.08)", color: "#6D28D9", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}
                      >Copy</button>
                      <a
                        href={`https://solscan.io/account/${campaign.contract_pda}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ flexShrink: 0, padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(109,40,217,.25)", background: "rgba(109,40,217,.08)", color: "#6D28D9", fontSize: 11, textDecoration: "none", fontWeight: 600 }}
                      >View ↗</a>
                    </div>
                  </div>
                )}

                {/* ── Contributor withdrawal panel ──────────────────── */}
                {/* Hide entirely once M1 is reached on-chain — contract blocks both withdraw and refund */}
                {campaign.contract_pda && isEscrowEnabled() && walletAddress && myEscrowAmount > 0 && user?.id !== campaign.creator_id && !(() => { const goal = campaignEscrowState?.goalSol ?? +campaign.goal_sol ?? 0; return goal > 0 && (campaignEscrowState?.totalRaisedSol ?? +campaign.raised_sol ?? 0) >= goal / 4; })() && (
                  <div style={{ marginTop: 14, background: isCancelledNoPenalty ? "rgba(239,68,68,.06)" : "rgba(245,158,11,.06)", border: `1px solid ${isCancelledNoPenalty ? "rgba(239,68,68,.25)" : "rgba(245,158,11,.25)"}`, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: isCancelledNoPenalty ? C.red : "#92400E", marginBottom: 6 }}>
                      {isCancelledNoPenalty ? "🚫 Campaign Failed: Full Refund Available" : "Your Escrow Contribution"}
                    </div>
                    <div style={{ fontSize: 13, color: isCancelledNoPenalty ? C.red : "#92400E", marginBottom: 10 }}>
                      {isCancelledNoPenalty
                        ? <>This campaign ended without reaching 25% of its goal. You can withdraw your full <b>{myEscrowAmount.toFixed(4)} SOL</b> with <b>no penalty</b>.</>
                        : <>You have <b>{myEscrowAmount.toFixed(4)} SOL</b> in this campaign's escrow. Withdrawing early deducts a <b>5% penalty</b> sent to the platform.</>}
                    </div>
                    {withdrawStep === "done" ? (
                      <div style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>✓ {isCancelledNoPenalty ? "Refund" : "Withdrawal"} successful!</div>
                    ) : withdrawStep === "confirm" ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={handleWithdraw} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: isCancelledNoPenalty ? C.red : "#D97706", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                          Confirm: Get {isCancelledNoPenalty ? myEscrowAmount.toFixed(4) : (myEscrowAmount * 0.95).toFixed(4)} SOL
                        </button>
                        <button onClick={() => setWithdrawStep("idle")} style={{ padding: "8px 14px", borderRadius: 9, border: `1px solid ${isCancelledNoPenalty ? "rgba(239,68,68,.3)" : "rgba(245,158,11,.3)"}`, background: "transparent", color: isCancelledNoPenalty ? C.red : "#92400E", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setWithdrawStep("confirm")} disabled={withdrawStep === "pending"} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: isCancelledNoPenalty ? C.red : "#D97706", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                        {withdrawStep === "pending" ? "Processing…" : isCancelledNoPenalty ? "Claim Full Refund" : "Withdraw My Contribution"}
                      </button>
                    )}
                    {withdrawErr && <div style={{ marginTop: 8, fontSize: 11, color: C.red }}>{withdrawErr}</div>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Comments ─────────────────────────────────── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginTop: 28 }}>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>💬 Comments</span>
            <span style={{ fontSize: 12, color: C.faint }}>{comments.length} total</span>
          </div>

          {/* Post a comment */}
          <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}` }}>
            {user ? (
              <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                <textarea
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Share your thoughts…"
                  rows={2}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 10, background: C.panel, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, fontFamily: "inherit", resize: "vertical", outline: "none", lineHeight: 1.5 }}
                  onFocus={e => { e.target.style.borderColor = accent; e.target.style.boxShadow = `0 0 0 3px ${accent}18`; }}
                  onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                />
                <button onClick={handlePostComment} disabled={!commentText.trim() || postingComment}
                  style={{ padding: isMobile ? "11px 0" : "0 18px", borderRadius: 10, border: "none", background: commentText.trim() ? `linear-gradient(135deg, ${C.purple}, ${accent})` : C.panel, color: commentText.trim() ? "#fff" : C.faint, fontWeight: 700, fontSize: 13, cursor: commentText.trim() ? "pointer" : "not-allowed", fontFamily: "inherit", flexShrink: 0, transition: "all .15s" }}>
                  {postingComment ? "…" : "Post"}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.muted, padding: "6px 0" }}>Sign in to leave a comment.</div>
            )}
          </div>

          {/* Comment list */}
          {comments.length === 0 ? (
            <div style={{ padding: "36px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>No comments yet</div>
              <div style={{ fontSize: 13, color: C.muted }}>Be the first to comment!</div>
            </div>
          ) : (
            <div>
              {comments.map((c, i) => (
                <div key={c.id} style={{ padding: "14px 22px", borderBottom: i < comments.length - 1 ? `1px solid ${C.border}` : "none", display: "flex", gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}22, ${accent}44)`, border: `1px solid ${accent}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>
                    {c.profiles?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{c.profiles?.username || "Anonymous"}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: C.faint }}>{new Date(c.created_at).toLocaleString()}</span>
                        {user && (user.id === c.user_id || user.id === campaign?.creator_id) && (
                          <button onClick={() => handleDeleteComment(c.id)}
                            style={{ border: "none", background: "none", color: C.faint, fontSize: 12, cursor: "pointer", padding: "2px 6px", borderRadius: 6, transition: "color .12s" }}
                            onMouseEnter={e => e.currentTarget.style.color = C.red}
                            onMouseLeave={e => e.currentTarget.style.color = C.faint}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Live donation toasts (bottom-right) ────────── */}
      {toasts.length > 0 && (
        <div style={{ position: "fixed", bottom: isMobile ? 12 : 24, right: isMobile ? 8 : 24, left: isMobile ? 8 : "auto", zIndex: 999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
          {toasts.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#0F0A1E", border: `1px solid ${accent}40`, borderRadius: 14, boxShadow: `0 8px 32px rgba(0,0,0,.4), 0 0 0 1px ${accent}20`, minWidth: isMobile ? 0 : 260, maxWidth: isMobile ? "100%" : 320, animation: "slideInRight .35s cubic-bezier(.22,1,.36,1) both", backdropFilter: "blur(12px)" }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${accent}60, ${C.purpleLight}60)`, border: `2px solid ${accent}60`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>◎</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: `${accent}30`, color: accent, padding: "1px 7px", borderRadius: 99, fontSize: 12 }}>+{t.amount_sol} SOL</span>
                  <span style={{ fontSize: 10, background: "rgba(21,128,61,.3)", color: "#4ADE80", padding: "1px 6px", borderRadius: 99 }}>● LIVE</span>
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 3, fontFamily: "monospace" }}>
                  {t.wallet_from ? `${t.wallet_from.slice(0,5)}…${t.wallet_from.slice(-4)}` : "Anonymous"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>

    {/* Report modal — outside animated div so position:fixed works correctly */}
    {showReport && campaign && user && (
      <ReportModal
        campaignId={campaign.id}
        campaignTitle={campaign.title}
        reporterId={user.id}
        existingReport={myReport}
        onClose={() => {
          setShowReport(false);
          getMyReport(user.id, campaign.id).then(setMyReport).catch(() => {});
        }}
      />
    )}
  </>
  );
}
