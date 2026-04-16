import { useState, useEffect, useRef, useCallback } from "react";
import { Trash2, Heart, MessageCircle, Rocket, Leaf, Wallet, Zap } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import usePageMeta from "../hooks/usePageMeta";
import {
  getPosts, createPost, toggleLike, getMyLikes,
  getPostReplies, addReply, deletePost,
  getMonthlyPostCount, getPostPointBalance, getUserFreePostLimit,
  buyPostPoints, getPointsPurchases, getPlatformSetting,
  getActiveCampaignsByUserIds,
  followCreator, unfollowCreator, getFollowedCreatorIds,
  getBoostedCampaigns,
} from "../supabase";
import { sendSol } from "../utils/solana";

// ── V1.1 Purple light theme ───────────────────────────────────────────────────
const C = {
  bg:           "#F5F3FF",
  surface:      "#FFFFFF",
  panel:        "#EDE9FE",
  border:       "#DDD6FE",
  borderHover:  "#C4B5FD",
  text:         "#1E0A4C",
  textSub:      "#4C1D95",
  muted:        "#6B7280",
  faint:        "#9CA3AF",
  purple:       "#6D28D9",
  purpleLight:  "#7C3AED",
  purpleSoft:   "rgba(109,40,217,.08)",
  purpleBorder: "rgba(109,40,217,.2)",
  green:        "#15803D",
  greenDim:     "rgba(21,128,61,.08)",
  red:          "#B91C1C",
  redDim:       "rgba(185,28,28,.06)",
};

