import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { getPlatformSetting } from "../supabase";
import { useIsMobile } from "../hooks/useIsMobile";
import {
  Home, LayoutGrid, FolderOpen, Coins, Compass, Trophy,
  User, PenLine, ShieldCheck, Megaphone, BookOpen, Globe,
  Send, Zap, Wallet, LogOut, LogIn, ChevronDown, ExternalLink,
  X, Settings,
} from "lucide-react";

const C = {
  yellow:       "#C9960C",
  yellowLight:  "#E8B904",
  yellowDim:    "rgba(201,150,12,.1)",
  yellowBorder: "rgba(201,150,12,.25)",
  purple:       "#6D28D9",
  purpleDim:    "rgba(109,40,217,.08)",
  bg:           "#F1F3F8",
  surface:      "#FFFFFF",
  border:       "#E2E5EE",
  text:         "#0F1117",
  textSub:      "#374151",
  muted:        "#6B7280",
  faint:        "#9CA3AF",
  green:        "#15803D",
  greenDim:     "rgba(21,128,61,.1)",
  red:          "#B91C1C",
};

const short = (a) => a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "";

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick, sub = false, badge }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        padding: sub ? "7px 12px 7px 40px" : "9px 12px",
        marginBottom: 1,
        borderRadius: 8,
        border: "none",
        borderLeft: active ? `3px solid #7536E1` : "3px solid transparent",
        textAlign: "left",
        cursor: "pointer",
        fontFamily: "inherit",
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: active ? "#EDEDED" : hov ? C.bg : "transparent",
        color: active ? C.text : hov ? C.text : sub ? C.faint : C.muted,
        fontWeight: active ? 800 : 500,
        fontSize: sub ? 13 : 13.5,
        transition: "all .12s",
        boxSizing: "border-box",
      }}
    >
      {!sub && (
        <span style={{
          width: 28, height: 28, borderRadius: 7,
          background: active ? "#D8D8D8" : hov ? C.border : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, flexShrink: 0, transition: "background .12s",
        }}>
          {icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{label}</span>
      {badge && (
        <span style={{ fontSize: 10, fontWeight: 800, background: C.yellow, color: "#fff", borderRadius: 99, padding: "1px 6px" }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── SectionLabel ──────────────────────────────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 12px 6px", userSelect: "none" }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: C.faint, letterSpacing: 1.3, textTransform: "uppercase", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar({ page, setPage, onAuthClick, open, onClose }) {
  const { profile, walletAddress, disconnectWallet, signOut } = useWallet();
  const isMobile = useIsMobile();
  const [socialOpen, setSocialOpen] = useState(false);
  const [telegramUrl, setTelegramUrl] = useState("");
  const [twitterUrl,  setTwitterUrl]  = useState("");
  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";
  const hasWallet = !!walletAddress;

  useEffect(() => {
    Promise.all([
      getPlatformSetting("social_telegram"),
      getPlatformSetting("social_twitter"),
    ]).then(([tg, tw]) => {
      if (tg) setTelegramUrl(tg);
      if (tw) setTwitterUrl(tw);
    }).catch(() => {});
  }, []);

  const nav = (key) => setPage(key);
  const is  = (key) => page === key;

  return (
    <>
      {/* Backdrop — mobile only, shown when sidebar is open */}
      {isMobile && open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 99,
            background: "rgba(0,0,0,.4)",
          }}
        />
      )}

    <div style={{
      width: 240, height: "100vh", position: "fixed", left: 0, top: 0, zIndex: 100,
      background: C.surface, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      boxShadow: "2px 0 12px rgba(0,0,0,.05)",
      transform: isMobile ? (open ? "translateX(0)" : "translateX(-100%)") : "none",
      transition: "transform .25s ease",
    }}>

      {/* ── Brand ── */}
      <div style={{ padding: "18px 16px 14px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          onClick={() => nav("home")}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 10px", borderRadius: 10, transition: "background .15s", flex: 1 }}
          onMouseEnter={e => e.currentTarget.style.background = C.bg}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "#7536E1",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, color: "#fff", fontWeight: 900, flexShrink: 0,
            boxShadow: "0 2px 8px rgba(109,40,217,.3)",
          }}>◎</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 15, color: C.text, letterSpacing: -.4, lineHeight: 1 }}>FundBeep</div>
            <div style={{ fontSize: 9, color: C.faint, letterSpacing: 1.3, marginTop: 3, textTransform: "uppercase" }}>Crowdfunding Platform</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        {isMobile && (
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", fontSize: 16, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >×</button>
        )}
      </div>

      <div style={{ height: 1, background: C.border, flexShrink: 0 }} />

      {/* ── Scrollable nav area ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2px 8px 12px" }}>

        {/* ── SECTION: MAIN ── */}
        <SectionLabel label="Main" />
        <NavItem icon={<Home size={15} />} label="Home"           active={is("home")}        onClick={() => nav("home")} />
        <NavItem icon={<LayoutGrid size={15} />} label="All Campaigns" active={is("campaigns")}   onClick={() => nav("campaigns")} />
        {hasWallet && <NavItem icon={<FolderOpen size={15} />} label="My Campaign"       active={is("dashboard")}         onClick={() => nav("dashboard")} />}
        {hasWallet && <NavItem icon={<Coins size={15} />} label="My Contributions" active={is("my-contributions")} onClick={() => nav("my-contributions")} />}
        <NavItem icon={<Compass size={15} />} label="Explore"     active={is("explore")}     onClick={() => nav("explore")} />
        <NavItem icon={<Trophy size={15} />} label="Leaderboard" active={is("leaderboard")} onClick={() => nav("leaderboard")} />

        {/* ── SECTION: MY SPACE (wallet required) ── */}
        {hasWallet && (
          <>
            <SectionLabel label="My Space" />
            <NavItem icon={<User size={15} />}        label="Profile"      active={is("profile")}      onClick={() => nav("profile")} />
            <NavItem icon={<PenLine size={13} />}   label="Edit Profile" active={is("edit-profile")} onClick={() => nav("edit-profile")} sub />
            <NavItem icon={<ShieldCheck size={15} />} label="Get Verified" active={is("kyc")}        onClick={() => nav("kyc")} />
          </>
        )}

        {/* ── SECTION: TOOLS (wallet required) ── */}
        {hasWallet && (
          <>
            <SectionLabel label="Tools" />
            <NavItem icon={<Megaphone size={15} />} label="Promote" active={is("promote")} onClick={() => nav("promote")} />
          </>
        )}

        {/* ── SECTION: RESOURCES ── */}
        <SectionLabel label="Resources" />
        <NavItem icon={<BookOpen size={15} />} label="Documentation" active={is("docs")} onClick={() => nav("docs")} />

        {/* ── SECTION: COMMUNITY (social links) ── */}
        {(telegramUrl || twitterUrl) && (
          <>
            <SectionLabel label="Community" />

            {/* Social Media accordion */}
            <button
              onClick={() => setSocialOpen(o => !o)}
              style={{
                width: "100%", padding: "9px 12px", marginBottom: 1, borderRadius: 8,
                border: "none", borderLeft: "3px solid transparent",
                textAlign: "left", cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 10,
                background: socialOpen ? C.purpleDim : "transparent",
                color: socialOpen ? C.purple : C.muted,
                fontWeight: socialOpen ? 700 : 500, fontSize: 13.5,
                transition: "all .12s", boxSizing: "border-box",
              }}
              onMouseEnter={e => { if (!socialOpen) { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.text; } }}
              onMouseLeave={e => { if (!socialOpen) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; } }}
            >
              <span style={{ width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Globe size={15} /></span>
              <span style={{ flex: 1 }}>Social Media</span>
              <ChevronDown size={13} style={{ color: C.faint, transform: socialOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>

            {socialOpen && (
              <div style={{ marginLeft: 8, borderLeft: `2px solid ${C.border}`, paddingLeft: 4 }}>
                {telegramUrl && (
                  <a href={telegramUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px 7px 14px", borderRadius: 7, fontSize: 13, color: C.muted, fontWeight: 500, textDecoration: "none", transition: "all .12s", marginBottom: 1 }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.text; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}
                  >
                    <Send size={13} /> Telegram
                    <ExternalLink size={11} style={{ marginLeft: "auto", color: C.faint }} />
                  </a>
                )}
                {twitterUrl && (
                  <a href={twitterUrl} target="_blank" rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 10px 7px 14px", borderRadius: 7, fontSize: 13, color: C.muted, fontWeight: 500, textDecoration: "none", transition: "all .12s", marginBottom: 1 }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.text; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 800 }}>𝕏</span> Twitter / X
                    <ExternalLink size={11} style={{ marginLeft: "auto", color: C.faint }} />
                  </a>
                )}
              </div>
            )}
          </>
        )}

        {/* ── SECTION: ADMIN ── */}
        {isAdmin && (
          <>
            <SectionLabel label="Admin" />
            <NavItem icon={<Zap size={15} />} label="Admin Panel" active={is("admin")} onClick={() => nav("admin")} />
          </>
        )}

        {/* ── Connect wallet CTA (no wallet) ── */}
        {!hasWallet && (
          <div style={{ padding: "12px 4px 4px" }}>
            <button
              onClick={onAuthClick}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 9, border: `1px solid ${C.yellowBorder}`, background: C.yellowDim, color: C.yellow, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, transition: "background .15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(201,150,12,.18)"}
              onMouseLeave={e => e.currentTarget.style.background = C.yellowDim}
            >
              <Wallet size={15} /> Connect Wallet
            </button>
            <div style={{ fontSize: 11, color: C.faint, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
              Connect to access Dashboard, Profile, and more
            </div>
          </div>
        )}

      </div>

      {/* ── Wallet card at bottom ── */}
      {hasWallet && (
        <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, padding: "10px 12px" }}>

          {/* User info card */}
          <div style={{ background: C.bg, borderRadius: 10, padding: "10px 12px", marginBottom: 8, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "#7536E1",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, color: "#fff", fontWeight: 900, flexShrink: 0,
              }}>
                {profile?.full_name?.[0]?.toUpperCase() || "◎"}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {profile?.full_name || "Wallet"}
                </div>
                <div style={{ fontSize: 10, color: C.muted, fontFamily: "monospace", marginTop: 1 }}>
                  {short(walletAddress)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
                {profile?.is_verified && (
                  <span style={{ fontSize: 11, background: "rgba(21,128,61,.1)", color: C.green, borderRadius: 4, padding: "1px 5px", fontWeight: 700, fontSize: 10 }}>✦ Verified</span>
                )}
                {isAdmin && (
                  <span style={{ fontSize: 10, fontWeight: 800, background: C.yellowDim, color: C.yellow, borderRadius: 4, padding: "1px 6px", border: `1px solid ${C.yellowBorder}`, letterSpacing: .4 }}>
                    ⚡ {profile?.role?.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Disconnect / Sign out */}
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={disconnectWallet}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "background .12s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            ><LogOut size={12} /> Disconnect</button>
            <button
              onClick={signOut}
              style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid rgba(185,28,28,.15)", background: "rgba(185,28,28,.04)", color: C.red, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit", transition: "background .12s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(185,28,28,.1)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(185,28,28,.04)"}
            ><LogIn size={12} /> Sign Out</button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
