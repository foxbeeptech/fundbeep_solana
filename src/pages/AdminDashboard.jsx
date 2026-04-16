import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import {
  adminGetAllCampaigns, adminApproveCampaign, adminRejectCampaign,
  adminPauseCampaign, adminGetAllUsers, adminVerifyUser,
  getPlatformStats, getAdminLogs,
  adminGetBadgeRequests, adminApproveBadge, adminRejectBadge,
  getPlatformSetting, setPlatformSetting,
  getFeaturedCampaigns, adminSetFeatured, adminUnsetFeatured,
  adminGetFeatureRequests, adminApproveFeatureRequest, adminRejectFeatureRequest,
  adminGrantBadge, adminRevokeBadge, adminSetPostLimit, adminBoostCampaign, adminUnboostCampaign,
  adminGetReports, adminReviewReport,
  adminGrantKyc, adminRevokeKyc, adminGrantOrg, adminRevokeOrg,
  adminUpdateCampaign, adminAddContribution, deleteCampaign,
  adminGetAllCreators, adminGetAllContributions,
} from "../supabase";

const C = {
  bg:           "#F5F3FF",
  surface:      "#FFFFFF",
  panel:        "#EDE9FE",
  border:       "#DDD6FE",
  borderHover:  "#C4B5FD",
  text:         "#1E0A4C",
  sub:          "#4C1D95",
  muted:        "#6B7280",
  faint:        "#9CA3AF",
  purple:       "#6D28D9",
  purpleLight:  "#7C3AED",
  purpleSoft:   "rgba(109,40,217,.07)",
  purpleBorder: "rgba(109,40,217,.2)",
  purpleDim:    "rgba(109,40,217,.07)",
  purpleBright: "#7C3AED",
  green:        "#15803D",
  greenDim:     "rgba(21,128,61,.08)",
  greenBorder:  "rgba(21,128,61,.2)",
  amber:        "#92400E",
  amberDim:     "rgba(146,64,14,.06)",
  amberBorder:  "rgba(146,64,14,.18)",
  red:          "#B91C1C",
  redDim:       "rgba(185,28,28,.06)",
  redBorder:    "rgba(185,28,28,.15)",
  yellow:       "#6D28D9",
  yellowLight:  "#7C3AED",
  yellowDim:    "rgba(109,40,217,.07)",
  yellowBorder: "rgba(109,40,217,.2)",
  surfaceHover: "#F5F3FF",
  card:         "#FFFFFF",
  textSub:      "#4C1D95",
};

const SOL_USD = 148;
const toUSD = (s) => (s * SOL_USD).toLocaleString("en-US", { maximumFractionDigits: 0 });
const short = (a) => a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "—";

