import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { getUnreadNotifications, markNotificationRead, markAllNotificationsRead } from "../supabase";

const C = {
  purple:      "#6D28D9",
  purpleLight: "#7C3AED",
  purpleSoft:  "rgba(109,40,217,.08)",
  purpleBorder:"rgba(109,40,217,.2)",
  green:       "#15803D",
  greenDim:    "rgba(21,128,61,.1)",
  greenBorder: "rgba(21,128,61,.25)",
  red:         "#B91C1C",
  redDim:      "rgba(185,28,28,.08)",
  surface:     "#FFFFFF",
  border:      "#DDD6FE",
  text:        "#1E0A4C",
  muted:       "#6B7280",
  faint:       "#9CA3AF",
  bg:          "#F5F3FF",
};

const typeStyle = {
  campaign_approved: { border: C.greenBorder, bg: C.greenDim,  icon: "🎉" },
  campaign_rejected: { border: "rgba(185,28,28,.25)", bg: C.redDim, icon: "📋" },
};

export default function NotificationPopup({ user, onViewCampaign, setPage }) {
  const [notifications, setNotifications] = useState([]);
  const [visible, setVisible]             = useState(false);
  const [current, setCurrent]             = useState(0);

  // Fetch on mount + subscribe to realtime new notifications
  useEffect(() => {
    if (!user) return;

    const fetch = async () => {
      const data = await getUnreadNotifications(user.id);
      if (data.length > 0) { setNotifications(data); setCurrent(0); setVisible(true); }
    };

    fetch();

    // Realtime: new row inserted for this user
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on("postgres_changes", {
        event:  "INSERT",
        schema: "public",
        table:  "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev]);
        setCurrent(0);
        setVisible(true);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  if (!visible || notifications.length === 0) return null;

  const n    = notifications[current];
  const ts   = typeStyle[n.type] || typeStyle.campaign_approved;
  const total = notifications.length;

  const dismiss = async (id) => {
    await markNotificationRead(id);
    const remaining = notifications.filter(x => x.id !== id);
    if (remaining.length === 0) { setVisible(false); setNotifications([]); }
    else { setNotifications(remaining); setCurrent(0); }
  };

  const dismissAll = async () => {
    await markAllNotificationsRead(user.id);
    setVisible(false);
    setNotifications([]);
  };

  const handleCta = () => {
    if (n.metadata?.campaign_id && n.type === "campaign_approved") {
      dismiss(n.id);
      if (onViewCampaign) onViewCampaign(n.metadata.campaign_id);
    } else {
      dismiss(n.id);
      if (setPage) setPage("dashboard");
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(0,0,0,.45)", backdropFilter: "blur(6px)", animation: "fadeUp .2s ease both" }}>
      <div style={{ width: "100%", maxWidth: 420, background: C.surface, borderRadius: 20, border: `1.5px solid ${ts.border}`, boxShadow: "0 32px 80px rgba(0,0,0,.18)", overflow: "hidden", animation: "fadeUp .25s ease both" }}>

        {/* Top accent bar */}
        <div style={{ height: 4, background: n.type === "campaign_approved" ? `linear-gradient(90deg, ${C.green}, #22C55E)` : `linear-gradient(90deg, ${C.red}, #EF4444)` }} />

        <div style={{ padding: "28px 28px 24px" }}>
          {/* Counter badge (multiple) */}
          {total > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.purple, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, padding: "3px 10px", borderRadius: 99 }}>
                {current + 1} of {total} notifications
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setCurrent(c => Math.max(0, c - 1))}
                  disabled={current === 0}
                  style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${C.border}`, background: current === 0 ? C.bg : C.surface, color: current === 0 ? C.faint : C.purple, cursor: current === 0 ? "default" : "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                <button
                  onClick={() => setCurrent(c => Math.min(total - 1, c + 1))}
                  disabled={current === total - 1}
                  style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${C.border}`, background: current === total - 1 ? C.bg : C.surface, color: current === total - 1 ? C.faint : C.purple, cursor: current === total - 1 ? "default" : "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
              </div>
            </div>
          )}

          {/* Icon + Title */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: ts.bg, border: `1.5px solid ${ts.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
              {ts.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>{n.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{n.message}</div>
            </div>
          </div>

          {/* Timestamp */}
          <div style={{ fontSize: 11, color: C.faint, marginBottom: 20 }}>
            {new Date(n.created_at).toLocaleString()}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            {n.type === "campaign_approved" && (
              <button
                onClick={handleCta}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                View Campaign →
              </button>
            )}
            {n.type === "campaign_rejected" && (
              <button
                onClick={handleCta}
                style={{ flex: 1, padding: "11px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                Go to Dashboard →
              </button>
            )}
            <button
              onClick={() => dismiss(n.id)}
              style={{ padding: "11px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              {total > 1 ? "Dismiss" : "Close"}
            </button>
            {total > 1 && (
              <button
                onClick={dismissAll}
                style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.faint, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
