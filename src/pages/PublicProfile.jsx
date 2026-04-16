import { useState, useEffect } from "react";
import ReputationScore from "../components/ReputationScore";
import {
  getPublicProfile,
  getUserTotalContributed,
  getUserContributionCount,
  getUserBadges,
  getUserLeaderboardWins,
  getUserCampaigns,
  getProfileFollowStats,
  getUserFollowingList,
  getUserFollowersList,
  followCreator,
  unfollowCreator,
} from "../supabase";
import { useWallet } from "../context/WalletContext";

const C = {
  bg:           "#F5F3FF",
  surface:      "#FFFFFF",
  border:       "#DDD6FE",
  text:         "#1E0A4C",
  textSub:      "#4C1D95",
  muted:        "#6B7280",
  faint:        "#9CA3AF",
  purple:       "#6D28D9",
  purpleDim:    "rgba(109,40,217,.08)",
  purpleBorder: "rgba(109,40,217,.2)",
  yellow:       "#C9960C",
  yellowDim:    "rgba(201,150,12,.1)",
  gold:         "#F59E0B",
  green:        "#15803D",
  greenDim:     "rgba(21,128,61,.1)",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function Avatar({ name, avatarUrl, size = 72 }) {
  const letter = (name || "?")[0].toUpperCase();
  const palettes = [
    ["#6D28D9","#8B5CF6"], ["#0369A1","#0EA5E9"], ["#065F46","#10B981"],
    ["#9D174D","#EC4899"], ["#B45309","#F59E0B"], ["#1D4ED8","#60A5FA"],
    ["#7C3AED","#A78BFA"], ["#B91C1C","#F87171"],
  ];
  const [a, b] = palettes[letter.charCodeAt(0) % palettes.length];
  if (avatarUrl) {
    return (
      <div style={{ width: size, height: size, borderRadius: size * 0.28, flexShrink: 0, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,.14)" }}>
        <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `linear-gradient(135deg,${a},${b})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.44, fontWeight: 900, color: "#fff",
      boxShadow: "0 4px 16px rgba(0,0,0,.14)", flexShrink: 0,
    }}>{letter}</div>
  );
}

function StatBox({ icon, label, value, sub }) {
  return (
    <div style={{
      flex: 1, minWidth: 120,
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "14px 16px", textAlign: "center",
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontWeight: 900, fontSize: 18, color: C.purple }}>{value}</div>
      {sub && <div style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{sub}</div>}
      <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SocialLink({ icon, label, href, color }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      padding: "8px 14px", borderRadius: 20,
      background: C.surface, border: `1px solid ${C.border}`,
      color: color || C.purple, textDecoration: "none",
      fontWeight: 700, fontSize: 13, transition: "all .12s",
    }}
    onMouseEnter={e => { e.currentTarget.style.background = C.purpleDim; e.currentTarget.style.borderColor = C.purpleBorder; }}
    onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}
    >
      {icon} {label}
    </a>
  );
}

function Section({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function CampaignCard({ c, onViewCampaign }) {
  const pct = c.goal_sol > 0 ? Math.min(100, (c.raised_sol / c.goal_sol) * 100) : 0;
  const statusLabel = c.status === "active" ? "● Live"
    : c.status === "paused" ? "⏸ Paused"
    : "✓ Ended";
  const statusStyle = c.status === "active"
    ? { background: C.greenDim, color: C.green }
    : c.status === "paused"
    ? { background: "rgba(245,158,11,.1)", color: "#B45309" }
    : { background: C.purpleDim, color: C.purple };
  return (
    <div onClick={() => onViewCampaign?.(c.id)} style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "14px 16px",
      cursor: onViewCampaign ? "pointer" : "default",
      transition: "box-shadow .12s",
    }}
    onMouseEnter={e => { if (onViewCampaign) e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {c.image_url ? (
          <img src={c.image_url} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
        ) : c.image_emoji ? (
          <div style={{ width: 40, height: 40, borderRadius: 8, background: C.purpleDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{c.image_emoji}</div>
        ) : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.title}
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 5, ...statusStyle }}>
            {statusLabel}
          </span>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: C.purple }}>{parseFloat(c.raised_sol || 0).toFixed(2)} SOL</div>
          <div style={{ fontSize: 10, color: C.faint }}>of {parseFloat(c.goal_sol || 0).toFixed(2)}</div>
        </div>
      </div>
      <div style={{ height: 4, background: C.border, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${C.purple},#8B5CF6)`, borderRadius: 4, transition: "width .4s" }} />
      </div>
    </div>
  );
}

const BADGE_ICONS = { first_backer:"🥇", top_backer:"🌟", milestone_backer:"🎯", consistent_backer:"🔄" };
const BADGE_LABELS = { first_backer:"First Backer", top_backer:"Top Backer", milestone_backer:"Milestone Backer", consistent_backer:"Consistent Backer" };

function BadgeChip({ b }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 12px", borderRadius: 10,
      background: C.yellowDim, border: "1px solid rgba(201,150,12,.25)",
    }}>
      <span style={{ fontSize: 18 }}>{BADGE_ICONS[b.badge_type] || "🏅"}</span>
      <div>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.yellow }}>
          {BADGE_LABELS[b.badge_type] || b.badge_type}
        </div>
        {b.campaigns?.title && (
          <div style={{ fontSize: 11, color: C.muted }}>{b.campaigns.title}</div>
        )}
      </div>
    </div>
  );
}