const Spinner = ({ color = "#fff", size = 14 }) => (
  <span style={{ width: size, height: size, border: `2px solid rgba(109,40,217,.12)`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite", flexShrink: 0 }} />
);

function StatusBadge({ status }) {
  const map = {
    pending:   { color: C.purple, bg: C.purpleSoft, label: "⏳ Pending" },
    active:    { color: C.green, bg: C.greenDim, label: "✅ Active" },
    paused:    { color: C.muted, bg: C.faint, label: "⏸ Paused" },
    completed: { color: C.purpleBright, bg: C.purpleDim, label: "🎉 Completed" },
    rejected:  { color: C.red, bg: C.redDim, label: "❌ Rejected" },
  };
  const s = map[status] || map.pending;
  return <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.color}30`, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function RoleBadge({ role }) {
  const map = {
    superadmin: { color: C.purple, bg: C.purpleSoft },
    admin:      { color: C.purpleBright, bg: C.purpleDim },
    user:       { color: C.muted, bg: C.faint },
  };
  const s = map[role] || map.user;
  return <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 800, background: s.bg, color: s.color, textTransform: "uppercase", letterSpacing: 1 }}>{role}</span>;
}

// ── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ campaign, onClose, onRejected, adminId }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    await adminRejectCampaign(adminId, campaign.id, reason);
    onRejected(campaign.id, reason);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: C.surface, border: `1px solid ${C.red}30`, borderRadius: 20, padding: 28, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: 7, border: "none", background: C.faint, color: C.muted, cursor: "pointer" }}>✕</button>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>❌ Reject Campaign</div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>"{campaign.title}"</div>
        <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 6, letterSpacing: .5 }}>REASON FOR REJECTION</div>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Explain why this campaign is being rejected…" style={{ width: "100%", padding: "11px 14px", borderRadius: 10, background: "#F5F3FF", border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical", marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={handle} disabled={busy || !reason.trim()} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: C.red, color: "#fff", fontWeight: 800, cursor: busy || !reason.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {busy ? <Spinner /> : "Reject Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit Campaign Modal ───────────────────────────────────────────────────────
const CAMPAIGN_CATEGORIES = ["General","Education","Health","Environment","Arts","Technology","Community","Emergency","Animals","Sports"];
const CAMPAIGN_STATUSES   = ["pending","active","paused","completed","rejected"];

function EditCampaignModal({ campaign, onClose, onSaved }) {
  const [title,       setTitle]       = useState(campaign.title || "");
  const [description, setDescription] = useState(campaign.description || "");
  const [goalSol,     setGoalSol]     = useState(String(campaign.goal_sol || ""));
  const [category,    setCategory]    = useState(campaign.category || "General");
  const [status,      setStatus]      = useState(campaign.status || "active");
  const [endDate,     setEndDate]     = useState(campaign.end_date ? campaign.end_date.slice(0, 10) : "");
  const [emoji,       setEmoji]       = useState(campaign.image_emoji || "");
  const [wallet,      setWallet]      = useState(campaign.wallet || "");
  const [busy,        setBusy]        = useState(false);
  const [err,         setErr]         = useState("");

  const inputStyle = { width: "100%", padding: "10px 13px", borderRadius: 9, border: `1px solid ${C.border}`, background: "#F5F3FF", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const save = async () => {
    if (!title.trim()) return setErr("Title is required.");
    if (!goalSol || isNaN(goalSol) || +goalSol <= 0) return setErr("Enter a valid goal amount.");
    setBusy(true); setErr("");
    try {
      await adminUpdateCampaign(campaign.id, {
        title: title.trim(), description: description.trim(),
        goal_sol: parseFloat(goalSol), category, status,
        end_date: endDate || "", image_emoji: emoji.trim(), wallet: wallet.trim(),
      });
      onSaved({ ...campaign, title: title.trim(), description: description.trim(), goal_sol: parseFloat(goalSol), category, status, end_date: endDate || null, image_emoji: emoji.trim(), wallet: wallet.trim() });
      onClose();
    } catch (e) { setErr(e.message || "Save failed."); }
    setBusy(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", background: C.surface, border: `1px solid ${C.purpleBorder}`, borderRadius: 20, padding: 28, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: 7, border: "none", background: "#EDE9FE", color: C.muted, cursor: "pointer", fontWeight: 700 }}>✕</button>
        <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4 }}>✏️ Edit Campaign</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>ID: {campaign.id}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Title</div>
            <input value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Description</div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Goal (SOL)</div>
              <input type="number" value={goalSol} onChange={e => setGoalSol(e.target.value)} min="0.01" step="0.1" style={inputStyle} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Emoji</div>
              <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🎯" style={inputStyle} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Category</div>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                {CAMPAIGN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Status</div>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inputStyle}>
                {CAMPAIGN_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>End Date</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Receiving Wallet</div>
            <input value={wallet} onChange={e => setWallet(e.target.value)} placeholder="Solana wallet address" style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} />
          </div>
        </div>

        {err && <div style={{ marginTop: 14, fontSize: 13, color: C.red, background: C.redDim, padding: "8px 12px", borderRadius: 8 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.purple},${C.purpleBright})`, color: "#fff", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {busy ? <><Spinner color="#fff" size={13} /> Saving…</> : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Contribution Modal ────────────────────────────────────────────────────
function AddContributionModal({ campaign, onClose, onAdded }) {
  const [wallet, setWallet]   = useState("");
  const [amount, setAmount]   = useState("");
  const [busy,   setBusy]     = useState(false);
  const [done,   setDone]     = useState(false);
  const [err,    setErr]      = useState("");

  const inputStyle = { width: "100%", padding: "10px 13px", borderRadius: 9, border: `1px solid ${C.border}`, background: "#F5F3FF", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

  const submit = async () => {
    if (!amount || isNaN(amount) || +amount <= 0) return setErr("Enter a valid SOL amount.");
    setBusy(true); setErr("");
    try {
      const contrib = await adminAddContribution(campaign.id, wallet.trim(), parseFloat(amount), "");
      onAdded(contrib, parseFloat(amount));
      setDone(true);
    } catch (e) { setErr(e.message || "Failed to add contribution."); }
    setBusy(false);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: C.surface, border: `1px solid ${C.purpleBorder}`, borderRadius: 20, padding: 28, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, width: 28, height: 28, borderRadius: 7, border: "none", background: "#EDE9FE", color: C.muted, cursor: "pointer", fontWeight: 700 }}>✕</button>
        {done ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text, marginBottom: 6 }}>Contribution Added</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{amount} SOL added to "{campaign.title}"</div>
            <button onClick={onClose} style={{ padding: "9px 28px", borderRadius: 10, border: "none", background: C.purple, color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 900, fontSize: 17, color: C.text, marginBottom: 4 }}>💸 Add Contribution</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 20 }}>Manually record a confirmed contribution for "{campaign.title}"</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Contributor Wallet (optional)</div>
                <input value={wallet} onChange={e => setWallet(e.target.value)} placeholder="Leave blank for anonymous" style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: .5 }}>Amount (SOL)</div>
                <div style={{ position: "relative" }}>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0.001" step="0.001" placeholder="0.00" style={{ ...inputStyle, paddingRight: 52 }} />
                  <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.faint }}>SOL</span>
                </div>
              </div>
            </div>
            {err && <div style={{ marginTop: 12, fontSize: 13, color: C.red, background: C.redDim, padding: "8px 12px", borderRadius: 8 }}>{err}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={submit} disabled={busy} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: `linear-gradient(135deg,${C.green},#22C55E)`, color: "#fff", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                {busy ? <><Spinner color="#fff" size={13} /> Adding…</> : "✅ Add Contribution"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab: Campaigns ────────────────────────────────────────────────────────────
function CampaignsTab({ adminId }) {
  const [campaigns, setCampaigns]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all");
  const [rejectTarget, setRejectTarget]   = useState(null);
  const [editTarget,   setEditTarget]     = useState(null);
  const [contribTarget, setContribTarget] = useState(null);
  const [busyId, setBusyId]         = useState(null);
  const [boostHours, setBoostHours] = useState({}); // campaignId → hours

  useEffect(() => {
    adminGetAllCampaigns().then(d => { setCampaigns(d); setLoading(false); });
  }, []);

  const approve = async (id) => {
    setBusyId(id);
    await adminApproveCampaign(adminId, id);
    setCampaigns(p => p.map(c => c.id === id ? { ...c, status: "active" } : c));
    setBusyId(null);
  };

  const pause = async (id) => {
    setBusyId(id);
    await adminPauseCampaign(adminId, id);
    setCampaigns(p => p.map(c => c.id === id ? { ...c, status: "paused" } : c));
    setBusyId(null);
  };

  const remove = async (id, title) => {
    if (!window.confirm(`Permanently delete "${title}"? This cannot be undone.`)) return;
    setBusyId(id + "_del");
    try {
      await deleteCampaign(id);
      setCampaigns(p => p.filter(c => c.id !== id));
    } catch (e) { alert(e.message); }
    setBusyId(null);
  };

  const onRejected = (id, reason) => {
    setCampaigns(p => p.map(c => c.id === id ? { ...c, status: "rejected", reject_reason: reason } : c));
  };

  const filtered = filter === "all" ? campaigns : campaigns.filter(c => c.status === filter);

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {["all", "pending", "active", "paused", "completed", "rejected", "cancelled"].map(f => {
          const count = f === "all" ? campaigns.length : campaigns.filter(c => c.status === f).length;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 99, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", background: filter === f ? C.purpleSoft : "transparent", border: `1px solid ${filter === f ? C.purpleBorder : C.border}`, color: filter === f ? C.purple : C.muted }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} <span style={{ opacity: .6 }}>({count})</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spinner color={C.purple} size={28} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No campaigns found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: C.panel, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{c.image_emoji}</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>by {c.creator_name || c.profiles?.full_name || "Unknown"} · {c.category}</div>
                  </div>
                </div>
                <StatusBadge status={c.status} />
              </div>

              <div style={{ fontSize: 13, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>{c.description}</div>

              <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.muted, marginBottom: 12, flexWrap: "wrap" }}>
                <span>🎯 Goal: <b style={{ color: C.text }}>{c.goal_sol} SOL</b></span>
                <span>💰 Raised: <b style={{ color: C.purple }}>{(+c.raised_sol || 0).toFixed(2)} SOL</b></span>
                <span>👥 Backers: <b style={{ color: C.text }}>{c.contributor_count || 0}</b></span>
                <span>📅 {new Date(c.created_at).toLocaleDateString()}</span>
              </div>

              <div style={{ fontFamily: "monospace", fontSize: 11, color: C.muted, marginBottom: 12 }}>
                Wallet: {c.wallet}
              </div>

              {c.reject_reason && (
                <div style={{ fontSize: 12, color: C.red, background: C.redDim, padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
                  Rejection reason: {c.reject_reason}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {/* Edit + Add Contribution */}
                <button onClick={() => setEditTarget(c)} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.purpleBorder}`, background: C.purpleSoft, color: C.purple, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                  ✏️ Edit
                </button>
                <button onClick={() => setContribTarget(c)} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(21,128,61,.3)", background: "rgba(21,128,61,.08)", color: C.green, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                  💸 Add Contribution
                </button>
                {c.status === "pending" && (
                  <>
                    <button onClick={() => approve(c.id)} disabled={busyId === c.id} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: C.green, color: "#000", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                      {busyId === c.id ? <Spinner color="#000" size={11} /> : "✅ Approve"}
                    </button>
                    <button onClick={() => setRejectTarget(c)} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: C.redDim, color: C.red, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>❌ Reject</button>
                  </>
                )}
                {c.status === "active" && (
                  <button onClick={() => pause(c.id)} disabled={busyId === c.id} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                    {busyId === c.id ? <Spinner size={11} /> : "⏸ Pause"}
                  </button>
                )}
                {c.status === "paused" && (
                  <button onClick={() => approve(c.id)} disabled={busyId === c.id} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: C.green, color: "#000", fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                    {busyId === c.id ? <Spinner color="#000" size={11} /> : "▶️ Reactivate"}
                  </button>
                )}
                {c.status === "rejected" && (
                  <button onClick={() => approve(c.id)} disabled={busyId === c.id} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: C.purpleSoft, color: C.purple, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    ↩️ Reconsider
                  </button>
                )}

                {/* Delete — always available to admin */}
                <button
                  onClick={() => remove(c.id, c.title)}
                  disabled={busyId === c.id + "_del"}
                  style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid rgba(185,28,28,.3)`, background: "rgba(185,28,28,.08)", color: C.red, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                  {busyId === c.id + "_del" ? <Spinner color={C.red} size={11} /> : "🗑 Delete"}
                </button>

                {/* Admin: Boost / Feature toggles */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
                  {c.is_boosted ? (
                    <button
                      onClick={async () => {
                        setBusyId(c.id + "_boost");
                        try { await adminUnboostCampaign(adminId, c.id); setCampaigns(p => p.map(x => x.id === c.id ? { ...x, is_boosted: false, boosted_until: null } : x)); }
                        catch (e) { alert(e.message); }
                        setBusyId(null);
                      }}
                      disabled={busyId === c.id + "_boost"}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(185,28,28,.25)", background: "rgba(185,28,28,.08)", color: C.red, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                      {busyId === c.id + "_boost" ? <Spinner color={C.red} size={11} /> : "✕ Stop Boost"}
                    </button>
                  ) : (
                    <>
                      <select
                        value={boostHours[c.id] || "24"}
                        onChange={e => setBoostHours(p => ({ ...p, [c.id]: e.target.value }))}
                        style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, fontFamily: "inherit", outline: "none" }}>
                        <option value="24">24h</option>
                        <option value="48">48h</option>
                        <option value="72">72h</option>
                        <option value="168">7d</option>
                      </select>
                      <button
                        onClick={async () => {
                          setBusyId(c.id + "_boost");
                          try { await adminBoostCampaign(adminId, c.id, parseInt(boostHours[c.id] || 24, 10)); setCampaigns(p => p.map(x => x.id === c.id ? { ...x, is_boosted: true } : x)); }
                          catch (e) { alert(e.message); }
                          setBusyId(null);
                        }}
                        disabled={busyId === c.id + "_boost"}
                        style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(245,158,11,.15)", color: "#D97706", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                        {busyId === c.id + "_boost" ? <Spinner color="#D97706" size={11} /> : "🚀 Boost"}
                      </button>
                    </>
                  )}
                  {c.is_featured ? (
                    <button
                      onClick={async () => {
                        setBusyId(c.id + "_feat");
                        try { await adminUnsetFeatured(adminId, c.id); setCampaigns(p => p.map(x => x.id === c.id ? { ...x, is_featured: false, featured_order: null } : x)); }
                        catch (e) { alert(e.message); }
                        setBusyId(null);
                      }}
                      disabled={busyId === c.id + "_feat"}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(185,28,28,.25)", background: "rgba(185,28,28,.08)", color: C.red, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                      {busyId === c.id + "_feat" ? <Spinner color={C.red} size={11} /> : "✕ Unfeature"}
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        setBusyId(c.id + "_feat");
                        try { await adminSetFeatured(adminId, c.id, 1, null); setCampaigns(p => p.map(x => x.id === c.id ? { ...x, is_featured: true, featured_order: 1 } : x)); }
                        catch (e) { alert(e.message); }
                        setBusyId(null);
                      }}
                      disabled={busyId === c.id + "_feat"}
                      style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "rgba(201,150,12,.12)", color: "#C9960C", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                      {busyId === c.id + "_feat" ? <Spinner color="#C9960C" size={11} /> : "⭐ Feature"}
                    </button>
                  )}
                  {/* KYC badge */}
                  <button
                    onClick={async () => {
                      setBusyId(c.id + "_kyc");
                      try {
                        if (c.kyc_verified) { await adminRevokeKyc(adminId, c.id); setCampaigns(p => p.map(x => x.id === c.id ? { ...x, kyc_verified: false } : x)); }
                        else { await adminGrantKyc(adminId, c.id); setCampaigns(p => p.map(x => x.id === c.id ? { ...x, kyc_verified: true } : x)); }
                      } catch (e) { alert(e.message); }
                      setBusyId(null);
                    }}
                    disabled={busyId === c.id + "_kyc"}
                    style={{ padding: "6px 12px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
                      border: c.kyc_verified ? "1px solid rgba(185,28,28,.25)" : "1px solid rgba(37,99,235,.25)",
                      background: c.kyc_verified ? "rgba(185,28,28,.08)" : "rgba(37,99,235,.08)",
                      color: c.kyc_verified ? C.red : "#1D4ED8",
                    }}>
                    {busyId === c.id + "_kyc" ? <Spinner color="#1D4ED8" size={11} /> : c.kyc_verified ? "✕ Revoke KYC" : "🪪 Grant KYC"}
                  </button>
                  {/* Org badge */}
                  <button
                    onClick={async () => {
                      setBusyId(c.id + "_org");
                      try {
                        if (c.org_verified) { await adminRevokeOrg(adminId, c.id); setCampaigns(p => p.map(x => x.id === c.id ? { ...x, org_verified: false } : x)); }
                        else { await adminGrantOrg(adminId, c.id); setCampaigns(p => p.map(x => x.id === c.id ? { ...x, org_verified: true } : x)); }
                      } catch (e) { alert(e.message); }
                      setBusyId(null);
                    }}
                    disabled={busyId === c.id + "_org"}
                    style={{ padding: "6px 12px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
                      border: c.org_verified ? "1px solid rgba(185,28,28,.25)" : "1px solid rgba(6,95,70,.25)",
                      background: c.org_verified ? "rgba(185,28,28,.08)" : "rgba(6,95,70,.08)",
                      color: c.org_verified ? C.red : "#065F46",
                    }}>
                    {busyId === c.id + "_org" ? <Spinner color="#065F46" size={11} /> : c.org_verified ? "✕ Revoke Org" : "🏢 Grant Org"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {rejectTarget  && <RejectModal campaign={rejectTarget} adminId={adminId} onClose={() => setRejectTarget(null)} onRejected={onRejected} />}
      {editTarget    && <EditCampaignModal campaign={editTarget} onClose={() => setEditTarget(null)} onSaved={saved => setCampaigns(p => p.map(c => c.id === saved.id ? saved : c))} />}
      {contribTarget && <AddContributionModal campaign={contribTarget} onClose={() => setContribTarget(null)} onAdded={(_, amt) => setCampaigns(p => p.map(c => c.id === contribTarget.id ? { ...c, raised_sol: (parseFloat(c.raised_sol) || 0) + amt, contributor_count: (c.contributor_count || 0) + 1 } : c))} />}
    </div>
  );
}

// ── Tab: Users ────────────────────────────────────────────────────────────────
function UsersTab({ adminId }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busyId, setBusyId]     = useState(null);
  const [search, setSearch]     = useState("");
  const [expandId, setExpandId] = useState(null); // which user row is expanded
  const [badgeDays, setBadgeDays]   = useState({}); // userId → days input
  const [postLimit, setPostLimit]   = useState({}); // userId → limit input

  useEffect(() => {
    adminGetAllUsers().then(d => { setUsers(d); setLoading(false); });
  }, []);

  const verify = async (id) => {
    setBusyId(id + "_verify");
    await adminVerifyUser(adminId, id);
    setUsers(p => p.map(u => u.id === id ? { ...u, is_verified: true } : u));
    setBusyId(null);
  };

  const grantBadge = async (u) => {
    const days = parseInt(badgeDays[u.id] || 30, 10);
    if (!days || days < 1) return;
    setBusyId(u.id + "_badge");
    try {
      await adminGrantBadge(adminId, u.id, days);
      const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      setUsers(p => p.map(x => x.id === u.id ? { ...x, is_verified: true, badge_expires_at: expiresAt } : x));
    } catch (e) { alert(e.message); }
    setBusyId(null);
  };

  const revokeBadge = async (id) => {
    setBusyId(id + "_revoke");
    try {
      await adminRevokeBadge(adminId, id);
      setUsers(p => p.map(u => u.id === id ? { ...u, is_verified: false, badge_expires_at: null } : u));
    } catch (e) { alert(e.message); }
    setBusyId(null);
  };

  const setPostLimitFn = async (u) => {
    const val = postLimit[u.id];
    setBusyId(u.id + "_limit");
    try {
      await adminSetPostLimit(adminId, u.id, val === "" ? null : val);
      setUsers(p => p.map(x => x.id === u.id ? { ...x, free_posts_override: val === "" ? null : parseInt(val, 10) } : x));
    } catch (e) { alert(e.message); }
    setBusyId(null);
  };

  const filtered = users.filter(u =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.wallet?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or wallet…"
        style={{ width: "100%", padding: "11px 16px", borderRadius: 10, background: "#F5F3FF", border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 18 }} />

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spinner color={C.purple} size={28} /></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(u => {
            const isOpen = expandId === u.id;
            return (
              <div key={u.id} style={{ background: C.surface, border: `1px solid ${isOpen ? C.purpleBorder : C.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color .15s" }}>
                {/* Row header */}
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, cursor: "pointer" }}
                  onClick={() => setExpandId(isOpen ? null : u.id)}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff" }}>
                      {u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
                        {u.full_name || "No name"}
                        {u.is_verified && <span style={{ fontSize: 12 }}>✅</span>}
                        {u.free_posts_override != null && <span style={{ fontSize: 10, background: C.purpleSoft, color: C.purple, padding: "1px 6px", borderRadius: 99, fontWeight: 700 }}>{u.free_posts_override}/mo</span>}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>{u.email}</div>
                      {u.wallet && <div style={{ fontFamily: "monospace", fontSize: 10, color: C.muted, marginTop: 2 }}>{short(u.wallet)}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <RoleBadge role={u.role} />
                    <div style={{ fontSize: 11, color: C.faint }}>Joined {new Date(u.created_at).toLocaleDateString()}</div>
                    <span style={{ fontSize: 12, color: C.faint }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded actions */}
                {isOpen && (
                  <div style={{ padding: "0 20px 18px", borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>

                    {/* Badge control */}
                    <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: C.textSub, marginBottom: 10 }}>🔵 BLUE BADGE</div>
                      {u.is_verified && u.badge_expires_at && (
                        <div style={{ fontSize: 11, color: C.green, marginBottom: 8 }}>
                          Active until {new Date(u.badge_expires_at).toLocaleDateString()}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          type="number" min="1" max="365"
                          value={badgeDays[u.id] ?? 30}
                          onChange={e => setBadgeDays(p => ({ ...p, [u.id]: e.target.value }))}
                          placeholder="Days"
                          style={{ width: 80, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}
                        />
                        <span style={{ fontSize: 12, color: C.muted }}>days</span>
                        <button onClick={() => grantBadge(u)} disabled={busyId === u.id + "_badge"}
                          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                          {busyId === u.id + "_badge" ? <Spinner color="#fff" size={11} /> : "🔵 Grant Badge"}
                        </button>
                        {u.is_verified && (
                          <button onClick={() => revokeBadge(u.id)} disabled={busyId === u.id + "_revoke"}
                            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(185,28,28,.3)", background: C.redDim, color: C.red, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                            {busyId === u.id + "_revoke" ? "…" : "Revoke"}
                          </button>
                        )}
                        {!u.is_verified && (
                          <button onClick={() => verify(u.id)} disabled={busyId === u.id + "_verify"}
                            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: C.greenDim, color: C.green, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                            {busyId === u.id + "_verify" ? <Spinner color={C.green} size={11} /> : "✅ Verify (no expiry)"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Post limit */}
                    <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: C.textSub, marginBottom: 4 }}>✦ EXPLORE POST LIMIT / MONTH</div>
                      <div style={{ fontSize: 11, color: C.faint, marginBottom: 10 }}>
                        Current: {u.free_posts_override != null ? <b style={{ color: C.purple }}>{u.free_posts_override}/month (admin override)</b> : "dynamic (age + campaigns)"}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          type="number" min="0" max="9999"
                          value={postLimit[u.id] ?? (u.free_posts_override ?? "")}
                          onChange={e => setPostLimit(p => ({ ...p, [u.id]: e.target.value }))}
                          placeholder="e.g. 50"
                          style={{ width: 100, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }}
                        />
                        <span style={{ fontSize: 12, color: C.muted }}>posts/month</span>
                        <button onClick={() => setPostLimitFn(u)} disabled={busyId === u.id + "_limit"}
                          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                          {busyId === u.id + "_limit" ? "…" : "Set Limit"}
                        </button>
                        {u.free_posts_override != null && (
                          <button onClick={() => { setPostLimit(p => ({ ...p, [u.id]: "" })); adminSetPostLimit(adminId, u.id, null).then(() => setUsers(p => p.map(x => x.id === u.id ? { ...x, free_posts_override: null } : x))); }}
                            style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                            Reset to Dynamic
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Activity Log ─────────────────────────────────────────────────────────
function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminLogs().then(d => { setLogs(d); setLoading(false); });
  }, []);

  const actionColor = { approve: C.green, reject: C.red, pause: C.muted, verify_user: C.purple };
  const actionIcon = { approve: "✅", reject: "❌", pause: "⏸", verify_user: "🔐", delete: "🗑" };

  return loading ? (
    <div style={{ textAlign: "center", padding: 60 }}><Spinner color={C.purple} size={28} /></div>
  ) : logs.length === 0 ? (
    <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No admin actions yet.</div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {logs.map(l => (
        <div key={l.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>{actionIcon[l.action] || "⚡"}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: actionColor[l.action] || C.text }}>
                {l.action.replace("_", " ").toUpperCase()}: {l.target_type}
              </div>
              <div style={{ fontSize: 11, color: C.muted }}>by {l.profiles?.full_name || l.profiles?.email || "Admin"}</div>
              {l.note && <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Note: {l.note}</div>}
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.faint }}>{new Date(l.created_at).toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

// ── Badge Requests Tab ───────────────────────────────────────────────────────
function BadgesTab({ adminId }) {
  const [requests, setRequests]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [subTab, setSubTab]         = useState("pending");
  const [busyId, setBusyId]         = useState(null);
  const [rejectId, setRejectId]     = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    adminGetBadgeRequests().then(d => { setRequests(d); setLoading(false); });
  }, []);

  const pending  = requests.filter(r => r.status === "pending");
  const approved = requests.filter(r => r.status === "approved");
  const rejected = requests.filter(r => r.status === "rejected");
  const shown    = subTab === "pending" ? pending : subTab === "approved" ? approved : rejected;

  const approve = async (r) => {
    if (!window.confirm(`Approve badge for ${r.profiles?.full_name || "this user"}? This grants them 30 days of verified status.`)) return;
    setBusyId(r.id);
    try {
      await adminApproveBadge(adminId, r.id, r.user_id);
      setRequests(p => p.map(x => x.id === r.id ? { ...x, status: "approved", reviewed_at: new Date().toISOString() } : x));
    } finally { setBusyId(null); }
  };

  const reject = async (r) => {
    setBusyId(r.id);
    try {
      await adminRejectBadge(adminId, r.id, r.user_id, rejectNote);
      setRequests(p => p.map(x => x.id === r.id ? { ...x, status: "rejected", note: rejectNote } : x));
      setRejectId(null); setRejectNote("");
    } finally { setBusyId(null); }
  };

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { key: "pending",  icon: "⏳", label: "Waiting Approval", list: pending },
          { key: "approved", icon: "✅", label: "Approved",          list: approved },
          { key: "rejected", icon: "❌", label: "Rejected",          list: rejected },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)}
            style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${subTab === t.key ? C.purple : C.border}`, background: subTab === t.key ? `${C.purple}15` : "transparent", color: subTab === t.key ? C.purple : C.muted, fontWeight: subTab === t.key ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7, transition: "all .15s" }}>
            {t.icon} {t.label}
            {t.list.length > 0 && (
              <span style={{ background: subTab === t.key ? C.purple : C.panel, color: subTab === t.key ? "#fff" : C.muted, borderRadius: 99, fontSize: 10, fontWeight: 800, padding: "1px 8px", minWidth: 20, textAlign: "center" }}>
                {t.list.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spinner color={C.purple} size={28} /></div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted, fontSize: 14 }}>
          {subTab === "pending" ? "🎉 No pending badge requests" : `No ${subTab} requests`}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {shown.map(r => (
            <div key={r.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px" }}>

              {/* User + amount row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                    {(r.profiles?.full_name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2 }}>
                      {r.profiles?.full_name || "Unknown User"}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>
                      {r.profiles?.wallet ? `${r.profiles.wallet.slice(0,10)}…${r.profiles.wallet.slice(-6)}` : "—"}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: C.purple }}>{r.amount_sol} SOL</div>
                  <div style={{ fontSize: 11, color: C.faint }}>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
              </div>

              {/* TX verification */}
              <div style={{ padding: "10px 14px", background: "#EDE9FE", border: `1px solid ${C.border}`, borderRadius: 9, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.muted }}>
                  <span style={{ fontWeight: 700, color: C.faint }}>TX: </span>
                  <span style={{ fontFamily: "monospace" }}>{r.tx_signature.slice(0, 24)}…</span>
                </div>
                <a href={`https://solscan.io/tx/${r.tx_signature}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: C.purple, fontWeight: 700, textDecoration: "none" }}>
                  Verify on Solscan ↗
                </a>
              </div>

              {/* Status info */}
              {r.note && (
                <div style={{ fontSize: 12, color: C.red, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
                  Rejection note: {r.note}
                </div>
              )}
              {r.status === "approved" && r.reviewed_at && (
                <div style={{ fontSize: 11, color: C.green, marginBottom: 12 }}>
                  ✓ Approved on {new Date(r.reviewed_at).toLocaleDateString()} · badge valid 30 days from this date
                </div>
              )}

              {/* Pending actions */}
              {r.status === "pending" && (
                rejectId === r.id ? (
                  <div>
                    <div style={{ fontSize: 11, color: C.faint, marginBottom: 6 }}>Reason for rejection (optional, user will see this):</div>
                    <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                      placeholder="e.g. Transaction not confirmed, duplicate request…"
                      rows={2}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#F5F3FF", color: C.text, fontFamily: "inherit", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setRejectId(null); setRejectNote(""); }}
                        style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                        Cancel
                      </button>
                      <button onClick={() => reject(r)} disabled={busyId === r.id}
                        style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", background: "rgba(239,68,68,.15)", color: "#EF4444", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1px solid rgba(239,68,68,.3)" }}>
                        {busyId === r.id ? <><Spinner color="#EF4444" size={11} /> Rejecting…</> : "❌ Confirm Rejection"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setRejectId(r.id)}
                      style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.08)", color: "#EF4444", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                      ❌ Reject
                    </button>
                    <button onClick={() => approve(r)} disabled={busyId === r.id}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.purple}, #9D5CF6)`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: busyId === r.id ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, boxShadow: "0 3px 14px rgba(109,40,217,.35)" }}>
                      {busyId === r.id ? <><Spinner color="#fff" size={12} /> Approving…</> : "✦ Approve Badge (+30 days)"}
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Feature Requests Tab ─────────────────────────────────────────────────────
function FeatureRequestsTab({ adminId }) {
  const [requests, setRequests]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [subTab, setSubTab]       = useState("pending");
  const [busyId, setBusyId]       = useState(null);
  const [rejectId, setRejectId]   = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = () => adminGetFeatureRequests().then(d => { setRequests(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const pending  = requests.filter(r => r.status === "pending");
  const approved = requests.filter(r => r.status === "approved");
  const rejected = requests.filter(r => r.status === "rejected");
  const shown = subTab === "pending" ? pending : subTab === "approved" ? approved : rejected;

  async function approve(r) {
    setBusyId(r.id);
    try { await adminApproveFeatureRequest(adminId, r.id, r.campaign_id, 1); await load(); }
    catch (e) { alert(e.message || "Error"); }
    finally { setBusyId(null); }
  }

  async function reject(r) {
    setBusyId(r.id);
    try { await adminRejectFeatureRequest(adminId, r.id, rejectNote); setRejectId(null); setRejectNote(""); await load(); }
    catch (e) { alert(e.message || "Error"); }
    finally { setBusyId(null); }
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 900, fontSize: 18, color: C.text, marginBottom: 4 }}>⭐ Feature Requests</div>
        <div style={{ fontSize: 13, color: C.muted }}>Review campaigns submitted for homepage featuring.</div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {[["pending", pending.length], ["approved", approved.length], ["rejected", rejected.length]].map(([k, cnt]) => (
          <button key={k} onClick={() => setSubTab(k)} style={{
            padding: "7px 16px", borderRadius: 8, border: `1px solid ${subTab === k ? C.purple : C.border}`,
            background: subTab === k ? C.purpleSoft : "transparent", color: subTab === k ? C.purple : C.muted,
            fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", textTransform: "capitalize",
          }}>
            {k} {cnt > 0 && <span style={{ background: subTab === k ? C.purple : C.border, color: subTab === k ? "#fff" : C.muted, borderRadius: 99, padding: "1px 6px", fontSize: 10, marginLeft: 4 }}>{cnt}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: C.faint }}>Loading…</div>
      ) : shown.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.faint, fontSize: 13 }}>No {subTab} requests</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {shown.map(r => (
            <div key={r.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 2 }}>
                    {r.campaigns?.title || r.campaign_id}
                  </div>
                  <div style={{ fontSize: 12, color: C.faint }}>
                    By: {r.profiles?.full_name || "—"} &nbsp;·&nbsp; {r.profiles?.wallet ? short(r.profiles.wallet) : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, fontSize: 18, color: C.purple }}>{r.amount_sol} SOL</div>
                  <div style={{ fontSize: 11, color: C.faint }}>{new Date(r.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div style={{ padding: "10px 14px", background: "#EDE9FE", border: `1px solid ${C.border}`, borderRadius: 9, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.muted }}>
                  <span style={{ fontWeight: 700, color: C.faint }}>TX: </span>
                  <span style={{ fontFamily: "monospace" }}>{r.tx_signature?.slice(0, 24)}…</span>
                </div>
                <a href={`https://solscan.io/tx/${r.tx_signature}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: 11, color: C.purple, fontWeight: 700, textDecoration: "none" }}>
                  Verify ↗
                </a>
              </div>
              {r.note && (
                <div style={{ fontSize: 12, color: C.red, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>
                  Rejection note: {r.note}
                </div>
              )}
              {r.status === "pending" && (
                rejectId === r.id ? (
                  <div>
                    <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)}
                      placeholder="Rejection reason (optional)…" rows={2}
                      style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#F5F3FF", color: C.text, fontFamily: "inherit", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 8 }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => { setRejectId(null); setRejectNote(""); }}
                        style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                        Cancel
                      </button>
                      <button onClick={() => reject(r)} disabled={busyId === r.id}
                        style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.08)", color: "#EF4444", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                        {busyId === r.id ? "Rejecting…" : "❌ Confirm Rejection"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setRejectId(r.id)}
                      style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid rgba(239,68,68,.3)", background: "rgba(239,68,68,.08)", color: "#EF4444", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                      ❌ Reject
                    </button>
                    <button onClick={() => approve(r)} disabled={busyId === r.id}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.purple}, #9D5CF6)`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: busyId === r.id ? "not-allowed" : "pointer", fontFamily: "inherit", boxShadow: "0 3px 14px rgba(109,40,217,.35)" }}>
                      {busyId === r.id ? "Approving…" : "⭐ Approve & Feature (Slot 1)"}
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Featured Tab ─────────────────────────────────────────────────────────────
function FeaturedTab({ adminId }) {
  const [featured, setFeatured]     = useState([null, null, null]); // slots 1-3
  const [allCampaigns, setAll]      = useState([]);
  const [loading, setLoading]       = useState(true);
  const [pickSlot, setPickSlot]     = useState(null); // which slot is being picked
  const [search, setSearch]         = useState("");
  const [until, setUntil]           = useState(""); // featured_until date
  const [busyId, setBusyId]         = useState(null);

  const load = async () => {
    const [feat, all] = await Promise.all([
      getFeaturedCampaigns(),
      adminGetAllCampaigns(),
    ]);
    const slots = [null, null, null];
    feat.forEach(c => { if (c.featured_order >= 1 && c.featured_order <= 3) slots[c.featured_order - 1] = c; });
    setFeatured(slots);
    setAll(all.filter(c => c.status === "active"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handlePin = async (campaign) => {
    setBusyId(campaign.id);
    const untilIso = until ? new Date(until).toISOString() : null;
    await adminSetFeatured(adminId, campaign.id, pickSlot, untilIso);
    setPickSlot(null); setSearch(""); setUntil("");
    await load();
    setBusyId(null);
  };

  const handleUnpin = async (campaign) => {
    if (!window.confirm(`Remove "${campaign.title}" from featured?`)) return;
    setBusyId(campaign.id);
    await adminUnsetFeatured(adminId, campaign.id);
    await load();
    setBusyId(null);
  };

  const searchResults = allCampaigns.filter(c =>
    !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.category?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  if (loading) return <div style={{ textAlign: "center", padding: 60 }}><Spinner color={C.purple} size={28} /></div>;

  return (
    <div>
      {/* Monetization info box */}
      <div style={{ background: "rgba(201,150,12,.07)", border: "1px solid rgba(201,150,12,.25)", borderRadius: 14, padding: "16px 20px", marginBottom: 28, display: "flex", gap: 14, alignItems: "flex-start" }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>💰</span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#78580A", marginBottom: 4 }}>Monetization: Charge for Featured Slots</div>
          <div style={{ fontSize: 13, color: "#92400E", lineHeight: 1.65 }}>
            Featured campaigns appear prominently on the homepage. You can charge creators a SOL fee (via badge-style payment) before pinning their campaign. Set a "Featured Slot" price in Settings, collect the payment, then pin here. Slots auto-expire on the date you choose.
          </div>
        </div>
      </div>

      {/* 3 slots */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16, marginBottom: 32 }}>
        {featured.map((c, i) => (
          <div key={i} style={{ border: `2px dashed ${c ? "rgba(201,150,12,.4)" : C.border}`, borderRadius: 16, overflow: "hidden", background: c ? C.surface : "#FAFBFF", transition: "all .2s" }}>
            {/* Slot header */}
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: c ? "rgba(201,150,12,.06)" : C.bg }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 900, fontSize: 16, color: c ? "#C9960C" : C.faint }}>⭐</span>
                <span style={{ fontWeight: 800, fontSize: 13, color: c ? "#78580A" : C.muted }}>Featured Slot {i + 1}</span>
              </div>
              {c ? (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#15803D", background: "rgba(21,128,61,.1)", borderRadius: 99, padding: "2px 9px" }}>● LIVE</span>
              ) : (
                <span style={{ fontSize: 10, fontWeight: 700, color: C.faint, background: C.border, borderRadius: 99, padding: "2px 9px" }}>EMPTY</span>
              )}
            </div>

            {c ? (
              /* Filled slot */
              <div style={{ padding: "16px" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: c.image_url ? `url(${c.image_url}) center/cover` : `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {!c.image_url && (c.emoji || "🎯")}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{c.category} · {(+c.raised_sol || 0).toFixed(2)} / {(+c.goal_sol || 0).toFixed(1)} SOL</div>
                  </div>
                </div>
                {c.featured_until && (
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 10 }}>
                    ⏱ Expires: {new Date(c.featured_until).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setPickSlot(i + 1)}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                    ↩ Replace
                  </button>
                  <button onClick={() => handleUnpin(c)} disabled={busyId === c.id}
                    style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(185,28,28,.2)", background: "rgba(185,28,28,.06)", color: C.red, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                    {busyId === c.id ? <Spinner color={C.red} size={11} /> : "✕ Unpin"}
                  </button>
                </div>
              </div>
            ) : (
              /* Empty slot */
              <div style={{ padding: "28px 16px", textAlign: "center" }}>
                <div style={{ fontSize: 32, marginBottom: 10, opacity: .35 }}>📌</div>
                <div style={{ fontSize: 13, color: C.faint, marginBottom: 14 }}>No campaign pinned</div>
                <button onClick={() => setPickSlot(i + 1)}
                  style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                  + Pin a Campaign
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pick campaign modal */}
      {pickSlot !== null && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => { setPickSlot(null); setSearch(""); setUntil(""); }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 500, background: C.surface, borderRadius: 20, border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(109,40,217,.15)", overflow: "hidden" }}>
            <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Pin to Featured Slot {pickSlot}</div>
              <button onClick={() => { setPickSlot(null); setSearch(""); setUntil(""); }} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: "16px 22px 20px" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search active campaigns…"
                style={{ width: "100%", padding: "10px 14px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 12 }} />

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 6, letterSpacing: .5 }}>FEATURE UNTIL (optional)</div>
                <input type="date" value={until} onChange={e => setUntil(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  style={{ padding: "9px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit", width: "100%", boxSizing: "border-box" }} />
                <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>Leave blank to feature indefinitely</div>
              </div>

              <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {searchResults.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 20, color: C.muted, fontSize: 13 }}>No active campaigns found</div>
                ) : searchResults.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "#FAFBFF" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: c.image_url ? `url(${c.image_url}) center/cover` : `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                      {!c.image_url && (c.emoji || "🎯")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{c.category} · {(+c.raised_sol || 0).toFixed(2)} SOL raised</div>
                    </div>
                    {c.is_featured ? (
                      <span style={{ fontSize: 11, color: "#C9960C", fontWeight: 700, flexShrink: 0 }}>⭐ Slot {c.featured_order}</span>
                    ) : (
                      <button onClick={() => handlePin(c)} disabled={busyId === c.id}
                        style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}>
                        {busyId === c.id ? <Spinner size={11} /> : "📌 Pin"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Creators ─────────────────────────────────────────────────────────────
function CreatorsTab({ adminId }) {
  const [creators, setCreators] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [expandId, setExpandId] = useState(null);
  const [busyId, setBusyId]     = useState(null);
  const [badgeDays, setBadgeDays] = useState({});

  useEffect(() => {
    adminGetAllCreators().then(d => { setCreators(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const grantBadge = async (u) => {
    const days = parseInt(badgeDays[u.id] || 30, 10);
    if (!days || days < 1) return;
    setBusyId(u.id + "_badge");
    try {
      await adminGrantBadge(adminId, u.id, days);
      const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      setCreators(p => p.map(x => x.id === u.id ? { ...x, is_verified: true, badge_expires_at: expiresAt } : x));
    } catch (e) { alert(e.message); }
    setBusyId(null);
  };

  const revokeBadge = async (id) => {
    setBusyId(id + "_revoke");
    try {
      await adminRevokeBadge(adminId, id);
      setCreators(p => p.map(u => u.id === id ? { ...u, is_verified: false, badge_expires_at: null } : u));
    } catch (e) { alert(e.message); }
    setBusyId(null);
  };

  const statusColor = { active: C.green, pending: C.purple, paused: C.muted, completed: C.purpleBright, rejected: C.red, draft: "#2563EB", cancelled: C.red };

  const filtered = creators.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.wallet?.toLowerCase().includes(search.toLowerCase())
  );

  const totalRaisedAll = creators.reduce((s, u) => s + (u.campaigns || []).reduce((ss, c) => ss + (+c.raised_sol || 0), 0), 0);

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Creators", val: creators.length, color: C.purple },
          { label: "Total Campaigns", val: creators.reduce((s, u) => s + (u.campaigns?.length || 0), 0), color: C.purpleBright },
          { label: "Total SOL Raised", val: `${totalRaisedAll.toFixed(2)} ◎`, color: C.green },
          { label: "Verified Creators", val: creators.filter(u => u.is_verified).length, color: "#2563EB" },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search creator by name, email or wallet…"
        style={{ width: "100%", padding: "11px 16px", borderRadius: 10, background: "#F5F3FF", border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 16 }} />

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spinner color={C.purple} size={28} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No creators found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(u => {
            const isOpen = expandId === u.id;
            const totalRaised = (u.campaigns || []).reduce((s, c) => s + (+c.raised_sol || 0), 0);
            const active = (u.campaigns || []).filter(c => c.status === "active").length;
            return (
              <div key={u.id} style={{ background: C.surface, border: `1px solid ${isOpen ? C.purpleBorder : C.border}`, borderRadius: 14, overflow: "hidden", transition: "border-color .15s" }}>
                {/* Row header */}
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, cursor: "pointer" }}
                  onClick={() => setExpandId(isOpen ? null : u.id)}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                      {u.full_name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 7 }}>
                        {u.full_name || "No name"}
                        {u.is_verified && <span title="Verified">✅</span>}
                        <RoleBadge role={u.role || "user"} />
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{u.email}</div>
                      {u.wallet && <div style={{ fontFamily: "monospace", fontSize: 10, color: C.faint, marginTop: 2 }}>{u.wallet.slice(0,6)}…{u.wallet.slice(-6)}</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>{totalRaised.toFixed(2)} ◎</div>
                      <div style={{ fontSize: 10, color: C.faint }}>raised</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.purple }}>{u.campaigns?.length || 0}</div>
                      <div style={{ fontSize: 10, color: C.faint }}>campaigns</div>
                    </div>
                    {active > 0 && <span style={{ fontSize: 10, background: "rgba(21,128,61,.12)", color: C.green, padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>{active} active</span>}
                    <span style={{ fontSize: 12, color: C.faint }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Campaigns list */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 12, color: C.textSub, marginBottom: 10, textTransform: "uppercase", letterSpacing: .5 }}>Campaigns</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {(u.campaigns || []).map(c => (
                          <div key={c.id} style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <span style={{ fontSize: 18 }}>{c.image_emoji || "◈"}</span>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{c.title}</div>
                                <div style={{ fontSize: 11, color: C.faint }}>{new Date(c.created_at).toLocaleDateString()}</div>
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>{(+c.raised_sol || 0).toFixed(2)} / {c.goal_sol} ◎</span>
                              <span style={{ fontSize: 11, color: C.faint }}>{c.contributor_count || 0} backers</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[c.status] || C.muted, background: `${statusColor[c.status] || C.muted}18`, padding: "2px 8px", borderRadius: 99 }}>{c.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Badge control */}
                    <div style={{ background: C.bg, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: C.textSub, marginBottom: 8 }}>🔵 VERIFIED BADGE</div>
                      {u.is_verified && u.badge_expires_at && (
                        <div style={{ fontSize: 11, color: C.green, marginBottom: 8 }}>Active until {new Date(u.badge_expires_at).toLocaleDateString()}</div>
                      )}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input type="number" min="1" max="365" value={badgeDays[u.id] ?? 30}
                          onChange={e => setBadgeDays(p => ({ ...p, [u.id]: e.target.value }))}
                          style={{ width: 70, padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
                        <span style={{ fontSize: 12, color: C.muted }}>days</span>
                        <button onClick={() => grantBadge(u)} disabled={busyId === u.id + "_badge"}
                          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#2563EB,#3B82F6)", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                          {busyId === u.id + "_badge" ? <Spinner color="#fff" size={11} /> : "🔵 Grant Badge"}
                        </button>
                        {u.is_verified && (
                          <button onClick={() => revokeBadge(u.id)} disabled={busyId === u.id + "_revoke"}
                            style={{ padding: "7px 12px", borderRadius: 8, border: `1px solid rgba(185,28,28,.3)`, background: C.redDim, color: C.red, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                            {busyId === u.id + "_revoke" ? "…" : "Revoke"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Contributors ──────────────────────────────────────────────────────────
function ContributorsTab() {
  const [contributions, setContributions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState("");
  const [campaignFilter, setCampaignFilter] = useState("all");

  useEffect(() => {
    adminGetAllContributions().then(d => { setContributions(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const campaigns = [...new Map(contributions.map(c => [c.campaign_id, c.campaigns])).entries()]
    .map(([id, info]) => ({ id, title: info?.title || id }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const filtered = contributions.filter(c => {
    if (campaignFilter !== "all" && c.campaign_id !== campaignFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.wallet_from?.toLowerCase().includes(q) || c.campaigns?.title?.toLowerCase().includes(q);
    }
    return true;
  });

  const totalSol = filtered.reduce((s, c) => s + (+c.amount_sol || 0), 0);
  const uniqueWallets = new Set(filtered.map(c => c.wallet_from).filter(Boolean)).size;

  return (
    <div>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total Contributions", val: filtered.length, color: C.purple },
          { label: "Unique Contributors", val: uniqueWallets, color: C.purpleBright },
          { label: "Total SOL", val: `${totalSol.toFixed(3)} ◎`, color: C.green },
          { label: "Avg per Contribution", val: filtered.length ? `${(totalSol / filtered.length).toFixed(3)} ◎` : "—", color: C.amber },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by wallet or campaign…"
          style={{ flex: 1, minWidth: 200, padding: "10px 14px", borderRadius: 10, background: "#F5F3FF", border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
        <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
          style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: "#F5F3FF", color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit", maxWidth: 260 }}>
          <option value="all">All Campaigns</option>
          {campaigns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 60 }}><Spinner color={C.purple} size={28} /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No contributions found.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(c => (
            <div key={c.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(21,128,61,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {c.campaigns?.image_emoji || "◎"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
                    {(+c.amount_sol || 0).toFixed(4)} SOL
                    <span style={{ fontSize: 11, color: C.muted, fontWeight: 400, marginLeft: 8 }}>≈ ${((+c.amount_sol || 0) * 148).toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.purple, fontWeight: 600 }}>{c.campaigns?.title || "Unknown Campaign"}</div>
                  {c.wallet_from ? (
                    <div style={{ fontFamily: "monospace", fontSize: 10, color: C.faint, marginTop: 2 }}>{c.wallet_from.slice(0,6)}…{c.wallet_from.slice(-6)}</div>
                  ) : (
                    <div style={{ fontSize: 10, color: C.faint, marginTop: 2 }}>Anonymous</div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, color: C.muted }}>{new Date(c.created_at).toLocaleString()}</div>
                {c.tx_signature ? (
                  <a href={`https://solscan.io/tx/${c.tx_signature}`} target="_blank" rel="noreferrer"
                    style={{ fontSize: 11, color: C.purpleBright, fontFamily: "monospace", background: C.purpleSoft, padding: "3px 9px", borderRadius: 7, textDecoration: "none", whiteSpace: "nowrap" }}>
                    {c.tx_signature.slice(0, 8)}… ↗
                  </a>
                ) : (
                  <span style={{ fontSize: 11, color: C.faint, background: "rgba(0,0,0,.04)", padding: "3px 9px", borderRadius: 7 }}>Admin</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {contributions.length >= 500 && (
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: C.faint }}>Showing latest 500 contributions</div>
      )}
    </div>
  );
}

// ── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const [badgePrice,      setBadgePrice]      = useState("");
  const [badgeWallet,     setBadgeWallet]     = useState("");
  const [pointPrice,      setPointPrice]      = useState("0.02");
  const [platformWallet,  setPlatformWallet]  = useState("");
  const [boost24Price,    setBoost24Price]    = useState("0.05");
  const [boost48Price,    setBoost48Price]    = useState("0.10");
  const [liveFeedEnabled,    setLiveFeedEnabled]    = useState(true);
  const [featuredSlotPrice,  setFeaturedSlotPrice]  = useState("1.0");
  const [featuredSlotWallet, setFeaturedSlotWallet] = useState("");
  const [kycPrice,           setKycPrice]           = useState("0.5");
  const [kycOrgPrice,        setKycOrgPrice]        = useState("1.0");
  const [kycTelegram,        setKycTelegram]        = useState("fundbeep");
  const [showContributions,  setShowContributions]  = useState(true);
  const [socialTelegram,     setSocialTelegram]     = useState("");
  const [socialTwitter,      setSocialTwitter]      = useState("");
  // Smart Contract settings
  const [contractAdminWallet, setContractAdminWallet] = useState("6coG2GcQV1uAkuzHFMqYAk5piGrn2ivoMeAcSQEMHQ56");
  const [contractListingFee,  setContractListingFee]  = useState("0.05");
  const [contributionFeeBps,  setContributionFeeBps]  = useState("50");
  const [claimFeeM1Bps,       setClaimFeeM1Bps]       = useState("200");
  const [claimFeeM2Bps,       setClaimFeeM2Bps]       = useState("200");
  const [claimFeeM3Bps,       setClaimFeeM3Bps]       = useState("200");
  const [claimFeeFinalbps,    setClaimFeeFinalbps]    = useState("200");
  const [saving, setSaving]                   = useState(false);
  const [saved,  setSaved]                    = useState(false);
  const [loading, setLoading]                 = useState(true);

  useEffect(() => {
    Promise.all([
      getPlatformSetting("badge_price_sol"),
      getPlatformSetting("badge_wallet"),
      getPlatformSetting("post_point_price_sol"),
      getPlatformSetting("platform_wallet"),
      getPlatformSetting("boost_24h_price_sol"),
      getPlatformSetting("boost_48h_price_sol"),
      getPlatformSetting("live_feed_enabled"),
      getPlatformSetting("featured_slot_price_sol"),
      getPlatformSetting("featured_slot_wallet"),
      getPlatformSetting("kyc_price_sol"),
      getPlatformSetting("kyc_org_price_sol"),
      getPlatformSetting("kyc_telegram"),
      getPlatformSetting("show_contributions"),
      getPlatformSetting("social_telegram"),
      getPlatformSetting("social_twitter"),
      getPlatformSetting("contract_admin_wallet"),
      getPlatformSetting("contract_listing_fee_sol"),
      getPlatformSetting("contract_contribution_fee_bps"),
      getPlatformSetting("contract_claim_fee_m1_bps"),
      getPlatformSetting("contract_claim_fee_m2_bps"),
      getPlatformSetting("contract_claim_fee_m3_bps"),
      getPlatformSetting("contract_claim_fee_final_bps"),
    ]).then(([price, wallet, pprice, pw, b24, b48, lfe, fsp, fsw, kp, kop, ktg, sc, stg, stw, caw, clf, cfb, m1, m2, m3, mf]) => {
      setBadgePrice(price || "0.5");
      setBadgeWallet(wallet || "");
      setPointPrice(pprice || "0.02");
      setPlatformWallet(pw || "");
      setBoost24Price(b24 || "0.05");
      setBoost48Price(b48 || "0.10");
      setLiveFeedEnabled(lfe === null ? true : lfe !== "false");
      setFeaturedSlotPrice(fsp || "1.0");
      setFeaturedSlotWallet(fsw || "");
      setKycPrice(kp || "0.5");
      setKycOrgPrice(kop || "1.0");
      setKycTelegram(ktg || "fundbeep");
      setShowContributions(sc === null ? true : sc !== "false");
      setSocialTelegram(stg || "");
      setSocialTwitter(stw || "");
      setContractAdminWallet(caw || "6coG2GcQV1uAkuzHFMqYAk5piGrn2ivoMeAcSQEMHQ56");
      setContractListingFee(clf || "0.05");
      setContributionFeeBps(cfb || "50");
      setClaimFeeM1Bps(m1 || "200");
      setClaimFeeM2Bps(m2 || "200");
      setClaimFeeM3Bps(m3 || "200");
      setClaimFeeFinalbps(mf || "200");
      setLoading(false);
    });
  }, []);

  const save = async () => {
    if (!badgePrice || isNaN(badgePrice) || +badgePrice <= 0) return alert("Enter a valid badge price");
    if (!pointPrice || isNaN(pointPrice) || +pointPrice <= 0) return alert("Enter a valid post point price");
    setSaving(true);
    try {
      await setPlatformSetting("badge_price_sol", badgePrice);
      if (badgeWallet.trim()) await setPlatformSetting("badge_wallet", badgeWallet.trim());
      await setPlatformSetting("post_point_price_sol", pointPrice);
      if (platformWallet.trim()) await setPlatformSetting("platform_wallet", platformWallet.trim());
      await setPlatformSetting("boost_24h_price_sol", boost24Price);
      await setPlatformSetting("boost_48h_price_sol", boost48Price);
      await setPlatformSetting("live_feed_enabled", String(liveFeedEnabled));
      await setPlatformSetting("featured_slot_price_sol", featuredSlotPrice);
      if (featuredSlotWallet.trim()) await setPlatformSetting("featured_slot_wallet", featuredSlotWallet.trim());
      await setPlatformSetting("kyc_price_sol", kycPrice);
      await setPlatformSetting("kyc_org_price_sol", kycOrgPrice);
      if (kycTelegram.trim()) await setPlatformSetting("kyc_telegram", kycTelegram.trim().replace(/^@/, ""));
      await setPlatformSetting("show_contributions", String(showContributions));
      await setPlatformSetting("social_telegram", socialTelegram.trim());
      await setPlatformSetting("social_twitter", socialTwitter.trim());
      if (contractAdminWallet.trim()) await setPlatformSetting("contract_admin_wallet", contractAdminWallet.trim());
      await setPlatformSetting("contract_listing_fee_sol",           contractListingFee);
      await setPlatformSetting("contract_contribution_fee_bps",      contributionFeeBps);
      await setPlatformSetting("contract_claim_fee_m1_bps",          claimFeeM1Bps);
      await setPlatformSetting("contract_claim_fee_m2_bps",      claimFeeM2Bps);
      await setPlatformSetting("contract_claim_fee_m3_bps",      claimFeeM3Bps);
      await setPlatformSetting("contract_claim_fee_final_bps",   claimFeeFinalbps);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  };

  if (loading) return <div style={{ textAlign: "center", padding: 60 }}><Spinner color={C.purple} size={24} /></div>;

  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: .7, textTransform: "uppercase", marginBottom: 8 };
  const inputStyle = { width: "100%", padding: "12px 15px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color .15s" };
  const GroupHeader = ({ label }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "28px 0 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: C.faint, letterSpacing: 1.4, textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
  const Toggle = ({ on, onToggle }) => (
    <button onClick={onToggle}
      style={{ position: "relative", width: 48, height: 26, borderRadius: 99, border: "none", background: on ? `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})` : "#D1D5DB", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 24 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,.2)", transition: "left .2s" }} />
    </button>
  );
  const ToggleRow = ({ icon, label, desc, on, onToggle }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{label}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{desc}</div>
        </div>
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );

  return (
    <div style={{ maxWidth: 560 }}>

      {/* ════════════════════════════════════════════
          GROUP 1 · GENERAL
      ════════════════════════════════════════════ */}
      <GroupHeader label="General" />

      {/* Social Media Links */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>🌐</span>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Social Media Links</div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>Links shown in the sidebar Community menu. Leave blank to hide.</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={labelStyle}>✈️ Telegram</div>
            <input value={socialTelegram} onChange={e => setSocialTelegram(e.target.value)} placeholder="https://t.me/yourgroup"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#0088cc"}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>
          <div>
            <div style={labelStyle}>𝕏 Twitter / X</div>
            <input value={socialTwitter} onChange={e => setSocialTwitter(e.target.value)} placeholder="https://x.com/yourhandle"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = C.text}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 2 · DISPLAY CONTROLS
      ════════════════════════════════════════════ */}
      <GroupHeader label="Display Controls" />

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>🔴</span>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Live Feed & Visibility</div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Toggle global UI elements visible to all site visitors.</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ToggleRow
            icon="⚡" label="Live Donations Feed"
            desc="Real-time contribution ticker in the bottom-right corner"
            on={liveFeedEnabled} onToggle={() => setLiveFeedEnabled(v => !v)}
          />
          <ToggleRow
            icon="💸" label="Contributions List on Campaign Page"
            desc="Show or hide the backer list on every campaign's page"
            on={showContributions} onToggle={() => setShowContributions(v => !v)}
          />
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: liveFeedEnabled ? C.green : C.red }}>
            {liveFeedEnabled ? "● Live feed ON" : "○ Live feed OFF"}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: showContributions ? C.green : C.red }}>
            {showContributions ? "● Contributions visible" : "○ Contributions hidden"}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 3 · VERIFICATION
      ════════════════════════════════════════════ */}
      <GroupHeader label="Verification" />

      {/* KYC / Org */}
      <div style={{ background: C.surface, border: "1px solid rgba(37,99,235,.25)", borderRadius: 16, padding: "24px 26px" }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#1D4ED8,#065F46)", borderRadius: 3, marginBottom: 20, marginLeft: -26, marginRight: -26, marginTop: -24 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>KYC / Organisation Verification</div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>Prices and contact details for identity verification requests.</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
          <div>
            <div style={labelStyle}>🪪 KYC Price (SOL)</div>
            <div style={{ position: "relative" }}>
              <input type="number" value={kycPrice} onChange={e => setKycPrice(e.target.value)} min="0.01" step="0.1"
                style={{ ...inputStyle, paddingRight: 52 }}
                onFocus={e => e.target.style.borderColor = "#1D4ED8"}
                onBlur={e => e.target.style.borderColor = C.border} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: C.faint }}>SOL</span>
            </div>
            {kycPrice && !isNaN(kycPrice) && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>≈ ${(+kycPrice * 148).toFixed(2)} USD</div>}
          </div>
          <div>
            <div style={labelStyle}>🏢 Org Price (SOL)</div>
            <div style={{ position: "relative" }}>
              <input type="number" value={kycOrgPrice} onChange={e => setKycOrgPrice(e.target.value)} min="0.01" step="0.1"
                style={{ ...inputStyle, paddingRight: 52 }}
                onFocus={e => e.target.style.borderColor = "#065F46"}
                onBlur={e => e.target.style.borderColor = C.border} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: C.faint }}>SOL</span>
            </div>
            {kycOrgPrice && !isNaN(kycOrgPrice) && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>≈ ${(+kycOrgPrice * 148).toFixed(2)} USD</div>}
          </div>
        </div>

        <div>
          <div style={labelStyle}>Telegram Contact for Verification</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: C.faint, fontWeight: 700 }}>@</span>
            <input value={kycTelegram} onChange={e => setKycTelegram(e.target.value.replace(/^@/, ""))} placeholder="fundbeep"
              style={{ ...inputStyle, paddingLeft: 30 }}
              onFocus={e => e.target.style.borderColor = "#1D4ED8"}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 5 }}>
            Users are forwarded to <b>t.me/{kycTelegram || "fundbeep"}</b> with a pre-filled verification message
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 4 · MONETIZATION
      ════════════════════════════════════════════ */}
      <GroupHeader label="Monetization" />

      {/* Verified Badge */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 26px", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>✦</span>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Verified Badge</div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>Price and receiving wallet for ✦ Verified badge purchases (per 30 days).</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <div style={labelStyle}>Price per 30 days (SOL)</div>
            <div style={{ position: "relative" }}>
              <input type="number" value={badgePrice} onChange={e => setBadgePrice(e.target.value)} min="0.01" step="0.1"
                style={{ ...inputStyle, paddingRight: 52 }}
                onFocus={e => e.target.style.borderColor = C.purple}
                onBlur={e => e.target.style.borderColor = C.border} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: C.faint }}>SOL</span>
            </div>
            {badgePrice && !isNaN(badgePrice) && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>≈ ${(+badgePrice * 148).toFixed(2)} USD</div>}
          </div>
          <div>
            <div style={labelStyle}>Receiving Wallet</div>
            <input value={badgeWallet} onChange={e => setBadgeWallet(e.target.value)} placeholder="Solana wallet address"
              style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>
        </div>

        <div style={{ background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: "12px 14px", fontSize: 12, color: C.sub, lineHeight: 1.7 }}>
          💡 <b>Flow:</b> User pays SOL on-chain → appears in <b>Waiting Approval</b> tab → you verify on Solscan → click Approve → user gets ✦ Verified for 30 days
        </div>
      </div>

      {/* Featured Slots */}
      <div style={{ background: C.surface, border: "1px solid rgba(201,150,12,.3)", borderRadius: 16, padding: "24px 26px", marginBottom: 12 }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, #C9960C, #EAB308)", borderRadius: 3, marginBottom: 20, marginLeft: -26, marginRight: -26, marginTop: -24 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>⭐</span>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Featured Slots</div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>Price and wallet for featured campaign slots (7-day placements on the homepage).</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={labelStyle}>Price per Slot (SOL / 7 days)</div>
            <div style={{ position: "relative" }}>
              <input type="number" value={featuredSlotPrice} onChange={e => setFeaturedSlotPrice(e.target.value)} min="0.01" step="0.1"
                style={{ ...inputStyle, paddingRight: 52 }}
                onFocus={e => e.target.style.borderColor = "#C9960C"}
                onBlur={e => e.target.style.borderColor = C.border} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: C.faint }}>SOL</span>
            </div>
            {featuredSlotPrice && !isNaN(featuredSlotPrice) && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>≈ ${(+featuredSlotPrice * 148).toFixed(2)} USD</div>}
          </div>
          <div>
            <div style={labelStyle}>Receiving Wallet</div>
            <input value={featuredSlotWallet} onChange={e => setFeaturedSlotWallet(e.target.value)} placeholder="Solana wallet address"
              style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }}
              onFocus={e => e.target.style.borderColor = "#C9960C"}
              onBlur={e => e.target.style.borderColor = C.border} />
          </div>
        </div>
      </div>

      {/* Campaign Boosts */}
      <div style={{ background: C.surface, border: "1px solid rgba(234,179,8,.3)", borderRadius: 16, padding: "24px 26px", marginBottom: 12 }}>
        <div style={{ height: 3, background: "linear-gradient(90deg, #F59E0B, #EAB308)", borderRadius: 3, marginBottom: 20, marginLeft: -26, marginRight: -26, marginTop: -24 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>🚀</span>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Campaign Boosts</div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>Platform wallet and prices for timed campaign boosts.</div>

        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Platform Wallet (receives boost payments)</div>
          <input value={platformWallet} onChange={e => setPlatformWallet(e.target.value)} placeholder="Solana wallet address"
            style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }}
            onFocus={e => e.target.style.borderColor = "#F59E0B"}
            onBlur={e => e.target.style.borderColor = C.border} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <div style={labelStyle}>24h Boost Price (SOL)</div>
            <div style={{ position: "relative" }}>
              <input type="number" value={boost24Price} onChange={e => setBoost24Price(e.target.value)} min="0.001" step="0.01"
                style={{ ...inputStyle, paddingRight: 50 }}
                onFocus={e => e.target.style.borderColor = "#F59E0B"}
                onBlur={e => e.target.style.borderColor = C.border} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: C.faint }}>SOL</span>
            </div>
            {boost24Price && !isNaN(boost24Price) && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>≈ ${(+boost24Price * 148).toFixed(2)} USD</div>}
          </div>
          <div>
            <div style={labelStyle}>48h Boost Price (SOL)</div>
            <div style={{ position: "relative" }}>
              <input type="number" value={boost48Price} onChange={e => setBoost48Price(e.target.value)} min="0.001" step="0.01"
                style={{ ...inputStyle, paddingRight: 50 }}
                onFocus={e => e.target.style.borderColor = "#F59E0B"}
                onBlur={e => e.target.style.borderColor = C.border} />
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: C.faint }}>SOL</span>
            </div>
            {boost48Price && !isNaN(boost48Price) && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>≈ ${(+boost48Price * 148).toFixed(2)} USD</div>}
          </div>
        </div>
      </div>

      {/* Explore Post Points */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>✍️</span>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Explore · Post Points</div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>Each user gets 20 free posts/month. Extra posts cost 1 point. Set the SOL price per point.</div>

        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>Price per Point (SOL)</div>
          <div style={{ position: "relative" }}>
            <input type="number" value={pointPrice} onChange={e => setPointPrice(e.target.value)} min="0.001" step="0.005"
              style={{ ...inputStyle, paddingRight: 52 }}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = C.border} />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: C.faint }}>SOL</span>
          </div>
          {pointPrice && !isNaN(pointPrice) && <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>≈ ${(+pointPrice * 148).toFixed(3)} USD per extra post</div>}
        </div>

        <div style={{ background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: "12px 14px", fontSize: 12, color: C.sub, lineHeight: 1.7 }}>
          💡 Free until 20/month → each extra post costs 1 point → points bought with SOL → credited instantly
        </div>
      </div>

      {/* ════════════════════════════════════════════
          GROUP 5 · SMART CONTRACT
      ════════════════════════════════════════════ */}
      <GroupHeader label="Smart Contract (Escrow)" />

      <div style={{ background: C.surface, border: "1px solid rgba(124,58,237,.25)", borderRadius: 16, padding: "24px 26px", marginBottom: 12 }}>
        <div style={{ height: 3, background: "linear-gradient(90deg,#7C3AED,#9D5CF6)", borderRadius: 3, marginBottom: 20, marginLeft: -26, marginRight: -26, marginTop: -24 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>⛓️</span>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Milestone Escrow Settings</div>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>
          Creators pay a listing fee at launch. Contributors pay a configurable on-chain fee per contribution (set below).
          Funds are locked in escrow and released at 25%/50%/75% milestones (30 min wait each) + final claim after end date.<br />
          If 25% is never reached, contributors get a full refund with no penalty.
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>◎ Contract Admin Wallet</div>
          <input value={contractAdminWallet} onChange={e => setContractAdminWallet(e.target.value)} placeholder="Base58 Solana address"
            style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12 }}
            onFocus={e => e.target.style.borderColor = C.purple}
            onBlur={e => e.target.style.borderColor = C.border} />
          <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>Receives platform fees on claims and 5% penalty on contributor withdrawals.</div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>◎ Listing Fee (SOL) - charged at campaign creation</div>
          <div style={{ position: "relative" }}>
            <input type="number" value={contractListingFee} onChange={e => setContractListingFee(e.target.value)} min="0" step="0.01"
              style={{ ...inputStyle, paddingRight: 52 }}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = C.border} />
            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: C.faint }}>SOL</span>
          </div>
          {contractListingFee && !isNaN(contractListingFee) && +contractListingFee > 0 && (
            <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>≈ ${(+contractListingFee * 148).toFixed(2)} USD, paid to admin wallet when creator publishes campaign</div>
          )}
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={labelStyle}>Contributor Fee (basis points) - charged on each contribution</div>
          <div style={{ position: "relative" }}>
            <input type="number" value={contributionFeeBps} onChange={e => setContributionFeeBps(e.target.value)} min="0" max="2000" step="10"
              style={{ ...inputStyle, paddingRight: 42 }}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = C.border} />
            <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontWeight: 700, color: C.faint }}>bps</span>
          </div>
          {contributionFeeBps && !isNaN(contributionFeeBps) && (
            <div style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>
              {(+contributionFeeBps / 100).toFixed(2)}% deducted from each contribution and sent to admin wallet (e.g. 50 bps = 0.5%)
            </div>
          )}
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>Claim Fees (basis points, e.g. 200 = 2%)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {[
            { label: "M1 Claim Fee (25%)", val: claimFeeM1Bps, set: setClaimFeeM1Bps },
            { label: "M2 Claim Fee (50%)", val: claimFeeM2Bps, set: setClaimFeeM2Bps },
            { label: "M3 Claim Fee (75%)", val: claimFeeM3Bps, set: setClaimFeeM3Bps },
            { label: "Final Claim Fee",    val: claimFeeFinalbps, set: setClaimFeeFinalbps },
          ].map(({ label, val, set }) => (
            <div key={label}>
              <div style={labelStyle}>{label}</div>
              <div style={{ position: "relative" }}>
                <input type="number" value={val} onChange={e => set(e.target.value)} min="0" max="5000" step="50"
                  style={{ ...inputStyle, paddingRight: 42 }}
                  onFocus={e => e.target.style.borderColor = C.purple}
                  onBlur={e => e.target.style.borderColor = C.border} />
                <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 10, fontWeight: 700, color: C.faint }}>bps</span>
              </div>
              {val && !isNaN(val) && <div style={{ fontSize: 10, color: C.faint, marginTop: 3 }}>{(+val / 100).toFixed(2)}% of payout</div>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 4, background: "rgba(124,58,237,.06)", border: "1px solid rgba(124,58,237,.18)", borderRadius: 10, padding: "12px 14px", fontSize: 12, color: C.purple }}>
          ⚠️ Fee settings are baked into each campaign's escrow at creation time. Changing them here only affects <b>new campaigns</b>.
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SAVE BUTTON
      ════════════════════════════════════════════ */}
      <div style={{ marginTop: 28, marginBottom: 8 }}>
        <button onClick={save} disabled={saving}
          style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: saved ? `linear-gradient(135deg, ${C.green}, #16a34a)` : `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 700, fontSize: 15, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: saved ? "0 4px 18px rgba(21,128,61,.3)" : "0 4px 18px rgba(109,40,217,.3)", transition: "background .3s, box-shadow .3s" }}>
          {saving ? <><Spinner color="#fff" /> Saving…</> : saved ? "✓ Settings Saved!" : "💾 Save All Settings"}
        </button>
      </div>

      <AdminActionsPanel adminId={null} />
    </div>
  );
}

// ── Admin Quick-Action Panel (embedded in Settings) ───────────────────────────
function AdminActionsPanel({ adminId: _adminId }) {
  const { profile } = useWallet();
  const adminId = _adminId || profile?.id;

  const [allUsers, setAllUsers]           = useState([]);
  const [allCampaigns, setAllCampaigns]   = useState([]);
  const [loadingData, setLoadingData]     = useState(true);

  // Badge grant
  const [badgeSearch, setBadgeSearch]   = useState("");
  const [badgeUser, setBadgeUser]       = useState(null);
  const [badgeDays, setBadgeDays]       = useState("30");
  const [badgeBusy, setBadgeBusy]       = useState(false);
  const [badgeMsg, setBadgeMsg]         = useState(null);

  // Boost campaign
  const [boostSearch, setBoostSearch]   = useState("");
  const [boostCamp, setBoostCamp]       = useState(null);
  const [boostHours, setBoostHours]     = useState("24");
  const [boostBusy, setBoostBusy]       = useState(false);
  const [boostMsg, setBoostMsg]         = useState(null);

  // Feature campaign
  const [featSearch, setFeatSearch]     = useState("");
  const [featCamp, setFeatCamp]         = useState(null);
  const [featSlot, setFeatSlot]         = useState("1");
  const [featBusy, setFeatBusy]         = useState(false);
  const [featMsg, setFeatMsg]           = useState(null);

  // Post limit
  const [limitSearch, setLimitSearch]   = useState("");
  const [limitUser, setLimitUser]       = useState(null);
  const [limitVal, setLimitVal]         = useState("");
  const [limitBusy, setLimitBusy]       = useState(false);
  const [limitMsg, setLimitMsg]         = useState(null);

  useEffect(() => {
    Promise.all([adminGetAllUsers(), adminGetAllCampaigns()])
      .then(([u, c]) => { setAllUsers(u); setAllCampaigns(c); setLoadingData(false); });
  }, []);

  const userResults   = allUsers.filter(u => badgeSearch && (u.full_name?.toLowerCase().includes(badgeSearch.toLowerCase()) || u.email?.toLowerCase().includes(badgeSearch.toLowerCase()) || u.wallet?.toLowerCase().includes(badgeSearch.toLowerCase()))).slice(0, 5);
  const limitResults  = allUsers.filter(u => limitSearch && (u.full_name?.toLowerCase().includes(limitSearch.toLowerCase()) || u.email?.toLowerCase().includes(limitSearch.toLowerCase()))).slice(0, 5);
  const boostResults  = allCampaigns.filter(c => boostSearch && c.title?.toLowerCase().includes(boostSearch.toLowerCase())).slice(0, 5);
  const featResults   = allCampaigns.filter(c => featSearch && c.title?.toLowerCase().includes(featSearch.toLowerCase()) && c.status === "active").slice(0, 5);

  const sectionStyle = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 22px", marginTop: 14 };
  const rowStyle     = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 };
  const searchInput  = (val, set, ph) => (
    <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
      style={{ flex: 1, minWidth: 160, padding: "9px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
  );
  const dropdown = (items, selected, onSelect, labelFn) => items.length > 0 && (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginTop: 4 }}>
      {items.map(item => (
        <div key={item.id} onClick={() => { onSelect(item); }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: selected?.id === item.id ? 700 : 400, color: selected?.id === item.id ? C.purple : C.text, background: selected?.id === item.id ? C.purpleSoft : "transparent", borderBottom: `1px solid ${C.border}` }}
          onMouseEnter={e => { if (selected?.id !== item.id) e.currentTarget.style.background = C.bg; }}
          onMouseLeave={e => { if (selected?.id !== item.id) e.currentTarget.style.background = "transparent"; }}>
          {labelFn(item)}
        </div>
      ))}
    </div>
  );
  const msg = (m) => m && <div style={{ fontSize: 12, fontWeight: 600, color: m.type === "ok" ? C.green : C.red, marginTop: 6 }}>{m.text}</div>;
  const actionBtn = (onClick, busy, label, color = C.purple) => (
    <button onClick={onClick} disabled={busy} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: busy ? C.border : `linear-gradient(135deg, ${color}, ${color}cc)`, color: busy ? C.faint : "#fff", fontWeight: 700, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
      {busy ? "…" : label}
    </button>
  );

  if (loadingData) return null;

  return (
    <>
      <div style={{ marginTop: 24, marginBottom: 8, fontWeight: 900, fontSize: 16, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
        ⚡ Admin Quick Actions
        <span style={{ fontSize: 12, fontWeight: 600, color: C.faint }}>(no payment required)</span>
      </div>

      {/* Grant Badge */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>🔵 Grant Blue Badge to User</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Search user → set duration → grant badge immediately.</div>
        {searchInput(badgeSearch, (v) => { setBadgeSearch(v); setBadgeUser(null); }, "Search user by name, email or wallet…")}
        {dropdown(userResults, badgeUser, (u) => { setBadgeUser(u); setBadgeSearch(u.full_name || u.email || ""); }, u => `${u.full_name || "—"} · ${u.email || ""} · ${short(u.wallet || "")}`)}
        {badgeUser && (
          <div style={rowStyle}>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{badgeUser.full_name || badgeUser.email}</span>
            <input type="number" min="1" max="365" value={badgeDays} onChange={e => setBadgeDays(e.target.value)}
              style={{ width: 70, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <span style={{ fontSize: 12, color: C.muted }}>days</span>
            {actionBtn(async () => {
              setBadgeBusy(true); setBadgeMsg(null);
              try { await adminGrantBadge(adminId, badgeUser.id, parseInt(badgeDays, 10)); setBadgeMsg({ type: "ok", text: `✅ Badge granted to ${badgeUser.full_name || badgeUser.email} for ${badgeDays} days` }); setBadgeUser(null); setBadgeSearch(""); }
              catch (e) { setBadgeMsg({ type: "err", text: e.message }); }
              setBadgeBusy(false);
            }, badgeBusy, "🔵 Grant Badge", "#2563EB")}
          </div>
        )}
        {msg(badgeMsg)}
      </div>

      {/* Boost Campaign */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>🚀 Boost Any Campaign</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Search campaign → choose duration → boost instantly.</div>
        {searchInput(boostSearch, (v) => { setBoostSearch(v); setBoostCamp(null); }, "Search campaign by title…")}
        {dropdown(boostResults, boostCamp, (c) => { setBoostCamp(c); setBoostSearch(c.title); }, c => `${c.title} · ${c.status}`)}
        {boostCamp && (
          <div style={rowStyle}>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{boostCamp.title}</span>
            <select value={boostHours} onChange={e => setBoostHours(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" }}>
              <option value="24">24 hours</option>
              <option value="48">48 hours</option>
              <option value="72">72 hours</option>
              <option value="168">7 days</option>
              <option value="720">30 days</option>
            </select>
            {actionBtn(async () => {
              setBoostBusy(true); setBoostMsg(null);
              try { await adminBoostCampaign(adminId, boostCamp.id, parseInt(boostHours, 10)); setBoostMsg({ type: "ok", text: `✅ "${boostCamp.title}" boosted for ${boostHours}h` }); setBoostCamp(null); setBoostSearch(""); }
              catch (e) { setBoostMsg({ type: "err", text: e.message }); }
              setBoostBusy(false);
            }, boostBusy, "🚀 Boost Now", "#D97706")}
          </div>
        )}
        {msg(boostMsg)}
      </div>

      {/* Feature Campaign */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>⭐ Feature Any Campaign</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Search active campaign → select featured slot → pin immediately.</div>
        {searchInput(featSearch, (v) => { setFeatSearch(v); setFeatCamp(null); }, "Search active campaign…")}
        {dropdown(featResults, featCamp, (c) => { setFeatCamp(c); setFeatSearch(c.title); }, c => `${c.title}${c.is_featured ? " ⭐" : ""}`)}
        {featCamp && (
          <div style={rowStyle}>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{featCamp.title}</span>
            <select value={featSlot} onChange={e => setFeatSlot(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none" }}>
              <option value="1">Slot 1</option>
              <option value="2">Slot 2</option>
              <option value="3">Slot 3</option>
            </select>
            {actionBtn(async () => {
              setFeatBusy(true); setFeatMsg(null);
              try { await adminSetFeatured(adminId, featCamp.id, parseInt(featSlot, 10), null); setFeatMsg({ type: "ok", text: `✅ "${featCamp.title}" featured in slot ${featSlot}` }); setFeatCamp(null); setFeatSearch(""); }
              catch (e) { setFeatMsg({ type: "err", text: e.message }); }
              setFeatBusy(false);
            }, featBusy, "⭐ Feature Now", "#C9960C")}
          </div>
        )}
        {msg(featMsg)}
      </div>

      {/* Set Post Limit */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>✦ Set Explore Post Limit for User</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Override the dynamic monthly post limit for any user. Leave blank to reset to dynamic.</div>
        {searchInput(limitSearch, (v) => { setLimitSearch(v); setLimitUser(null); }, "Search user by name or email…")}
        {dropdown(limitResults, limitUser, (u) => { setLimitUser(u); setLimitSearch(u.full_name || u.email || ""); setLimitVal(u.free_posts_override != null ? String(u.free_posts_override) : ""); }, u => `${u.full_name || "—"} · ${u.email || ""} ${u.free_posts_override != null ? `· override: ${u.free_posts_override}/mo` : ""}`)}
        {limitUser && (
          <div style={rowStyle}>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{limitUser.full_name || limitUser.email}</span>
            <input type="number" min="0" value={limitVal} onChange={e => setLimitVal(e.target.value)} placeholder="e.g. 50"
              style={{ width: 90, padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <span style={{ fontSize: 12, color: C.muted }}>posts/month</span>
            {actionBtn(async () => {
              setLimitBusy(true); setLimitMsg(null);
              try {
                const v = limitVal === "" ? null : parseInt(limitVal, 10);
                await adminSetPostLimit(adminId, limitUser.id, v);
                setLimitMsg({ type: "ok", text: v == null ? `✅ Reset ${limitUser.full_name || limitUser.email} to dynamic limit` : `✅ Set ${limitUser.full_name || limitUser.email} to ${v} posts/month` });
                setLimitUser(null); setLimitSearch(""); setLimitVal("");
              } catch (e) { setLimitMsg({ type: "err", text: e.message }); }
              setLimitBusy(false);
            }, limitBusy, limitVal === "" ? "Reset Limit" : "Set Limit")}
          </div>
        )}
        {msg(limitMsg)}
      </div>

      {/* Stop Boost */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>🛑 Stop Campaign Boost</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Search a currently boosted campaign and remove its boost immediately.</div>
        <StopActionPanel
          items={allCampaigns.filter(c => c.is_boosted)}
          labelFn={c => `${c.title} · boosted until ${c.boosted_until ? new Date(c.boosted_until).toLocaleDateString() : "?"}`}
          emptyText="No campaigns currently boosted."
          btnLabel="✕ Stop Boost"
          btnColor={C.red}
          onAction={async (c) => { await adminUnboostCampaign(adminId, c.id); setAllCampaigns(p => p.map(x => x.id === c.id ? { ...x, is_boosted: false, boosted_until: null } : x)); }}
          successFn={c => `✅ Boost stopped for "${c.title}"`}
        />
      </div>

      {/* Remove Feature */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>✕ Remove Campaign Feature</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Remove a campaign from the featured homepage slots.</div>
        <StopActionPanel
          items={allCampaigns.filter(c => c.is_featured)}
          labelFn={c => `${c.title} · Slot ${c.featured_order}`}
          emptyText="No campaigns currently featured."
          btnLabel="✕ Unfeature"
          btnColor={C.red}
          onAction={async (c) => { await adminUnsetFeatured(adminId, c.id); setAllCampaigns(p => p.map(x => x.id === c.id ? { ...x, is_featured: false, featured_order: null } : x)); }}
          successFn={c => `✅ "${c.title}" removed from featured`}
        />
      </div>

      {/* Revoke Badge */}
      <div style={sectionStyle}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 4 }}>🚫 Revoke User Badge</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Remove the blue verified badge from a user immediately.</div>
        <StopActionPanel
          items={allUsers.filter(u => u.is_verified)}
          labelFn={u => `${u.full_name || "—"} · ${u.email || ""} ${u.badge_expires_at ? `· expires ${new Date(u.badge_expires_at).toLocaleDateString()}` : ""}`}
          emptyText="No users with active badges."
          btnLabel="🚫 Revoke Badge"
          btnColor={C.red}
          onAction={async (u) => { await adminRevokeBadge(adminId, u.id); setAllUsers(p => p.map(x => x.id === u.id ? { ...x, is_verified: false, badge_expires_at: null } : x)); }}
          successFn={u => `✅ Badge revoked from ${u.full_name || u.email}`}
        />
      </div>
    </>
  );
}

/** Reusable "pick from list → action" mini panel */
function StopActionPanel({ items, labelFn, emptyText, btnLabel, btnColor, onAction, successFn }) {
  const [selected, setSelected] = useState(null);
  const [busy, setBusy]         = useState(false);
  const [msg, setMsg]           = useState(null);

  if (items.length === 0) return <div style={{ fontSize: 13, color: "#9CA3AF", fontStyle: "italic" }}>{emptyText}</div>;

  return (
    <div>
      <select
        value={selected?.id || ""}
        onChange={e => setSelected(items.find(i => i.id === e.target.value) || null)}
        style={{ width: "100%", padding: "9px 12px", borderRadius: 9, border: `1px solid ${"#DDD6FE"}`, background: "#F5F3FF", color: "#1E0A4C", fontSize: 13, fontFamily: "inherit", outline: "none", marginBottom: 10 }}>
        <option value="">Select...</option>
        {items.map(i => <option key={i.id} value={i.id}>{labelFn(i)}</option>)}
      </select>
      {selected && (
        <button
          onClick={async () => {
            setBusy(true); setMsg(null);
            try {
              await onAction(selected);
              setMsg({ type: "ok", text: successFn(selected) });
              setSelected(null);
            } catch (e) { setMsg({ type: "err", text: e.message }); }
            setBusy(false);
          }}
          disabled={busy}
          style={{ padding: "9px 20px", borderRadius: 9, border: `1px solid ${btnColor}40`, background: `${btnColor}12`, color: btnColor, fontWeight: 700, fontSize: 13, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
          {busy ? "…" : btnLabel}
        </button>
      )}
      {msg && <div style={{ fontSize: 12, fontWeight: 600, color: msg.type === "ok" ? "#15803D" : "#B91C1C", marginTop: 8 }}>{msg.text}</div>}
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
const REPORT_REASON_LABELS = {
  scam:          "🚨 Scam / Fraud",
  fake:          "🎭 Fake Project",
  misleading:    "⚠️ Misleading",
  spam:          "📢 Spam",
  inappropriate: "🚫 Inappropriate",
  other:         "📝 Other",
};

const STATUS_COLORS = {
  pending:    { bg: "rgba(217,119,6,.1)",   color: "#B45309",  label: "Pending"    },
  reviewed:   { bg: "rgba(37,99,235,.1)",   color: "#1D4ED8",  label: "Reviewed"   },
  dismissed:  { bg: "rgba(107,114,128,.1)", color: "#6B7280",  label: "Dismissed"  },
  actioned:   { bg: "rgba(21,128,61,.1)",   color: "#15803D",  label: "Actioned"   },
};

function ReportsTab({ adminId }) {
  const [reports,   setReports]   = useState([]);
  const [filter,    setFilter]    = useState("pending");
  const [loading,   setLoading]   = useState(true);
  const [busyId,    setBusyId]    = useState(null);
  const [expandId,  setExpandId]  = useState(null);
  const [noteMap,   setNoteMap]   = useState({});

  const load = (f) => {
    setLoading(true);
    adminGetReports(f).then(d => { setReports(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(filter); }, [filter]);

  const review = async (reportId, status) => {
    setBusyId(reportId);
    try {
      await adminReviewReport(adminId, reportId, status, noteMap[reportId] || "");
      setReports(rs => rs.map(r => r.id === reportId ? { ...r, status, admin_note: noteMap[reportId] || r.admin_note } : r));
      setExpandId(null);
    } catch (_) {}
    setBusyId(null);
  };

  const pending = reports.filter(r => r.status === "pending").length;

  return (
    <div style={{ padding: "24px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontWeight: 800, fontSize: 17, color: C.text }}>🚨 Campaign Reports</span>
        {pending > 0 && (
          <span style={{ padding: "2px 10px", borderRadius: 99, background: "rgba(220,38,38,.1)", color: "#DC2626", fontWeight: 800, fontSize: 12, border: "1px solid rgba(220,38,38,.2)" }}>
            {pending} pending
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {["pending","reviewed","dismissed","actioned","all"].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "6px 14px", borderRadius: 8, fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: filter === s ? C.purple : "transparent",
              color: filter === s ? "#fff" : C.muted,
              border: `1px solid ${filter === s ? C.purple : C.border}`,
            }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>Loading…</div>
      ) : reports.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: 4 }}>No {filter !== "all" ? filter : ""} reports</div>
          <div style={{ fontSize: 13, color: C.muted }}>All clear!</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {reports.map(r => {
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
            const isOpen = expandId === r.id;
            return (
              <div key={r.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                {/* Summary row */}
                <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.text, marginBottom: 3 }}>
                      {r.campaigns?.title || "Unknown Campaign"}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                      Reported by: <b>{r.profiles?.full_name || r.profiles?.username || "Unknown"}</b>
                      {r.profiles?.wallet && <span style={{ fontFamily: "monospace", marginLeft: 6 }}>{r.profiles.wallet.slice(0,6)}…{r.profiles.wallet.slice(-4)}</span>}
                    </div>
                    <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>
                      {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "rgba(220,38,38,.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,.2)" }}>
                      {REPORT_REASON_LABELS[r.reason] || r.reason}
                    </span>
                    <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                    <button onClick={() => setExpandId(isOpen ? null : r.id)} style={{
                      padding: "5px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent",
                      color: C.muted, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                    }}>
                      {isOpen ? "▲ Hide" : "▼ Review"}
                    </button>
                  </div>
                </div>

                {/* Expanded review panel */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: "16px 18px", background: C.bg }}>
                    {r.details && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 5 }}>Reporter's Details</div>
                        <div style={{ fontSize: 13, color: C.text, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", lineHeight: 1.6 }}>
                          {r.details}
                        </div>
                      </div>
                    )}
                    {r.admin_note && r.status !== "pending" && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 5 }}>Previous Admin Note</div>
                        <div style={{ fontSize: 13, color: C.textSub, fontStyle: "italic" }}>{r.admin_note}</div>
                      </div>
                    )}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 5 }}>Admin Note (optional)</div>
                      <textarea
                        value={noteMap[r.id] || ""}
                        onChange={e => setNoteMap(m => ({ ...m, [r.id]: e.target.value }))}
                        placeholder="Internal note about this report…"
                        rows={2}
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${C.border}`, fontFamily: "inherit", fontSize: 13, color: C.text, resize: "vertical", boxSizing: "border-box" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {r.status !== "actioned" && (
                        <button onClick={() => review(r.id, "actioned")} disabled={busyId === r.id}
                          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#DC2626", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                          {busyId === r.id ? "…" : "⚡ Action (Flag Campaign)"}
                        </button>
                      )}
                      {r.status !== "dismissed" && (
                        <button onClick={() => review(r.id, "dismissed")} disabled={busyId === r.id}
                          style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                          {busyId === r.id ? "…" : "✕ Dismiss"}
                        </button>
                      )}
                      {r.status === "pending" && (
                        <button onClick={() => review(r.id, "reviewed")} disabled={busyId === r.id}
                          style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.purpleBorder}`, background: C.purpleDim, color: C.purple, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                          {busyId === r.id ? "…" : "👁 Mark Reviewed"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Admin Dashboard ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, profile } = useWallet();
  const [tab, setTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    getPlatformStats().then(d => { setStats(d); setLoadingStats(false); });
  }, []);

  // Guard: only admin/superadmin
  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    return (
      <div style={{ maxWidth: 500, margin: "100px auto", textAlign: "center", padding: 24 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8 }}>Access Denied</div>
        <div style={{ color: C.muted, fontSize: 14 }}>You need admin privileges to view this page.</div>
      </div>
    );
  }

  const [badgePendingCount, setBadgePendingCount]     = useState(0);
  const [featurePendingCount, setFeaturePendingCount] = useState(0);
  const [reportPendingCount, setReportPendingCount]   = useState(0);
  useEffect(() => {
    adminGetBadgeRequests().then(d => setBadgePendingCount(d.filter(r => r.status === "pending").length));
    adminGetFeatureRequests().then(d => setFeaturePendingCount(d.filter(r => r.status === "pending").length)).catch(() => {});
    adminGetReports("pending").then(d => setReportPendingCount(d.length)).catch(() => {});
  }, []);

  const tabs = [
    { key: "overview",         label: "📊 Overview" },
    { key: "campaigns",        label: "📋 Campaigns" },
    { key: "creators",         label: "🎯 Creators" },
    { key: "users",            label: "👥 Users" },
    { key: "contributors",     label: "💸 Contributors" },
    { key: "featured",         label: "⭐ Featured" },
    { key: "feature_requests", label: "🚀 Feature Req.", count: featurePendingCount },
    { key: "badges",           label: "✦ Badges", count: badgePendingCount },
    { key: "reports",          label: "🚨 Reports", count: reportPendingCount },
    { key: "logs",             label: "📝 Activity Log" },
    { key: "settings",         label: "⚙️ Settings" },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 100px", animation: "fadeUp .5s ease both" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 26 }}>⚡ Admin Dashboard</div>
          <RoleBadge role={profile.role} />
        </div>
        <div style={{ fontSize: 14, color: C.muted }}>Welcome, {profile.full_name || profile.email}. Manage the FundBeep platform.</div>
      </div>

      {/* Stats overview */}
      {tab === "overview" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 32 }}>
            {loadingStats ? (
              [...Array(6)].map((_, i) => <div key={i} style={{ background: C.surface, borderRadius: 14, padding: "20px", height: 80 }} />)
            ) : [
              { label: "Active Campaigns", val: stats?.active_campaigns || 0, accent: C.green },
              { label: "Pending Review", val: stats?.pending_campaigns || 0, accent: C.purple },
              { label: "Completed", val: stats?.completed_campaigns || 0, accent: C.purpleBright },
              { label: "Total Users", val: stats?.total_users || 0, accent: C.purpleBright },
              { label: "Contributions", val: stats?.total_contributions || 0, accent: C.purple },
              { label: "SOL Raised", val: `${(+stats?.total_sol_raised || 0).toFixed(2)}`, accent: C.purple },
            ].map(s => (
              <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: s.accent }}>{s.val}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 16 }}>Quick Actions</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 32 }}>
            <button onClick={() => setTab("campaigns")} style={{ padding: "12px 22px", borderRadius: 11, border: "none", background: `${C.purple}18`, color: C.purple, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
              ⏳ Review Pending Campaigns
            </button>
            <button onClick={() => setTab("users")} style={{ padding: "12px 22px", borderRadius: 11, border: "none", background: C.purpleDim, color: C.purpleBright, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
              👥 Manage Users
            </button>
            <button onClick={() => setTab("logs")} style={{ padding: "12px 22px", borderRadius: 11, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}>
              📝 View Activity Log
            </button>
          </div>

          {/* Platform info */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Platform Summary</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { label: "USD Value Raised", val: `$${toUSD(+stats?.total_sol_raised || 0)}` },
                { label: "Avg per Campaign", val: stats?.active_campaigns ? `${((+stats?.total_sol_raised || 0) / stats.active_campaigns).toFixed(2)} SOL` : "—" },
                { label: "Avg per Contribution", val: stats?.total_contributions ? `${((+stats?.total_sol_raised || 0) / stats.total_contributions).toFixed(3)} SOL` : "—" },
              ].map(s => (
                <div key={s.label} style={{ background: "#EDE9FE", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontWeight: 800, fontSize: 18, color: C.purple }}>{s.val}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tab navigation */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24, borderBottom: `1px solid ${C.border}`, paddingBottom: 0, overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "10px 18px", borderRadius: "10px 10px 0 0", border: "none", background: tab === t.key ? C.surface : "transparent", color: tab === t.key ? C.text : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", borderBottom: tab === t.key ? `2px solid ${C.purple}` : "2px solid transparent", display: "flex", alignItems: "center", gap: 7 }}>
            {t.label}
            {t.count > 0 && <span style={{ background: C.purple, color: "#000", borderRadius: 99, fontSize: 10, fontWeight: 900, padding: "1px 7px", minWidth: 18, textAlign: "center" }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "campaigns"        && <CampaignsTab        adminId={user.id} />}
      {tab === "creators"         && <CreatorsTab         adminId={user.id} />}
      {tab === "users"            && <UsersTab            adminId={user.id} />}
      {tab === "contributors"     && <ContributorsTab />}
      {tab === "featured"         && <FeaturedTab         adminId={user.id} />}
      {tab === "feature_requests" && <FeatureRequestsTab  adminId={user.id} />}
      {tab === "badges"           && <BadgesTab           adminId={user.id} />}
      {tab === "reports"          && <ReportsTab          adminId={user.id} />}
      {tab === "logs"             && <LogsTab />}
      {tab === "settings"         && <SettingsTab />}
    </div>
  );
}
