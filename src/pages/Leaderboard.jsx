import { useState, useEffect } from "react";
import { getMonthlyTopContributors, getMonthLeaderboardWins, recordMonthLeaderboard } from "../supabase";
import { useWallet } from "../context/WalletContext";
import usePageMeta from "../hooks/usePageMeta";
import { Trophy, Zap, Medal, Star, BadgeCheck, CheckCircle, Leaf, ChevronUp, ChevronDown } from "lucide-react";

const C = {
  bg:           "#F5F3FF",
  surface:      "#FFFFFF",
  border:       "#DDD6FE",
  text:         "#1E0A4C",
  muted:        "#6B7280",
  faint:        "#9CA3AF",
  purple:       "#6D28D9",
  purpleDim:    "rgba(109,40,217,.08)",
  purpleBorder: "rgba(109,40,217,.2)",
  yellow:       "#C9960C",
  yellowDim:    "rgba(201,150,12,.1)",
  yellowBorder: "rgba(201,150,12,.25)",
  gold:         "#F59E0B",
  silver:       "#9CA3AF",
  bronze:       "#B45309",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const MEDAL = ["1","2","3","4","5"];
const MEDAL_COLOR = [
  { bg: "linear-gradient(135deg,#F59E0B,#FCD34D)", text: "#78350F" },
  { bg: "linear-gradient(135deg,#9CA3AF,#E5E7EB)", text: "#374151" },
  { bg: "linear-gradient(135deg,#B45309,#D97706)", text: "#fff"    },
  { bg: C.purpleDim, text: C.purple },
  { bg: C.purpleDim, text: C.purple },
];

function Avatar({ name, size = 44 }) {
  const letter = (name || "?")[0].toUpperCase();
  const colors = [
    ["#6D28D9","#8B5CF6"], ["#0369A1","#0EA5E9"], ["#065F46","#10B981"],
    ["#9D174D","#EC4899"], ["#B45309","#F59E0B"], ["#1D4ED8","#60A5FA"],
  ];
  const idx = letter.charCodeAt(0) % colors.length;
  const [a, b] = colors[idx];
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `linear-gradient(135deg,${a},${b})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.42, fontWeight: 900, color: "#fff", flexShrink: 0,
      boxShadow: "0 2px 8px rgba(0,0,0,.12)",
    }}>{letter}</div>
  );
}

function BadgeTag({ win }) {
  const month = MONTHS[win.month - 1];
  const Icon = win.rank === 1 ? Trophy : win.rank <= 3 ? Medal : Star;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 20,
      background: win.rank === 1 ? "rgba(245,158,11,.12)" : C.purpleDim,
      border: `1px solid ${win.rank === 1 ? "rgba(245,158,11,.35)" : C.purpleBorder}`,
      fontSize: 11, fontWeight: 700,
      color: win.rank === 1 ? "#92400E" : C.purple,
    }}>
      <Icon size={11} /> Top {win.rank} · {month.slice(0,3)} {win.year}
    </span>
  );
}

function TopCard({ entry, rank, onViewUser }) {
  const mc = MEDAL_COLOR[rank] || MEDAL_COLOR[4];
  const isTop3 = rank < 3;
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${rank === 0 ? "rgba(245,158,11,.4)" : C.border}`,
      borderRadius: 16,
      padding: isTop3 ? "24px 20px" : "16px 20px",
      display: "flex", alignItems: "center", gap: 16,
      boxShadow: rank === 0 ? "0 4px 20px rgba(245,158,11,.12)" : "0 1px 4px rgba(0,0,0,.04)",
      cursor: "pointer", transition: "box-shadow .15s",
      animation: "fadeUp .4s ease both",
      animationDelay: `${rank * 80}ms`,
    }}
    onClick={() => onViewUser(entry.user_id)}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = rank === 0 ? "0 8px 28px rgba(245,158,11,.2)" : "0 4px 16px rgba(0,0,0,.08)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = rank === 0 ? "0 4px 20px rgba(245,158,11,.12)" : "0 1px 4px rgba(0,0,0,.04)"; }}
    >
      {/* Medal badge */}
      <div style={{
        width: isTop3 ? 40 : 32, height: isTop3 ? 40 : 32,
        borderRadius: "50%", background: mc.bg,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: isTop3 ? 20 : 16, flexShrink: 0,
        boxShadow: rank === 0 ? "0 2px 8px rgba(245,158,11,.3)" : "none",
      }}>{MEDAL[rank]}</div>

      <Avatar name={entry.full_name || entry.username || "?"} size={isTop3 ? 48 : 40} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 800, fontSize: isTop3 ? 16 : 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.full_name || entry.username || "Anonymous"}
          </span>
          {entry.is_verified && (new Date() < new Date(entry.badge_expires_at || "2099")) && (
            <BadgeCheck size={14} title="Verified" style={{ color: "#2563EB" }} />
          )}
          {entry.wallet_verified && <CheckCircle size={13} title="Wallet Verified" style={{ color: "#15803D" }} />}
        </div>
        {entry.username && (
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>@{entry.username}</div>
        )}
      </div>

      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ fontWeight: 900, fontSize: isTop3 ? 18 : 15, color: rank === 0 ? C.gold : C.purple }}>
          {parseFloat(entry.total_sol || 0).toFixed(3)}
        </div>
        <div style={{ fontSize: 11, color: C.faint, fontWeight: 600 }}>SOL</div>
      </div>
    </div>
  );
}