function LeaderboardWinChip({ w }) {
  const month = MONTHS[w.month - 1];
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 12px", borderRadius: 10,
      background: w.rank === 1 ? "rgba(245,158,11,.1)" : C.purpleDim,
      border: `1px solid ${w.rank === 1 ? "rgba(245,158,11,.35)" : C.purpleBorder}`,
    }}>
      <span style={{ fontSize: 20 }}>{w.rank === 1 ? "🥇" : w.rank === 2 ? "🥈" : w.rank === 3 ? "🥉" : "⭐"}</span>
      <div>
        <div style={{ fontWeight: 800, fontSize: 12, color: w.rank === 1 ? "#92400E" : C.purple }}>
          {w.rank === 1 ? "🏆 Champion" : `Top ${w.rank}`} · {month} {w.year}
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>{parseFloat(w.total_sol || 0).toFixed(3)} SOL contributed</div>
      </div>
    </div>
  );
}

function Skeleton({ h = 16, w = "100%", r = 8 }) {
  return (
    <div style={{ height: h, width: w, borderRadius: r, background: "linear-gradient(90deg,#EDE9FE 25%,#F5F3FF 50%,#EDE9FE 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
  );
}

function PersonChip({ p, onViewUser }) {
  const isVerified = p?.is_verified && (new Date() < new Date(p?.badge_expires_at || "2099"));
  return (
    <div onClick={() => onViewUser?.(p.id)} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", borderRadius: 10,
      background: C.surface, border: `1px solid ${C.border}`,
      cursor: onViewUser ? "pointer" : "default", transition: "background .12s",
    }}
    onMouseEnter={e => { if (onViewUser) e.currentTarget.style.background = C.purpleDim; }}
    onMouseLeave={e => { e.currentTarget.style.background = C.surface; }}
    >
      <Avatar name={p?.full_name || p?.username || "?"} avatarUrl={p?.avatar_url} size={34} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p?.full_name || p?.username || "Anonymous"}
          </span>
          {isVerified && <span style={{ fontSize: 11 }}>🔵</span>}
        </div>
        {p?.username && <div style={{ fontSize: 11, color: C.muted }}>@{p.username}</div>}
      </div>
    </div>
  );
}