const FREE_MONTHLY_DEFAULT = 10;
const short = (a) => a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "";
const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (s < 60)  return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m`;
  if (s < 86400) return `${Math.floor(s/3600)}h`;
  return `${Math.floor(s/86400)}d`;
};

const EMOJIS = ["😀","😂","🔥","💜","✨","🚀","👍","🎉","💡","🙏","😎","🤔","❤️","💰","◎","⚡","🌙","👀","🫡","💎"];

// Extract YouTube video ID from any YouTube URL format in a string
const getYouTubeId = (text) => {
  if (!text) return null;
  const m = text.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

const Spinner = ({ size = 16, color = C.purple }) => (
  <span style={{ width: size, height: size, border: `2px solid rgba(109,40,217,.12)`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite", flexShrink: 0 }} />
);

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ profile, size = 38 }) {
  const initials = profile?.full_name?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || "?";
  if (profile?.avatar_url) {
    return (
      <div style={{ width: size, height: size, borderRadius: "50%", flexShrink: 0, overflow: "hidden", userSelect: "none" }}>
        <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * .38, fontWeight: 800, color: "#fff", flexShrink: 0, userSelect: "none" }}>
      {initials}
    </div>
  );
}

// ── Emoji Picker ──────────────────────────────────────────────────────────────
function EmojiPicker({ onPick }) {
  return (
    <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: 0, zIndex: 50, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px", boxShadow: "0 8px 32px rgba(109,40,217,.12)", display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 2, width: 260, animation: "slideDown .15s ease both" }}>
      {EMOJIS.map(e => (
        <button key={e} onClick={() => onPick(e)}
          style={{ width: 24, height: 24, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", transition: "background .1s" }}
          onMouseEnter={e2 => e2.currentTarget.style.background = C.panel}
          onMouseLeave={e2 => e2.currentTarget.style.background = "transparent"}>
          {e}
        </button>
      ))}
    </div>
  );
}

// ── Buy Points Modal ──────────────────────────────────────────────────────────
function BuyPointsModal({ onClose, userId, walletAddress, pointPrice, onSuccess }) {
  const [qty, setQty]       = useState(10);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState("");
  const ADMIN_WALLET        = import.meta.env.VITE_ADMIN_WALLET || "4nRpccQjTeYEPgtVUWtQpDtdGLPdsh15tt2zHQQyGcZ9";

  const total = (qty * pointPrice).toFixed(4);

  const buy = async () => {
    if (!walletAddress) return setErr("Connect wallet first");
    setLoading(true); setErr("");
    try {
      const sig = await sendSol(walletAddress, ADMIN_WALLET, parseFloat(total));
      await buyPostPoints(userId, qty, parseFloat(total), sig);
      onSuccess(qty);
    } catch (e) {
      setErr(e.message || "Transaction failed");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,0,50,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 420, background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(109,40,217,.15)", overflow: "hidden", animation: "fadeUp .2s ease both" }}>
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Buy Post Points</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>1 point = 1 extra post · {pointPrice} SOL each</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 16 }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>
          {/* Quick qty selector */}
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 8 }}>Select quantity</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 16 }}>
            {[5, 10, 25, 50].map(v => (
              <button key={v} onClick={() => setQty(v)}
                style={{ padding: "11px 0", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .12s", background: qty === v ? C.purpleSoft : C.bg, border: `1px solid ${qty === v ? C.purpleBorder : C.border}`, color: qty === v ? C.purple : C.muted }}>
                {v}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <input type="number" min={1} max={500} value={qty} onChange={e => setQty(Math.max(1, Math.min(500, +e.target.value || 1)))}
              style={{ width: "100%", padding: "11px 60px 11px 14px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.faint }}>points</span>
          </div>

          {/* Summary */}
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.muted }}>Points</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{qty}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: C.muted }}>Price per point</span>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{pointPrice} SOL</span>
            </div>
            <div style={{ height: 1, background: C.border, margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.textSub }}>Total</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: C.purple }}>{total} SOL</span>
            </div>
          </div>

          {err && <div style={{ fontSize: 12, color: C.red, marginBottom: 10 }}>{err}</div>}

          <button onClick={buy} disabled={loading}
            style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: "none", background: loading ? C.panel : `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: loading ? C.muted : "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .2s" }}>
            {loading ? <><Spinner color={C.purple} /><span>Processing…</span></> : <><Zap size={14} /> Buy {qty} Points: {total} SOL</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reply Thread ──────────────────────────────────────────────────────────────
function ReplyThread({ postId, currentUserId, onClose }) {
  const [replies, setReplies]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    getPostReplies(postId).then(r => { setReplies(r); setLoading(false); });
  }, [postId]);

  const send = async () => {
    if (!text.trim() || sending || !currentUserId) return;
    setSending(true);
    try {
      const r = await addReply(currentUserId, postId, text.trim());
      setReplies(prev => [...prev, r]);
      setText("");
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const insertEmoji = (emoji) => {
    const el = textRef.current;
    const pos = el.selectionStart;
    setText(t => t.slice(0, pos) + emoji + t.slice(pos));
    setShowEmoji(false);
    setTimeout(() => { el.focus(); el.setSelectionRange(pos + emoji.length, pos + emoji.length); }, 0);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,0,50,.45)", zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 560, maxHeight: "80vh", background: C.surface, borderRadius: 18, border: `1px solid ${C.border}`, boxShadow: "0 20px 60px rgba(109,40,217,.15)", display: "flex", flexDirection: "column", overflow: "hidden", animation: "fadeUp .2s ease both" }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Replies</span>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        {/* Replies list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 20px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 32 }}><Spinner size={24} /></div>
          ) : replies.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 13 }}>No replies yet. Be the first! 👇</div>
          ) : (
            replies.map(r => (
              <div key={r.id} style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <Avatar profile={r.profiles} size={30} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{r.profiles?.full_name || r.profiles?.username || short(r.profiles?.wallet)}</span>
                    {r.profiles?.is_verified && <span style={{ fontSize: 11, color: C.purple }}>✓</span>}
                    <span style={{ fontSize: 11, color: C.faint }}>{timeAgo(r.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, background: C.bg, borderRadius: "4px 12px 12px 12px", padding: "8px 12px", border: `1px solid ${C.border}` }}>{r.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Compose reply */}
        {currentUserId ? (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <textarea
                ref={textRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }}
                placeholder="Write a reply… (Ctrl+Enter to send)"
                maxLength={280}
                rows={2}
                style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6 }}
                onFocus={e => e.target.style.borderColor = C.purpleBorder}
                onBlur={e => e.target.style.borderColor = C.border}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
              <div style={{ position: "relative" }}>
                <button onClick={() => setShowEmoji(v => !v)}
                  style={{ border: "none", background: "transparent", fontSize: 18, cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}
                  onMouseEnter={e => e.currentTarget.style.background = C.panel}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  😊
                </button>
                {showEmoji && <EmojiPicker onPick={insertEmoji} />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: text.length > 250 ? C.red : C.faint }}>{text.length}/280</span>
                <button onClick={send} disabled={!text.trim() || sending}
                  style={{ padding: "7px 18px", borderRadius: 8, border: "none", background: text.trim() && !sending ? `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})` : C.panel, color: text.trim() && !sending ? "#fff" : C.muted, fontWeight: 700, fontSize: 13, cursor: text.trim() && !sending ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all .15s", display: "flex", alignItems: "center", gap: 6 }}>
                  {sending ? <Spinner size={13} color={C.purple} /> : "Reply"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 20px", textAlign: "center", color: C.muted, fontSize: 13 }}>Connect wallet to reply</div>
        )}
      </div>
    </div>
  );
}

// ── Boosted Campaign Feed Card ────────────────────────────────────────────────
function BoostedCampaignCard({ campaign, onViewCampaign }) {
  const [hov, setHov] = useState(false);
  const raised  = parseFloat(campaign.raised_sol) || 0;
  const goal    = parseFloat(campaign.goal_sol)   || 1;
  const pct     = Math.min(100, Math.round((raised / goal) * 100));
  const creator = campaign.profiles;
  const hasImage = campaign.image_url?.trim();

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: C.surface,
        border: `1px solid ${hov ? "rgba(234,179,8,.5)" : "rgba(234,179,8,.28)"}`,
        borderRadius: 16,
        overflow: "hidden",
        transition: "all .18s",
        boxShadow: hov ? "0 6px 24px rgba(234,179,8,.15)" : "0 2px 8px rgba(234,179,8,.08)",
      }}
    >
      {/* Gold boost stripe */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #F59E0B, #EAB308, #F59E0B)", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />

      {/* Sponsored label */}
      <div style={{ padding: "10px 16px 0", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 800, background: "rgba(234,179,8,.15)", color: "#D97706", padding: "2px 9px", borderRadius: 99, letterSpacing: .6, textTransform: "uppercase" }}>
          <Rocket size={10} style={{ display: "inline", marginRight: 4 }} /> Boosted Campaign
        </span>
      </div>

      {/* Campaign header */}
      <div style={{ padding: "10px 16px 0", display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* Thumbnail */}
        <div
          onClick={() => onViewCampaign?.(campaign.id)}
          style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0, cursor: "pointer",
            background: hasImage ? `url(${campaign.image_url}) center/cover` : "linear-gradient(135deg, #EDE9FE, #DDD6FE)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
          }}>
          {!hasImage && (campaign.image_emoji || "🎯")}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            onClick={() => onViewCampaign?.(campaign.id)}
            style={{ fontWeight: 800, fontSize: 15, color: C.text, cursor: "pointer", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            onMouseEnter={e => e.currentTarget.style.color = C.purple}
            onMouseLeave={e => e.currentTarget.style.color = C.text}
          >
            {campaign.title}
          </div>
          <div style={{ fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", width: 18, height: 18, borderRadius: "50%", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontSize: 9, fontWeight: 900, textAlign: "center", lineHeight: "18px", flexShrink: 0 }}>
              {creator?.full_name?.[0]?.toUpperCase() || "?"}
            </span>
            {creator?.full_name || "Creator"}
            {creator?.is_verified && <span style={{ color: C.purple }}>✓</span>}
            {campaign.category && <><span style={{ color: C.faint }}>·</span> {campaign.category}</>}
          </div>
        </div>
      </div>

      {/* Description */}
      {campaign.description && (
        <div style={{ padding: "8px 16px 0", fontSize: 13, color: C.muted, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {campaign.description}
        </div>
      )}

      {/* Progress */}
      <div style={{ padding: "12px 16px 0" }}>
        <div style={{ height: 5, borderRadius: 99, background: C.panel, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: "linear-gradient(90deg, #F59E0B, #EAB308)", transition: "width .4s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted }}>
          <span><b style={{ color: C.text }}>{raised.toFixed(2)} SOL</b> raised</span>
          <span><b style={{ color: C.text }}>{pct}%</b> of {goal} SOL</span>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: "12px 16px 14px" }}>
        <button
          onClick={() => onViewCampaign?.(campaign.id)}
          style={{
            width: "100%", padding: "9px 0", borderRadius: 9, border: "none",
            background: "linear-gradient(135deg, #F59E0B, #D97706)",
            color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", transition: "opacity .15s",
            opacity: hov ? 1 : 0.92,
          }}
        >
          Back This Campaign →
        </button>
      </div>
    </div>
  );
}

// ── Single Post Card ──────────────────────────────────────────────────────────
function PostCard({ post, isLiked, onLike, onReply, onDelete, currentUserId, campaigns = [], onViewCampaign, isFollowingCreator, onToggleFollowCreator, onViewUser }) {
  const [localLiked, setLocalLiked]   = useState(isLiked);
  const [localLikes, setLocalLikes]   = useState(post.like_count || 0);
  const [liking, setLiking]           = useState(false);
  const [showCampaignList, setShowCampaignList] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const isOwn = currentUserId === post.user_id;
  const name  = post.profiles?.full_name || post.profiles?.username || short(post.profiles?.wallet);

  const handleLike = async () => {
    if (!currentUserId || liking) return;
    setLiking(true);
    const newLiked = !localLiked;
    setLocalLiked(newLiked);
    setLocalLikes(l => newLiked ? l + 1 : Math.max(0, l - 1));
    try { await onLike(post.id, localLiked); } catch (_) { setLocalLiked(localLiked); setLocalLikes(post.like_count); }
    setLiking(false);
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", transition: "box-shadow .18s" }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = `0 4px 20px rgba(109,40,217,.07)`}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
      {/* Header row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <div onClick={() => onViewUser?.(post.user_id)} style={{ cursor: onViewUser ? "pointer" : "default", flexShrink: 0 }}>
          <Avatar profile={post.profiles} size={40} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span
              onClick={() => onViewUser?.(post.user_id)}
              style={{ fontWeight: 800, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: onViewUser ? "pointer" : "default" }}
            >{name}</span>
            {post.profiles?.is_verified && (
              <span style={{ fontSize: 11, background: C.purpleSoft, color: C.purple, borderRadius: 99, padding: "1px 7px", fontWeight: 700, flexShrink: 0 }}>✓ Verified</span>
            )}
            {post.profiles?.wallet_verified && (
              <span title="Wallet ownership verified on-chain" style={{ fontSize: 11, background: "rgba(21,128,61,.1)", color: "#15803D", borderRadius: 99, padding: "1px 7px", fontWeight: 700, border: "1px solid rgba(21,128,61,.18)", flexShrink: 0 }}>✓ Wallet</span>
            )}
            {campaigns.length > 0 && (
              <div style={{ position: "relative", flexShrink: 0 }}>
                <button
                  onClick={() => campaigns.length === 1 ? onViewCampaign(campaigns[0].id) : setShowCampaignList(v => !v)}
                  style={{ fontSize: 11, background: C.greenDim, color: C.green, borderRadius: 99, padding: "2px 9px", fontWeight: 700, border: `1px solid rgba(21,128,61,.2)`, cursor: "pointer", fontFamily: "inherit" }}>
                  <Rocket size={10} style={{ display: "inline", marginRight: 4 }} />{campaigns.length} Campaign{campaigns.length > 1 ? "s" : ""} running
                </button>
                {showCampaignList && campaigns.length > 1 && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 60, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(109,40,217,.12)", minWidth: 200, overflow: "hidden" }}>
                    {campaigns.map(c => (
                      <button key={c.id} onClick={() => { setShowCampaignList(false); onViewCampaign(c.id); }}
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "transparent", color: C.text, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                        onMouseEnter={e => e.currentTarget.style.background = C.bg}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        {c.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <span style={{ fontSize: 11, color: C.faint, marginLeft: "auto", flexShrink: 0 }}>{timeAgo(post.created_at)}</span>
            {!isOwn && currentUserId && onToggleFollowCreator && (
              <button
                onClick={async () => {
                  if (followLoading) return;
                  setFollowLoading(true);
                  await onToggleFollowCreator(post.user_id, isFollowingCreator);
                  setFollowLoading(false);
                }}
                style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 99, border: `1px solid ${isFollowingCreator ? C.purpleBorder : C.border}`, background: isFollowingCreator ? C.purpleSoft : "transparent", color: isFollowingCreator ? C.purple : C.faint, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, transition: "all .15s" }}>
                {followLoading ? "…" : isFollowingCreator ? "✓ Following" : "+ Follow"}
              </button>
            )}
            {isOwn && (
              <button onClick={() => onDelete(post.id)}
                style={{ border: "none", background: "transparent", color: C.faint, cursor: "pointer", padding: "2px 5px", borderRadius: 5, flexShrink: 0, display: "flex", alignItems: "center" }}
                title="Delete post"
                onMouseEnter={e => { e.currentTarget.style.color = C.red; e.currentTarget.style.background = C.redDim; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.faint; e.currentTarget.style.background = "transparent"; }}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div style={{ fontSize: 11, color: C.faint, fontFamily: "monospace", marginTop: 1 }}>{short(post.profiles?.wallet)}</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ fontSize: 14, color: C.text, lineHeight: 1.7, marginBottom: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", paddingLeft: 50 }}>
        {post.content}
      </div>

      {/* YouTube embed — auto-detected from post content */}
      {(() => {
        const ytId = getYouTubeId(post.content);
        if (!ytId) return null;
        return (
          <div style={{ paddingLeft: 50, marginBottom: 12 }}>
            <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
              />
            </div>
          </div>
        );
      })()}

      {/* Actions */}
      <div style={{ display: "flex", gap: 4, paddingLeft: 46 }}>
        {/* Like */}
        <button onClick={handleLike}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 99, border: `1px solid ${localLiked ? C.purpleBorder : "transparent"}`, background: localLiked ? C.purpleSoft : "transparent", color: localLiked ? C.purple : C.muted, fontWeight: 600, fontSize: 13, cursor: currentUserId ? "pointer" : "default", fontFamily: "inherit", transition: "all .15s" }}
          onMouseEnter={e => { if (currentUserId) { e.currentTarget.style.background = C.purpleSoft; e.currentTarget.style.color = C.purple; } }}
          onMouseLeave={e => { if (!localLiked) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; } }}>
          <Heart size={14} fill={localLiked ? "currentColor" : "none"} /> {localLikes > 0 && <span>{localLikes}</span>}
        </button>

        {/* Reply */}
        <button onClick={() => onReply(post.id)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 99, border: "1px solid transparent", background: "transparent", color: C.muted, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
          onMouseEnter={e => { e.currentTarget.style.background = C.purpleSoft; e.currentTarget.style.color = C.purple; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}>
          <MessageCircle size={14} /> {post.reply_count > 0 && <span>{post.reply_count}</span>}
        </button>
      </div>
    </div>
  );
}

// ── Compose Box ───────────────────────────────────────────────────────────────
function ComposeBox({ onPost, monthCount, freeLimit, pointBalance, walletAddress, onBuyPoints }) {
  const [text, setText]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showInfo, setShowInfo]   = useState(false);
  const textRef = useRef(null);

  const remaining = Math.max(0, freeLimit - monthCount);
  const canPost   = walletAddress && (remaining > 0 || pointBalance > 0);

  const submit = async () => {
    if (!text.trim() || loading || !canPost) return;
    setLoading(true); setErr("");
    try {
      const post = await onPost(text.trim());
      setText("");
      return post;
    } catch (e) {
      if (e.message === "NO_POINTS") setErr("No points left! Buy more to keep posting.");
      else setErr(e.message || "Failed to post");
    } finally { setLoading(false); }
  };

  const insertEmoji = (emoji) => {
    const el = textRef.current;
    const pos = el.selectionStart;
    setText(t => t.slice(0, pos) + emoji + t.slice(pos));
    setShowEmoji(false);
    setTimeout(() => { el.focus(); el.setSelectionRange(pos + emoji.length, pos + emoji.length); }, 0);
  };

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px 18px", marginBottom: 16 }}>
      {/* Quota bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>
            {remaining > 0
              ? <span style={{ color: C.green }}>✦ {remaining} free posts left this month</span>
              : <span style={{ color: C.muted }}>Monthly free posts used</span>}
          </span>
          {pointBalance > 0 && (
            <span style={{ fontSize: 11, background: C.purpleSoft, color: C.purple, borderRadius: 99, padding: "2px 9px", fontWeight: 700 }}>
              {pointBalance} pts
            </span>
          )}
          <button
            onClick={() => setShowInfo(v => !v)}
            title="How to earn more free posts"
            style={{ width: 18, height: 18, borderRadius: "50%", border: `1px solid ${C.border}`, background: showInfo ? C.purpleSoft : "transparent", color: showInfo ? C.purple : C.faint, fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s", fontFamily: "inherit" }}>
            ℹ
          </button>
        </div>
        <button onClick={onBuyPoints}
          style={{ fontSize: 12, fontWeight: 700, color: C.purple, border: `1px solid ${C.purpleBorder}`, background: C.purpleSoft, borderRadius: 99, padding: "4px 12px", cursor: "pointer", fontFamily: "inherit" }}
          onMouseEnter={e => e.currentTarget.style.background = C.panel}
          onMouseLeave={e => e.currentTarget.style.background = C.purpleSoft}>
          + Buy Points
        </button>
      </div>

      {/* Info panel — how to earn more free posts */}
      {showInfo && (
        <div style={{ background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: "11px 14px", marginBottom: 10, fontSize: 12, color: C.textSub, lineHeight: 1.7, animation: "slideDown .15s ease both" }}>
          <div style={{ fontWeight: 800, marginBottom: 5, color: C.purple }}>How to earn more free posts</div>
          <div>• <strong>Default:</strong> 10 free posts/month for all accounts</div>
          <div>• <strong>Account age:</strong> If your account is older than 1 year → <strong>30 free posts/month</strong></div>
          <div>• <strong>Successful campaigns:</strong> +1 post/month for every <strong>1 SOL raised</strong> in a completed campaign</div>
          <div style={{ marginTop: 5, color: C.muted }}>Or buy extra points above to post without limits.</div>
        </div>
      )}

      {/* Quota progress bar */}
      <div style={{ height: 3, borderRadius: 99, background: C.border, marginBottom: 14, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, (monthCount / freeLimit) * 100)}%`, borderRadius: 99, background: monthCount >= freeLimit ? C.red : `linear-gradient(90deg, ${C.purple}, ${C.purpleLight})`, transition: "width .6s ease" }} />
      </div>

      {/* Text area */}
      {!walletAddress ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: C.muted, fontSize: 13 }}>Connect your wallet to post</div>
      ) : (
        <>
          <div style={{ position: "relative" }}>
            <textarea
              ref={textRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(); }}
              placeholder={canPost ? "The more you post, the more the world discovers you." : "Buy points to keep posting this month"}
              disabled={!canPost}
              maxLength={500}
              rows={3}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: canPost ? C.bg : "#F8F7FF", color: C.text, fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.65, transition: "border .15s" }}
              onFocus={e => e.target.style.borderColor = C.purpleBorder}
              onBlur={e => e.target.style.borderColor = C.border}
            />
          </div>
          {err && <div style={{ fontSize: 12, color: C.red, marginTop: 6 }}>{err}</div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <div style={{ position: "relative" }}>
              <button onClick={() => setShowEmoji(v => !v)} disabled={!canPost}
                style={{ border: "none", background: "transparent", fontSize: 18, cursor: canPost ? "pointer" : "default", padding: "4px 6px", borderRadius: 6 }}
                onMouseEnter={e => { if (canPost) e.currentTarget.style.background = C.panel; }}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                😊
              </button>
              {showEmoji && <EmojiPicker onPick={insertEmoji} />}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: text.length > 450 ? C.red : C.faint }}>{text.length}/500</span>
              <button onClick={submit} disabled={!text.trim() || loading || !canPost}
                style={{ padding: "8px 22px", borderRadius: 9, border: "none", background: text.trim() && !loading && canPost ? `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})` : C.panel, color: text.trim() && !loading && canPost ? "#fff" : C.muted, fontWeight: 800, fontSize: 13, cursor: text.trim() && !loading && canPost ? "pointer" : "not-allowed", fontFamily: "inherit", transition: "all .18s", display: "flex", alignItems: "center", gap: 7, boxShadow: text.trim() && canPost ? `0 4px 16px rgba(109,40,217,.25)` : "none" }}>
                {loading ? <><Spinner size={13} color={C.purple} /><span>Posting…</span></> : "Post"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Explore Page ─────────────────────────────────────────────────────────
export default function Explore({ onViewCampaign, onViewUser }) {
  usePageMeta({
    title: "Explore | Solana Crowdfunding Community",
    description: "Explore the FundBeep community feed. Discover what creators and backers are discussing, share updates, and follow your favourite Solana campaign creators.",
    keywords: "solana crowdfunding community, web3 fundraising feed, crypto campaign updates, fundbeep explore, solana backer community",
    url: "https://fundbeep.com/#explore",
  });
  const { user, walletAddress } = useWallet();
  const [posts, setPosts]           = useState([]);
  const [likedIds, setLikedIds]     = useState(new Set());
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage]             = useState(0);
  const [hasMore, setHasMore]       = useState(true);
  const [monthCount, setMonthCount] = useState(0);
  const [freeLimit, setFreeLimit]   = useState(FREE_MONTHLY_DEFAULT);
  const [pointBalance, setPointBalance] = useState(0);
  const [pointPrice, setPointPrice] = useState(0.02);
  const [replyPostId, setReplyPostId] = useState(null);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [userCampaignsMap, setUserCampaignsMap] = useState({});
  const [followedCreators, setFollowedCreators] = useState(new Set());
  const [boostedCampaigns, setBoostedCampaigns] = useState([]);

  const LIMIT = 20;

  // Load initial data
  useEffect(() => {
    loadFeed(0, true);
    getPlatformSetting("post_point_price_sol").then(v => v && setPointPrice(parseFloat(v))).catch(() => {});
    getBoostedCampaigns().then(setBoostedCampaigns).catch(() => {});
  }, []);

  // Load user-specific data
  useEffect(() => {
    if (!user) return;
    getMonthlyPostCount(user.id).then(setMonthCount).catch(() => {});
    getPostPointBalance(user.id).then(setPointBalance).catch(() => {});
    getFollowedCreatorIds(user.id).then(setFollowedCreators).catch(() => {});
    getUserFreePostLimit(user.id).then(setFreeLimit).catch(() => {});
  }, [user]);

  const loadFeed = async (pg, reset = false) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const data = await getPosts({ page: pg, limit: LIMIT });
      setPosts(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === LIMIT);
      setPage(pg);
      if (data.length) {
        // Load which ones the user liked
        if (user) {
          const ids = data.map(p => p.id);
          getMyLikes(user.id, ids).then(liked => {
            setLikedIds(prev => new Set([...prev, ...liked]));
          });
        }
        // Load active campaigns for post authors
        const userIds = [...new Set(data.map(p => p.user_id).filter(Boolean))];
        getActiveCampaignsByUserIds(userIds).then(campaigns => {
          const map = {};
          campaigns.forEach(c => {
            if (!map[c.creator_id]) map[c.creator_id] = [];
            map[c.creator_id].push(c);
          });
          setUserCampaignsMap(prev => ({ ...prev, ...map }));
        }).catch(() => {});
      }
    } catch (e) { console.error(e); }
    finally { reset ? setLoading(false) : setLoadingMore(false); }
  };

  const handlePost = async (content) => {
    const newPost = await createPost(user.id, content);
    // Attach profile info optimistically
    newPost.profiles = { id: user.id, full_name: user.user_metadata?.full_name, wallet: walletAddress };
    setPosts(prev => [newPost, ...prev]);
    setMonthCount(c => c + 1);
    return newPost;
  };

  const handleLike = useCallback(async (postId, wasLiked) => {
    await toggleLike(user.id, postId, wasLiked);
    setLikedIds(prev => {
      const next = new Set(prev);
      wasLiked ? next.delete(postId) : next.add(postId);
      return next;
    });
  }, [user]);

  const handleDelete = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    await deletePost(postId, user.id);
    setPosts(prev => prev.filter(p => p.id !== postId));
    setMonthCount(c => Math.max(0, c - 1));
  };

  const handleToggleFollowCreator = useCallback(async (creatorId, isFollowing) => {
    if (!user) return;
    if (isFollowing) {
      await unfollowCreator(user.id, creatorId);
      setFollowedCreators(prev => { const next = new Set(prev); next.delete(creatorId); return next; });
    } else {
      await followCreator(user.id, creatorId);
      setFollowedCreators(prev => new Set([...prev, creatorId]));
    }
  }, [user]);

  const handleBuySuccess = (qty) => {
    setPointBalance(b => b + qty);
    setShowBuyModal(false);
  };

  const handleReplyUpdate = (postId) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p));
  };

  return (
    <div style={{ flex: 1, background: C.bg, minHeight: "100vh" }}>
      {/* Page header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 28px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: 20, color: C.text, letterSpacing: -.5 }}>Explore</h1>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>Public feed · text & emoji</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {user && (
              <div style={{ fontSize: 12, color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ background: monthCount >= freeLimit ? C.redDim : C.purpleSoft, color: monthCount >= freeLimit ? C.red : C.purple, borderRadius: 99, padding: "3px 10px", fontWeight: 700 }}>
                  {Math.max(0, freeLimit - monthCount)} / {freeLimit} free
                </span>
                {pointBalance > 0 && (
                  <span style={{ background: C.panel, color: C.purple, borderRadius: 99, padding: "3px 10px", fontWeight: 700 }}>
                    {pointBalance} pts
                  </span>
                )}
              </div>
            )}
            <button onClick={() => loadFeed(0, true)}
              style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.purpleBorder; e.currentTarget.style.color = C.purple; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
              ↻ Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Feed content */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "20px 16px" }}>
        {/* Compose */}
        {user && (
          <ComposeBox
            onPost={handlePost}
            monthCount={monthCount}
            freeLimit={freeLimit}
            pointBalance={pointBalance}
            walletAddress={walletAddress}
            onBuyPoints={() => setShowBuyModal(true)}
          />
        )}

        {!user && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "20px 24px", marginBottom: 16, textAlign: "center" }}>
            <div style={{ marginBottom: 8, color: C.faint }}><Wallet size={28} /></div>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>Connect wallet to post</div>
            <div style={{ fontSize: 12, color: C.muted }}>You can still browse and read all posts below.</div>
          </div>
        )}

        {/* Posts */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px 0" }}>
            <Spinner size={32} />
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ marginBottom: 14, color: C.faint }}><Leaf size={48} /></div>
            <div style={{ fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 6 }}>No posts yet</div>
            <div style={{ fontSize: 13, color: C.muted }}>Be the first to post something!</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {posts.map((post, idx) => {
                // Insert a boosted campaign card after every 5th post
                const boostSlot = Math.floor(idx / 5);
                const showBoost = boostedCampaigns.length > 0 && idx > 0 && idx % 5 === 0;
                const boostCamp = showBoost ? boostedCampaigns[boostSlot % boostedCampaigns.length] : null;
                return (
                  <div key={post.id}>
                    {boostCamp && (
                      <div style={{ marginBottom: 10 }}>
                        <BoostedCampaignCard campaign={boostCamp} onViewCampaign={onViewCampaign} />
                      </div>
                    )}
                    <PostCard
                      post={post}
                      isLiked={likedIds.has(post.id)}
                      onLike={handleLike}
                      onReply={(id) => setReplyPostId(id)}
                      onDelete={handleDelete}
                      currentUserId={user?.id}
                      campaigns={userCampaignsMap[post.user_id] || []}
                      onViewCampaign={onViewCampaign}
                      isFollowingCreator={followedCreators.has(post.user_id)}
                      onToggleFollowCreator={handleToggleFollowCreator}
                      onViewUser={onViewUser}
                    />
                  </div>
                );
              })}
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button onClick={() => loadFeed(page + 1)}
                  disabled={loadingMore}
                  style={{ padding: "10px 28px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surface, color: C.purple, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {loadingMore ? <><Spinner size={14} /> Loading…</> : "Load more posts"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reply thread modal */}
      {replyPostId && (
        <ReplyThread
          postId={replyPostId}
          currentUserId={user?.id}
          onClose={() => setReplyPostId(null)}
          onReply={() => handleReplyUpdate(replyPostId)}
        />
      )}

      {/* Buy points modal */}
      {showBuyModal && (
        <BuyPointsModal
          onClose={() => setShowBuyModal(false)}
          userId={user?.id}
          walletAddress={walletAddress}
          pointPrice={pointPrice}
          onSuccess={handleBuySuccess}
        />
      )}
    </div>
  );
}
