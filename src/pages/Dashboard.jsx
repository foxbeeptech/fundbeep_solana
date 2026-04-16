import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { getMyCampaigns, getCampaignContributions, getPlatformSetting, updateCampaign, creatorCancelCampaign } from "../supabase";
import CampaignWizard from "./CampaignWizard";
import { useIsMobile } from "../hooks/useIsMobile";
import { claimEscrow, initializeEscrow, isEscrowEnabled, getEscrowState, getEscrowPDA } from "../utils/escrow";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { LayoutGrid, CircleDollarSign, Users, Trophy, Rocket, CheckCircle, Clock, AlertTriangle, FileText, Zap, PauseCircle, XCircle, Trash2 } from "lucide-react";

const C = {
  bg:           "#F6F4FF",
  surface:      "#FFFFFF",
  card:         "#FAFAFA",
  cardHover:    "#F5F5F5",
  border:       "rgba(124,58,237,.13)",
  borderHover:  "rgba(124,58,237,.35)",
  text:         "#1A0A3C",
  sub:          "#5B21B6",
  muted:        "#6B7280",
  faint:        "#A0A3B1",
  purple:       "#7C3AED",
  purpleLight:  "#9D5CF6",
  purpleSoft:   "rgba(124,58,237,.08)",
  purpleGlow:   "rgba(124,58,237,.18)",
  green:        "#059669",
  greenDim:     "rgba(5,150,105,.08)",
  greenBorder:  "rgba(5,150,105,.2)",
  amber:        "#D97706",
  amberDim:     "rgba(217,119,6,.08)",
  amberBorder:  "rgba(217,119,6,.2)",
  red:          "#DC2626",
  redDim:       "rgba(220,38,38,.07)",
  redBorder:    "rgba(220,38,38,.18)",
  blue:         "#2563EB",
  blueDim:      "rgba(37,99,235,.08)",
};

const SOL_USD = 148;
const short = (a) => a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "";
const toUSD = (s) => (s * SOL_USD).toLocaleString("en-US", { maximumFractionDigits: 0 });

