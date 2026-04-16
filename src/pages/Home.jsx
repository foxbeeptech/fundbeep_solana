import { useState, useEffect, useRef } from "react";
import { getPlatformStats, getFeaturedCampaigns } from "../supabase";
import { useWallet } from "../context/WalletContext";
import usePageMeta from "../hooks/usePageMeta";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  Wallet, FileText, Link, Zap, Target, IdCard, Building2, Star, Trophy,
  Search, AlertTriangle, Sparkles, MessageCircle, BarChart3, BadgeCheck,
  Globe, Rocket, FolderOpen, User, LayoutGrid, LogOut, LogIn,
  ChevronDown, Heart,
} from "lucide-react";

const P = {
  bg:          "#F5F3FF",
  surface:     "#FFFFFF",
  panel:       "#EDE9FE",
  border:      "#DDD6FE",
  borderMid:   "#C4B5FD",
  text:        "#000000",
  textSub:     "#000000",
  muted:       "#000000",
  faint:       "#000000",
  light:       "#000000",
  lighter:     "#000000",
  lightest:    "#EDE9FE",
  purple:      "#6D28D9",
  purpleMid:   "#7C3AED",
  purpleLight: "#8B5CF6",
  purpleGlow:  "rgba(109,40,217,.15)",
  purpleDeep:  "#4C1D95",
  purplePop:   "#5B21B6",
  green:       "#15803D",
  greenDim:    "rgba(21,128,61,.1)",
  yellow:      "#C9960C",
  yellowDim:   "rgba(201,150,12,.1)",
};

const short = (a) => a ? `${a.slice(0, 4)}...${a.slice(-4)}` : "";
const pctOf = (r, g) => g > 0 ? Math.min((+r / +g) * 100, 100) : 0;