function PastMonth({ year, month, onViewUser }) {
  const [winners, setWinners] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || winners !== null) return;
    getMonthLeaderboardWins(year, month).then(setWinners).catch(() => setWinners([]));
  }, [open]);

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden", marginBottom: 8 }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", padding: "14px 18px", border: "none", background: C.surface,
        display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
        fontFamily: "inherit",
      }}>
        <Trophy size={18} style={{ color: C.gold, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: C.text, flex: 1, textAlign: "left" }}>
          {MONTHS[month - 1]} {year}
        </span>
        <span style={{ fontSize: 12, color: C.muted }}>Top 5</span>
        {open ? <ChevronUp size={14} style={{ color: C.faint, marginLeft: 6 }} /> : <ChevronDown size={14} style={{ color: C.faint, marginLeft: 6 }} />}
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", background: C.bg }}>
          {winners === null ? (
            <div style={{ textAlign: "center", padding: "16px 0", color: C.muted, fontSize: 13 }}>Loading…</div>
          ) : winners.length === 0 ? (
            <div style={{ textAlign: "center", padding: "12px 0", color: C.faint, fontSize: 13 }}>No data recorded.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {winners.map((w) => (
                <div key={w.id} onClick={() => onViewUser(w.user_id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, cursor: "pointer", transition: "background .12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.purpleDim}
                  onMouseLeave={e => e.currentTarget.style.background = C.surface}
                >
                  <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{MEDAL[w.rank - 1]}</span>
                  <Avatar name={w.profiles?.full_name || w.profiles?.username || "?"} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
                      {w.profiles?.full_name || w.profiles?.username || "Unknown"}
                    </div>
                    {w.profiles?.username && (
                      <div style={{ fontSize: 11, color: C.muted }}>@{w.profiles.username}</div>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: C.purple }}>
                    {parseFloat(w.total_sol || 0).toFixed(3)} SOL
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Leaderboard({ onViewUser }) {
  usePageMeta({
    title: "Contributor Leaderboard | Top Solana Backers",
    description: "See the top Solana crowdfunding contributors on FundBeep. Monthly leaderboard of the most active backers, ranked by SOL contributed.",
    keywords: "solana crowdfunding leaderboard, top crypto backers, fundbeep leaderboard, best solana contributors, web3 crowdfunding rankings",
    url: "https://fundbeep.com/#leaderboard",
  });
  const { user } = useWallet();
  const now = new Date();
  const thisYear  = now.getFullYear();
  const thisMonth = now.getMonth() + 1; // 1-indexed

  const [top5, setTop5]         = useState(null);
  const [pastMonths, setPastMonths] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        // Load this month's live top 5
        const live = await getMonthlyTopContributors(thisYear, thisMonth, 5);
        setTop5(live);

        // Auto-record last month's winners (if authenticated, silently)
        if (user) {
          const lm = thisMonth === 1 ? 12 : thisMonth - 1;
          const ly = thisMonth === 1 ? thisYear - 1 : thisYear;
          recordMonthLeaderboard(ly, lm).catch(() => {});
        }

        // Build list of past months to show (last 6 months)
        const past = [];
        for (let i = 1; i <= 6; i++) {
          let m = thisMonth - i;
          let y = thisYear;
          while (m <= 0) { m += 12; y -= 1; }
          past.push({ year: y, month: m });
        }
        setPastMonths(past);
      } catch (_) {
        setTop5([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "22px 40px", background: C.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Trophy size={28} style={{ color: C.gold }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, color: C.text }}>Contributor Leaderboard</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
              Top backers by SOL contributed · {MONTHS[thisMonth - 1]} {thisYear}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px 24px 80px" }}>

        {/* This month */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Zap size={16} style={{ color: C.purple }} />
            <span style={{ fontWeight: 800, fontSize: 17, color: C.text }}>This Month: Live Rankings</span>
            <span style={{
              marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "3px 10px",
              borderRadius: 20, background: "rgba(21,128,61,.1)", color: "#15803D",
              border: "1px solid rgba(21,128,61,.2)",
            }}>LIVE</span>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ height: 78, borderRadius: 16, background: C.surface, border: `1px solid ${C.border}`, opacity: .6 }} />
              ))}
            </div>
          ) : top5?.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 24px", background: C.surface, borderRadius: 16, border: `1px solid ${C.border}` }}>
              <div style={{ marginBottom: 12, color: C.faint }}><Leaf size={40} /></div>
              <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>No contributions yet this month</div>
              <div style={{ fontSize: 13, color: C.muted }}>Be the first to back a campaign and claim the top spot!</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(top5 || []).map((entry, i) => (
                <TopCard key={entry.user_id} entry={entry} rank={i} onViewUser={onViewUser} />
              ))}
            </div>
          )}
        </div>

        {/* Past champions */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 16 }}>📜</span>
            <span style={{ fontWeight: 800, fontSize: 17, color: C.text }}>Past Champions</span>
          </div>
          <div>
            {pastMonths.map(({ year, month }) => (
              <PastMonth key={`${year}-${month}`} year={year} month={month} onViewUser={onViewUser} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
