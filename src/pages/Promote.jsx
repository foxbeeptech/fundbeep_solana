import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import {
  getMyCampaigns, getPlatformSetting,
  submitBadgeRequest, getMyBadgeRequests,
  boostCampaign, supabase,
} from "../supabase";
import { sendSol } from "../utils/solana";

const C = {
  purple:       "#6D28D9",
  purpleLight:  "#7C3AED",
  purpleDim:    "rgba(109,40,217,.08)",
  purpleBorder: "rgba(109,40,217,.2)",
  bg:           "#F5F3FF",
  surface:      "#FFFFFF",
  border:       "#DDD6FE",
  text:         "#1E0A4C",
  textSub:      "#4C1D95",
  muted:        "#6D28D9",
  faint:        "#8B5CF6",
  green:        "#15803D",
  greenDim:     "rgba(21,128,61,.1)",
  greenBorder:  "rgba(21,128,61,.25)",
  red:          "#B91C1C",
  redDim:       "rgba(185,28,28,.08)",
  gold:         "#D97706",
  goldDim:      "rgba(217,119,6,.08)",
  goldBorder:   "rgba(217,119,6,.25)",
};

// ── helpers ──────────────────────────────────────────────────────────────────

function Card({ children, style }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: "24px 28px", marginBottom: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SolBtn({ onClick, loading, disabled, children, color = C.purple }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        padding: "11px 24px", borderRadius: 9, border: "none",
        background: disabled || loading ? "#DDD6FE" : `linear-gradient(135deg, ${color}, ${color}dd)`,
        color: disabled || loading ? C.faint : "#fff",
        fontWeight: 800, fontSize: 14, cursor: disabled || loading ? "not-allowed" : "pointer",
        fontFamily: "inherit", transition: "opacity .15s",
      }}
    >
      {loading ? "Processing…" : children}
    </button>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending:  { bg: "rgba(217,119,6,.1)",  color: C.gold,  label: "⏳ Pending" },
    approved: { bg: C.greenDim,            color: C.green, label: "✅ Approved" },
    rejected: { bg: C.redDim,              color: C.red,   label: "❌ Rejected" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

// ── Feature Campaign tab ──────────────────────────────────────────────────────

function FeatureTab({ campaigns, settings, walletAddress, user }) {
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState(null);
  const [requests, setRequests]     = useState([]);

  const price  = parseFloat(settings.featured_slot_price_sol) || 0;
  const wallet = settings.featured_slot_wallet || "";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("feature_requests")
      .select("*, campaigns(title)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRequests(data || []))
      .catch(() => {});
  }, [user, msg]);

  async function handleSubmit() {
    if (!selectedId) return setMsg({ type: "error", text: "Select a campaign first." });
    if (!wallet)     return setMsg({ type: "error", text: "Feature wallet not configured by admin yet." });
    if (!price)      return setMsg({ type: "error", text: "Feature price not configured by admin yet." });
    setLoading(true); setMsg(null);
    try {
      const sig = await sendSol(walletAddress, wallet, price);
      const { error } = await supabase.from("feature_requests").insert({
        user_id: user.id, campaign_id: selectedId,
        tx_signature: sig, amount_sol: price,
      });
      if (error) throw error;
      setMsg({ type: "success", text: `Payment sent! Your feature request is under review. Tx: ${sig.slice(0,16)}…` });
      setSelectedId("");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Transaction failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>⭐</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 4 }}>Feature Your Campaign</div>
            <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.6 }}>
              Get your campaign pinned in the Featured section on the homepage. Reviewed and approved by our team within 24 hours.
            </div>
          </div>
        </div>

        <div style={{ background: C.goldDim, border: `1px solid ${C.goldBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.gold }}>
            Price: {price ? `${price} SOL` : "—"} &nbsp;·&nbsp; Wallet: {wallet ? `${wallet.slice(0,8)}…${wallet.slice(-6)}` : "Not set"}
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div style={{ color: C.faint, fontSize: 13 }}>You have no campaigns yet. Create one first.</div>
        ) : (
          <>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 6 }}>
              SELECT CAMPAIGN
            </label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 9,
                border: `1px solid ${C.border}`, background: C.bg,
                color: C.text, fontSize: 14, marginBottom: 16,
                fontFamily: "inherit", outline: "none",
              }}
            >
              <option value="">Choose a campaign</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>

            {msg && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                fontSize: 13, fontWeight: 600,
                background: msg.type === "success" ? C.greenDim : C.redDim,
                color: msg.type === "success" ? C.green : C.red,
                border: `1px solid ${msg.type === "success" ? C.greenBorder : "rgba(185,28,28,.2)"}`,
              }}>
                {msg.text}
              </div>
            )}

            <SolBtn onClick={handleSubmit} loading={loading} disabled={!selectedId || !price || !wallet} color={C.gold}>
              ⭐ Pay {price || "?"} SOL & Request Feature
            </SolBtn>
          </>
        )}
      </Card>

      {requests.length > 0 && (
        <Card>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 14 }}>My Feature Requests</div>
          {requests.map(r => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: `1px solid ${C.border}`,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{r.campaigns?.title || r.campaign_id}</div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>
                  {new Date(r.created_at).toLocaleDateString()} &nbsp;·&nbsp; {r.amount_sol} SOL
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

// ── Boost Campaign tab ────────────────────────────────────────────────────────

function BoostTab({ campaigns, settings, walletAddress, user }) {
  const [selectedId, setSelectedId] = useState("");
  const [duration, setDuration]     = useState(24);
  const [loading, setLoading]       = useState(false);
  const [msg, setMsg]               = useState(null);

  const price24 = parseFloat(settings.boost_24h_price_sol) || 0;
  const price48 = parseFloat(settings.boost_48h_price_sol) || 0;
  const wallet  = settings.platform_wallet || "";
  const price   = duration === 24 ? price24 : price48;

  async function handleBoost() {
    if (!selectedId) return setMsg({ type: "error", text: "Select a campaign first." });
    if (!wallet)     return setMsg({ type: "error", text: "Platform wallet not configured." });
    if (!price)      return setMsg({ type: "error", text: "Boost price not configured." });
    setLoading(true); setMsg(null);
    try {
      await sendSol(walletAddress, wallet, price);
      await boostCampaign(selectedId, user?.id || "", duration);
      setMsg({ type: "success", text: `Boost activated! Your campaign is pinned for ${duration} hours.` });
      setSelectedId("");
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Transaction failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 36, flexShrink: 0 }}>🚀</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 4 }}>Boost Your Campaign</div>
          <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.6 }}>
            Pin your campaign at the top of the Explore feed for 24 or 48 hours. Boosts activate instantly after payment.
          </div>
        </div>
      </div>

      {/* Duration selector */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        {[24, 48].map(h => (
          <button key={h} onClick={() => setDuration(h)} style={{
            flex: 1, padding: "12px 16px", borderRadius: 10,
            border: `2px solid ${duration === h ? C.purple : C.border}`,
            background: duration === h ? C.purpleDim : C.bg,
            cursor: "pointer", fontFamily: "inherit",
            transition: "all .15s",
          }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: duration === h ? C.purple : C.text }}>
              {h}h Boost
            </div>
            <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>
              {h === 24 ? (price24 ? `${price24} SOL` : "—") : (price48 ? `${price48} SOL` : "—")}
            </div>
          </button>
        ))}
      </div>

      {campaigns.length === 0 ? (
        <div style={{ color: C.faint, fontSize: 13 }}>You have no campaigns yet. Create one first.</div>
      ) : (
        <>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.textSub, display: "block", marginBottom: 6 }}>
            SELECT CAMPAIGN
          </label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: 9,
              border: `1px solid ${C.border}`, background: C.bg,
              color: C.text, fontSize: 14, marginBottom: 16,
              fontFamily: "inherit", outline: "none",
            }}
          >
            <option value="">Choose a campaign</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          {msg && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 14,
              fontSize: 13, fontWeight: 600,
              background: msg.type === "success" ? C.greenDim : C.redDim,
              color: msg.type === "success" ? C.green : C.red,
              border: `1px solid ${msg.type === "success" ? C.greenBorder : "rgba(185,28,28,.2)"}`,
            }}>
              {msg.text}
            </div>
          )}

          <SolBtn onClick={handleBoost} loading={loading} disabled={!selectedId || !price || !wallet}>
            🚀 Pay {price || "?"} SOL & Boost {duration}h
          </SolBtn>
        </>
      )}
    </Card>
  );
}

// ── Buy Blue Badge tab ────────────────────────────────────────────────────────

function BadgeTab({ settings, walletAddress, user }) {
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState(null);
  const [requests, setRequests] = useState([]);

  const price  = parseFloat(settings.badge_price_sol) || 0;
  const wallet = settings.badge_wallet || "";

  useEffect(() => {
    if (!user) return;
    getMyBadgeRequests(user.id).then(setRequests).catch(() => {});
  }, [user, msg]);

  const hasPending = requests.some(r => r.status === "pending");
  const hasActive  = requests.some(r => r.status === "approved");

  async function handleBuy() {
    if (!wallet) return setMsg({ type: "error", text: "Badge wallet not configured by admin yet." });
    if (!price)  return setMsg({ type: "error", text: "Badge price not configured by admin yet." });
    setLoading(true); setMsg(null);
    try {
      const sig = await sendSol(walletAddress, wallet, price);
      await submitBadgeRequest(user.id, sig, price);
      setMsg({ type: "success", text: `Payment sent! Your badge request is under review. Tx: ${sig.slice(0,16)}…` });
    } catch (e) {
      setMsg({ type: "error", text: e.message || "Transaction failed." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 36, flexShrink: 0 }}>🔵</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 4 }}>
              Buy Blue Verified Badge
            </div>
            <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.6 }}>
              Get a blue verified badge ✅ on your profile and campaigns. Valid for 30 days. Reviewed and approved by our team.
            </div>
          </div>
        </div>

        <div style={{ background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: "12px 16px", marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.purple }}>
            Price: {price ? `${price} SOL` : "—"} &nbsp;·&nbsp; Wallet: {wallet ? `${wallet.slice(0,8)}…${wallet.slice(-6)}` : "Not set"}
          </div>
        </div>

        <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px", marginBottom: 20, fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>
          <strong>What you get:</strong>
          <ul style={{ marginTop: 6, paddingLeft: 20 }}>
            <li>✅ Blue verified checkmark on your profile</li>
            <li>✅ Badge shown on all your campaigns</li>
            <li>✅ Higher trust with backers</li>
            <li>✅ 30-day validity</li>
          </ul>
        </div>

        {hasActive && (
          <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: C.greenDim, color: C.green, border: `1px solid ${C.greenBorder}`, fontSize: 13, fontWeight: 700 }}>
            ✅ You already have an active blue badge!
          </div>
        )}

        {hasPending && !hasActive && (
          <div style={{ padding: "10px 14px", borderRadius: 8, marginBottom: 14, background: C.goldDim, color: C.gold, border: `1px solid ${C.goldBorder}`, fontSize: 13, fontWeight: 700 }}>
            ⏳ Your badge request is pending review.
          </div>
        )}

        {msg && (
          <div style={{
            padding: "10px 14px", borderRadius: 8, marginBottom: 14,
            fontSize: 13, fontWeight: 600,
            background: msg.type === "success" ? C.greenDim : C.redDim,
            color: msg.type === "success" ? C.green : C.red,
            border: `1px solid ${msg.type === "success" ? C.greenBorder : "rgba(185,28,28,.2)"}`,
          }}>
            {msg.text}
          </div>
        )}

        <SolBtn
          onClick={handleBuy}
          loading={loading}
          disabled={hasPending || hasActive || !price || !wallet}
          color="#2563EB"
        >
          🔵 Pay {price || "?"} SOL & Request Badge
        </SolBtn>
      </Card>

      {requests.length > 0 && (
        <Card>
          <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 14 }}>My Badge Requests</div>
          {requests.map(r => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 0", borderBottom: `1px solid ${C.border}`,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Blue Verified Badge</div>
                <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>
                  {new Date(r.created_at).toLocaleDateString()} &nbsp;·&nbsp; {r.amount_sol} SOL
                  {r.note && <span style={{ marginLeft: 8, color: C.red }}>({r.note})</span>}
                </div>
              </div>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

// ── Main Promote page ─────────────────────────────────────────────────────────

export default function Promote() {
  const { user, walletAddress } = useWallet();
  const [tab, setTab]           = useState("feature");
  const [campaigns, setCampaigns] = useState([]);
  const [settings, setSettings]   = useState({});
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const keys = [
      "featured_slot_price_sol", "featured_slot_wallet",
      "boost_24h_price_sol", "boost_48h_price_sol", "platform_wallet",
      "badge_price_sol", "badge_wallet",
    ];
    Promise.all([
      user ? getMyCampaigns(user.id) : Promise.resolve([]),
      Promise.all(keys.map(k => getPlatformSetting(k).then(v => [k, v]).catch(() => [k, null]))),
    ]).then(([camps, pairs]) => {
      setCampaigns(camps);
      setSettings(Object.fromEntries(pairs));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user]);

  if (!walletAddress) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, minHeight: "80vh" }}>
        <div style={{ textAlign: "center", maxWidth: 360 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🚀</div>
          <div style={{ fontWeight: 900, fontSize: 22, color: C.text, marginBottom: 8 }}>Connect Your Wallet</div>
          <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>Connect your Phantom wallet to access promotion tools.</div>
        </div>
      </div>
    );
  }

  const TABS = [
    { key: "feature", icon: "⭐", label: "Feature Campaign" },
    { key: "boost",   icon: "🚀", label: "Boost Campaign" },
    { key: "badge",   icon: "🔵", label: "Buy Blue Badge" },
  ];

  return (
    <div style={{ padding: "32px 40px", maxWidth: 760, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontWeight: 900, fontSize: 26, color: C.text, marginBottom: 6 }}>🚀 Promote</h1>
        <p style={{ color: C.muted, fontSize: 14 }}>Increase visibility and credibility for your campaigns.</p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 28,
        background: "#EDE9FE", padding: 5, borderRadius: 12,
      }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: "10px 12px", borderRadius: 9, border: "none",
            cursor: "pointer", fontFamily: "inherit", fontWeight: 700, fontSize: 13,
            background: tab === t.key ? C.surface : "transparent",
            color: tab === t.key ? C.purple : "#7C3AED",
            boxShadow: tab === t.key ? "0 1px 4px rgba(0,0,0,.1)" : "none",
            transition: "all .15s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60, color: C.faint, fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {tab === "feature" && <FeatureTab campaigns={campaigns} settings={settings} walletAddress={walletAddress} user={user} />}
          {tab === "boost"   && <BoostTab   campaigns={campaigns} settings={settings} walletAddress={walletAddress} user={user} />}
          {tab === "badge"   && <BadgeTab   settings={settings}   walletAddress={walletAddress} user={user} />}
        </>
      )}
    </div>
  );
}
