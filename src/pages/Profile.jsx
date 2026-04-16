import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { supabase, updateProfile, uploadAvatar, getPlatformSetting, submitBadgeRequest, getMyBadgeRequests, getUserBadges, getUserFollowing, unfollowCampaign, unfollowCreator, markWalletVerified } from "../supabase";
import { sendSol, verifyWalletOwnership } from "../utils/solana";
import ReputationScore from "../components/ReputationScore";

const BADGE_META = {
  seed:     { emoji: "🌱", name: "Seed Backer",  desc: "Made your first-ever contribution",  color: "#15803D", bg: "rgba(21,128,61,.08)",   border: "rgba(21,128,61,.2)"   },
  early:    { emoji: "⚡", name: "Early Backer",  desc: "Among the first 10 backers",         color: "#D97706", bg: "rgba(217,119,6,.08)",   border: "rgba(217,119,6,.2)"   },
  flame:    { emoji: "🔥", name: "Flame",         desc: "Contributed 5+ SOL in one go",       color: "#DC2626", bg: "rgba(220,38,38,.08)",   border: "rgba(220,38,38,.2)"   },
  diamond:  { emoji: "💎", name: "Diamond",       desc: "Contributed 10+ SOL in one go",      color: "#2563EB", bg: "rgba(37,99,235,.08)",   border: "rgba(37,99,235,.2)"   },
  champion: { emoji: "🏆", name: "Champion",      desc: "Backed 3 or more campaigns",         color: "#7C3AED", bg: "rgba(124,58,237,.08)",  border: "rgba(124,58,237,.2)"  },
};

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
const short = (a) => a ? `${a.slice(0,6)}…${a.slice(-4)}` : "";

function Spinner({ color = C.purple, size = 14 }) {
  return <span style={{ width: size, height: size, border: `2px solid rgba(109,40,217,.12)`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .65s linear infinite", flexShrink: 0 }} />;
}

function VerifiedBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px", borderRadius: 99, background: C.blueDim, border: `1px solid ${C.blueBorder}`, fontSize: 11, fontWeight: 700, color: C.blue }}>
      ✦ Verified
    </span>
  );
}

function StatusPill({ status }) {
  const map = {
    pending:  { color: C.purple, bg: C.purpleSoft, border: C.purpleBorder, label: "⏳ Pending Review" },
    approved: { color: C.green,  bg: C.greenDim,  border: C.greenBorder,  label: "✅ Approved" },
    rejected: { color: C.red,    bg: C.redDim,    border: C.redBorder,    label: "❌ Rejected" },
  };
  const s = map[status] || map.pending;
  return <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{s.label}</span>;
}

// ── helpers ───────────────────────────────────────────────────────────────────
const genUsername = (userId) => "user_" + (userId || "").replace(/-/g, "").slice(0, 10);

const labelStyle = {
  fontSize: 11, fontWeight: 700, color: "#6B7280",
  letterSpacing: .7, textTransform: "uppercase", marginBottom: 6, display: "block",
};
const inputStyle = (err) => ({
  width: "100%", padding: "10px 13px", borderRadius: 10, boxSizing: "border-box",
  border: `1.5px solid ${err ? "#B91C1C" : "#DDD6FE"}`, background: "#F5F3FF",
  color: "#1E0A4C", fontSize: 14, outline: "none", fontFamily: "inherit",
  transition: "border-color .15s",
});

