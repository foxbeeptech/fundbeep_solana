import { useState, useEffect } from "react";
import { useIsMobile } from "./hooks/useIsMobile";
import { Analytics } from "@vercel/analytics/react";
import { supabase } from "./supabase";
import { WalletContext } from "./context/WalletContext";
import Sidebar from "./components/Sidebar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import CampaignPage from "./pages/CampaignPage";
import Campaigns from "./pages/Campaigns";
import Explore from "./pages/Explore";
import Profile from "./pages/Profile";
import AuthModal from "./components/AuthModal";
import LiveFeed from "./components/LiveFeed";
import NotificationPopup from "./components/NotificationPopup";
import SaraAI from "./components/SaraAI";
import Docs from "./pages/Docs";
import EmbedWidget from "./pages/EmbedWidget";
import Promote from "./pages/Promote";
import Leaderboard from "./pages/Leaderboard";
import PublicProfile from "./pages/PublicProfile";
import KycPage from "./pages/Kyc";
import About from "./pages/About";
import Lightpaper from "./pages/Lightpaper";
import MyContributions from "./pages/MyContributions";

const C = {
  purple:       "#6D28D9",
  purpleLight:  "#7C3AED",
  purpleDim:    "rgba(109,40,217,.08)",
  purpleBorder: "rgba(109,40,217,.2)",
  bg:           "#F5F3FF",
  surface:      "#FFFFFF",
  surfaceHover: "#F8F9FC",
  border:       "#DDD6FE",
  borderHover:  "#C4B5FD",
  text:         "#1E0A4C",
  textSub:      "#4C1D95",
  muted:        "#6D28D9",
  faint:        "#8B5CF6",
  green:        "#15803D",
  greenDim:     "rgba(21,128,61,.1)",
  red:          "#B91C1C",
  redDim:       "rgba(185,28,28,.08)",
};

const VALID_PAGES = ["home","explore","campaigns","campaign","dashboard","my-contributions","profile","edit-profile","admin","docs","embed","promote","leaderboard","user","kyc","about","lightpaper"];

function readHash() {
  const hash  = window.location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/");
  const pg    = VALID_PAGES.includes(parts[0]) ? parts[0] : "home";
  const cid   = (pg === "campaign" || pg === "embed") ? (parts[1] || null) : null;
  const uid   = pg === "user" ? (parts[1] || null) : null;
  return { pg, cid, uid };
}

