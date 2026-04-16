import { useState, useEffect } from "react";
import { getCampaign } from "../supabase";

const SOL_USD = 148;
const toUSD   = (s) => (s * SOL_USD).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pctOf   = (r, g) => g > 0 ? Math.min((+r / +g) * 100, 100) : 0;

const SITE_URL = "https://fundbeep.com";

export default function EmbedWidget({ campaignId }) {
  const [campaign, setCampaign] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [hov,      setHov]      = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    getCampaign(campaignId)
      .then(setCampaign)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campaignId]);

  const openCampaign = () => {
    window.open(`${SITE_URL}/#campaign/${campaignId}`, "_blank", "noreferrer");
  };

  if (loading) return (
    <div style={{ width: "100%", minHeight: 200, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito Sans', sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 28, height: 28, border: "3px solid #DDD6FE", borderTopColor: "#7C3AED", borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto 8px" }} />
        <div style={{ fontSize: 11, color: "#8B5CF6" }}>Loading…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
    </div>
  );

  if (!campaign) return (
    <div style={{ width: "100%", minHeight: 160, background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Nunito Sans', sans-serif" }}>
      <div style={{ fontSize: 12, color: "#9CA3AF" }}>Campaign not found.</div>
    </div>
  );

  const pct     = pctOf(campaign.raised_sol, campaign.goal_sol);
  const hasImg  = campaign.image_url && !campaign.image_url.includes("placeholder");
  const accent  = "#7C3AED";
  const isEnded = campaign.status !== "active";

  return (
    <div style={{ width: "100%", minHeight: 180, background: "#FAFAFA", border: "1px solid #E9E4FF", borderRadius: 14, overflow: "hidden", fontFamily: "'Nunito Sans', Arial, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Banner */}
      <div
        onClick={openCampaign}
        style={{
          height: 88,
          cursor: "pointer",
          background: hasImg
            ? `url(${campaign.image_url}) center/cover`
            : `linear-gradient(135deg, #EDE9FE, #DDD6FE)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, position: "relative", flexShrink: 0,
        }}>
        {!hasImg && (campaign.image_emoji || "🚀")}
        {/* Gradient overlay for text legibility */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,.45))" }} />
        <div style={{ position: "absolute", bottom: 8, left: 10, right: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,.5)", lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {campaign.title}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "12px 14px 10px", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Stats row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: accent, lineHeight: 1 }}>
              {(+campaign.raised_sol || 0).toFixed(2)} <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF" }}>SOL</span>
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>of {campaign.goal_sol} SOL · ≈ ${toUSD(+campaign.raised_sol || 0)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: pct >= 100 ? "#15803D" : accent }}>{pct.toFixed(0)}%</div>
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>funded</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, borderRadius: 99, background: "#EDE9FE", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${accent}99, ${accent})`, transition: "width 1s ease" }} />
        </div>

        {/* CTA button */}
        {!isEnded && (
          <button
            onClick={openCampaign}
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{
              width: "100%", padding: "9px 0", borderRadius: 9, border: "none",
              background: hov ? "#5B21B6" : `linear-gradient(135deg, #6D28D9, ${accent})`,
              color: "#fff", fontWeight: 800, fontSize: 12.5, cursor: "pointer",
              fontFamily: "inherit", transition: "background .15s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            }}>
            ◎ Back This Project
          </button>
        )}

        {isEnded && (
          <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#15803D", background: "rgba(21,128,61,.08)", border: "1px solid rgba(21,128,61,.2)", borderRadius: 7, padding: "6px 0" }}>
            ✓ Campaign Completed
          </div>
        )}
      </div>

      {/* Watermark */}
      <div
        onClick={() => window.open(SITE_URL, "_blank", "noreferrer")}
        style={{
          padding: "5px 14px 6px",
          background: "#F5F3FF",
          borderTop: "1px solid #EDE9FE",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
          cursor: "pointer",
        }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 5px #22C55E", flexShrink: 0, animation: "pulse 2s ease infinite" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#8B5CF6", letterSpacing: .2 }}>Live on FundBeep.com</span>
        <style>{`@keyframes pulse { 0%,100% { opacity:.5 } 50% { opacity:1 } }`}</style>
      </div>
    </div>
  );
}
