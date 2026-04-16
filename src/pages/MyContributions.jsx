import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { getMyContributedCampaigns } from "../supabase";
import { refundFromEscrowNoPenalty, isEscrowEnabled } from "../utils/escrow";
import { useIsMobile } from "../hooks/useIsMobile";

const C = {
  bg:           "#F6F4FF",
  surface:      "#FFFFFF",
  border:       "#DDD6FE",
  text:         "#1E0A4C",
  sub:          "#4C1D95",
  muted:        "#6B7280",
  faint:        "#9CA3AF",
  purple:       "#6D28D9",
  purpleLight:  "#7C3AED",
  purpleSoft:   "rgba(109,40,217,.07)",
  purpleBorder: "rgba(109,40,217,.18)",
  green:        "#15803D",
  greenSoft:    "rgba(21,128,61,.07)",
  greenBorder:  "rgba(21,128,61,.2)",
  red:          "#B91C1C",
  redSoft:      "rgba(185,28,28,.06)",
  redBorder:    "rgba(185,28,28,.18)",
  amber:        "#92400E",
  amberSoft:    "rgba(245,158,11,.07)",
  amberBorder:  "rgba(245,158,11,.22)",
};

function isCampaignFailed(c) {
  if (!c.contract_pda || !isEscrowEnabled()) return false;
  if (c.milestone_claimed > 0) return false;
  if (!c.end_date) return false;
  const ended = new Date(c.end_date) < new Date();
  const below25 = Number(c.raised_sol) < Number(c.goal_sol) * 0.25;
  return ended && below25;
}