export default function PublicProfile({ userId, onBack, onViewCampaign, onViewUser }) {
  const { user } = useWallet();
  const [profile,       setProfile]       = useState(null);
  const [totalSol,      setTotalSol]      = useState(null);
  const [ctbCount,      setCtbCount]      = useState(null);
  const [badges,        setBadges]        = useState(null);
  const [wins,          setWins]          = useState(null);
  const [campaigns,     setCampaigns]     = useState(null);
  const [followStats,   setFollowStats]   = useState({ followersCount: 0, followingCount: 0, isFollowing: false });
  const [followingList, setFollowingList] = useState(null);
  const [followersList, setFollowersList] = useState(null);
  const [followBusy,    setFollowBusy]    = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);

  const isSelf = user?.id === userId;

  useEffect(() => {
    if (!userId) { setNotFound(true); return; }
    setLoading(true); setNotFound(false);
    setProfile(null); setTotalSol(null); setCtbCount(null);
    setBadges(null); setWins(null); setCampaigns(null);
    setFollowingList(null); setFollowersList(null);

    Promise.all([
      getPublicProfile(userId).catch(() => null),
      getUserTotalContributed(userId).catch(() => 0),
      getUserContributionCount(userId).catch(() => 0),
      getUserBadges(userId).catch(() => []),
      getUserLeaderboardWins(userId).catch(() => []),
      getUserCampaigns(userId).catch(() => []),
      getProfileFollowStats(userId, user?.id || null).catch(() => ({ followersCount: 0, followingCount: 0, isFollowing: false })),
      getUserFollowingList(userId).catch(() => []),
      getUserFollowersList(userId).catch(() => []),
    ]).then(([p, sol, cnt, bdg, wns, camps, fstats, following, followers]) => {
      if (!p) { setNotFound(true); setLoading(false); return; }
      setProfile(p);
      setTotalSol(sol);
      setCtbCount(cnt);
      setBadges(bdg);
      setWins(wns);
      setCampaigns(camps);
      setFollowStats(fstats);
      setFollowingList(following);
      setFollowersList(followers);
      setLoading(false);
    });
  }, [userId, user?.id]);

  const toggleFollow = async () => {
    if (!user || isSelf || followBusy) return;
    setFollowBusy(true);
    try {
      if (followStats.isFollowing) {
        await unfollowCreator(user.id, userId);
        setFollowStats(s => ({ ...s, isFollowing: false, followersCount: Math.max(0, s.followersCount - 1) }));
        setFollowersList(l => (l || []).filter(r => r.follower_id !== user.id));
      } else {
        await followCreator(user.id, userId);
        setFollowStats(s => ({ ...s, isFollowing: true, followersCount: s.followersCount + 1 }));
        // Re-fetch followers list to get the new entry with profile
        getUserFollowersList(userId).then(setFollowersList).catch(() => {});
      }
    } catch (_) {}
    setFollowBusy(false);
  };

  if (notFound) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 8 }}>Profile not found</div>
        <button onClick={onBack} style={{ padding: "10px 22px", borderRadius: 9, border: "none", background: C.purple, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>← Go Back</button>
      </div>
    </div>
  );

  const isVerified = profile?.is_verified && (new Date() < new Date(profile.badge_expires_at || "2099"));
  const joinedDate = profile?.created_at ? new Date(profile.created_at) : null;
  const dob        = profile?.date_of_birth ? new Date(profile.date_of_birth) : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
      `}</style>

      {/* Header bar */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "14px 28px", background: C.surface, display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            ← Back
          </button>
        )}
        <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Public Profile</div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "28px 24px 80px", animation: "fadeUp .4s ease" }}>

        {/* Profile header card */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 18, padding: "28px 24px", marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,.04)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
            {loading ? <Skeleton h={72} w={72} r={20} /> : (
              <Avatar name={profile?.full_name || profile?.username || "?"} avatarUrl={profile?.avatar_url} size={72} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              {loading ? (
                <>
                  <Skeleton h={22} w={180} r={6} />
                  <div style={{ height: 6 }} />
                  <Skeleton h={14} w={120} r={5} />
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h1 style={{ margin: 0, fontWeight: 900, fontSize: 22, color: C.text }}>
                      {profile?.full_name || profile?.username || "Anonymous"}
                    </h1>
                    {isVerified && (
                      <span title="Blue Verified Badge" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: "rgba(37,99,235,.1)", border: "1px solid rgba(37,99,235,.25)", fontSize: 11, fontWeight: 800, color: "#1D4ED8" }}>
                        🔵 Verified
                      </span>
                    )}
                    {profile?.wallet_verified && (
                      <span title="Wallet Verified" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 20, background: C.greenDim, border: "1px solid rgba(21,128,61,.2)", fontSize: 11, fontWeight: 800, color: C.green }}>
                        ✅ Wallet Verified
                      </span>
                    )}
                  </div>
                  {profile?.username && (
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>@{profile.username}</div>
                  )}
                  {/* Reputation compact badge */}
                  <div style={{ marginTop: 10, marginBottom: 4 }}>
                    <ReputationScore userId={userId} compact />
                  </div>
                  {/* Followers / following counts */}
                  <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>
                      <span style={{ fontWeight: 900 }}>{followStats.followersCount}</span>
                      <span style={{ fontWeight: 500, color: C.muted }}> Followers</span>
                    </span>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>
                      <span style={{ fontWeight: 900 }}>{followStats.followingCount}</span>
                      <span style={{ fontWeight: 500, color: C.muted }}> Following</span>
                    </span>
                  </div>
                  {/* Meta info row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", marginTop: 8 }}>
                    {joinedDate && (
                      <span style={{ fontSize: 12, color: C.faint, display: "flex", alignItems: "center", gap: 4 }}>
                        📅 Joined {joinedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </span>
                    )}
                    {dob && (
                      <span style={{ fontSize: 12, color: C.faint, display: "flex", alignItems: "center", gap: 4 }}>
                        🎂 {dob.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  {/* Follow button */}
                  {!isSelf && user && (
                    <div style={{ marginTop: 12 }}>
                      <button onClick={toggleFollow} disabled={followBusy} style={{
                        padding: "8px 20px", borderRadius: 20, fontFamily: "inherit",
                        fontWeight: 800, fontSize: 13, cursor: followBusy ? "default" : "pointer",
                        border: followStats.isFollowing ? `1px solid ${C.purpleBorder}` : "none",
                        background: followStats.isFollowing ? "transparent" : `linear-gradient(135deg,${C.purple},#8B5CF6)`,
                        color: followStats.isFollowing ? C.purple : "#fff",
                        transition: "all .15s",
                      }}>
                        {followBusy ? "…" : followStats.isFollowing ? "✓ Following" : "+ Follow"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Short bio */}
          {!loading && profile?.bio_short && (
            <p style={{ margin: "16px 0 0", fontSize: 14, color: C.textSub, lineHeight: 1.6, fontStyle: "italic" }}>
              "{profile.bio_short}"
            </p>
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
          <StatBox icon="💸" label="Total Contributed"
            value={totalSol !== null ? `${parseFloat(totalSol).toFixed(3)}` : "—"}
            sub={totalSol !== null ? "SOL" : undefined} />
          <StatBox icon="🤝" label="Contributions"
            value={ctbCount !== null ? ctbCount : "—"} />
          <StatBox icon="🏆" label="Leaderboard Wins"
            value={wins !== null ? wins.length : "—"} />
          <StatBox icon="🎖" label="Badges Earned"
            value={badges !== null ? badges.length : "—"} />
        </div>

        {/* Trust Score */}
        {!loading && profile && (
          <Section title="Trust Score" icon="⭐">
            <ReputationScore userId={userId} />
          </Section>
        )}

        {/* Social links */}
        {!loading && (profile?.twitter || profile?.facebook || profile?.telegram) && (
          <Section title="Social" icon="🌐">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {profile.twitter && (
                <SocialLink
                  icon="𝕏"
                  label={`Follow @${profile.twitter}`}
                  href={`https://x.com/${profile.twitter}`}
                  color="#000"
                />
              )}
              {profile.telegram && (
                <SocialLink
                  icon="✈️"
                  label={`Chat on Telegram`}
                  href={`https://t.me/${profile.telegram}`}
                  color="#0088CC"
                />
              )}
              {profile.facebook && (
                <SocialLink
                  icon="f"
                  label={`Facebook`}
                  href={`https://facebook.com/${profile.facebook}`}
                  color="#1877F2"
                />
              )}
            </div>
          </Section>
        )}

        {/* Long bio */}
        {!loading && profile?.bio_long && (
          <Section title="About" icon="📝">
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: "16px 18px",
              fontSize: 14, color: C.textSub, lineHeight: 1.75, whiteSpace: "pre-wrap",
            }}>
              {profile.bio_long}
            </div>
          </Section>
        )}

        {/* Leaderboard wins */}
        {!loading && wins && wins.length > 0 && (
          <Section title="Leaderboard Wins" icon="🏆">
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {wins.map(w => <LeaderboardWinChip key={w.id} w={w} />)}
            </div>
          </Section>
        )}

        {/* Contributor badges */}
        {!loading && badges && badges.length > 0 && (
          <Section title="Contributor Badges" icon="🎖">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {badges.map(b => <BadgeChip key={b.id} b={b} />)}
            </div>
          </Section>
        )}

        {/* Running / paused campaigns */}
        {!loading && campaigns && campaigns.filter(c => c.status === "active" || c.status === "paused").length > 0 && (
          <Section title="Campaigns" icon="🟢">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {campaigns.filter(c => c.status === "active" || c.status === "paused").map(c => (
                <CampaignCard key={c.id} c={c} onViewCampaign={onViewCampaign} />
              ))}
            </div>
          </Section>
        )}

        {/* Past / completed campaigns */}
        {!loading && campaigns && campaigns.filter(c => c.status === "completed").length > 0 && (
          <Section title="Past Campaigns" icon="📁">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {campaigns.filter(c => c.status === "completed").map(c => (
                <CampaignCard key={c.id} c={c} onViewCampaign={onViewCampaign} />
              ))}
            </div>
          </Section>
        )}

        {/* Followers */}
        {!loading && followersList && followersList.length > 0 && (
          <Section title={`Followers (${followersList.length})`} icon="👥">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {followersList.map(r => (
                <PersonChip key={r.follower_id} p={r.profiles} onViewUser={onViewUser} />
              ))}
            </div>
          </Section>
        )}

        {/* Following */}
        {!loading && followingList && followingList.length > 0 && (
          <Section title={`Following (${followingList.length})`} icon="➡️">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              {followingList.map(r => (
                <PersonChip key={r.creator_id} p={r.profiles} onViewUser={onViewUser} />
              ))}
            </div>
          </Section>
        )}

        {/* Empty state */}
        {!loading && profile && !profile.bio_short && !profile.bio_long && ctbCount === 0 && campaigns?.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 24px", background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, color: C.muted, fontSize: 14 }}>
            This user hasn't added any activity yet.
          </div>
        )}
      </div>
    </div>
  );
}