// Embed widget — standalone iframe page, no app chrome
function EmbedPage() {
  const { pg, cid } = readHash();
  if (pg !== "embed" || !cid) return null;
  return (
    <div style={{ minHeight: "100vh", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <EmbedWidget campaignId={cid} />
      </div>
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const init = readHash();
  const [page, setPage]               = useState(init.pg);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [campaignId, setCampaignId]   = useState(init.cid);
  const [userId, setUserId]           = useState(init.uid);
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [walletAddress, setWalletAddress] = useState(() => localStorage.getItem("fb_wallet") || null);
  const [walletProvider, setWalletProvider] = useState(null);
  const [showAuth, setShowAuth]       = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ── URL hash routing ──────────────────────────────────────────────────────
  useEffect(() => {
    let newHash = page;
    if (page === "campaign" && campaignId) newHash = `campaign/${campaignId}`;
    if (page === "user"     && userId)     newHash = `user/${userId}`;
    if (window.location.hash.replace(/^#\/?/, "") !== newHash)
      window.location.hash = newHash;
  }, [page, campaignId, userId]);

  useEffect(() => {
    const onHashChange = () => {
      const { pg, cid, uid } = readHash();
      setPage(pg);
      if (cid) setCampaignId(cid);
      if (uid) setUserId(uid);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser(session.user);
      setAuthLoading(false);
    }).catch(() => setAuthLoading(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) setUser(session.user);
      else { setUser(null); setProfile(null); setWalletAddress(null); setWalletProvider(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single()
      .then(({ data }) => {
        if (data) { setProfile(data); if (data.wallet) setWalletAddress(data.wallet); }
      }).catch(() => {});
  }, [user]);

  // Auto-restore walletProvider after page reload (provider object is lost on refresh)
  useEffect(() => {
    if (!walletAddress || walletProvider) return;
    const tryRestore = async () => {
      const candidates = [
        window?.phantom?.solana,
        window?.solana,
        window?.backpack,
        window?.solflare,
        window?.okxwallet?.solana,
      ].filter(Boolean);

      for (const p of candidates) {
        // Already connected and matches — use immediately
        if (p?.publicKey?.toString() === walletAddress) { setWalletProvider(p); return; }
        // Try silent reconnect (onlyIfTrusted = no popup if site was previously approved)
        try {
          const res = await p.connect({ onlyIfTrusted: true });
          if (res?.publicKey?.toString() === walletAddress) { setWalletProvider(p); return; }
        } catch (_) { /* wallet not trusted or not available — skip */ }
      }
    };
    const t = setTimeout(tryRestore, 500); // wait for wallet extensions to inject
    return () => clearTimeout(t);
  }, [walletAddress, walletProvider]);

  const connectWallet = async (addr, provider = null) => {
    if (!addr) return null;
    localStorage.setItem("fb_wallet", addr);
    setWalletAddress(addr);
    if (provider) setWalletProvider(provider);
    if (user) {
      await supabase.from("profiles").update({ wallet: addr }).eq("id", user.id);
      setProfile(p => ({ ...p, wallet: addr }));
    }
    return addr;
  };

  const disconnectWallet = async () => {
    try { if (walletProvider) await walletProvider.disconnect(); } catch (_) {}
    localStorage.removeItem("fb_wallet");
    setWalletAddress(null);
    setWalletProvider(null);
    if (user) {
      await supabase.from("profiles").update({ wallet: null }).eq("id", user.id);
      setProfile(p => ({ ...p, wallet: null }));
    }
  };

  const signOut = async () => {
    try { if (walletProvider) await walletProvider.disconnect(); } catch (_) {}
    await supabase.auth.signOut();
    localStorage.removeItem("fb_wallet");
    setPage("home"); setUser(null); setProfile(null); setWalletAddress(null); setWalletProvider(null);
  };

  const goToUser = (uid) => { setUserId(uid); setPage("user"); };

  // Embed widget — return bare page with no sidebar/auth/etc.
  if (page === "embed") return <EmbedPage />;

  if (authLoading) return (
    <div style={{ minHeight: "100vh", background: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 13, margin: "0 auto 16px", background: "linear-gradient(135deg, #6D28D9, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#fff" }}>◎</div>
        <div style={{ color: "#8B5CF6", fontSize: 14 }}>Loading FundBeep…</div>
      </div>
    </div>
  );

  // Home page has its own full-width layout with embedded nav
  const isHomePage = page === "home";

  return (
    <WalletContext.Provider value={{ user, profile, setProfile, walletAddress, walletProvider, connectWallet, disconnectWallet, signOut }}>
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Nunito Sans', sans-serif", display: "flex" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,300;0,6..12,400;0,6..12,500;0,6..12,600;0,6..12,700;0,6..12,800;0,6..12,900;1,6..12,400&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          html, body, #root { width: 100% !important; overflow-x: hidden; }
          body { background: #F5F3FF; }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-track { background: #F5F3FF; }
          ::-webkit-scrollbar-thumb { background: #DDD6FE; border-radius: 4px; }
          ::-webkit-scrollbar-thumb:hover { background: #C4B5FD; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
          @keyframes slideDown { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
          @keyframes pulse { 0%,100% { opacity:.6; } 50% { opacity:1; } }
          @keyframes slideInRight { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
          input, textarea, select, button { font-family: inherit; }
          .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          a { color: inherit; }
          @media (max-width: 768px) {
            .lp-toc, .docs-toc { display: none !important; }
            .lp-toc.toc-open, .docs-toc.toc-open { display: flex !important; }
            .lp-content, .docs-content { padding: 24px 18px 80px !important; }
            .about-content { padding: 0 16px 80px !important; }
            .hero-section { padding: 60px 20px 72px !important; }
            .stats-bar { margin: 32px 0 !important; }
            .feat-grid { gap: 12px !important; }
          }
        `}</style>

        {/* Sidebar only shows on non-home pages */}
        {!isHomePage && (
          <Sidebar
            page={page}
            setPage={(p) => { setPage(p); setSidebarOpen(false); }}
            onAuthClick={() => setShowAuth(true)}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, marginLeft: isMobile ? 0 : (isHomePage ? 0 : 240), minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>

          {/* Mobile top bar — shown on non-home pages on mobile */}
          {isMobile && !isHomePage && (
            <div style={{ position: "sticky", top: 0, zIndex: 90, height: 56, background: "#fff", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", flexShrink: 0 }}>
              <button
                onClick={() => setSidebarOpen(true)}
                style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", fontSize: 18, color: C.text, display: "flex", alignItems: "center", justifyContent: "center" }}
              >☰</button>
              <span style={{ fontWeight: 800, fontSize: 15, color: C.text, letterSpacing: -.3 }}>
                {page === "dashboard" ? "My Campaign" : page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, " ")}
              </span>
              <div>
                {!walletAddress ? (
                  <button
                    onClick={() => setShowAuth(true)}
                    style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                  >Connect</button>
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: "#7536E1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#fff", fontWeight: 700 }}>
                    {profile?.full_name?.[0]?.toUpperCase() || "◎"}
                  </div>
                )}
              </div>
            </div>
          )}
          {page === "home"      && <Home      setPage={setPage} onAuthClick={() => setShowAuth(true)} onViewCampaign={(id) => { setCampaignId(id); setPage("campaign"); }} />}
          {page === "explore"   && <Explore   setPage={setPage} onAuthClick={() => setShowAuth(true)} onViewCampaign={(id) => { setCampaignId(id); setPage("campaign"); }} onViewUser={goToUser} />}
          {page === "campaigns" && <Campaigns setPage={setPage} onAuthClick={() => setShowAuth(true)} onViewCampaign={(id) => { setCampaignId(id); setPage("campaign"); }} />}
          {page === "campaign"  && campaignId && <CampaignPage campaignId={campaignId} onBack={() => setPage("campaigns")} onViewUser={goToUser} />}
          {page === "dashboard" && (walletAddress ? <Dashboard setPage={setPage} onViewCampaign={(id) => { setCampaignId(id); setPage("campaign"); }} /> : <NotLoggedIn onAuth={() => setShowAuth(true)} />)}
          {page === "my-contributions" && (walletAddress ? <MyContributions onViewCampaign={(id) => { setCampaignId(id); setPage("campaign"); }} /> : <NotLoggedIn onAuth={() => setShowAuth(true)} />)}
          {page === "profile"      && (walletAddress ? <Profile onViewCampaign={(id) => { setCampaignId(id); setPage("campaign"); }} onViewUser={goToUser} /> : <NotLoggedIn onAuth={() => setShowAuth(true)} />)}
          {page === "edit-profile" && (walletAddress ? <Profile onViewCampaign={(id) => { setCampaignId(id); setPage("campaign"); }} onViewUser={goToUser} openEdit /> : <NotLoggedIn onAuth={() => setShowAuth(true)} />)}
          {page === "admin"     && (["admin","superadmin"].includes(profile?.role) ? <AdminDashboard /> : <NotLoggedIn onAuth={() => setShowAuth(true)} />)}
          {page === "docs"        && <Docs />}
          {page === "about"       && <About />}
          {page === "lightpaper"  && <Lightpaper />}
          {page === "promote"     && <Promote />}
          {page === "leaderboard" && <Leaderboard onViewUser={goToUser} />}
          {page === "kyc"         && <KycPage />}
          {page === "user" && userId && (
            <PublicProfile
              userId={userId}
              onBack={() => window.history.back()}
              onViewUser={goToUser}
              onViewCampaign={(id) => { setCampaignId(id); setPage("campaign"); }}
            />
          )}
        </div>

        {showAuth && (
          <AuthModal onClose={(redirect) => { setShowAuth(false); if (redirect && page === "home") setPage(redirect); }} connectWallet={connectWallet} />
        )}

        {/* Global live donations feed — hidden on home page */}
        {!isHomePage && <LiveFeed />}
      </div>

      {/* Notification popup — shown to logged-in creators on approval/rejection */}
      {user && (
        <NotificationPopup
          user={user}
          onViewCampaign={(id) => { setCampaignId(id); setPage("campaign"); }}
          setPage={setPage}
        />
      )}

      <Analytics />
      <SaraAI />
    </WalletContext.Provider>
  );
}

function NotLoggedIn({ onAuth }) {
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40, minHeight: "80vh" }}>
      <div style={{ textAlign: "center", maxWidth: 360 }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>👻</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: "#1E0A4C", marginBottom: 8 }}>Connect Your Wallet</div>
        <div style={{ color: "#6D28D9", fontSize: 14, marginBottom: 28, lineHeight: 1.6 }}>Connect your Phantom wallet to access your dashboard and manage campaigns.</div>
        <button onClick={onAuth} style={{ padding: "12px 28px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #6D28D9, #8B5CF6)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
          👻 Connect Phantom
        </button>
      </div>
    </div>
  );
}