function StatusBadge({ status, failed }) {
  const cfg = failed
    ? { label: "Failed", bg: C.redSoft, border: C.redBorder, color: C.red }
    : status === "active"
    ? { label: "Active", bg: C.greenSoft, border: C.greenBorder, color: C.green }
    : status === "completed"
    ? { label: "Completed", bg: C.purpleSoft, border: C.purpleBorder, color: C.purple }
    : { label: status, bg: C.amberSoft, border: C.amberBorder, color: C.amber };
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

export default function MyContributions({ onViewCampaign }) {
  const isMobile = useIsMobile();
  const { user, walletAddress } = useWallet();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [claiming, setClaiming]   = useState({});
  const [claimErr, setClaimErr]   = useState({});
  const [claimOk, setClaimOk]     = useState({});

  useEffect(() => {
    if (!user) return;
    getMyContributedCampaigns(user.id)
      .then(data => { setCampaigns(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user]);

  const handleClaim = async (c) => {
    if (!walletAddress || !c.contract_pda) return;
    setClaiming(p => ({ ...p, [c.id]: true }));
    setClaimErr(p => ({ ...p, [c.id]: "" }));
    try {
      await refundFromEscrowNoPenalty(walletAddress, c.id, c.contract_pda);
      setClaimOk(p => ({ ...p, [c.id]: true }));
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, _claimed: true } : x));
    } catch (e) {
      setClaimErr(p => ({ ...p, [c.id]: e.message || "Transaction failed." }));
    } finally {
      setClaiming(p => ({ ...p, [c.id]: false }));
    }
  };

  if (!walletAddress) return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: C.muted, fontSize: 15 }}>Connect your wallet to see your contributions.</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, padding: isMobile ? "24px 16px" : "40px 32px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 900, fontSize: isMobile ? 22 : 28, color: C.text, marginBottom: 6 }}>My Contributions</div>
          <div style={{ fontSize: 14, color: C.muted }}>Campaigns you've contributed to. Claim your refund if a campaign failed.</div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: C.muted, padding: 60, fontSize: 14 }}>Loading…</div>
        ) : campaigns.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, background: C.surface, borderRadius: 16, border: `1.5px dashed ${C.border}` }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>💸</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 8 }}>No contributions yet</div>
            <div style={{ fontSize: 13, color: C.muted }}>Start supporting campaigns to see them here.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {campaigns.map(c => {
              const failed = isCampaignFailed(c) && !c._claimed;
              const claimed = claimOk[c.id] || c._claimed;
              const pct = c.goal_sol > 0 ? Math.min(100, (Number(c.raised_sol) / Number(c.goal_sol)) * 100) : 0;

              return (
                <div key={c.id} style={{
                  background: C.surface,
                  borderRadius: 16,
                  border: `1.5px solid ${failed ? C.redBorder : C.border}`,
                  padding: isMobile ? "18px 16px" : "20px 24px",
                  boxShadow: failed ? "0 4px 20px rgba(185,28,28,.08)" : "0 2px 12px rgba(109,40,217,.06)",
                  transition: "box-shadow .2s",
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>

                    {/* Emoji/image */}
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, overflow: "hidden" }}>
                      {c.image_url ? <img src={c.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (c.image_emoji || "🚀")}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span
                          onClick={() => onViewCampaign?.(c.id)}
                          style={{ fontWeight: 800, fontSize: 15, color: C.text, cursor: "pointer", textDecoration: "none" }}
                          onMouseEnter={e => e.currentTarget.style.color = C.purple}
                          onMouseLeave={e => e.currentTarget.style.color = C.text}
                        >{c.title}</span>
                        <StatusBadge status={c.status} failed={failed && !claimed} />
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ height: 6, borderRadius: 99, background: C.border, overflow: "hidden", marginBottom: 4 }}>
                          <div style={{ height: "100%", borderRadius: 99, width: `${pct}%`, background: failed ? "#EF4444" : `linear-gradient(90deg, ${C.purple}, ${C.purpleLight})`, transition: "width .4s" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted }}>
                          <span>{Number(c.raised_sol).toFixed(2)} / {Number(c.goal_sol).toFixed(2)} SOL raised ({pct.toFixed(0)}%)</span>
                          {c.end_date && <span>{new Date(c.end_date) < new Date() ? "Ended" : `Ends ${new Date(c.end_date).toLocaleDateString()}`}</span>}
                        </div>
                      </div>

                      {/* My contribution */}
                      <div style={{ fontSize: 12, color: C.sub, fontWeight: 700 }}>
                        Your contribution: <span style={{ color: C.purple }}>{c.my_total_sol.toFixed(4)} SOL</span>
                      </div>
                    </div>

                    {/* Action */}
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                      <button
                        onClick={() => onViewCampaign?.(c.id)}
                        style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${C.purpleBorder}`, background: C.purpleSoft, color: C.purple, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                      >View</button>

                      {/* Claim refund button for failed campaigns */}
                      {failed && !claimed && (
                        <button
                          onClick={() => handleClaim(c)}
                          disabled={claiming[c.id]}
                          style={{ padding: "7px 14px", borderRadius: 9, border: "none", background: claiming[c.id] ? C.redBorder : C.red, color: "#fff", fontSize: 12, fontWeight: 800, cursor: claiming[c.id] ? "not-allowed" : "pointer", fontFamily: "inherit", opacity: claiming[c.id] ? 0.7 : 1 }}
                        >{claiming[c.id] ? "Claiming…" : "Claim Refund"}</button>
                      )}
                      {claimed && (
                        <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>✓ Refunded</span>
                      )}
                    </div>
                  </div>

                  {/* Failed campaign notice */}
                  {failed && !claimed && (
                    <div style={{ marginTop: 14, padding: "10px 14px", background: C.redSoft, border: `1px solid ${C.redBorder}`, borderRadius: 10, fontSize: 12, color: C.red, lineHeight: 1.6 }}>
                      ⚠️ This campaign ended without reaching 25% of its goal. You can claim a <strong>full refund</strong> of your {c.my_total_sol.toFixed(4)} SOL with <strong>no penalty</strong>.
                    </div>
                  )}
                  {claimErr[c.id] && (
                    <div style={{ marginTop: 10, fontSize: 12, color: C.red }}>{claimErr[c.id]}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