const Spinner = ({ color = C.purple, size = 14 }) => (
  <span style={{ width: size, height: size, border: `2px solid rgba(0,0,0,.08)`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite", flexShrink: 0 }} />
);

function Bar({ pct, color }) {
  return (
    <div style={{ height: 5, borderRadius: 99, background: "rgba(0,0,0,.07)", overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(pct, 100)}%`, height: "100%", borderRadius: 99,
        background: `linear-gradient(90deg, ${color}80, ${color})`,
        boxShadow: `0 0 8px ${color}60`,
        transition: "width 1.2s cubic-bezier(.4,0,.2,1)"
      }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft:     { color: C.blue,  bg: C.blueDim,   border: "rgba(37,99,235,.2)", dot: "#60A5FA", label: "Draft" },
    pending:   { color: C.amber,  bg: C.amberDim,  border: C.amberBorder,  dot: "#F59E0B", label: "Pending" },
    active:    { color: C.green,  bg: C.greenDim,  border: C.greenBorder,  dot: "#10B981", label: "Active" },
    paused:    { color: C.muted,  bg: "rgba(0,0,0,.04)", border: "rgba(0,0,0,.1)", dot: "#9CA3AF", label: "Paused" },
    completed: { color: C.purpleLight, bg: C.purpleSoft, border: C.border, dot: "#9D5CF6", label: "Completed" },
    rejected:  { color: C.red,   bg: C.redDim,    border: C.redBorder,    dot: "#EF4444", label: "Rejected" },
    cancelled: { color: C.red,   bg: C.redDim,    border: C.redBorder,    dot: "#EF4444", label: "Cancelled" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      letterSpacing: .4
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.dot, boxShadow: `0 0 4px ${s.dot}` }} />
      {s.label}
    </span>
  );
}

const TABS = [
  { key: "All",       label: "All Campaigns", icon: LayoutGrid   },
  { key: "Draft",     label: "Draft",         icon: FileText     },
  { key: "Active",    label: "Active",        icon: Zap          },
  { key: "Pending",   label: "Pending",       icon: Clock        },
  { key: "Completed", label: "Completed",     icon: CheckCircle  },
  { key: "Paused",    label: "Paused",        icon: PauseCircle  },
  { key: "Rejected",  label: "Rejected",      icon: XCircle      },
  { key: "Cancelled", label: "Cancelled",     icon: Trash2       },
];

// ── Contributions Modal ────────────────────────────────────────────────────────
function ContributionsModal({ campaign, onClose }) {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCampaignContributions(campaign.id).then(data => { setContributions(data); setLoading(false); });
  }, [campaign.id]);

  const total = contributions.reduce((s, c) => s + (+c.amount_sol || 0), 0);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.85)", backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 460, maxHeight: "82vh", overflowY: "auto",
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 22, padding: 28, position: "relative",
        boxShadow: `0 20px 60px rgba(100,60,220,.12), 0 0 0 1px ${C.border}`
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16, width: 30, height: 30,
          borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent",
          color: C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14
        }}>✕</button>

        <div style={{ fontWeight: 900, fontSize: 18, color: C.text, marginBottom: 4 }}>Contributions</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>{campaign.title}</div>

        {!loading && contributions.length > 0 && (
          <div style={{ background: C.purpleSoft, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Total Raised</div>
              <div style={{ fontWeight: 900, color: C.purpleLight, fontSize: 20 }}>{total.toFixed(3)} SOL</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>Contributors</div>
              <div style={{ fontWeight: 900, color: C.text, fontSize: 20 }}>{contributions.length}</div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}><Spinner color={C.purple} size={24} /></div>
        ) : contributions.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No contributions yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {contributions.map((c, i) => (
              <div key={c.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 14px", borderRadius: 10,
                background: i % 2 === 0 ? "transparent" : "rgba(124,58,237,.03)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: C.purpleSoft, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>◎</div>
                  <div>
                    <div style={{ fontSize: 12, color: C.sub, fontFamily: "monospace", fontWeight: 600 }}>{short(c.wallet_from) || "Anonymous"}</div>
                    <div style={{ fontSize: 10, color: C.faint, marginTop: 1 }}>{new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: C.green, fontSize: 13 }}>+{c.amount_sol} SOL</div>
                  <div style={{ fontSize: 10, color: C.muted }}>≈ ${toUSD(c.amount_sol)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard({ setPage, onViewCampaign }) {
  const isMobile = useIsMobile();
  const { user, profile, walletAddress, walletProvider, connectWallet } = useWallet();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [viewContribs, setViewContribs] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [claimingId, setClaimingId] = useState(null);
  const [claimErr,   setClaimErr]   = useState({});
  const [contractAdminWallet, setContractAdminWallet] = useState("6coG2GcQV1uAkuzHFMqYAk5piGrn2ivoMeAcSQEMHQ56");
  const [tab, setTab] = useState("All");
  const [completingDraftId, setCompletingDraftId] = useState(null);
  const [draftErr, setDraftErr] = useState({});
  const [cancellingId, setCancellingId] = useState(null);
  const [escrowStates, setEscrowStates] = useState({});
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  const totalRaised = campaigns.reduce((s, c) => s + (+c.raised_sol || 0), 0);
  const totalContributors = campaigns.reduce((s, c) => s + (c.contributor_count || 0), 0);
  const activeCnt = campaigns.filter(c => c.status === "active").length;
  const completedCnt = campaigns.filter(c => c.status === "completed").length;

  useEffect(() => {
    if (!user) return;
    getMyCampaigns(user.id).then(data => { setCampaigns(data); setLoading(false); });
    getPlatformSetting("contract_admin_wallet").then(w => { if (w) setContractAdminWallet(w); }).catch(() => {});
  }, [user]);

  // Fetch on-chain escrow state for each campaign that has a contract PDA
  useEffect(() => {
    if (!isEscrowEnabled()) return;
    const withPda = campaigns.filter(c => c.contract_pda);
    if (!withPda.length) return;
    withPda.forEach(c => {
      getEscrowState(c.id).then(state => {
        if (state) setEscrowStates(prev => ({ ...prev, [c.id]: state }));
      }).catch(() => {});
    });
  }, [campaigns]);

  // Tick every second so countdown timers stay live
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleSave = (saved) => {
    setCampaigns(prev => {
      const exists = prev.find(c => c.id === saved.id);
      return exists ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev];
    });
  };

  const handleConnect = async () => {
    setConnecting(true);
    await connectWallet();
    setConnecting(false);
  };

  const handleClaim = async (c) => {
    if (!c.contract_pda || !walletAddress || !isEscrowEnabled()) return;
    // Use getMilestoneInfo to get the correct highest-claimable milestone number
    const mi = getMilestoneInfo(c);
    if (!mi || !mi.canClaim) return;
    const milestone = mi.next;
    setClaimingId(c.id); setClaimErr(prev => ({ ...prev, [c.id]: "" }));
    try {
      // Always read admin wallet from on-chain escrow state — it was baked in at initialization
      // and may differ from the current platform setting if it was changed later
      const escrowState = await getEscrowState(c.id);
      const adminWallet = escrowState?.adminWallet || contractAdminWallet;
      const creatorWallet = escrowState?.creatorWallet || c.wallet;
      const { signature } = await claimEscrow(walletProvider, walletAddress, c.id, c.contract_pda, creatorWallet, adminWallet, milestone);
      const updates = { milestone_claimed: milestone };
      if (milestone === 4) updates.final_claim_tx = signature;
      await updateCampaign(c.id, updates);
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, milestone_claimed: milestone, ...(milestone === 4 ? { final_claim_tx: signature } : {}) } : x));
      setEscrowStates(prev => ({ ...prev, [c.id]: { ...prev[c.id], milestoneClaimed: milestone } }));
    } catch (e) {
      const msg = e.message || "";
      let friendly = msg;
      if (msg.includes("Custom:6009") || msg.includes("MilestoneLocked")) {
        friendly = "Milestone threshold not yet reached on-chain.";
      } else if (msg.includes("Custom:6008") || msg.includes("MilestoneAlreadyClaimed")) {
        friendly = "This milestone has already been claimed.";
      } else if (msg.includes("Custom:6013") || msg.includes("M1NotReached")) {
        friendly = "At least 25% of goal must be raised before any claim.";
      } else if (msg.includes("Custom:6006") || msg.includes("Unauthorized")) {
        friendly = "Only the campaign creator can claim milestones.";
      }
      setClaimErr(prev => ({ ...prev, [c.id]: friendly }));
    } finally {
      setClaimingId(null);
    }
  };

  const handleCompleteDraft = async (c) => {
    if (!walletAddress || !isEscrowEnabled()) return;
    setCompletingDraftId(c.id);
    setDraftErr(prev => ({ ...prev, [c.id]: "" }));
    try {
      // Validate campaign wallet is set
      if (!c.wallet || c.wallet.trim().length < 32) {
        setDraftErr(prev => ({ ...prev, [c.id]: "Campaign receiving wallet is not set. Edit the campaign and add your Solana wallet address first." }));
        setCompletingDraftId(null);
        return;
      }
      // Validate goal and end date
      if (!c.goal_sol || +c.goal_sol <= 0) {
        setDraftErr(prev => ({ ...prev, [c.id]: "Campaign goal is not set. Edit the campaign first." }));
        setCompletingDraftId(null);
        return;
      }

      const [listingFee, contribFee, m1, m2, m3, mf] = await Promise.all([
        getPlatformSetting("contract_listing_fee_sol"),
        getPlatformSetting("contract_contribution_fee_bps"),
        getPlatformSetting("contract_claim_fee_m1_bps"),
        getPlatformSetting("contract_claim_fee_m2_bps"),
        getPlatformSetting("contract_claim_fee_m3_bps"),
        getPlatformSetting("contract_claim_fee_final_bps"),
      ]);

      const listingFeeSol = +(listingFee ?? 0);   // default FREE if not configured
      const escrowRentSol = 0.003;                // ~rent for escrow PDA account
      const totalNeeded   = listingFeeSol + escrowRentSol + 0.001; // +0.001 SOL tx buffer

      // Pre-check wallet balance
      const rpcUrl = import.meta.env.VITE_HELIUS_RPC_URL?.startsWith("http")
        ? import.meta.env.VITE_HELIUS_RPC_URL
        : "https://api.mainnet-beta.solana.com";
      const conn = new Connection(rpcUrl, "confirmed");
      const balance = await conn.getBalance(new PublicKey(walletAddress));
      const balanceSol = balance / LAMPORTS_PER_SOL;

      if (balanceSol < totalNeeded) {
        setDraftErr(prev => ({ ...prev, [c.id]:
          `Insufficient SOL. Need at least ${totalNeeded.toFixed(3)} SOL (${listingFeeSol > 0 ? `${listingFeeSol} SOL listing fee + ` : ""}~${escrowRentSol} SOL account rent + fees). Your wallet has ${balanceSol.toFixed(4)} SOL.`
        }));
        setCompletingDraftId(null);
        return;
      }

      // Check if escrow PDA already exists on-chain (previous attempt may have succeeded)
      const [existingPda] = getEscrowPDA(c.id);
      const existingState = await getEscrowState(c.id);

      let escrowPda;
      if (existingState) {
        // Already initialized — skip tx, just update Supabase
        escrowPda = existingPda.toBase58();
      } else {
        const result = await initializeEscrow(
          walletProvider, walletAddress, c.id,
          +c.goal_sol, c.end_date,
          c.wallet, contractAdminWallet,
          listingFeeSol,
          +(contribFee ?? 50),
          +(m1 || 50), +(m2 || 50), +(m3 || 50), +(mf || 100)
        );
        escrowPda = result.escrowPda;
      }

      const approvedAt = new Date().toISOString();
      await updateCampaign(c.id, { contract_pda: escrowPda, milestone_claimed: 0, status: "active", approved_at: approvedAt });
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, contract_pda: escrowPda, milestone_claimed: 0, status: "active", approved_at: approvedAt } : x));
    } catch (e) {
      // Friendly messages for common on-chain errors
      const msg = e.message || "";
      let friendly = msg;
      if (msg.includes("Custom:1") || msg.includes("ResultWithNegativeLamports")) {
        friendly = "Insufficient SOL in your wallet to pay the listing fee and account rent. Please add more SOL and try again.";
      } else if (msg.includes("Custom:0") || msg.includes("AccountAlreadyInUse")) {
        friendly = "Escrow account already exists for this campaign. If a previous attempt failed, please contact support.";
      } else if (msg.includes("0x1")) {
        friendly = "Insufficient SOL balance. Please top up your wallet and try again.";
      }
      setDraftErr(prev => ({ ...prev, [c.id]: friendly }));
    } finally {
      setCompletingDraftId(null);
    }
  };

  const handleCancel = async (c) => {
    const raised = escrowStates[c.id]?.totalRaisedSol ?? +c.raised_sol ?? 0;
    const goal   = +c.goal_sol || 0;
    if (goal > 0 && raised >= goal / 4) {
      alert("Cannot cancel: this campaign has reached 25% of its goal (M1). Contributor funds are locked in escrow.");
      return;
    }
    if (!window.confirm(`Cancel "${c.title}"? This cannot be undone. On-chain funds (if any) are unaffected. Contributors can still withdraw via the escrow contract.`)) return;
    setCancellingId(c.id);
    try {
      await creatorCancelCampaign(c.id, user.id);
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: "cancelled" } : x));
    } catch (e) {
      alert(e.message || "Failed to cancel campaign");
    } finally {
      setCancellingId(null);
    }
  };

  // Returns milestone info for the dashboard claim panel.
  // New contract: sweep model, no time locks, non-sequential claiming.
  const getMilestoneInfo = (c) => {
    if (!c.contract_pda || !isEscrowEnabled()) return null;
    // Use the higher of on-chain or Supabase milestone_claimed (on-chain is source of truth)
    const claimed = Math.max(
      escrowStates[c.id]?.milestoneClaimed ?? 0,
      c.milestone_claimed || 0,
    );
    if (claimed >= 4) return { allClaimed: true };

    const es     = escrowStates[c.id];
    // Prefer on-chain values; fall back to Supabase while loading
    const raised = es ? es.totalRaisedSol : (+c.raised_sol || 0);
    const goal   = es ? es.goalSol        : (+c.goal_sol   || 0);
    if (!goal) return null;

    const isEnded = c.end_date && now >= Math.floor(new Date(c.end_date).getTime() / 1000);

    // Non-sequential: find highest milestone whose threshold is met and not yet claimed
    const m4Ok = raised >= goal / 4 && (raised >= goal || isEnded);
    const m3Ok = raised >= goal * 3 / 4;
    const m2Ok = raised >= goal / 2;
    const m1Ok = raised >= goal / 4;

    let highestClaimable = 0;
    if      (claimed < 4 && m4Ok) highestClaimable = 4;
    else if (claimed < 3 && m3Ok) highestClaimable = 3;
    else if (claimed < 2 && m2Ok) highestClaimable = 2;
    else if (claimed < 1 && m1Ok) highestClaimable = 1;

    if (highestClaimable > 0) {
      return {
        canClaim: true,
        next: highestClaimable,
        isFinal: highestClaimable === 4,
        claimed,
        raisedSol: raised,
        goalSol: goal,
        escrowLoaded: !!es,
      };
    }

    // Not yet claimable — show progress toward next threshold
    const next = claimed + 1;
    const thresholdSol = next <= 3 ? (goal * next) / 4 : goal;
    return {
      canClaim: false,
      next,
      isFinal: next === 4,
      claimed,
      thresholdSol,
      raisedSol: raised,
      goalSol: goal,
      isEnded,
      escrowLoaded: !!es,
    };
  };

  const filtered = tab === "All" ? campaigns : campaigns.filter(c => c.status === tab.toLowerCase());
  const tabCount = (key) => key === "All" ? campaigns.length : campaigns.filter(c => c.status === key.toLowerCase()).length;

  const stats = [
    { label: "Total Campaigns", value: campaigns.length,           sub: `${activeCnt} active`,                    icon: LayoutGrid,         color: C.purple,  glow: C.purpleGlow },
    { label: "SOL Raised",      value: totalRaised.toFixed(2),     sub: `≈ $${toUSD(totalRaised)}`,               icon: CircleDollarSign,   color: C.green,   glow: "rgba(16,185,129,.3)" },
    { label: "Contributors",    value: totalContributors,           sub: "total backers",                          icon: Users,              color: C.blue,    glow: "rgba(59,130,246,.3)" },
    { label: "Completed",       value: completedCnt,                sub: `of ${campaigns.length} campaigns`,       icon: Trophy,             color: C.amber,   glow: "rgba(245,158,11,.3)" },
  ];

  const avatar = profile?.full_name ? profile.full_name.slice(0, 2).toUpperCase() : walletAddress ? walletAddress.slice(0, 2).toUpperCase() : "👤";

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      maxWidth: 1200, width: "100%", margin: "0 auto",
      padding: isMobile ? "16px 14px 90px" : "36px 32px 80px",
      animation: "fadeUp .4s ease both"
    }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: "#7536E1",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 900, color: "#fff",
            boxShadow: `0 0 20px ${C.purpleGlow}`
          }}>{avatar}</div>
          <div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 2 }}>Creator Dashboard</div>
            <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>
              {profile?.full_name ? `Hello, ${profile.full_name.split(" ")[0]}` : "My Dashboard"}
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          disabled={!walletAddress}
          title={!walletAddress ? "Connect wallet first" : ""}
          style={{
            padding: "11px 22px", borderRadius: 12, border: "none",
            fontWeight: 800, fontSize: 14, fontFamily: "inherit",
            background: walletAddress
              ? `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`
              : "rgba(0,0,0,.05)",
            color: walletAddress ? "#fff" : C.faint,
            cursor: walletAddress ? "pointer" : "not-allowed",
            boxShadow: walletAddress ? `0 4px 20px ${C.purpleGlow}` : "none",
            display: "flex", alignItems: "center", gap: 8,
            width: isMobile ? "100%" : "auto", justifyContent: "center",
            transition: "transform .15s, box-shadow .15s",
          }}
          onMouseEnter={e => { if (walletAddress) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = `0 8px 28px ${C.purpleGlow}`; } }}
          onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = walletAddress ? `0 4px 20px ${C.purpleGlow}` : "none"; }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> New Campaign
        </button>
      </div>

      {/* ── Wallet banner ── */}
      {!walletAddress && (
        <div style={{
          background: "linear-gradient(135deg, rgba(124,58,237,.15), rgba(157,92,246,.08))",
          border: `1px solid ${C.border}`, borderRadius: 16,
          padding: "18px 22px", marginBottom: 28,
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12
        }}>
          <div>
            <div style={{ fontWeight: 700, color: C.sub, marginBottom: 4, fontSize: 14 }}>Wallet not connected</div>
            <div style={{ fontSize: 13, color: C.muted }}>Connect your Phantom wallet to create campaigns and receive funds.</div>
          </div>
          <button onClick={handleConnect} disabled={connecting} style={{
            padding: "10px 22px", borderRadius: 10, border: "none",
            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
            color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
            boxShadow: `0 4px 16px ${C.purpleGlow}`
          }}>
            {connecting ? <><Spinner color="#fff" /> Connecting…</> : "◎ Connect Wallet"}
          </button>
        </div>
      )}

      {/* ── Wallet chip ── */}
      {walletAddress && (
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
          padding: "10px 16px", marginBottom: 28,
          display: "flex", alignItems: "center", gap: 10
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}`, flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 10, color: C.faint, marginBottom: 1 }}>Connected Wallet</div>
            <div style={{ fontFamily: "monospace", fontSize: isMobile ? 11 : 12, color: C.sub, wordBreak: "break-all" }}>{walletAddress}</div>
          </div>
          <span style={{ padding: "3px 10px", borderRadius: 99, background: C.greenDim, color: C.green, fontSize: 10, fontWeight: 700, flexShrink: 0, border: `1px solid ${C.greenBorder}` }}>Live</span>
        </div>
      )}

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: isMobile ? 10 : 14, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 16,
            padding: isMobile ? "16px 14px" : "20px 20px", position: "relative", overflow: "hidden",
            transition: "border-color .2s, transform .2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${s.color}40`; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ""; }}
          >
            {/* glow orb */}
            <div style={{ position: "absolute", top: -20, right: -20, width: 70, height: 70, borderRadius: "50%", background: s.glow, filter: "blur(20px)", pointerEvents: "none" }} />

            <div style={{ marginBottom: 10, color: s.color }}><s.icon size={20} /></div>
            <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: C.text, letterSpacing: -1, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: s.color, marginTop: 2, fontWeight: 600 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── My Campaigns heading ── */}
      <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 16 }}>My Campaigns</div>

      {/* ── Two-column layout: sidebar nav + content ── */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 16, alignItems: "flex-start" }}>

        {/* Sidebar nav — desktop only */}
        {!isMobile && (
          <div style={{
            width: 196, flexShrink: 0,
            background: "#FFFFFF", border: "1px solid #E5E7EB",
            borderRadius: 12, padding: "6px 6px", position: "sticky", top: 20
          }}>
            {TABS.map(({ key, label, icon: Icon }) => {
              const cnt = tabCount(key);
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 9,
                    width: "100%", padding: "9px 10px", borderRadius: 8,
                    border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: active ? "#EDEDED" : "transparent",
                    color: active ? "#111111" : "#555555",
                    fontWeight: active ? 600 : 500,
                    fontSize: 13.5, textAlign: "left",
                    marginBottom: 1, transition: "background .12s, color .12s"
                  }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#F5F5F5"; e.currentTarget.style.color = "#222"; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#555555"; } }}
                >
                  <Icon size={16} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {cnt > 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: active ? "#444" : "#9CA3AF",
                      background: active ? "#D8D8D8" : "#F3F4F6",
                      padding: "1px 7px", borderRadius: 99, lineHeight: "18px"
                    }}>{cnt}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Mobile: horizontal scroll tabs */}
        {isMobile && (
          <div style={{ overflowX: "auto", display: "flex", gap: 6, paddingBottom: 4, marginBottom: 4, width: "100%" }}>
            {TABS.map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button key={key} onClick={() => setTab(key)} style={{
                  display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
                  padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                  border: active ? "none" : `1px solid ${C.border}`,
                  background: active ? "#EDEDED" : "transparent",
                  color: active ? "#111" : C.muted,
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"
                }}>
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80 }}><Spinner color={C.purple} size={30} /></div>
        ) : filtered.length === 0 && campaigns.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px",
          background: C.card, borderRadius: 20,
          border: `1.5px dashed ${C.border}`
        }}>
          <div style={{ marginBottom: 12, color: C.purple }}><Rocket size={48} /></div>
          <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 8 }}>No campaigns yet</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 24, maxWidth: 300, margin: "0 auto 24px" }}>Launch your first campaign and start raising funds on Solana</div>
          <button onClick={() => setShowCreate(true)} disabled={!walletAddress} style={{
            padding: "11px 28px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
            color: "#fff", fontWeight: 800, cursor: walletAddress ? "pointer" : "not-allowed",
            fontFamily: "inherit", boxShadow: `0 4px 20px ${C.purpleGlow}`
          }}>+ Create Campaign</button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted, fontSize: 13 }}>No {tab.toLowerCase()} campaigns.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(c => {
            const pct = c.goal_sol > 0 ? (+c.raised_sol / +c.goal_sol) * 100 : 0;
            const accent = c.accent_color || C.purple;
            const raised = (+c.raised_sol || 0);
            const daysLeft = c.end_date ? Math.max(0, Math.ceil((new Date(c.end_date) - Date.now()) / 86400000)) : null;

            return (
              <div key={c.id}
                style={{
                  background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
                  overflow: "hidden", transition: "border-color .2s, transform .15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = ""; }}
              >

                <div style={{ padding: isMobile ? "16px 14px" : "20px 22px" }}>
                  {/* Top row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}>
                      <div style={{
                        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                        background: `linear-gradient(135deg, ${accent}20, ${accent}10)`,
                        border: `1px solid ${accent}30`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                      }}>{c.image_emoji}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                        <div style={{ fontSize: 11, color: C.faint, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ background: C.purpleSoft, padding: "1px 7px", borderRadius: 99, border: `1px solid ${C.border}` }}>{c.category}</span>
                          <span>·</span>
                          <span>{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>

                  {/* Progress */}
                  <Bar pct={pct} color={accent} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                    <div style={{ fontSize: 13 }}>
                      <span style={{ fontWeight: 800, color: accent }}>{raised.toFixed(2)} SOL</span>
                      <span style={{ color: C.faint, fontSize: 12 }}> / {c.goal_sol} SOL</span>
                    </div>
                    <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        <span style={{ color: C.text, fontWeight: 700 }}>{pct.toFixed(0)}%</span> funded
                      </span>
                      <span style={{ fontSize: 11, color: C.muted }}>
                        <span style={{ color: C.text, fontWeight: 700 }}>👥 {c.contributor_count || 0}</span>
                      </span>
                      {daysLeft !== null && (
                        <span style={{ fontSize: 11, color: daysLeft <= 3 ? C.red : C.muted }}>
                          <span style={{ color: daysLeft <= 3 ? C.red : C.text, fontWeight: 700 }}>{daysLeft}d</span> left
                        </span>
                      )}
                    </div>
                  </div>

                  {/* USD raised */}
                  <div style={{ marginTop: 6, fontSize: 11, color: C.faint }}>≈ ${toUSD(raised)} raised</div>

                  {/* Reject reason */}
                  {c.reject_reason && (
                    <div style={{ marginTop: 12, fontSize: 12, color: C.red, background: C.redDim, padding: "9px 13px", borderRadius: 9, border: `1px solid ${C.redBorder}` }}>
                      Rejected: {c.reject_reason}
                    </div>
                  )}

                  {/* ── Draft banner ── */}
                  {c.status === "draft" && (
                    <div style={{ marginTop: 12, background: C.blueDim, border: "1px solid rgba(37,99,235,.2)", borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.blue, marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}><AlertTriangle size={12} /> Setup incomplete</div>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                        This campaign is saved as a draft. Complete the listing fee payment to submit it for review.
                      </div>
                      <button
                        onClick={() => handleCompleteDraft(c)}
                        disabled={completingDraftId === c.id || !walletAddress}
                        style={{
                          padding: "8px 18px", borderRadius: 9, border: "none",
                          background: completingDraftId === c.id ? "rgba(37,99,235,.15)" : `linear-gradient(135deg, ${C.blue}, #3B82F6)`,
                          color: completingDraftId === c.id ? C.blue : "#fff",
                          fontWeight: 800, fontSize: 12, cursor: completingDraftId === c.id ? "not-allowed" : "pointer",
                          fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6
                        }}
                      >
                        {completingDraftId === c.id ? <><Spinner color={C.blue} size={12} /> Paying listing fee…</> : "Complete Setup →"}
                      </button>
                      {draftErr[c.id] && <div style={{ marginTop: 8, fontSize: 11, color: C.red }}>{draftErr[c.id]}</div>}
                    </div>
                  )}

                  {/* ── Milestone claim panel ── */}
                  {c.status !== "draft" && (() => {
                    const mi = getMilestoneInfo(c);
                    if (!mi) return null;
                    if (mi.allClaimed) return (
                      <div style={{ marginTop: 12, fontSize: 11, color: "#059669", background: "rgba(5,150,105,.07)", border: "1px solid rgba(5,150,105,.2)", borderRadius: 8, padding: "8px 12px", fontWeight: 700 }}>
                        <Trophy size={13} style={{ display: "inline", marginRight: 5 }} /> All 4 milestones claimed. Full goal paid out.
                      </div>
                    );

                    // Determine panel state
                    const panelColor  = mi.canClaim ? "rgba(5,150,105,.06)" : "rgba(124,58,237,.05)";
                    const panelBorder = mi.canClaim ? "rgba(5,150,105,.2)"  : "rgba(124,58,237,.15)";
                    const labelColor  = mi.canClaim ? "#059669"             : "#7C3AED";

                    let label, sublabel;
                    if (mi.canClaim) {
                      if (mi.isFinal) {
                        label    = "Final Claim Ready";
                        sublabel = "Sweep all remaining balance (minus platform fee)";
                      } else {
                        label    = `Milestone ${mi.next}/4 Ready to Claim`;
                        sublabel = `Sweep all current escrow balance (minus platform fee)`;
                      }
                    } else if (mi.isFinal) {
                      label    = "Final Claim Locked";
                      sublabel = mi.isEnded
                        ? `Need at least 25% goal raised (${((mi.goalSol || 0) / 4).toFixed(2)} SOL) · currently ${mi.raisedSol.toFixed(2)} SOL`
                        : `Unlocks when goal is reached OR campaign ends · currently ${mi.raisedSol.toFixed(2)} SOL`;
                    } else {
                      label    = `Milestone ${mi.next}/4 Locked`;
                      sublabel = mi.escrowLoaded
                        ? `Need ${mi.thresholdSol.toFixed(2)} SOL on-chain · currently ${mi.raisedSol.toFixed(2)} SOL`
                        : `Need ${mi.thresholdSol.toFixed(2)} SOL raised · loading on-chain data…`;
                    }

                    return (
                      <div style={{ marginTop: 12, background: panelColor, border: `1px solid ${panelBorder}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: labelColor, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>{mi.canClaim ? <CheckCircle size={11} /> : <Clock size={11} />}{label}</div>
                            <div style={{ fontSize: 11, color: "#6B7280" }}>{sublabel}</div>
                          </div>
                          {mi.canClaim && (
                            <button
                              onClick={() => handleClaim(c)}
                              disabled={claimingId === c.id}
                              style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: claimingId === c.id ? "#D1FAE5" : "linear-gradient(135deg,#059669,#10B981)", color: claimingId === c.id ? "#059669" : "#fff", fontWeight: 800, fontSize: 12, cursor: claimingId === c.id ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                              {claimingId === c.id ? <><Spinner color="#059669" size={12} /> Claiming…</> : "Claim Now"}
                            </button>
                          )}
                        </div>
                        {/* Milestone progress dots */}
                        <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
                          {[1,2,3,4].map(n => (
                            <div key={n} style={{ flex: 1, height: 4, borderRadius: 99, background: n <= (mi.claimed || 0) ? "#059669" : n === mi.next && mi.canClaim ? "#7C3AED" : "rgba(0,0,0,.08)", transition: "background .3s" }} />
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 9, color: "#9CA3AF" }}>
                          {[25,50,75,100].map(p => <span key={p}>{p}%</span>)}
                        </div>
                        {claimErr[c.id] && <div style={{ marginTop: 8, fontSize: 11, color: "#DC2626" }}>{claimErr[c.id]}</div>}
                      </div>
                    );
                  })()}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                    {c.status !== "draft" && (
                      <button onClick={() => setViewContribs(c)} style={{
                        padding: "7px 16px", borderRadius: 9,
                        border: `1px solid ${C.border}`, background: "transparent",
                        color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        fontFamily: "inherit", transition: "border-color .15s, color .15s"
                      }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.sub; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
                      >
                        Contributions
                      </button>
                    )}
                    <button onClick={() => setEditCampaign(c)} style={{
                      padding: "7px 16px", borderRadius: 9,
                      border: `1px solid ${C.border}`,
                      background: C.purpleSoft,
                      color: C.purpleLight, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", transition: "background .15s"
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = `rgba(124,58,237,.2)`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = C.purpleSoft; }}
                    >
                      Edit Campaign
                    </button>
                    {!["draft","cancelled"].includes(c.status) &&
                     !((escrowStates[c.id]?.milestoneClaimed ?? c.milestone_claimed ?? 0) >= 1) &&
                     !((escrowStates[c.id]?.totalRaisedSol ?? +c.raised_sol ?? 0) >= (+c.goal_sol || Infinity) / 4) && (
                      <button
                        onClick={() => handleCancel(c)}
                        disabled={cancellingId === c.id}
                        style={{
                          padding: "7px 16px", borderRadius: 9,
                          border: `1px solid ${C.redBorder}`, background: C.redDim,
                          color: C.red, fontSize: 12, fontWeight: 700,
                          cursor: cancellingId === c.id ? "not-allowed" : "pointer",
                          fontFamily: "inherit"
                        }}
                      >
                        {cancellingId === c.id ? "Cancelling…" : "Cancel"}
                      </button>
                    )}
                    {c.status !== "draft" && (
                    <button onClick={() => onViewCampaign(c.id)} style={{
                      padding: "7px 16px", borderRadius: 9,
                      border: `1px solid ${C.border}`, background: "transparent",
                      color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit", transition: "border-color .15s, color .15s", marginLeft: "auto"
                    }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.sub; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
                    >
                      View →
                    </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </div>{/* /content */}
      </div>{/* /two-column */}

      {(showCreate || editCampaign) && (
        <CampaignWizard
          campaign={editCampaign || undefined}
          onClose={() => { setShowCreate(false); setEditCampaign(null); }}
          onSave={handleSave}
        />
      )}
      {viewContribs && <ContributionsModal campaign={viewContribs} onClose={() => setViewContribs(null)} />}
    </div>
  );
}