// ── Full Profile Editor ───────────────────────────────────────────────────────
function ProfileEditSection({ profile, onUpdated, autoOpen }) {
  const { user } = useWallet();
  const [open, setOpen]           = useState(autoOpen || !profile?.username); // auto-open if no username yet
  const [busy, setBusy]           = useState(false);
  const [saved, setSaved]         = useState(false);
  const [errors, setErrors]       = useState({});
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);

  const [displayName, setDisplayName] = useState(profile?.full_name || "");
  const [username, setUsername]       = useState(profile?.username || "");
  const [bioShort, setBioShort]       = useState(profile?.bio_short || "");
  const [bioLong, setBioLong]         = useState(profile?.bio_long || "");
  const [twitter, setTwitter]         = useState(profile?.twitter || "");
  const [facebook, setFacebook]       = useState(profile?.facebook || "");
  const [telegram, setTelegram]       = useState(profile?.telegram || "");
  const [dob, setDob]                 = useState(profile?.date_of_birth || "");

  // Sync if parent profile changes (e.g. after DB re-fetch)
  useEffect(() => {
    setDisplayName(profile?.full_name || "");
    setUsername(profile?.username || "");
    setBioShort(profile?.bio_short || "");
    setBioLong(profile?.bio_long || "");
    setTwitter(profile?.twitter || "");
    setFacebook(profile?.facebook || "");
    setTelegram(profile?.telegram || "");
    setDob(profile?.date_of_birth || "");
    setAvatarPreview(profile?.avatar_url || null);
  }, [profile?.id]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErrors(p => ({ ...p, avatar: "Max file size is 2 MB" })); return; }
    setAvatarBusy(true);
    setErrors(p => ({ ...p, avatar: "" }));
    try {
      const updated = await uploadAvatar(user.id, file);
      setAvatarPreview(updated.avatar_url);
      onUpdated({ ...profile, avatar_url: updated.avatar_url });
    } catch (err) {
      setErrors(p => ({ ...p, avatar: err.message || "Upload failed" }));
    } finally {
      setAvatarBusy(false);
    }
  };

  const isVerified = profile?.is_verified && profile?.badge_expires_at && new Date(profile.badge_expires_at) > new Date();

  const validate = () => {
    const e = {};
    if (displayName.trim() && displayName.trim().length < 2) e.displayName = "At least 2 characters";
    if (displayName.trim().length > 50) e.displayName = "Max 50 characters";
    if (username.trim() && !/^[a-zA-Z0-9_]+$/.test(username.trim())) e.username = "Letters, numbers and _ only";
    if (username.trim().length > 32) e.username = "Max 32 characters";
    if (bioShort.length > 200) e.bioShort = "Max 200 characters";
    if (twitter.trim() && !/^[a-zA-Z0-9_]{1,50}$/.test(twitter.trim())) e.twitter = "Invalid username";
    if (facebook.trim() && !/^[a-zA-Z0-9._-]{1,60}$/.test(facebook.trim())) e.facebook = "Invalid username";
    if (telegram.trim() && !/^[a-zA-Z0-9_]{4,32}$/.test(telegram.trim())) e.telegram = "4–32 chars, letters/numbers/_";
    return e;
  };

  const save = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setBusy(true);
    try {
      const finalUsername = username.trim() || genUsername(user.id);
      const finalName     = displayName.trim() || profile?.full_name || finalUsername;
      const payload = {
        full_name:     finalName,
        username:      finalUsername,
        bio_short:     bioShort.trim() || null,
        bio_long:      bioLong.trim()  || null,
        twitter:       twitter.trim()  || null,
        facebook:      facebook.trim() || null,
        telegram:      telegram.trim() || null,
        date_of_birth: dob || null,
      };
      await updateProfile(user.id, payload);
      onUpdated({ ...profile, ...payload });
      setUsername(finalUsername);
      setDisplayName(finalName);
      setOpen(false); setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setErrors({ general: err.message?.includes("unique") ? "That username is already taken. Try another." : err.message });
    } finally { setBusy(false); }
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 14, overflow: "hidden" }}>

      {/* Profile header — always visible */}
      <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "#fff", flexShrink: 0, overflow: "hidden" }}>
          {avatarPreview
            ? <img src={avatarPreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (profile?.full_name || "U")[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
            <span style={{ fontWeight: 900, fontSize: 17, color: C.text }}>{profile?.full_name || "Creator"}</span>
            {isVerified && <VerifiedBadge />}
            {saved && <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>✓ Profile saved</span>}
          </div>
          {profile?.username && <div style={{ fontSize: 12, color: C.purple, fontWeight: 600 }}>@{profile.username}</div>}
          {profile?.bio_short && <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>{profile.bio_short}</div>}
          {(profile?.twitter || profile?.facebook || profile?.telegram) && (
            <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
              {profile.twitter  && <a href={`https://twitter.com/${profile.twitter}`}  target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#1D9BF0", fontWeight: 600, textDecoration: "none" }}>𝕏 @{profile.twitter}</a>}
              {profile.facebook && <a href={`https://facebook.com/${profile.facebook}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#1877F2", fontWeight: 600, textDecoration: "none" }}>f /{profile.facebook}</a>}
              {profile.telegram && <a href={`https://t.me/${profile.telegram}`}         target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#26A5E4", fontWeight: 600, textDecoration: "none" }}>✈ @{profile.telegram}</a>}
            </div>
          )}
        </div>
        <button onClick={() => setOpen(v => !v)}
          style={{ padding: "8px 16px", borderRadius: 9, border: `1px solid ${C.border}`, background: open ? C.panel : "transparent", color: open ? C.purple : C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "all .15s" }}>
          {open ? "✕ Close" : "✏ Edit Profile"}
        </button>
      </div>

      {/* Edit form */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* Avatar Upload */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 72, height: 72, borderRadius: 18, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 900, color: "#fff", flexShrink: 0, overflow: "hidden", border: `2px solid ${C.border}` }}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (profile?.full_name || "U")[0].toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Profile Picture</label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: avatarBusy ? C.panel : "transparent", color: avatarBusy ? C.muted : C.purple, fontWeight: 700, fontSize: 13, cursor: avatarBusy ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all .15s" }}>
                {avatarBusy ? <><Spinner /> Uploading…</> : "↑ Upload Photo"}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} disabled={avatarBusy} style={{ display: "none" }} />
              </label>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 5 }}>JPG, PNG or WebP · max 2 MB</div>
              {errors.avatar && <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>⚠ {errors.avatar}</div>}
            </div>
          </div>

          {/* Row: Display Name + Username */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Display Name</label>
              <input value={displayName} onChange={e => { setDisplayName(e.target.value); setErrors(p => ({...p, displayName: ""})); }}
                placeholder="Your name" maxLength={50}
                style={inputStyle(errors.displayName)}
                onFocus={e => e.target.style.borderColor = C.purple}
                onBlur={e => e.target.style.borderColor = errors.displayName ? "#B91C1C" : "#DDD6FE"} />
              {errors.displayName && <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>{errors.displayName}</div>}
            </div>
            <div>
              <label style={labelStyle}>Username <span style={{ color: C.faint, fontSize: 10, fontWeight: 400, textTransform: "none" }}>(auto-assigned if blank)</span></label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: C.faint, pointerEvents: "none" }}>@</span>
                <input value={username} onChange={e => { setUsername(e.target.value); setErrors(p => ({...p, username: ""})); }}
                  placeholder={genUsername(user?.id)} maxLength={32}
                  style={{ ...inputStyle(errors.username), paddingLeft: 26 }}
                  onFocus={e => e.target.style.borderColor = C.purple}
                  onBlur={e => e.target.style.borderColor = errors.username ? "#B91C1C" : "#DDD6FE"} />
              </div>
              {errors.username ? <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>{errors.username}</div>
                : <div style={{ fontSize: 10, color: C.faint, marginTop: 3 }}>letters, numbers, _ only</div>}
            </div>
          </div>

          {/* Short Bio */}
          <div>
            <label style={labelStyle}>Short Bio <span style={{ color: C.faint, fontSize: 10, fontWeight: 400, textTransform: "none" }}>(shown on profile card, max 200)</span></label>
            <input value={bioShort} onChange={e => { setBioShort(e.target.value); setErrors(p => ({...p, bioShort: ""})); }}
              placeholder="A one-liner about yourself…" maxLength={200}
              style={inputStyle(errors.bioShort)}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = errors.bioShort ? "#B91C1C" : "#DDD6FE"} />
            <div style={{ fontSize: 10, color: bioShort.length > 180 ? C.amber : C.faint, marginTop: 3, textAlign: "right" }}>{bioShort.length}/200</div>
          </div>

          {/* Long Bio */}
          <div>
            <label style={labelStyle}>Long Bio <span style={{ color: C.faint, fontSize: 10, fontWeight: 400, textTransform: "none" }}>(full about section)</span></label>
            <textarea value={bioLong} onChange={e => setBioLong(e.target.value)}
              placeholder="Tell your story, your mission, what you're building…" rows={4}
              style={{ ...inputStyle(false), resize: "vertical", lineHeight: 1.6 }}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = "#DDD6FE"} />
          </div>

          {/* Social links */}
          <div>
            <label style={labelStyle}>Social Links <span style={{ color: C.faint, fontSize: 10, fontWeight: 400, textTransform: "none" }}>(username only, no URL needed)</span></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[
                { label: "𝕏 Twitter", val: twitter, set: setTwitter, key: "twitter", ph: "yourhandle", prefix: "@" },
                { label: "f Facebook", val: facebook, set: setFacebook, key: "facebook", ph: "username", prefix: "/" },
                { label: "✈ Telegram", val: telegram, set: setTelegram, key: "telegram", ph: "username", prefix: "@" },
              ].map(({ label, val, set, key, ph, prefix }) => (
                <div key={key}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 600 }}>{label}</div>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.faint, pointerEvents: "none" }}>{prefix}</span>
                    <input value={val} onChange={e => { set(e.target.value); setErrors(p => ({...p, [key]: ""})); }}
                      placeholder={ph} maxLength={60}
                      style={{ ...inputStyle(errors[key]), paddingLeft: 22, fontSize: 13 }}
                      onFocus={e => e.target.style.borderColor = C.purple}
                      onBlur={e => e.target.style.borderColor = errors[key] ? "#B91C1C" : "#DDD6FE"} />
                  </div>
                  {errors[key] && <div style={{ fontSize: 10, color: C.red, marginTop: 2 }}>{errors[key]}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Date of Birth */}
          <div style={{ maxWidth: 220 }}>
            <label style={labelStyle}>Date of Birth <span style={{ color: C.faint, fontSize: 10, fontWeight: 400, textTransform: "none" }}>(optional, private)</span></label>
            <input type="date" value={dob} onChange={e => setDob(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              style={{ ...inputStyle(false), color: dob ? C.text : C.faint }}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = "#DDD6FE"} />
          </div>

          {errors.general && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: C.redDim, border: `1px solid ${C.redBorder}`, fontSize: 13, color: C.red, fontWeight: 600 }}>
              ⚠ {errors.general}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={save} disabled={busy}
              style={{ padding: "11px 28px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleBright})`, color: "#fff", fontWeight: 800, fontSize: 14, cursor: busy ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
              {busy ? <><Spinner color="#fff" /> Saving…</> : "💾 Save Profile"}
            </button>
            <button onClick={() => setOpen(false)}
              style={{ padding: "11px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Badge Purchase Section ────────────────────────────────────────────────────
function BadgeSection({ profile, onUpdated }) {
  const { user, walletAddress, walletProvider } = useWallet();
  const [badgePrice, setBadgePrice]   = useState(null);
  const [badgeWallet, setBadgeWallet] = useState(null);
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [step, setStep]               = useState("idle"); // idle|signing|confirming|done|error
  const [errMsg, setErrMsg]           = useState("");
  const [txSig, setTxSig]             = useState("");

  useEffect(() => {
    Promise.all([
      getPlatformSetting("badge_price_sol"),
      getPlatformSetting("badge_wallet"),
      getMyBadgeRequests(user.id),
    ]).then(([price, wallet, reqs]) => {
      setBadgePrice(parseFloat(price) || 0.5);
      setBadgeWallet(wallet);
      setRequests(reqs);
      setLoading(false);
    });
  }, [user.id]);

  const isVerified = profile?.is_verified && profile?.badge_expires_at && new Date(profile.badge_expires_at) > new Date();
  const hasPending = requests.some(r => r.status === "pending");
  const expiresAt  = profile?.badge_expires_at ? new Date(profile.badge_expires_at) : null;
  const daysLeft   = expiresAt ? Math.ceil((expiresAt - new Date()) / 86400000) : 0;

  const purchase = async () => {
    if (!walletAddress || !badgeWallet || !badgePrice) return;
    setStep("signing"); setErrMsg("");
    try {
      const sig = await sendSol(walletProvider, walletAddress, badgeWallet, badgePrice);
      setTxSig(sig); setStep("confirming");
      const req = await submitBadgeRequest(user.id, sig, badgePrice);
      setRequests(p => [req, ...p]);
      onUpdated({ ...profile, badge_tx: sig });
      setStep("done");
    } catch (e) {
      setErrMsg(e.message?.includes("rejected") || e.code === 4001 ? "Cancelled in Phantom." : e.message || "Transaction failed.");
      setStep("error");
    }
  };

  if (loading) return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 40, textAlign: "center", marginBottom: 14 }}>
      <Spinner size={24} />
    </div>
  );

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 28px", marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: .7, textTransform: "uppercase", marginBottom: 18 }}>Verified Badge</div>

      {/* Status banners */}
      {isVerified && (
        <div style={{ background: C.blueDim, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", flexShrink: 0 }}>✦</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.blue, marginBottom: 3 }}>You're Verified!</div>
            <div style={{ fontSize: 12, color: C.muted }}><b style={{ color: C.text }}>{daysLeft} days remaining</b> · expires {expiresAt?.toLocaleDateString()}</div>
          </div>
        </div>
      )}

      {hasPending && !isVerified && (
        <div style={{ background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 12, padding: "16px 20px", marginBottom: 20, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: C.purple, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#000", flexShrink: 0 }}>⏳</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.purple, marginBottom: 3 }}>Payment Received: Awaiting Approval</div>
            <div style={{ fontSize: 12, color: C.muted }}>Admin will review your request within 24 hours.</div>
          </div>
        </div>
      )}

      {/* What you get */}
      {!isVerified && !hasPending && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
            {[
              { icon: "✦", label: "Blue verified badge on profile" },
              { icon: "📋", label: "Badge shown on all campaigns" },
              { icon: "👥", label: "Higher contributor trust" },
              { icon: "⏱", label: "30 days from approval date" },
            ].map(f => (
              <div key={f.label} style={{ display: "flex", gap: 9, alignItems: "center", padding: "10px 12px", background: "#EDE9FE", borderRadius: 9, border: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 12, color: C.muted }}>{f.label}</span>
              </div>
            ))}
          </div>

          {/* Price box */}
          <div style={{ background: "#EDE9FE", border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 10, marginBottom: 10, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.muted }}>Verified Badge · 30 days</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 900, fontSize: 22, color: C.text }}>{badgePrice} <span style={{ fontSize: 14, fontWeight: 600, color: C.muted }}>SOL</span></div>
                <div style={{ fontSize: 11, color: C.faint }}>≈ ${(badgePrice * SOL_USD).toFixed(2)} USD</div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.faint }}>
              <span>Direct on-chain payment to FundBeep</span>
              <span>0% additional fees</span>
            </div>
          </div>

          {!walletAddress && (
            <div style={{ fontSize: 12, color: C.purple, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 8, padding: "9px 13px", marginBottom: 12 }}>
              ⚠️ Connect your Phantom wallet first (top-right corner)
            </div>
          )}

          {step === "error" && (
            <div style={{ fontSize: 12, color: C.red, background: C.redDim, border: `1px solid ${C.redBorder}`, borderRadius: 8, padding: "9px 13px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>⚠ {errMsg}</span>
              <button onClick={() => setStep("idle")} style={{ fontSize: 11, color: C.red, background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontFamily: "inherit" }}>Try again</button>
            </div>
          )}

          <button onClick={purchase} disabled={!walletAddress || (step !== "idle" && step !== "error")}
            style={{ width: "100%", padding: "14px 0", borderRadius: 11, border: "none", fontWeight: 800, fontSize: 15, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, transition: "all .2s", cursor: !walletAddress || (step !== "idle" && step !== "error") ? "not-allowed" : "pointer", background: !walletAddress || (step !== "idle" && step !== "error") ? C.panel : `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: !walletAddress || (step !== "idle" && step !== "error") ? C.muted : "#fff", boxShadow: walletAddress && step === "idle" ? "0 4px 24px rgba(109,40,217,.35)" : "none" }}>
            {step === "signing"    && <><Spinner color="#fff" /> Waiting for Phantom…</>}
            {step === "confirming" && <><Spinner color="#fff" /> Confirming on-chain…</>}
            {(step === "idle" || step === "error") && <>✦ Get Verified · {badgePrice} SOL</>}
          </button>
          <div style={{ textAlign: "center", fontSize: 11, color: C.faint, marginTop: 8 }}>Payment sent on-chain · admin review within 24 hours</div>
        </>
      )}

      {step === "done" && (
        <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: "14px 16px", marginTop: 4 }}>
          <div style={{ fontWeight: 700, color: C.green, marginBottom: 4 }}>✅ Payment sent!</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>Badge request is under review. Check back soon.</div>
          <a href={`https://solscan.io/tx/${txSig}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.purple, fontWeight: 700 }}>View on Solscan ↗</a>
        </div>
      )}

      {/* Request history */}
      {requests.length > 0 && (
        <div style={{ marginTop: 22, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.faint, letterSpacing: .6, textTransform: "uppercase", marginBottom: 10 }}>Payment History</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {requests.map(r => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#EDE9FE", border: `1px solid ${C.border}`, borderRadius: 10, gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{r.amount_sol} SOL</div>
                  <div style={{ fontSize: 11, color: C.faint }}>{new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                  {r.note && <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>Note: {r.note}</div>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <StatusPill status={r.status} />
                  <a href={`https://solscan.io/tx/${r.tx_signature}`} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: C.purple, fontWeight: 600 }}>View tx ↗</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Wallet Info ───────────────────────────────────────────────────────────────
// ── Wallet Verification ───────────────────────────────────────────────────────
function WalletVerification({ profile, onUpdated }) {
  const { user, walletAddress, walletProvider, setProfile: setCtxProfile } = useWallet();
  const [step, setStep]   = useState("idle"); // idle | signing | done | error
  const [errMsg, setErrMsg] = useState("");

  if (!profile?.wallet) return null;

  const alreadyVerified = profile?.wallet_verified;

  const handleVerify = async () => {
    if (!walletAddress) return;
    setStep("signing"); setErrMsg("");
    try {
      await verifyWalletOwnership(walletProvider, walletAddress);
      const updated = await markWalletVerified(user.id);
      onUpdated(updated);
      if (setCtxProfile) setCtxProfile(updated);
      setStep("done");
    } catch (e) {
      setErrMsg(e.message || "Verification failed");
      setStep("error");
    }
  };

  return (
    <div style={{ background: alreadyVerified ? "rgba(21,128,61,.04)" : C.surface, border: `1px solid ${alreadyVerified ? "rgba(21,128,61,.3)" : C.border}`, borderRadius: 16, padding: "22px 28px", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
              background: alreadyVerified ? "rgba(21,128,61,.12)" : C.panel,
              border: `1.5px solid ${alreadyVerified ? "rgba(21,128,61,.3)" : C.border}` }}>
              {alreadyVerified ? "✓" : "◎"}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: alreadyVerified ? C.green : C.text }}>
                {alreadyVerified ? "Wallet Verified" : "Verify Wallet Ownership"}
              </div>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>
                {alreadyVerified
                  ? `Verified on ${new Date(profile.wallet_verified_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                  : "Prove you own this wallet with a cryptographic signature"}
              </div>
            </div>
          </div>

          {!alreadyVerified && (
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.65, marginLeft: 42 }}>
              Sign a one-time message with Phantom to get a <b style={{ color: C.green }}>Verified Wallet ✓</b> badge on your campaigns and profile. <b>No SOL is spent</b>. It's just a signature.
            </div>
          )}
        </div>

        {alreadyVerified ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 99, background: "rgba(21,128,61,.1)", border: "1px solid rgba(21,128,61,.25)", flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: C.green }}>✓ On-Chain Verified</span>
          </div>
        ) : (
          <button onClick={handleVerify} disabled={step === "signing"}
            style={{ padding: "9px 20px", borderRadius: 10, border: "none", fontWeight: 800, fontSize: 13, cursor: step === "signing" ? "wait" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 7, flexShrink: 0, transition: "all .15s",
              background: step === "signing" ? C.panel : "linear-gradient(135deg, #15803D, #16a34a)",
              color: step === "signing" ? C.faint : "#fff",
              boxShadow: step === "signing" ? "none" : "0 4px 14px rgba(21,128,61,.3)" }}>
            {step === "signing"
              ? <><span style={{ width: 12, height: 12, border: "2px solid rgba(0,0,0,.1)", borderTopColor: C.green, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} /> Waiting for Phantom…</>
              : "◎ Verify Now (Free)"}
          </button>
        )}
      </div>

      {errMsg && (
        <div style={{ marginTop: 12, padding: "9px 14px", borderRadius: 8, background: "rgba(185,28,28,.06)", border: "1px solid rgba(185,28,28,.2)", fontSize: 12, color: "#B91C1C" }}>
          {errMsg}
        </div>
      )}
    </div>
  );
}

function WalletInfo({ profile }) {
  const [copied, setCopied] = useState(false);
  if (!profile?.wallet) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 28px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: .7, textTransform: "uppercase", marginBottom: 14 }}>Connected Wallet</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#EDE9FE", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
        <span style={{ color: C.purple, fontSize: 18, flexShrink: 0 }}>◎</span>
        <span style={{ fontFamily: "monospace", fontSize: 12, color: C.muted, flex: 1, wordBreak: "break-all" }}>{profile.wallet}</span>
        <button onClick={() => { navigator.clipboard.writeText(profile.wallet); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ padding: "5px 11px", borderRadius: 7, border: `1px solid ${C.border}`, background: copied ? C.purpleDim : "transparent", color: copied ? C.purple : C.faint, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <a href={`https://solscan.io/account/${profile.wallet}`} target="_blank" rel="noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12, color: C.purple, fontWeight: 600, textDecoration: "none" }}>
        View on Solscan ↗
      </a>
    </div>
  );
}

// ── Following Section ─────────────────────────────────────────────────────────
function FollowingSection({ userId, onViewCampaign, onViewUser }) {
  const [data, setData]     = useState({ campaigns: [], creators: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab]       = useState("campaigns");

  useEffect(() => {
    getUserFollowing(userId).then(setData).catch(() => {}).finally(() => setLoading(false));
  }, [userId]);

  const handleUnfollowCampaign = async (campaignId) => {
    await unfollowCampaign(userId, campaignId);
    setData(p => ({ ...p, campaigns: p.campaigns.filter(c => c.campaign_id !== campaignId) }));
  };
  const handleUnfollowCreator = async (creatorId) => {
    await unfollowCreator(userId, creatorId);
    setData(p => ({ ...p, creators: p.creators.filter(c => c.creator_id !== creatorId) }));
  };

  const total = data.campaigns.length + data.creators.length;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: "hidden", marginBottom: 14 }}>
      <div style={{ padding: "20px 28px 0", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: .7, textTransform: "uppercase" }}>Following</div>
            <div style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{total} total</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 0 }}>
          {[["campaigns", `Campaigns (${data.campaigns.length})`], ["creators", `Creators (${data.creators.length})`]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: "8px 16px", fontSize: 13, fontWeight: tab === id ? 700 : 500, color: tab === id ? C.purple : C.muted, background: "transparent", border: "none", borderBottom: `2px solid ${tab === id ? C.purple : "transparent"}`, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "16px 20px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Spinner size={22} /></div>
        ) : tab === "campaigns" ? (
          data.campaigns.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: C.faint, fontSize: 13 }}>You haven't followed any campaigns yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.campaigns.map(row => {
                const c = row.campaigns;
                if (!c) return null;
                const pct = Math.min(100, (+c.raised_sol / +c.goal_sol) * 100) || 0;
                return (
                  <div key={row.campaign_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, transition: "box-shadow .15s" }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 12px rgba(109,40,217,.08)"}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
                    {/* Thumbnail */}
                    <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, overflow: "hidden", background: `linear-gradient(135deg, ${C.panel}, #EDE9FE)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {c.image_url ? <img src={c.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (c.image_emoji || "🚀")}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                      <div style={{ height: 4, borderRadius: 99, background: C.border, marginTop: 5, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: `linear-gradient(90deg, ${C.purple}, ${C.purpleLight})` }} />
                      </div>
                      <div style={{ fontSize: 11, color: C.faint, marginTop: 3 }}>{pct.toFixed(0)}% funded · {c.raised_sol || 0} SOL raised</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                      <button onClick={() => onViewCampaign?.(c.id)}
                        style={{ padding: "4px 12px", borderRadius: 7, border: `1px solid ${C.purpleBorder}`, background: C.purpleSoft, color: C.purple, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                        View
                      </button>
                      <button onClick={() => handleUnfollowCampaign(row.campaign_id)}
                        style={{ padding: "4px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.faint, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                        Unfollow
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          data.creators.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: C.faint, fontSize: 13 }}>You haven't followed any creators yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.creators.map(row => {
                const p = row.profiles;
                if (!p) return null;
                return (
                  <div key={row.creator_id} onClick={() => onViewUser?.(row.creator_id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, cursor: onViewUser ? "pointer" : "default", transition: "box-shadow .12s" }}
                    onMouseEnter={e => { if (onViewUser) e.currentTarget.style.boxShadow = "0 2px 12px rgba(109,40,217,.08)"; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 900, color: "#fff", flexShrink: 0 }}>
                      {(p.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{p.full_name || p.username || "Creator"}</span>
                        {p.is_verified && <span style={{ fontSize: 11, color: C.purple }}>✓</span>}
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: 10, color: C.faint, marginTop: 2 }}>
                        {p.wallet ? `${p.wallet.slice(0, 6)}…${p.wallet.slice(-4)}` : "No wallet"}
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleUnfollowCreator(row.creator_id); }}
                      style={{ padding: "4px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.faint, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                      Unfollow
                    </button>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ── Backer Badges ─────────────────────────────────────────────────────────────
function BackerBadgesSection({ userId }) {
  const [badges, setBadges]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserBadges(userId)
      .then(setBadges)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  // Deduplicate by badge_type (keep earliest earned)
  const unique = Object.values(
    badges.reduce((acc, b) => { if (!acc[b.badge_type]) acc[b.badge_type] = b; return acc; }, {})
  );

  // All possible types in display order
  const ALL_TYPES = ["seed", "early", "flame", "diamond", "champion"];
  const earnedSet = new Set(unique.map(b => b.badge_type));

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "24px 28px", marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: .7, textTransform: "uppercase", marginBottom: 6 }}>Backer Badges</div>
      <div style={{ fontSize: 12, color: C.faint, marginBottom: 20 }}>Earned automatically when you contribute to campaigns.</div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 20 }}><Spinner size={22} /></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {ALL_TYPES.map(type => {
            const m = BADGE_META[type];
            const earned = earnedSet.has(type);
            const earnedBadge = unique.find(b => b.badge_type === type);
            return (
              <div key={type} style={{ borderRadius: 12, border: `1.5px solid ${earned ? m.border : C.border}`, background: earned ? m.bg : "#F9F9FB", padding: "14px 16px", transition: "all .2s", opacity: earned ? 1 : 0.45 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{m.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 13, color: earned ? m.color : C.faint, marginBottom: 3 }}>{m.name}</div>
                <div style={{ fontSize: 11, color: C.faint, lineHeight: 1.5, marginBottom: earned ? 8 : 0 }}>{m.desc}</div>
                {earned && earnedBadge?.campaigns?.title && (
                  <div style={{ fontSize: 10, color: m.color, fontWeight: 600, background: m.bg, padding: "3px 8px", borderRadius: 99, display: "inline-block" }}>
                    via {earnedBadge.campaigns.title.length > 22 ? earnedBadge.campaigns.title.slice(0, 22) + "…" : earnedBadge.campaigns.title}
                  </div>
                )}
                {!earned && (
                  <div style={{ fontSize: 10, color: C.faint, fontStyle: "italic" }}>Not yet earned</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && unique.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.border}`, fontSize: 12, color: C.muted }}>
          {unique.length} / {ALL_TYPES.length} badges earned
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ProfilePage({ onViewCampaign, onViewUser, openEdit }) {
  const { user, profile: ctx, walletAddress, setProfile: setCtxProfile } = useWallet();
  const [profile, setProfile] = useState(ctx);

  // Always re-fetch fresh profile on mount so admin-granted badges/limits show immediately
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) { setProfile(data); setCtxProfile(data); }
      }).catch(() => {});
  }, [user?.id]);

  useEffect(() => setProfile(ctx), [ctx]);

  if (!user || !walletAddress) return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>🔒</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: C.text, marginBottom: 6 }}>Connect your wallet</div>
        <div style={{ fontSize: 14, color: C.muted }}>Use the Connect Wallet button (top-right) to access your profile.</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "22px 40px" }}>
        <div style={{ fontWeight: 800, fontSize: 22, color: C.text }}>My Profile</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>Edit your public profile, bio, and social links</div>
      </div>
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "32px 24px 80px" }}>
        <ProfileEditSection   profile={profile} onUpdated={setProfile} autoOpen={openEdit} />
        <WalletVerification   profile={profile} onUpdated={setProfile} />
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#1E0A4C", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span>⭐</span> Trust Score
          </div>
          <ReputationScore userId={user.id} />
        </div>
        <FollowingSection     userId={user.id} onViewCampaign={onViewCampaign} onViewUser={onViewUser} />
        <BackerBadgesSection  userId={user.id} />
        <BadgeSection         profile={profile} onUpdated={setProfile} />
        <WalletInfo           profile={profile} />
      </div>
    </div>
  );
}
