import { useState, useEffect, useRef, useCallback } from "react";
import { getRecentContributions, getPlatformSetting, supabase } from "../supabase";

const short = (a) => a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "Anon";
const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)  return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
};

const C = {
  surface:  "#0F0A1E",
  border:   "rgba(109,40,217,.35)",
  purple:   "#7C3AED",
  green:    "#4ADE80",
  muted:    "rgba(255,255,255,.45)",
  faint:    "rgba(255,255,255,.22)",
  text:     "#fff",
};

export default function LiveFeed() {
  const [items, setItems]         = useState([]);
  const [minimized, setMinimized] = useState(true);
  const [pulse, setPulse]         = useState(false);
  const [enabled, setEnabled]     = useState(null); // null = loading
  const idRef                     = useRef(0);

  useEffect(() => {
    getPlatformSetting("live_feed_enabled")
      .then(v => setEnabled(v === null ? true : v !== "false"))
      .catch(() => setEnabled(true));
  }, []);

  const addItem = useCallback((row) => {
    const item = {
      _lid: ++idRef.current,
      amount_sol:  row.amount_sol,
      wallet_from: row.wallet_from,
      created_at:  row.created_at || new Date().toISOString(),
      campaign:    row.campaigns?.title || row.campaign_title || "a campaign",
      campaignId:  row.campaigns?.id || row.campaign_id,
    };
    setItems(prev => [item, ...prev].slice(0, 8));
    setPulse(true);
    setTimeout(() => setPulse(false), 1000);
  }, []);

  // Load initial data
  useEffect(() => {
    getRecentContributions(6).then(rows => {
      rows.reverse().forEach(r => addItem(r));
    }).catch(() => {});
  }, [addItem]);

  // Global real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("global-contributions-live")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "contributions",
      }, async (payload) => {
        const c = payload.new;
        // Fetch campaign title since realtime payload has no joins
        let campaign_title = "a campaign";
        let campaign_id = c.campaign_id;
        try {
          const { data } = await supabase
            .from("campaigns").select("id, title").eq("id", c.campaign_id).single();
          if (data) { campaign_title = data.title; campaign_id = data.id; }
        } catch (_) {}
        addItem({ ...c, campaign_title, campaign_id });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [addItem]);

  if (enabled === null || enabled === false) return null;

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 500,
      width: 290, fontFamily: "inherit",
    }}>
      {/* Header */}
      <button
        onClick={() => setMinimized(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 14px", borderRadius: minimized ? 12 : "12px 12px 0 0",
          background: C.surface, border: `1px solid ${C.border}`,
          borderBottom: minimized ? undefined : "none",
          cursor: "pointer", fontFamily: "inherit",
          boxShadow: "0 4px 24px rgba(0,0,0,.35)",
          transition: "border-radius .2s",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: pulse ? "#4ADE80" : items.length ? "#4ADE80" : "#6B7280",
            display: "inline-block", flexShrink: 0,
            boxShadow: pulse ? "0 0 0 4px rgba(74,222,128,.3)" : items.length ? "0 0 6px rgba(74,222,128,.5)" : "none",
            transition: "all .3s",
          }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: C.text }}>Live Donations</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {items.length > 0 && (
            <span style={{ fontSize: 10, background: "rgba(124,58,237,.3)", color: C.purple, padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>
              {items.length}
            </span>
          )}
          <span style={{ fontSize: 12, color: C.muted, lineHeight: 1 }}>{minimized ? "▲" : "▼"}</span>
        </div>
      </button>

      {/* Feed panel */}
      {!minimized && (
        <div style={{
          background: C.surface, border: `1px solid ${C.border}`, borderTop: "none",
          borderRadius: "0 0 12px 12px", overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,.4)",
          maxHeight: 320, overflowY: "auto",
        }}>
          {items.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: C.faint, fontSize: 12 }}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>👀</div>
              Waiting for donations…
            </div>
          ) : (
            items.map((item, i) => (
              <div key={item._lid} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                borderBottom: i < items.length - 1 ? `1px solid ${C.faint}20` : "none",
                animation: i === 0 ? "slideInRight .3s ease both" : "none",
                background: i === 0 && pulse ? "rgba(74,222,128,.04)" : "transparent",
                transition: "background .6s",
              }}>
                {/* Avatar */}
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, rgba(124,58,237,.4), rgba(124,58,237,.2))", border: "1px solid rgba(124,58,237,.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0, color: C.purple }}>◎</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#A78BFA" }}>+{item.amount_sol} SOL</span>
                    {i === 0 && <span style={{ fontSize: 9, background: "rgba(74,222,128,.2)", color: C.green, padding: "1px 5px", borderRadius: 99, fontWeight: 700 }}>NEW</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {short(item.wallet_from)} → <span style={{ color: "rgba(255,255,255,.6)" }}>{item.campaign.length > 22 ? item.campaign.slice(0, 22) + "…" : item.campaign}</span>
                  </div>
                </div>

                {/* Time */}
                <div style={{ fontSize: 10, color: C.faint, flexShrink: 0 }}>{timeAgo(item.created_at)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
