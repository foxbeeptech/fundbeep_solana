import { useState, useEffect } from "react";
import { getReputationScore } from "../supabase";

const C = {
  surface: "#FFFFFF",
  border:  "#DDD6FE",
  text:    "#1E0A4C",
  muted:   "#6B7280",
  faint:   "#9CA3AF",
  purple:  "#6D28D9",
  bg:      "#F5F3FF",
};

function scoreColor(s) {
  if (s >= 85) return { main: "#C9960C", light: "rgba(201,150,12,.1)", border: "rgba(201,150,12,.3)", label: "Excellent" };
  if (s >= 65) return { main: "#15803D", light: "rgba(21,128,61,.1)",  border: "rgba(21,128,61,.3)",  label: "Good"      };
  if (s >= 45) return { main: "#D97706", light: "rgba(217,119,6,.1)",  border: "rgba(217,119,6,.3)",  label: "Fair"      };
  if (s >= 20) return { main: "#DC2626", light: "rgba(220,38,38,.1)",  border: "rgba(220,38,38,.3)",  label: "Low"       };
  return             { main: "#6B7280", light: "rgba(107,114,128,.1)", border: "rgba(107,114,128,.3)", label: "Building"  };
}

function ScoreRing({ score, size = 96 }) {
  const { main } = scoreColor(score);
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.border} strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={main} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontWeight: 900, fontSize: size * 0.27, color: main, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: size * 0.11, fontWeight: 700, color: C.faint, marginTop: 1 }}>/100</span>
      </div>
    </div>
  );
}

function BreakdownRow({ icon, label, value, pts, positive = true, note }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 16, width: 22, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{label}</div>
        {note && <div style={{ fontSize: 11, color: C.faint }}>{note}</div>}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 800, color: positive ? "#15803D" : "#DC2626" }}>
          {positive ? "+" : "-"}{Math.abs(pts)} pts
        </div>
      </div>
    </div>
  );
}

export default function ReputationScore({ userId, compact = false }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const [open,    setOpen]    = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    setData(null);
    getReputationScore(userId)
      .then(d => { setData(d); setError(false); })
      .catch(() => { setData(null); setError(true); })
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  if (loading) return (
    <div style={{
      height: compact ? 40 : 110,
      borderRadius: 12,
      background: "linear-gradient(90deg,#EDE9FE 25%,#F5F3FF 50%,#EDE9FE 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
      border: `1px solid ${C.border}`,
    }} />
  );

  if (error || !data) {
    if (compact) return null;
    return (
      <div style={{ background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 16, padding: "18px 22px", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>⭐</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Trust Score</div>
          <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>Score unavailable. Try again later.</div>
        </div>
      </div>
    );
  }

  const { score, campaigns_created, successful_campaigns, total_sol_raised,
          total_sol_contributed, contribution_count, scam_reports_actioned,
          creator_pts, raising_pts, contrib_pts, penalty_pts } = data;
  const sc = scoreColor(score);

  if (compact) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 99, background: sc.light, border: `1px solid ${sc.border}` }}>
        <span style={{ fontSize: 14 }}>⭐</span>
        <span style={{ fontWeight: 900, fontSize: 14, color: sc.main }}>{score}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: sc.main, opacity: .8 }}>Trust Score</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: sc.main, opacity: .65, background: "rgba(255,255,255,.5)", padding: "1px 6px", borderRadius: 99 }}>{sc.label}</span>
      </div>
    );
  }

  return (
    <div style={{ background: C.surface, border: `1.5px solid ${sc.border}`, borderRadius: 16, overflow: "hidden" }}>
      {/* Score header */}
      <div style={{ padding: "20px 22px", background: sc.light, display: "flex", alignItems: "center", gap: 20 }}>
        <ScoreRing score={score} size={88} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>⭐</span>
            <span style={{ fontWeight: 900, fontSize: 17, color: C.text }}>Trust Score</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: sc.main, background: "rgba(255,255,255,.7)", border: `1px solid ${sc.border}`, padding: "2px 8px", borderRadius: 99 }}>
              {sc.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
            On-chain identity score based on campaign activity, fundraising history, and community trust.
          </div>
          {/* Mini stats */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px" }}>
            <span style={{ fontSize: 12, color: C.muted }}><b style={{ color: sc.main }}>{campaigns_created}</b> campaigns</span>
            <span style={{ fontSize: 12, color: C.muted }}><b style={{ color: sc.main }}>{successful_campaigns}</b> successful</span>
            <span style={{ fontSize: 12, color: C.muted }}><b style={{ color: sc.main }}>{parseFloat(total_sol_raised || 0).toFixed(2)}</b> SOL raised</span>
            <span style={{ fontSize: 12, color: C.muted }}><b style={{ color: sc.main }}>{contribution_count}</b> donations made</span>
          </div>
        </div>
      </div>

      {/* Breakdown toggle */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "10px 22px", border: "none", borderTop: `1px solid ${C.border}`,
        background: "transparent", display: "flex", alignItems: "center", justifyContent: "space-between",
        cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: C.muted,
      }}>
        <span>📊 Score Breakdown</span>
        <span style={{ fontSize: 11 }}>{open ? "▲ Hide" : "▼ Show"}</span>
      </button>

      {open && (
        <div style={{ padding: "4px 22px 16px" }}>
          <BreakdownRow
            icon="◈" label="Campaigns Created"
            note={`${campaigns_created} total · ${successful_campaigns} successful`}
            value={`${campaigns_created} created`}
            pts={creator_pts}
            positive
          />
          <BreakdownRow
            icon="💰" label="Total SOL Raised"
            note="SOL raised across all campaigns"
            value={`${parseFloat(total_sol_raised || 0).toFixed(2)} SOL`}
            pts={raising_pts}
            positive
          />
          <BreakdownRow
            icon="🤝" label="Donation History"
            note={`${contribution_count} contributions · ${parseFloat(total_sol_contributed || 0).toFixed(2)} SOL donated`}
            value={`${contribution_count} donations`}
            pts={contrib_pts}
            positive
          />
          <div style={{ borderBottom: `1px solid ${C.border}` }} />
          <BreakdownRow
            icon="🚨" label="Scam Reports"
            note={scam_reports_actioned === 0 ? "No confirmed reports. Great!" : `${scam_reports_actioned} report(s) actioned by admin`}
            value={`${scam_reports_actioned} confirmed`}
            pts={penalty_pts}
            positive={false}
          />
          {/* Total */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.muted }}>Total Score</span>
            <span style={{ fontWeight: 900, fontSize: 20, color: sc.main }}>⭐ {score} / 100</span>
          </div>
        </div>
      )}
    </div>
  );
}