function Counter({ target, suffix = "", duration = 1800 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      observer.disconnect();
      let start = null;
      const tick = (ts) => {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        setVal(Math.floor(ease * target));
        if (progress < 1) requestAnimationFrame(tick);
        else setVal(target);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

function FeaturedSection({ setPage, onViewCampaign }) {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading]   = useState(true);
  useEffect(() => {
    getFeaturedCampaigns().then(d => { setFeatured(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading || featured.length === 0) return null;
  return (
    <section style={{ padding: "80px 32px 72px", background: P.surface, borderTop: `1px solid ${P.border}` }}>
      <div style={{ maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, color: "#000", letterSpacing: 2, marginBottom: 12, padding: "4px 14px", borderRadius: 99, background: P.yellowDim, border: "1px solid rgba(201,150,12,.25)" }}>
              ⭐ FEATURED CAMPAIGNS
            </div>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 900, color: P.text, letterSpacing: -1, margin: 0 }}>Successfully Funded Campaigns</h2>
            <p style={{ fontSize: 14, color: P.light, marginTop: 6 }}>Top 6 highest-raised campaigns that reached 100% of their goal. Fully on-chain, verified on Solana.</p>
          </div>
          <button onClick={() => setPage("campaigns")}
            style={{ padding: "10px 22px", borderRadius: 9, border: `1.5px solid ${P.border}`, background: "transparent", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .15s", whiteSpace: "nowrap" }}
            onMouseEnter={e => { e.currentTarget.style.background = P.panel; e.currentTarget.style.borderColor = P.borderMid; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = P.border; }}>
            Browse All Campaigns →
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))`, gap: 20 }}>
          {featured.map((c, i) => {
            const pct = pctOf(c.raised_sol, c.goal_sol);
            const hasImage = c.image_url?.trim();
            return (
              <div key={c.id} onClick={() => onViewCampaign(c.id)}
                style={{ background: P.bg, border: `1.5px solid ${i === 0 ? "rgba(201,150,12,.4)" : P.border}`, borderRadius: 18, overflow: "hidden", cursor: "pointer", transition: "all .2s", position: "relative" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(109,40,217,.12)"; e.currentTarget.style.borderColor = P.borderMid; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = i === 0 ? "rgba(201,150,12,.4)" : P.border; }}>
                <div style={{ position: "absolute", top: 14, left: 14, zIndex: 2, display: "flex", alignItems: "center", gap: 5, background: "rgba(201,150,12,.92)", borderRadius: 99, padding: "4px 10px", fontSize: 10, fontWeight: 800, color: "#fff", backdropFilter: "blur(4px)" }}>⭐ Featured</div>
                <div style={{ height: 150, background: hasImage ? `url(${c.image_url}) center/cover` : `linear-gradient(135deg, ${P.panel}, ${P.lightest})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                  {!hasImage && (c.image_emoji || "🎯")}
                </div>
                <div style={{ padding: "18px 20px 22px" }}>
                  <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: P.faint, textTransform: "uppercase", letterSpacing: 1 }}>{c.category || "General"}</span>
                    {c.kyc_verified && <span style={{ fontSize: 10, fontWeight: 700, color: "#000", background: "rgba(29,78,216,.1)", borderRadius: 99, padding: "1px 6px" }}>🪪 KYC</span>}
                    {c.org_verified && <span style={{ fontSize: 10, fontWeight: 700, color: "#000", background: P.greenDim, borderRadius: 99, padding: "1px 6px" }}>🏢 Org</span>}
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: P.text, lineHeight: 1.3, marginBottom: 6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.6, marginBottom: 14, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{c.description}</div>
                  <div style={{ height: 5, borderRadius: 99, background: P.border, overflow: "hidden", marginBottom: 10 }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: `linear-gradient(90deg, ${P.purple}, ${P.purpleLight})` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: P.text }}>{(+c.raised_sol || 0).toFixed(2)} <span style={{ fontSize: 11, color: P.faint }}>SOL</span></div>
                      <div style={{ fontSize: 11, color: P.faint }}>of {(+c.goal_sol || 0).toFixed(1)} SOL goal</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#000" }}>{pct.toFixed(0)}% funded</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  { num: "01", icon: Wallet,   title: "Connect Phantom Wallet",   desc: "No email, no password, no forms. Your Phantom wallet is your account. One click and you're in." },
  { num: "02", icon: FileText, title: "Create Your Campaign",     desc: "Set your goal in SOL, write your story, add an image and end date. All in under 2 minutes from your Dashboard." },
  { num: "03", icon: Link,     title: "Share & Build Trust",      desc: "Share your campaign link. Apply for KYC or Organisation verification to show backers you're legitimate." },
  { num: "04", icon: Zap,      title: "Claim Funds by Milestone",  desc: "Contributions are held in a Solana smart contract escrow. Claim your funds at 4 milestones (25%, 50%, 75%, final) as your campaign progresses." },
];

const FEATURES = [
  { icon: Zap,           title: "Smart Contract Escrow",         desc: "Contributions are secured in a Solana on-chain escrow, milestone-protected so backers can trust where their SOL goes." },
  { icon: Target,        title: "Milestone Payout System",      desc: "Creators claim funds at 4 milestones (25%, 50%, 75%, final). Low claim fees: 3% → 2% → 1.5% → 1%." },
  { icon: IdCard,        title: "KYC Verification",             desc: "Creators can apply for personal KYC verification. Verified campaigns display a verified badge to build donor trust." },
  { icon: Building2,     title: "Organisation Verification",    desc: "NGOs, charities and companies can get the Org Verified badge after submitting registration documents." },
  { icon: Star,          title: "Trust Score (DID)",            desc: "Every user builds an on-chain reputation score based on campaigns created, SOL raised, donations made, and community standing." },
  { icon: Trophy,        title: "Contributor Leaderboard",      desc: "Monthly leaderboard crowns the top SOL contributors. Champions earn permanent recognition on their public profile." },
  { icon: Search,        title: "Full Transparency",            desc: "Every contribution has a Solscan link. Creators can post Proof of Use to show exactly how raised funds were spent." },
  { icon: AlertTriangle, title: "Scam Reporting",               desc: "Community-powered safety. Any user can report suspicious campaigns. Admins review reports and take action." },
  { icon: Sparkles,      title: "Explore Social Feed",          desc: "A public feed where creators post updates, milestones, and announcements. Like, comment, and follow your favourites." },
  { icon: MessageCircle, title: "Live Comments & Updates",      desc: "Backers and creators discuss directly on campaign pages. Real-time updates keep everyone in sync." },
  { icon: BarChart3,     title: "Proof of Use",                 desc: "Attach Solana TX signatures to prove exactly how raised funds were spent. Each one links to Solscan." },
  { icon: Link,          title: "Embed Widget",                 desc: "Embed a live progress widget for your campaign anywhere on the web with a single iframe line." },
];

const TRUST_ITEMS = [
  { icon: IdCard,     color: "#1D4ED8", bg: "rgba(29,78,216,.08)", border: "rgba(29,78,216,.2)", title: "KYC Verified",         desc: "Creator identity verified by the FundBeep team. Requires passport / ID and face verification." },
  { icon: Building2,  color: "#059669", bg: "rgba(5,150,105,.08)",  border: "rgba(5,150,105,.2)",  title: "Org Verified",         desc: "For NGOs, charities and companies. Requires registration documents, website, and social accounts." },
  { icon: Star,       color: "#C9960C", bg: "rgba(201,150,12,.08)", border: "rgba(201,150,12,.2)", title: "Trust Score",          desc: "Computed from on-chain activity: campaigns created, SOL raised, donations given, and report history." },
  { icon: BadgeCheck, color: "#2563EB", bg: "rgba(37,99,235,.08)",  border: "rgba(37,99,235,.2)",  title: "Blue Verified Badge",  desc: "Awarded by admins to recognised creators and organisations as an extra layer of credibility." },
];

export default function Home({ setPage, onAuthClick, onViewCampaign }) {
  usePageMeta({
    title: "FundBeep - Solana Crowdfunding Platform",
    description: "Launch or back campaigns on Solana. Smart contract escrow protects every backer. Milestone-based payouts for creators. KYC verified, Trust Score system. Phantom, Backpack, Solflare & OKX supported.",
    keywords: "solana crowdfunding, crypto fundraising, web3 crowdfunding platform, solana campaigns, smart contract escrow crowdfunding, phantom wallet fundraising, milestone crowdfunding, fundbeep",
    url: "https://fundbeep.com/",
  });
  const isMobile = useIsMobile();
  const { walletAddress, profile, disconnectWallet, signOut } = useWallet();
  const [stats, setStats] = useState({ total_sol_raised: 0, active_campaigns: 0, total_contributions: 0, total_users: 0 });
  const [walletDrop, setWalletDrop] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    getPlatformStats().then(s => s && setStats(s)).catch(() => {});
  }, []);
  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setWalletDrop(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  return (
    <div style={{ flex: 1, background: P.bg, minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse    { 0%,100% { box-shadow: 0 0 0 0 rgba(139,92,246,.4); } 50% { box-shadow: 0 0 0 6px rgba(139,92,246,0); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
      `}</style>

      {/* ── TOP NAV ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 200, background: "rgba(245,243,255,.94)", backdropFilter: "blur(18px)", borderBottom: `1px solid ${P.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "0 16px" : "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div onClick={() => setPage("home")} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg, ${P.purple}, ${P.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#fff", boxShadow: `0 4px 14px ${P.purpleGlow}` }}>◎</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, color: P.text, letterSpacing: -.3, lineHeight: 1 }}>FundBeep</div>
              {!isMobile && <div style={{ fontSize: 9, color: P.light, letterSpacing: 1.5, marginTop: 2 }}>CROWDFUNDING PLATFORM</div>}
            </div>
          </div>

          {/* Desktop nav links */}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              {[
                { label: "Campaigns",   page: "campaigns"   },
                { label: "Leaderboard", page: "leaderboard" },
                { label: "Explore",     page: "explore"     },
                { label: "Docs",        page: "docs"        },
                { label: "Lightpaper",  page: "lightpaper"  },
                { label: "About Us",    page: "about"       },
              ].map(item => (
                <button key={item.page} onClick={() => setPage(item.page)}
                  style={{ padding: "7px 13px", borderRadius: 8, border: "none", background: "transparent", color: P.muted, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = P.panel; e.currentTarget.style.color = P.purple; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = P.muted; }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Mobile hamburger */}
          {isMobile && (
            <button
              onClick={() => setMobileNavOpen(o => !o)}
              style={{ width: 38, height: 38, borderRadius: 9, border: `1px solid ${P.border}`, background: P.surface, cursor: "pointer", fontSize: 20, color: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}
            >≡</button>
          )}

          <div ref={dropRef} style={{ position: "relative", flexShrink: 0 }}>
            {!walletAddress ? (
              <button onClick={onAuthClick}
                style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${P.purple}, ${P.purpleLight})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 4px 16px ${P.purpleGlow}`, display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap" }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 24px rgba(109,40,217,.4)`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${P.purpleGlow}`; e.currentTarget.style.transform = "none"; }}>
                <Wallet size={15} /> Connect Wallet
              </button>
            ) : (
              <>
                <button onClick={() => setWalletDrop(d => !d)}
                  style={{ padding: "7px 12px 7px 8px", borderRadius: 9, border: `1.5px solid ${P.border}`, background: P.surface, color: P.text, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = P.borderMid}
                  onMouseLeave={e => e.currentTarget.style.borderColor = P.border}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: `linear-gradient(135deg, ${P.purple}, ${P.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#fff", fontWeight: 700 }}>
                    {profile?.full_name?.[0]?.toUpperCase() || "◎"}
                  </div>
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: P.text, lineHeight: 1 }}>{profile?.full_name || "Wallet"}</div>
                    <div style={{ fontSize: 10, color: P.light, fontFamily: "monospace", marginTop: 2 }}>{short(walletAddress)}</div>
                  </div>
                  <ChevronDown size={13} style={{ color: P.lighter }} />
                </button>
                {walletDrop && (
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, boxShadow: `0 12px 40px rgba(109,40,217,.12)`, overflow: "hidden", minWidth: 185, animation: "slideDown .15s ease both", zIndex: 300 }}>
                    {[
                      { icon: FolderOpen,   label: "My Campaign",  action: () => { setPage("dashboard");   setWalletDrop(false); } },
                      { icon: User,         label: "Profile",      action: () => { setPage("profile");     setWalletDrop(false); } },
                      { icon: Trophy,       label: "Leaderboard",  action: () => { setPage("leaderboard"); setWalletDrop(false); } },
                      { icon: LayoutGrid,   label: "Campaigns",    action: () => { setPage("campaigns");   setWalletDrop(false); } },
                      ...(isAdmin ? [{ icon: Zap, label: "Admin Panel", action: () => { setPage("admin"); setWalletDrop(false); } }] : []),
                    ].map(item => (
                      <button key={item.label} onClick={item.action}
                        style={{ width: "100%", padding: "10px 16px", border: "none", background: "transparent", color: P.textSub, fontSize: 13, fontWeight: 500, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9 }}
                        onMouseEnter={e => e.currentTarget.style.background = P.lightest}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <item.icon size={14} /> {item.label}
                      </button>
                    ))}
                    <div style={{ height: 1, background: P.border, margin: "4px 0" }} />
                    <button onClick={() => { disconnectWallet(); setWalletDrop(false); }}
                      style={{ width: "100%", padding: "9px 16px", border: "none", background: "transparent", color: P.faint, fontSize: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9 }}
                      onMouseEnter={e => e.currentTarget.style.background = P.lightest}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <LogOut size={13} /> Disconnect
                    </button>
                    <button onClick={() => { signOut(); setWalletDrop(false); }}
                      style={{ width: "100%", padding: "9px 16px", border: "none", background: "transparent", color: "#B91C1C", fontSize: 12, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9 }}
                      onMouseEnter={e => e.currentTarget.style.background = "rgba(185,28,28,.05)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <LogIn size={13} /> Sign Out
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
          </div>
        </div>

        {/* Mobile nav dropdown */}
        {isMobile && mobileNavOpen && (
          <div style={{ position: "absolute", top: 64, left: 0, right: 0, background: P.surface, borderBottom: `1px solid ${P.border}`, padding: "12px 16px 16px", zIndex: 150, display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { label: "Campaigns",   page: "campaigns"   },
              { label: "Leaderboard", page: "leaderboard" },
              { label: "Explore",     page: "explore"     },
              { label: "Docs",        page: "docs"        },
              { label: "Lightpaper",  page: "lightpaper"  },
              { label: "About Us",    page: "about"       },
            ].map(item => (
              <button key={item.page} onClick={() => { setPage(item.page); setMobileNavOpen(false); }}
                style={{ padding: "12px 16px", borderRadius: 9, border: "none", background: "transparent", color: P.muted, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = P.panel; e.currentTarget.style.color = P.purple; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = P.muted; }}>
                {item.label}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="hero-section" style={{ position: "relative", overflow: "hidden", padding: isMobile ? "40px 20px 60px" : "56px 32px 100px", textAlign: "center" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          <div style={{ position: "absolute", width: 900, height: 900, borderRadius: "50%", background: `radial-gradient(circle, rgba(139,92,246,.18) 0%, transparent 65%)`, top: -320, left: "50%", transform: "translateX(-50%)", filter: "blur(60px)" }} />
          <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, rgba(109,40,217,.1) 0%, transparent 65%)`, bottom: -60, right: "6%", filter: "blur(30px)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(${P.border} 1px, transparent 1px), linear-gradient(90deg, ${P.border} 1px, transparent 1px)`, backgroundSize: "64px 64px", opacity: .3 }} />
        </div>

        {/* ── Floating circles (desktop only) ── */}
        {!isMobile && (() => {
          const circles = [
            { label: "Community", emoji: "🏘", img: "https://images.pexels.com/photos/18057138/pexels-photo-18057138.jpeg", size: 148, style: { top: "8%",  left: "3%" },  delay: "0s",    float: "6s"  },
            { label: "Medical",   emoji: "🏥", img: "https://images.pexels.com/photos/8853183/pexels-photo-8853183.jpeg", size: 128, style: { top: "52%", left: "1%" },  delay: "1.2s",  float: "7s"  },
            { label: "Emergency", emoji: "🆘", img: "https://images.pexels.com/photos/6520074/pexels-photo-6520074.jpeg", size: 118, style: { bottom: "6%", left: "16%" }, delay: "0.6s", float: "5.5s"},
            { label: "Education", emoji: "🎓", img: "https://images.pexels.com/photos/35548842/pexels-photo-35548842.jpeg", size: 150, style: { top: "6%",  right: "3%" }, delay: "0.4s",  float: "6.5s"},
            { label: "Nature",    emoji: "🌿", img: "https://images.pexels.com/photos/17018353/pexels-photo-17018353.jpeg", size: 125, style: { top: "54%", right: "1%" }, delay: "1.5s",  float: "7.5s"},
            { label: "Tech",      emoji: "💡", img: "https://images.pexels.com/photos/7382446/pexels-photo-7382446.jpeg", size: 135, style: { bottom: "4%", right: "14%" }, delay: "0.8s", float: "6s"},
          ];
          return circles.map(c => (
            <div key={c.label} style={{
              position: "absolute", ...c.style,
              width: c.size, height: c.size,
              animation: `float ${c.float} ease-in-out ${c.delay} infinite`,
              zIndex: 1, pointerEvents: "none",
            }}>
              <div style={{
                width: c.size, height: c.size, borderRadius: "50%",
                border: "3px solid #7536E1",
                boxShadow: "0 8px 32px rgba(109,40,217,.18)",
                overflow: "hidden",
                background: c.img ? `url(${c.img}) center/cover no-repeat` : "rgba(109,40,217,.06)",
                display: c.img ? "block" : "flex",
                alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: 4,
              }}>
                {!c.img && <>
                  <span style={{ fontSize: c.size * 0.28 }}>{c.emoji}</span>
                </>}
              </div>
              <div style={{
                textAlign: "center", marginTop: 7,
                fontSize: 11, fontWeight: 700, color: "#555",
                letterSpacing: .5, textTransform: "uppercase",
              }}>{c.label}</div>
            </div>
          ));
        })()}

        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto", zIndex: 2 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 16px 5px 10px", borderRadius: 99, background: P.panel, border: `1px solid ${P.border}`, marginBottom: 36, animation: "fadeUp .45s ease both" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E", display: "inline-block", boxShadow: "0 0 0 3px rgba(34,197,94,.25)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: P.muted, letterSpacing: 1.5 }}>DECENTRALIZED CROWDFUNDING ON SOLANA</span>
          </div>

          <h1 style={{ fontSize: "clamp(40px, 6.5vw, 80px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: -4, color: P.text, marginBottom: 28, animation: "fadeUp .5s ease .07s both" }}>
            The Web3 version of<br />
            <span style={{ background: `linear-gradient(135deg, ${P.purple} 0%, ${P.purpleLight} 50%, #A78BFA 100%)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              GoFundMe
            </span>{" "}on Solana Chain.
          </h1>

          <p style={{ fontSize: 18, color: P.muted, maxWidth: 560, margin: "0 auto 52px", lineHeight: 1.78, animation: "fadeUp .5s ease .14s both" }}>
            Launch campaigns on Solana with KYC verification, on-chain Trust Scores, and real-time transparency. Funds are held in a <strong style={{ color: P.textSub }}>Solana smart contract escrow</strong>: milestone-protected for backers, instantly claimable for creators.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", animation: "fadeUp .5s ease .21s both" }}>
            <button onClick={walletAddress ? () => setPage("dashboard") : onAuthClick}
              style={{ padding: "15px 38px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${P.purple}, ${P.purpleLight})`, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 6px 28px rgba(109,40,217,.38)`, transition: "all .18s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 36px rgba(109,40,217,.5)`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 6px 28px rgba(109,40,217,.38)`; }}>
              <Rocket size={15} style={{ display: "inline", marginRight: 7 }} /> Launch a Campaign
            </button>
            <button onClick={() => setPage("campaigns")}
              style={{ padding: "15px 34px", borderRadius: 11, border: `1.5px solid ${P.border}`, background: P.surface, color: "#000", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", transition: "all .18s" }}
              onMouseEnter={e => { e.currentTarget.style.background = P.panel; e.currentTarget.style.borderColor = P.borderMid; }}
              onMouseLeave={e => { e.currentTarget.style.background = P.surface; e.currentTarget.style.borderColor = P.border; }}>
              Browse Campaigns →
            </button>
          </div>

          {/* Trust badges row */}
          <div style={{ display: isMobile ? "grid" : "flex", gridTemplateColumns: isMobile ? "1fr 1fr" : undefined, gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 40, animation: "fadeUp .5s ease .3s both" }}>
            {[
              { icon: IdCard,  label: "KYC Verified Creators" },
              { icon: Star,    label: "On-chain Trust Score"  },
              { icon: Zap,     label: "Instant SOL Payouts"   },
              { icon: Search,  label: "Solscan Transparency"  },
            ].map(b => (
              <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 99, background: P.surface, border: `1px solid ${P.border}`, fontSize: 12, fontWeight: 600, color: P.textSub }}>
                <b.icon size={13} /> {b.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE STATS ── */}
      <section className="stats-bar" style={{ background: P.surface, borderTop: `1px solid ${P.border}`, borderBottom: `1px solid ${P.border}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)" }}>
          {[
            { label: "SOL Raised",     value: Math.round(+stats.total_sol_raised || 0),   suffix: "",  unit: "raised on-chain" },
            { label: "Live Campaigns", value: +stats.active_campaigns || 0,               suffix: "",  unit: "active right now" },
            { label: "Contributions",  value: +stats.total_contributions || 0,            suffix: "+", unit: "on-chain transactions" },
            { label: "Creators",       value: +stats.total_users || 0,                    suffix: "",  unit: "connected wallets" },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "38px 24px", textAlign: "center", borderRight: i < 3 ? `1px solid ${P.border}` : "none" }}>
              <div style={{ fontSize: "clamp(30px, 3.5vw, 48px)", fontWeight: 900, color: P.text, lineHeight: 1, marginBottom: 8, letterSpacing: -1.5, background: `linear-gradient(135deg, ${P.purple}, ${P.purpleLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                <Counter target={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.textSub, marginBottom: 3 }}>{s.label}</div>
              <div style={{ fontSize: 11, color: P.lighter }}>{s.unit}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED CAMPAIGNS ── */}
      <FeaturedSection setPage={setPage} onViewCampaign={onViewCampaign} />

      {/* ── VIDEO + ABOUT ── */}
      <section style={{ padding: isMobile ? "60px 20px" : "100px 32px", background: P.bg, borderTop: `1px solid ${P.border}`, position: "relative", overflow: "hidden" }}>
        {/* decorative blobs */}
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, rgba(109,40,217,.07) 0%, transparent 70%)`, top: -100, right: -100, pointerEvents: "none" }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, rgba(139,92,246,.06) 0%, transparent 70%)`, bottom: -80, left: -80, pointerEvents: "none" }} />

        <div style={{ maxWidth: 1140, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 40 : 64, alignItems: "center" }}>

            {/* LEFT — YouTube embed */}
            <div style={{ position: "relative" }}>
              {/* glow ring behind video */}
              <div style={{ position: "absolute", inset: -12, borderRadius: 24, background: `linear-gradient(135deg, ${P.purple}, ${P.purpleLight})`, opacity: .18, filter: "blur(18px)", zIndex: 0 }} />
              <div style={{
                position: "relative", zIndex: 1,
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: `0 30px 80px rgba(109,40,217,.22), 0 8px 24px rgba(0,0,0,.12)`,
                border: `2px solid ${P.borderMid}`,
                aspectRatio: "16/9",
                background: "#000",
              }}>
                <iframe
                  src="https://www.youtube.com/embed/jFrW9AMuqWA?rel=0&modestbranding=1"
                  title="FundBeep - How It Works"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                />
              </div>
              {/* floating badge */}
              <div style={{ position: "absolute", bottom: -16, left: 24, zIndex: 2, display: "flex", alignItems: "center", gap: 8, background: P.surface, border: `1px solid ${P.border}`, borderRadius: 99, padding: "8px 16px", boxShadow: "0 8px 24px rgba(109,40,217,.12)" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,.2)", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: P.text }}>Live on Solana</span>
              </div>
            </div>

            {/* RIGHT — About FundBeep */}
            <div style={{ paddingBottom: isMobile ? 0 : 8 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 800, color: P.purple, letterSpacing: 2, marginBottom: 18, padding: "5px 14px", borderRadius: 99, background: P.panel, border: `1px solid ${P.border}` }}>
                🚀 ABOUT FUNDBEEP
              </div>
              <h2 style={{ fontSize: isMobile ? 28 : "clamp(28px, 3vw, 42px)", fontWeight: 900, color: P.text, letterSpacing: -1.2, lineHeight: 1.15, marginBottom: 18 }}>
                Crowdfunding<br />
                <span style={{ background: `linear-gradient(90deg, ${P.purple}, ${P.purpleLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>powered by Solana</span>
              </h2>
              <p style={{ fontSize: 15, color: P.muted, lineHeight: 1.8, marginBottom: 28 }}>
                FundBeep is a decentralized crowdfunding platform built on the Solana blockchain: fast, transparent, and borderless. Anyone with a Phantom wallet can launch a campaign or contribute in seconds, with no banks, no middlemen, and zero hidden fees.
              </p>

              {/* feature pills */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36 }}>
                {[
                  { icon: "⚡", title: "Lightning-fast transactions", desc: "Solana confirms in under a second. Contributions land instantly." },
                  { icon: "🌍", title: "Truly borderless", desc: "Anyone, anywhere can fund or be funded. No geographic restrictions." },
                  { icon: "🔒", title: "On-chain transparency", desc: "Every contribution is verifiable on the Solana blockchain forever." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: P.panel, border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: P.text, marginBottom: 3 }}>{title}</div>
                      <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.6 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={() => setPage("campaigns")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, background: `linear-gradient(135deg, ${P.purple}, ${P.purpleLight})`, color: "#fff", fontWeight: 800, fontSize: 14, border: "none", cursor: "pointer", boxShadow: `0 8px 24px ${P.purpleGlow}` }}
                >
                  <Rocket size={15} /> Explore Campaigns
                </button>
                <button
                  onClick={() => setPage("campaign-wizard")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, background: P.surface, color: P.purple, fontWeight: 800, fontSize: 14, border: `1.5px solid ${P.border}`, cursor: "pointer" }}
                >
                  <Sparkles size={15} /> Start a Campaign
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "100px 32px", background: P.bg }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 68 }}>
            <div style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: "#000", letterSpacing: 2.5, marginBottom: 16, padding: "5px 16px", borderRadius: 99, background: P.panel, border: `1px solid ${P.border}` }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: "clamp(28px, 3.5vw, 46px)", fontWeight: 900, color: P.text, letterSpacing: -1.5, marginBottom: 14 }}>From wallet to funded in minutes</h2>
            <p style={{ fontSize: 15, color: P.muted, maxWidth: 460, margin: "0 auto", lineHeight: 1.75 }}>No bank account, no lengthy approval process. A 0.1 SOL listing fee launches your campaign on-chain. Just connect your Phantom wallet and go.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {STEPS.map((step, i) => (
              <div key={step.num}
                style={{ background: P.surface, border: `1.5px solid ${P.border}`, borderRadius: 18, padding: "30px 26px", position: "relative", overflow: "hidden", animation: `fadeUp .5s ease ${i * .1}s both`, transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = P.borderMid; e.currentTarget.style.boxShadow = `0 8px 32px rgba(109,40,217,.1)`; e.currentTarget.style.transform = "translateY(-3px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ position: "absolute", right: 16, top: 8, fontSize: 72, fontWeight: 900, color: "rgba(109,40,217,.05)", lineHeight: 1, userSelect: "none", letterSpacing: -4 }}>{step.num}</div>
                <div style={{ width: 50, height: 50, borderRadius: 14, background: P.panel, border: `1px solid ${P.border}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: P.purple }}><step.icon size={22} /></div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#000", letterSpacing: 1.5, marginBottom: 10 }}>STEP {step.num}</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: P.text, marginBottom: 12, letterSpacing: -.3 }}>{step.title}</div>
                <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.78 }}>{step.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 52 }}>
            <button onClick={walletAddress ? () => setPage("dashboard") : onAuthClick}
              style={{ padding: "14px 38px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, ${P.purple}, ${P.purpleLight})`, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", boxShadow: `0 6px 28px rgba(109,40,217,.3)`, transition: "all .18s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 36px rgba(109,40,217,.42)`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 6px 28px rgba(109,40,217,.3)`; }}>
              <Rocket size={15} style={{ display: "inline", marginRight: 7 }} /> Start Your Campaign Now
            </button>
          </div>
        </div>
      </section>

      {/* ── TRUST & SAFETY ── */}
      <section style={{ padding: "100px 32px", background: P.surface, borderTop: `1px solid ${P.border}` }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 32 : 72, alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: "#000", letterSpacing: 2, marginBottom: 16, padding: "5px 16px", borderRadius: 99, background: "rgba(5,150,105,.08)", border: "1px solid rgba(5,150,105,.2)" }}>TRUST & SAFETY</div>
              <h2 style={{ fontSize: "clamp(26px, 3vw, 42px)", fontWeight: 900, color: P.text, letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 18 }}>Built for trust.<br />Verified on-chain.</h2>
              <p style={{ fontSize: 15, color: P.muted, lineHeight: 1.8, marginBottom: 32 }}>
                FundBeep is the only crowdfunding platform with a fully on-chain reputation system. Every creator builds a verifiable Trust Score from real activity, and backers can always see the receipts on Solscan.
              </p>
              <button onClick={() => setPage("docs")}
                style={{ padding: "11px 24px", borderRadius: 9, border: `1.5px solid ${P.border}`, background: "transparent", color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.background = P.panel; e.currentTarget.style.borderColor = P.borderMid; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = P.border; }}>
                Learn how verification works →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {TRUST_ITEMS.map(t => (
                <div key={t.title} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 20px", background: P.bg, border: `1px solid ${t.border}`, borderRadius: 14, transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.bg; e.currentTarget.style.boxShadow = `0 4px 20px ${t.border}`; }}
                  onMouseLeave={e => { e.currentTarget.style.background = P.bg; e.currentTarget.style.boxShadow = "none"; }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: t.color }}><t.icon size={18} /></div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: t.color, marginBottom: 4 }}>{t.title}</div>
                    <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.65 }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section style={{ padding: "100px 32px", background: P.bg, borderTop: `1px solid ${P.border}` }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ display: "inline-block", fontSize: 11, fontWeight: 800, color: "#000", letterSpacing: 2.5, marginBottom: 16, padding: "5px 16px", borderRadius: 99, background: P.panel, border: `1px solid ${P.border}` }}>EVERYTHING YOU NEED</div>
            <h2 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 900, color: P.text, letterSpacing: -1.5 }}>A complete crowdfunding ecosystem</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title}
                style={{ padding: "24px 26px", borderRadius: 14, border: `1.5px solid ${P.border}`, background: P.surface, animation: `fadeUp .5s ease ${i * .06}s both`, transition: "all .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = P.borderMid; e.currentTarget.style.background = P.panel; e.currentTarget.style.boxShadow = `0 4px 20px rgba(109,40,217,.08)`; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.background = P.surface; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                <div style={{ marginBottom: 14, color: P.purple }}><f.icon size={24} /></div>
                <div style={{ fontWeight: 800, fontSize: 14, color: P.text, marginBottom: 7, letterSpacing: -.2 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.75 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERBOARD TEASER ── */}
      <section style={{ padding: "100px 32px", background: P.surface, borderTop: `1px solid ${P.border}` }}>
        <div style={{ maxWidth: 740, margin: "0 auto", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800, color: "#000", letterSpacing: 2, marginBottom: 16, padding: "5px 16px", borderRadius: 99, background: P.yellowDim, border: "1px solid rgba(201,150,12,.25)" }}><Trophy size={13} /> MONTHLY LEADERBOARD</div>
          <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900, color: P.text, letterSpacing: -1.5, marginBottom: 16 }}>Top contributors win recognition</h2>
          <p style={{ fontSize: 15, color: P.muted, lineHeight: 1.8, marginBottom: 36, maxWidth: 500, margin: "0 auto 36px" }}>
            Every month, the top 5 SOL contributors are crowned on the Contributor Leaderboard. Past champions earn a permanent win badge on their public profile.
          </p>
          <button onClick={() => setPage("leaderboard")}
            style={{ padding: "13px 34px", borderRadius: 11, border: "none", background: `linear-gradient(135deg, #C9960C, #F59E0B)`, color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 24px rgba(201,150,12,.3)", transition: "all .18s" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(201,150,12,.42)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(201,150,12,.3)"; }}>
            <Trophy size={15} style={{ display: "inline", marginRight: 7 }} /> View Leaderboard
          </button>
        </div>
      </section>

      {/* ── PLATFORM SPECS ── */}
      <section style={{ padding: "80px 32px", background: P.bg, borderTop: `1px solid ${P.border}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 36px)", fontWeight: 900, color: P.text, letterSpacing: -1, marginBottom: 8 }}>Platform at a glance</h2>
            <p style={{ fontSize: 14, color: P.muted }}>Designed for speed, fairness, and full on-chain transparency.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { icon: Target,  label: "Listing Fee",         val: "0.1 SOL",   sub: "One-time, on-chain" },
              { icon: Zap,     label: "Settlement Time",     val: "~400ms",    sub: "Solana block time" },
              { icon: Wallet,  label: "Min Contribution",    val: "0.01 SOL",  sub: "Roughly $1–2 USD" },
              { icon: Link,    label: "Blockchain",          val: "Solana",    sub: "Fast & low fees" },
              { icon: Heart,   label: "Payment Method",      val: "SOL only",  sub: "Via Phantom wallet" },
              { icon: Globe,   label: "Access",              val: "Global",    sub: "Anyone, anywhere" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 20px", background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, transition: "all .18s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = P.borderMid; e.currentTarget.style.boxShadow = `0 4px 16px rgba(109,40,217,.08)`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.boxShadow = "none"; }}>
                <span style={{ flexShrink: 0, color: P.purple }}><item.icon size={22} /></span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: P.text, lineHeight: 1 }}>{item.val}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: P.muted, marginTop: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: P.lighter, marginTop: 1 }}>{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section style={{ padding: "100px 32px", background: P.surface, borderTop: `1px solid ${P.border}` }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center", background: `linear-gradient(135deg, ${P.purpleDeep} 0%, ${P.purplePop} 50%, ${P.purple} 100%)`, borderRadius: 24, padding: "84px 52px", position: "relative", overflow: "hidden", boxShadow: `0 24px 80px rgba(76,29,149,.38)` }}>
          <div style={{ position: "absolute", width: 380, height: 380, borderRadius: "50%", background: "rgba(255,255,255,.04)", top: -150, right: -100, pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,.03)", bottom: -90, left: -90, pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 54, marginBottom: 20, animation: "float 3s ease-in-out infinite" }}>◎</div>
            <h2 style={{ fontSize: "clamp(26px, 3.5vw, 42px)", fontWeight: 900, color: "#fff", letterSpacing: -1.5, marginBottom: 18 }}>Ready to raise on Solana?</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.72)", marginBottom: 44, lineHeight: 1.78, maxWidth: 460, margin: "0 auto 44px" }}>
              Connect your Phantom wallet and launch your first campaign in under 2 minutes. Smart contract escrow protects backers. All on-chain.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={walletAddress ? () => setPage("dashboard") : onAuthClick}
                style={{ padding: "14px 40px", borderRadius: 11, border: "none", background: "#fff", color: "#000", fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 6px 24px rgba(0,0,0,.15)", transition: "all .18s" }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 32px rgba(0,0,0,.22)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,.15)"; }}>
                <Rocket size={15} style={{ display: "inline", marginRight: 7 }} /> Launch Campaign
              </button>
              <button onClick={() => setPage("campaigns")}
                style={{ padding: "14px 34px", borderRadius: 11, border: "1.5px solid rgba(255,255,255,.3)", background: "rgba(255,255,255,.08)", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: "inherit", transition: "all .18s" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.16)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.5)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,.08)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.3)"; }}>
                Browse Campaigns
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: P.bg, borderTop: `1px solid ${P.border}`, padding: "36px 32px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 32, marginBottom: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${P.purple}, ${P.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#fff" }}>◎</div>
                <span style={{ fontWeight: 900, fontSize: 15, color: P.text }}>FundBeep</span>
              </div>
              <p style={{ fontSize: 12, color: P.lighter, maxWidth: 220, lineHeight: 1.65 }}>Decentralized crowdfunding on Solana. On-chain escrow. Milestone-based payouts.</p>
            </div>
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              {[
                { heading: "Platform", links: [{ label: "Campaigns", page: "campaigns" }, { label: "Explore", page: "explore" }, { label: "Leaderboard", page: "leaderboard" }, { label: "My Campaign", page: "dashboard" }] },
                { heading: "Resources", links: [{ label: "Documentation", page: "docs" }, { label: "Lightpaper", page: "lightpaper" }, { label: "About Us", page: "about" }, { label: "Get Verified", page: "kyc" }, { label: "Promote", page: "promote" }] },
              ].map(col => (
                <div key={col.heading}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: P.textSub, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>{col.heading}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {col.links.map(l => (
                      <button key={l.page} onClick={() => setPage(l.page)}
                        style={{ background: "none", border: "none", color: P.lighter, fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 500, textAlign: "left", padding: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = P.purple}
                        onMouseLeave={e => e.currentTarget.style.color = P.lighter}>
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${P.border}`, paddingTop: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 12, color: P.lighter }}>© 2025 FundBeep. All rights reserved.</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {[
                { label: "X", href: "https://x.com/fundbeep", bg: "#000", icon: "𝕏" },
                { label: "Telegram", href: "https://t.me/fundbeep", bg: "#229ED9", icon: "✈" },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noreferrer"
                  style={{ width: 32, height: 32, borderRadius: 8, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 800, textDecoration: "none", opacity: .85, transition: "opacity .15s" }}
                  onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                  onMouseLeave={e => e.currentTarget.style.opacity = ".85"}>
                  {s.icon}
                </a>
              ))}
              <div style={{ fontSize: 12, color: P.lighter, marginLeft: 4 }}>Built on Solana · Powered by Phantom</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
