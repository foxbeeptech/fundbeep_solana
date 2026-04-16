import { useState, useEffect } from "react";
import { getCampaigns, recordContribution } from "../supabase";
import { useWallet } from "../context/WalletContext";
import { sendSol } from "../utils/solana";
import usePageMeta from "../hooks/usePageMeta";
import { Zap, IdCard, Building2, Rocket, Search, CheckCircle, X } from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile";

const SOL_USD = 148;
const short  = (a) => a ? `${a.slice(0,4)}…${a.slice(-4)}` : "";
const toUSD  = (s) => (s * SOL_USD).toLocaleString("en-US", { maximumFractionDigits: 0 });
const pctOf  = (r, g) => g > 0 ? Math.min((+r / +g) * 100, 100) : 0;

const daysLeft = (end) => {
  if (!end) return null;
  const d = Math.ceil((new Date(end) - Date.now()) / 86400000);
  return d;
};

const C = {
  yellow: "#C9960C", yellowLight: "#E8B904",
  yellowDim: "rgba(201,150,12,.1)", yellowBorder: "rgba(201,150,12,.25)",
  purple: "#6D28D9", purpleLight: "#7C3AED",
  purpleDim: "rgba(109,40,217,.08)", purpleBorder: "rgba(109,40,217,.2)",
  bg: "#F1F3F8", surface: "#FFFFFF", surfaceHover: "#F8F9FC",
  border: "#E2E5EE", borderHover: "#C8CDD9",
  text: "#0F1117", textSub: "#374151", muted: "#6B7280", faint: "#9CA3AF",
  green: "#15803D", greenDim: "rgba(21,128,61,.1)",
  red: "#B91C1C", redDim: "rgba(185,28,28,.08)",
};

const CATEGORIES = [
  { key: "All",          emoji: "✦"  },
  { key: "Technology",   emoji: "💻" },
  { key: "Art",          emoji: "🎨" },
  { key: "Music",        emoji: "🎵" },
  { key: "Gaming",       emoji: "🎮" },
  { key: "Community",    emoji: "🌱" },
  { key: "Education",    emoji: "📚" },
  { key: "Health",       emoji: "❤️" },
  { key: "Environment",  emoji: "🌿" },
  { key: "Business",     emoji: "💼" },
  { key: "Sports",       emoji: "⚽" },
  { key: "Other",        emoji: "◎"  },
];

const SORTS = [
  { key: "newest",      label: "Newest"       },
  { key: "most_raised", label: "Most Raised"  },
  { key: "most_funded", label: "Most Funded"  },
  { key: "ending_soon", label: "Ending Soon"  },
];

