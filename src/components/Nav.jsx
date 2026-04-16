import { useState, useRef, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { Home, LayoutDashboard, User, Zap, LogOut, LogIn, Wallet, ChevronDown } from "lucide-react";

const C = {
  yellow: "#E8B904", purple: "#7C3AED", purpleBright: "#9D5CF6",
  bg: "#09080F", surface: "#110F1C", border: "rgba(255,255,255,.07)",
  text: "#F0ECF8", muted: "rgba(240,236,248,.45)", faint: "rgba(240,236,248,.12)",
  purpleDim: "#7C3AED18", purpleBorder: "#7C3AED45",
};

const short = (a) => a ? `${a.slice(0, 4)}…${a.slice(-4)}` : "";

const Spinner = () => (
  <span style={{ width: 13, height: 13, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
);

export default function Nav({ page, setPage, onAuthClick }) {
  const { user, profile, walletAddress, disconnectWallet, signOut } = useWallet();
  const [dropOpen, setDropOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";

  return (
    <nav style={{
      padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between",
      borderBottom: `1px solid ${C.border}`,
      background: "rgba(9,8,15,.85)", backdropFilter: "blur(24px)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div onClick={() => setPage("home")} style={{ display: "flex", alignItems: "center", gap: 11, cursor: "pointer" }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg, ${C.purple}, ${C.yellow})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900 }}>◎</div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 19, letterSpacing: -1, lineHeight: 1 }}>FundBeep</div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: C.muted }}>SOLANA FUNDRAISING</div>
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {[
          { key: "home", label: "Home" },
          { key: "campaigns", label: "All Campaigns" },
          ...(walletAddress ? [{ key: "dashboard", label: "Dashboard" }] : []),
          ...(isAdmin ? [{ key: "admin", label: "⚡ Admin" }] : []),
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setPage(key)} style={{
            padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: page === key ? "rgba(255,255,255,.09)" : "transparent",
            color: page === key ? C.text : C.muted,
            fontWeight: 600, fontSize: 13,
          }}>{label}</button>
        ))}
      </div>

      {/* Right — wallet not connected */}
      {!walletAddress && (
        <button onClick={onAuthClick} style={{
          padding: "10px 22px", borderRadius: 10, border: "none",
          background: `linear-gradient(135deg, ${C.purple}, ${C.yellow})`,
          color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: `0 4px 20px ${C.purple}40`,
        }}>
          <Wallet size={15} /> Connect Wallet
        </button>
      )}

      {/* Right — wallet connected */}
      {walletAddress && (
        <div ref={dropRef} style={{ position: "relative" }}>
          <button onClick={() => setDropOpen(o => !o)} style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "7px 14px", borderRadius: 10,
            background: "rgba(255,255,255,.05)", border: `1px solid ${C.border}`,
            color: C.text, cursor: "pointer",
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${C.purple}, ${C.yellow})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900 }}>
              {profile?.full_name?.[0]?.toUpperCase() || "◎"}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{profile?.full_name || "Wallet"}</div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{short(walletAddress)}</div>
            </div>
            <ChevronDown size={13} style={{ color: C.muted }} />
          </button>

          {dropOpen && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0, width: 230,
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: 14, overflow: "hidden", zIndex: 200,
              animation: "slideDown .15s ease both",
              boxShadow: "0 20px 60px rgba(0,0,0,.6)",
            }}>
              {/* Wallet chip */}
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6, fontWeight: 700, letterSpacing: .5 }}>CONNECTED WALLET</div>
                <div style={{ fontFamily: "monospace", fontSize: 11, color: C.yellow, background: "rgba(232,185,4,.08)", padding: "6px 9px", borderRadius: 7, wordBreak: "break-all" }}>
                  {walletAddress}
                </div>
              </div>

              {[
                { icon: <Home size={14} />,           label: "Home",        action: () => { setPage("home");      setDropOpen(false); } },
                { icon: <LayoutDashboard size={14} />, label: "Dashboard",   action: () => { setPage("dashboard"); setDropOpen(false); } },
                { icon: <User size={14} />,           label: "My Profile",  action: () => { setPage("profile");   setDropOpen(false); } },
                ...(isAdmin ? [{ icon: <Zap size={14} />, label: "Admin Panel", action: () => { setPage("admin"); setDropOpen(false); } }] : []),
                { icon: <LogOut size={14} />,         label: "Disconnect",  action: () => { disconnectWallet();   setDropOpen(false); }, color: C.muted },
                ...(user ? [{ icon: <LogIn size={14} />, label: "Sign Out", action: () => { signOut(); setDropOpen(false); }, color: "#e07070" }] : []),
              ].map(item => (
                <button key={item.label} onClick={item.action} style={{
                  width: "100%", padding: "11px 16px", border: "none", textAlign: "left",
                  background: "transparent", color: item.color || C.text,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  transition: "background .1s",
                  display: "flex", alignItems: "center", gap: 10,
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.05)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >{item.icon}{item.label}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