const STATUSES = [
  { key: "active",    label: "● Active"     },
  { key: "all",       label: "All"           },
  { key: "completed", label: "✓ Completed"  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const Spinner = ({ color = C.purple, size = 14 }) => (
  <span style={{ width: size, height: size, border: `2px solid rgba(0,0,0,.08)`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite", flexShrink: 0 }} />
);

function StatusBadge({ status }) {
  const map = {
    active:    { label: "● Live",    bg: "rgba(21,128,61,.88)"  },
    pending:   { label: "◐ Pending", bg: "rgba(146,64,14,.88)"  },
    completed: { label: "✓ Ended",   bg: "rgba(30,10,76,.85)"   },
    paused:    { label: "⏸ Paused", bg: "rgba(55,65,81,.82)"   },
  };
  const s = map[status] || map.pending;
  return <span style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 800, background: s.bg, color: "#fff", backdropFilter: "blur(4px)", letterSpacing: .3 }}>{s.label}</span>;
}

function ProgressBar({ pct, height = 7 }) {
  return (
    <div style={{ height, borderRadius: 99, background: "#EEF0F6", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${C.yellowLight}aa, ${C.yellow})`, transition: "width 1.2s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

// ── Contribute Modal ──────────────────────────────────────────────────────────

function ContributeModal({ campaign, onClose, onSuccess }) {
  const { walletAddress, walletProvider } = useWallet();
  const [amount, setAmount] = useState("0.1");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    const sol = parseFloat(amount);
    if (!sol || sol < 0.01) return setErr("Minimum 0.01 SOL");
    if (!walletAddress) return setErr("Connect wallet first");
    setLoading(true); setErr("");
    try {
      const sig = await sendSol(walletProvider, walletAddress, campaign.wallet, sol);
      await recordContribution({ campaign_id: campaign.id, wallet_from: walletAddress, wallet_to: campaign.wallet, amount_sol: sol, tx_signature: sig, status: "confirmed" });
      onSuccess();
    } catch (e) {
      setErr(e.message || "Transaction failed");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.12)" }}>
        <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Support Campaign</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{campaign.title}</div>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, color: C.muted, cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
        <div style={{ padding: "20px 24px 24px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 8 }}>Amount (SOL)</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
            {[0.1, 0.5, 1, 5].map(v => (
              <button key={v} onClick={() => setAmount(String(v))}
                style={{ padding: "10px 0", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", background: +amount === v ? C.yellowDim : C.surface, border: `1px solid ${+amount === v ? C.yellowBorder : C.border}`, color: +amount === v ? C.yellow : C.muted, fontFamily: "inherit", transition: "all .1s" }}>
                {v}
              </button>
            ))}
          </div>
          <div style={{ position: "relative" }}>
            <input type="number" value={amount} min="0.01" step="0.01" onChange={e => setAmount(e.target.value)}
              style={{ width: "100%", padding: "11px 50px 11px 14px", borderRadius: 9, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.faint }}>SOL</span>
          </div>
          {amount && !isNaN(+amount) && (
            <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>≈ ${toUSD(+amount)} USD · to {short(campaign.wallet)}</div>
          )}
          {err && <div style={{ marginTop: 8, fontSize: 12, color: C.red }}>{err}</div>}
          <button onClick={submit} disabled={loading}
            style={{ width: "100%", marginTop: 16, padding: "13px 0", borderRadius: 10, border: "none", background: loading ? C.border : `linear-gradient(135deg, ${C.purple}, ${C.yellowLight})`, color: loading ? C.muted : "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><Spinner color="#fff" /><span>Sending…</span></> : <><Zap size={14} /> Contribute Now</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Campaign Card ─────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onContribute, onView }) {
  const [hov, setHov] = useState(false);
  const pct      = pctOf(campaign.raised_sol, campaign.goal_sol);
  const hasImage = campaign.image_url && campaign.image_url.trim();
  const days     = daysLeft(campaign.end_date);
  const catInfo  = CATEGORIES.find(c => c.key === campaign.category) || CATEGORIES[0];
  const boosted  = campaign.is_boosted && campaign.boosted_until && new Date(campaign.boosted_until) > Date.now();

  return (
    <div
      onClick={() => onView && onView(campaign.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ background: C.surface, border: `1px solid ${boosted ? "rgba(234,179,8,.4)" : hov ? C.borderHover : C.border}`, borderRadius: 14, overflow: "hidden", cursor: "pointer", transition: "all .18s", boxShadow: boosted ? "0 4px 20px rgba(234,179,8,.18)" : hov ? "0 8px 24px rgba(0,0,0,.09)" : "0 1px 3px rgba(0,0,0,.04)", transform: hov ? "translateY(-3px)" : "none" }}>

      {/* Boost stripe */}
      {boosted && (
        <div style={{ height: 3, background: "linear-gradient(90deg, #F59E0B, #EAB308, #F59E0B)", backgroundSize: "200% 100%", animation: "shimmer 2s linear infinite" }} />
      )}

      {/* Banner */}
      <div style={{ height: 130, background: hasImage ? `url(${campaign.image_url}) center/cover` : `linear-gradient(135deg, ${C.purpleDim}, ${C.yellowDim})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, position: "relative" }}>
        {!hasImage && (campaign.emoji || "🎯")}
        <div style={{ position: "absolute", top: 10, left: 10, display: "flex", gap: 5, alignItems: "center" }}>
          {boosted && (
            <span style={{ background: "rgba(234,179,8,.9)", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 800, color: "#fff", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 3 }}>
              <Rocket size={10} /> Boosted
            </span>
          )}
          <span style={{ background: "rgba(255,255,255,.92)", borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700, color: C.textSub, backdropFilter: "blur(4px)" }}>
            {catInfo.emoji} {campaign.category || "General"}
          </span>
        </div>
        <div style={{ position: "absolute", top: 10, right: 10 }}><StatusBadge status={campaign.status} /></div>
        {days !== null && days <= 7 && days >= 0 && (
          <div style={{ position: "absolute", bottom: 10, right: 10, background: days <= 2 ? "rgba(185,28,28,.85)" : "rgba(201,150,12,.85)", color: "#fff", borderRadius: 6, padding: "2px 8px", fontSize: 10, fontWeight: 800, backdropFilter: "blur(4px)" }}>
            ⏱ {days === 0 ? "Last day!" : `${days}d left`}
          </div>
        )}
      </div>

      <div style={{ padding: "14px 16px 16px" }}>
        <div style={{ marginBottom: 5 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{campaign.title}</div>
          {(campaign.kyc_verified || campaign.org_verified) && (
            <div style={{ display: "flex", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
              {campaign.kyc_verified && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#1D4ED8", background: "rgba(29,78,216,.1)", border: "1px solid rgba(29,78,216,.25)", borderRadius: 99, padding: "2px 7px" }}>
                  <IdCard size={10} /> KYC Verified
                </span>
              )}
              {campaign.org_verified && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, color: "#059669", background: "rgba(5,150,105,.1)", border: "1px solid rgba(5,150,105,.25)", borderRadius: 99, padding: "2px 7px" }}>
                  <Building2 size={10} /> Org Verified
                </span>
              )}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 12, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{campaign.description}</div>

        <ProgressBar pct={pct} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{(+campaign.raised_sol || 0).toFixed(2)} <span style={{ fontSize: 10, fontWeight: 600, color: C.faint }}>SOL</span></div>
            <div style={{ fontSize: 10, color: C.faint }}>of {(+campaign.goal_sol || 0).toFixed(1)} SOL goal</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: pct >= 100 ? C.green : C.yellow }}>{pct.toFixed(0)}%</div>
            <div style={{ fontSize: 10, color: C.faint }}>funded</div>
          </div>
        </div>

        {campaign.status === "active" && (
          <button
            onClick={e => { e.stopPropagation(); onContribute(campaign); }}
            style={{ marginTop: 12, width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.yellowLight})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            <Zap size={13} style={{ display: "inline", marginRight: 5 }} /> Contribute
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Campaigns({ setPage, onAuthClick, onViewCampaign }) {
  usePageMeta({
    title: "Browse Campaigns | Solana Crowdfunding",
    description: "Discover active Solana crowdfunding campaigns on FundBeep. Back projects you believe in. All funds protected by smart contract escrow. SOL contributions, on-chain transparency.",
    keywords: "solana crowdfunding campaigns, active crypto fundraising, back solana projects, web3 campaign listings, fundbeep campaigns",
    url: "https://fundbeep.com/#campaigns",
  });
  const isMobile = useIsMobile();

  const [campaigns, setCampaigns]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [category, setCategory]       = useState("All");
  const [sort, setSort]               = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contribute, setContribute]   = useState(null);
  const [successId, setSuccessId]     = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { walletAddress }             = useWallet();

  const PAGE_SIZE = 12;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getCampaigns({ status: statusFilter, sort: sort === "most_funded" ? "newest" : sort });
      setCampaigns(data || []);
    } catch (_) { setCampaigns([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [sort, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [search, category, sort, statusFilter]);

  // Client-side: category filter + search + most_funded sort
  let filtered = campaigns.filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "All" || c.category === category;
    return matchSearch && matchCat;
  });

  if (sort === "most_funded") {
    filtered = [...filtered].sort((a, b) => pctOf(b.raised_sol, b.goal_sol) - pctOf(a.raised_sol, a.goal_sol));
  }

  // Boosted campaigns (active, not expired) always float to top
  const now = Date.now();
  const isBoosted = (c) => c.is_boosted && c.boosted_until && new Date(c.boosted_until) > now;
  filtered = [...filtered].sort((a, b) => (isBoosted(b) ? 1 : 0) - (isBoosted(a) ? 1 : 0));

  // Per-category counts (from loaded campaigns, before search filter)
  const catCounts = {};
  campaigns.forEach(c => {
    catCounts[c.category || "Other"] = (catCounts[c.category || "Other"] || 0) + 1;
  });
  const totalForCat = (key) => key === "All" ? campaigns.length : (catCounts[key] || 0);

  const handleContribute = (campaign) => {
    if (!walletAddress) { onAuthClick(); return; }
    setContribute(campaign);
  };

  const handleSuccess = () => {
    setSuccessId(contribute?.id);
    setContribute(null);
    setTimeout(() => { setSuccessId(null); load(); }, 3000);
  };

  return (
    <div style={{ flex: 1, minWidth: 0, width: "100%", background: C.bg, minHeight: "100vh", overflowX: "hidden" }}>

      {/* ── Top bar ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: isMobile ? "0 12px" : "0 28px", position: "sticky", top: isMobile ? 56 : 0, zIndex: 80 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {isMobile ? (
            /* ── MOBILE: compact 2-row header ── */
            <>
              {/* Row 1: title + launch button + sort dropdown */}
              <div style={{ padding: "10px 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ fontWeight: 900, fontSize: 16, color: C.text, letterSpacing: -.3 }}>Campaigns</h1>
                  <div style={{ fontSize: 11, color: C.muted }}>
                    {loading ? "Loading…" : `${filtered.length} found${category !== "All" ? ` · ${category}` : ""}`}
                  </div>
                </div>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  style={{ padding: "6px 8px", borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 11, fontFamily: "inherit", outline: "none", cursor: "pointer", flexShrink: 0 }}
                >
                  {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <button onClick={() => setPage("dashboard")}
                  style={{ padding: "7px 12px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.yellowLight})`, color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer", fontFamily: "inherit", flexShrink: 0, whiteSpace: "nowrap" }}>
                  + New
                </button>
              </div>

              {/* Row 2: search + status tabs */}
              <div style={{ paddingBottom: 10, display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: C.faint, pointerEvents: "none", display: "flex" }}><Search size={12} /></span>
                  <input
                    placeholder="Search…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "7px 28px 7px 28px", borderRadius: 7, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                  {search && (
                    <button onClick={() => setSearch("")}
                      style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: C.faint, cursor: "pointer", fontSize: 12, padding: 0 }}>✕</button>
                  )}
                </div>
                <div style={{ display: "flex", background: C.bg, borderRadius: 7, border: `1px solid ${C.border}`, overflow: "hidden", flexShrink: 0 }}>
                  {STATUSES.map(s => {
                    const active = statusFilter === s.key;
                    return (
                      <button key={s.key} onClick={() => setStatusFilter(s.key)}
                        style={{ padding: "7px 9px", border: "none", background: active ? C.surface : "transparent", color: active ? C.text : C.muted, fontWeight: active ? 700 : 500, fontSize: 11, cursor: "pointer", fontFamily: "inherit", transition: "all .12s", borderRight: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                        {s.key === "active" ? "● Live" : s.key === "completed" ? "✓ Done" : "All"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category pills */}
              <div className="hide-scrollbar" style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 10 }}>
                {CATEGORIES.map(cat => {
                  const active = category === cat.key;
                  return (
                    <button key={cat.key} onClick={() => setCategory(cat.key)}
                      style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 99, border: `1px solid ${active ? C.yellowBorder : C.border}`, background: active ? C.yellowDim : C.surface, color: active ? C.yellow : C.muted, fontWeight: active ? 700 : 500, fontSize: 11, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                      <span>{cat.emoji}</span>
                      <span>{cat.key}</span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            /* ── DESKTOP: full header ── */
            <>
              {/* Title row */}
              <div style={{ padding: "16px 0 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <h1 style={{ fontWeight: 900, fontSize: 20, color: C.text, letterSpacing: -.5 }}>Browse Campaigns</h1>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                    {loading ? "Loading…" : `${filtered.length} campaign${filtered.length !== 1 ? "s" : ""}${category !== "All" ? ` in ${category}` : ""}`}
                  </div>
                </div>
                <button onClick={() => setPage("dashboard")}
                  style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "#6d28d9", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>
                  + Launch Campaign
                </button>
              </div>

              {/* Category pills */}
              <div className="hide-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12 }}>
                {CATEGORIES.map(cat => {
                  const active = category === cat.key;
                  const count = totalForCat(cat.key);
                  return (
                    <button key={cat.key} onClick={() => setCategory(cat.key)}
                      style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 99, border: `1px solid ${active ? C.yellowBorder : C.border}`, background: active ? C.yellowDim : C.surface, color: active ? C.yellow : C.muted, fontWeight: active ? 700 : 500, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit", transition: "all .12s", whiteSpace: "nowrap" }}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = C.borderHover; e.currentTarget.style.color = C.text; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; } }}>
                      <span>{cat.emoji}</span>
                      <span>{cat.key}</span>
                      {count > 0 && (
                        <span style={{ background: active ? C.yellow : C.bg, color: active ? "#fff" : C.faint, borderRadius: 99, padding: "1px 6px", fontSize: 10, fontWeight: 700, minWidth: 18, textAlign: "center" }}>{count}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search + Sort + Status row */}
              <div style={{ paddingBottom: 14, display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
                  <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: C.faint, pointerEvents: "none", display: "flex" }}><Search size={13} /></span>
                  <input
                    placeholder="Search campaigns…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                    onFocus={e => e.target.style.borderColor = C.borderHover}
                    onBlur={e => e.target.style.borderColor = C.border}
                  />
                  {search && (
                    <button onClick={() => setSearch("")}
                      style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", color: C.faint, cursor: "pointer", fontSize: 13, padding: 0 }}>✕</button>
                  )}
                </div>
                <div style={{ display: "flex", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden", flexShrink: 0 }}>
                  {STATUSES.map(s => {
                    const active = statusFilter === s.key;
                    return (
                      <button key={s.key} onClick={() => setStatusFilter(s.key)}
                        style={{ padding: "7px 14px", border: "none", background: active ? C.surface : "transparent", color: active ? C.text : C.muted, fontWeight: active ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .12s", borderRight: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                <div style={{ display: "flex", background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden", flexShrink: 0 }}>
                  {SORTS.map(s => {
                    const active = sort === s.key;
                    return (
                      <button key={s.key} onClick={() => setSort(s.key)}
                        style={{ padding: "7px 12px", border: "none", background: active ? C.purpleDim : "transparent", color: active ? C.purple : C.muted, fontWeight: active ? 700 : 500, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "all .12s", borderRight: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 12px" : "24px 28px" }}>
        {successId && (
          <div style={{ marginBottom: 16, padding: "14px 18px", borderRadius: 10, background: C.greenDim, border: `1px solid rgba(21,128,61,.2)`, color: C.green, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle size={15} /> Contribution sent! Transaction confirmed on Solana.
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "80px 0" }}>
            <Spinner size={32} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <div style={{ marginBottom: 14, color: C.faint }}>
              <Search size={48} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 6 }}>No campaigns found</div>
            <div style={{ color: C.muted, fontSize: 14, marginBottom: 20 }}>
              {search ? `No results for "${search}"` : category !== "All" ? `No ${category} campaigns yet` : "No campaigns match your filters"}
            </div>
            {(search || category !== "All") && (
              <button onClick={() => { setSearch(""); setCategory("All"); }}
                style={{ padding: "9px 20px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: C.textSub, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (() => {
          const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
          const paginated  = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
          return (
            <>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(260px, 1fr))", gap: isMobile ? 12 : 18 }}>
                {paginated.map(campaign => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onContribute={handleContribute}
                    onView={onViewCampaign}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 36, paddingBottom: 16 }}>
                  <button
                    onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    disabled={currentPage === 1}
                    style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: currentPage === 1 ? C.faint : C.text, fontWeight: 600, fontSize: 13, cursor: currentPage === 1 ? "default" : "pointer", fontFamily: "inherit", opacity: currentPage === 1 ? 0.5 : 1 }}>
                    ← Prev
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                    const isActive = p === currentPage;
                    const show = p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                    if (!show) {
                      if (p === 2 && currentPage > 3) return <span key={p} style={{ color: C.faint, fontSize: 13 }}>…</span>;
                      if (p === totalPages - 1 && currentPage < totalPages - 2) return <span key={p} style={{ color: C.faint, fontSize: 13 }}>…</span>;
                      return null;
                    }
                    return (
                      <button key={p}
                        onClick={() => { setCurrentPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${isActive ? C.purpleBorder : C.border}`, background: isActive ? C.purpleDim : C.surface, color: isActive ? C.purple : C.textSub, fontWeight: isActive ? 800 : 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                        {p}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    disabled={currentPage === totalPages}
                    style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.surface, color: currentPage === totalPages ? C.faint : C.text, fontWeight: 600, fontSize: 13, cursor: currentPage === totalPages ? "default" : "pointer", fontFamily: "inherit", opacity: currentPage === totalPages ? 0.5 : 1 }}>
                    Next →
                  </button>
                </div>
              )}
            </>
          );
        })()}
      </div>

      {contribute && (
        <ContributeModal campaign={contribute} onClose={() => setContribute(null)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
