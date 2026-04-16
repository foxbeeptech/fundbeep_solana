import { useState } from "react";
import { supabase } from "../supabase";
import { WALLET_LIST, getInstalledWallets, isInWalletBrowser } from "../utils/walletProviders";

const C = {
  yellow: "#E8B904", purple: "#7C3AED", purpleBright: "#9D5CF6",
  surface: "#110F1C", border: "rgba(255,255,255,.07)",
  text: "#F0ECF8", muted: "rgba(240,236,248,.45)", faint: "rgba(240,236,248,.12)",
  purpleBorder: "#7C3AED45",
};

const Spinner = () => (
  <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.2)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} />
);

const isMobileDevice = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export default function AuthModal({ onClose, connectWallet }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [connectingId, setConnectingId] = useState(null);

  const mobile = isMobileDevice();
  const inWalletBrowser = isInWalletBrowser();
  const installed = getInstalledWallets();

  const handleConnect = async (walletDef) => {
    setError("");
    const provider = walletDef.getProvider();

    if (!provider) {
      // On mobile with a deep link available → redirect
      if (mobile && walletDef.mobileDeepLink?.()) {
        window.location.href = walletDef.mobileDeepLink();
        return;
      }
      window.open(walletDef.url, "_blank");
      setError(`${walletDef.name} not found. Install it then try again.`);
      return;
    }

    setBusy(true);
    setConnectingId(walletDef.id);
    try {
      const resp = await provider.connect();
      const addr = resp.publicKey.toString();

      const fakeEmail = `${addr.slice(0, 16).toLowerCase()}@wallet.fundbeep`;
      const fakePass  = `FBW_${addr}_secure`;

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: fakeEmail, password: fakePass,
      });

      if (!signInErr && signInData?.session) {
        await supabase.from("profiles")
          .upsert({ id: signInData.user.id, email: fakeEmail, wallet: addr }, { onConflict: "id" });
        await connectWallet(addr, provider);
        onClose("dashboard");
        return;
      }

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: fakeEmail, password: fakePass,
        options: { data: { wallet: addr }, emailRedirectTo: undefined },
      });
      if (signUpErr) throw signUpErr;

      if (signUpData?.user) {
        await supabase.from("profiles").upsert({
          id: signUpData.user.id, email: fakeEmail, wallet: addr,
          full_name: `${addr.slice(0, 4)}…${addr.slice(-4)}`,
        }, { onConflict: "id" });
      }

      if (!signUpData?.session) {
        const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({
          email: fakeEmail, password: fakePass,
        });
        if (retryErr || !retryData?.session) {
          setError("Please disable email confirmation in Supabase Auth settings, then try again.");
          setBusy(false); setConnectingId(null);
          return;
        }
      }

      await connectWallet(addr, provider);
      onClose("dashboard");

    } catch (e) {
      console.error("Wallet connect error:", e);
      if (e.message?.includes("User already registered")) {
        try {
          const provider2 = walletDef.getProvider();
          const addr2 = provider2?.publicKey?.toString();
          if (addr2) {
            const fe = `${addr2.slice(0, 16).toLowerCase()}@wallet.fundbeep`;
            const fp = `FBW_${addr2}_secure`;
            const { data } = await supabase.auth.signInWithPassword({ email: fe, password: fp });
            if (data?.session) {
              await supabase.from("profiles").upsert({ id: data.user.id, email: fe, wallet: addr2 }, { onConflict: "id" });
              await connectWallet(addr2, provider2);
              onClose("dashboard");
              setBusy(false); setConnectingId(null);
              return;
            }
          }
        } catch (_) {}
      }
      setError(e.message || "Connection failed. Please try again.");
    } finally {
      setBusy(false);
      setConnectingId(null);
    }
  };

  // ── Mobile outside any wallet browser ────────────────────────────────────────
  if (mobile && !inWalletBrowser) {
    return (
      <div onClick={() => onClose()} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.9)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: C.surface, border: `1px solid ${C.purpleBorder}`, borderRadius: 24, padding: 28, position: "relative", boxShadow: "0 40px 100px rgba(124,58,237,.35)", animation: "fadeUp .25s ease both", textAlign: "center" }}>
          <button onClick={() => onClose()} style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: 8, border: "none", background: C.faint, color: C.muted, cursor: "pointer" }}>✕</button>
          <div style={{ width: 54, height: 54, borderRadius: 15, background: `linear-gradient(135deg, ${C.purple}, ${C.yellow})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>◎</div>
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 6, color: C.text }}>Connect Your Wallet</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 22, lineHeight: 1.6 }}>Open FundBeep inside your wallet's browser to connect.</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
            {WALLET_LIST.map(w => {
              const deepLink = w.mobileDeepLink?.();
              const installUrl = w.mobileInstallUrl || w.url;
              if (deepLink) {
                return (
                  <button key={w.id} onClick={() => { window.location.href = deepLink; }}
                    style={{ width: "100%", padding: "13px 18px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #4C1D95, #9945FF)", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, fontFamily: "inherit", boxShadow: "0 6px 24px rgba(153,69,255,.4)" }}>
                    <span style={{ fontSize: 20 }}>{w.icon}</span>
                    <span style={{ flex: 1, textAlign: "left" }}>Open in {w.name}</span>
                    <span style={{ fontSize: 12, opacity: 0.7 }}>→</span>
                  </button>
                );
              }
              return (
                <a key={w.id} href={installUrl} target="_blank" rel="noreferrer"
                  style={{ width: "100%", padding: "13px 18px", borderRadius: 14, border: `1px solid rgba(255,255,255,.08)`, background: "rgba(255,255,255,.03)", color: C.muted, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, fontFamily: "inherit", textDecoration: "none", boxSizing: "border-box" }}>
                  <span style={{ fontSize: 20 }}>{w.icon}</span>
                  <span style={{ flex: 1, textAlign: "left" }}>{w.name}</span>
                  <span style={{ fontSize: 11, color: C.faint }}>Install →</span>
                </a>
              );
            })}
          </div>

          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, fontSize: 11, color: C.muted, lineHeight: 1.7, textAlign: "left", marginBottom: 12 }}>
            <b style={{ color: C.text }}>How it works:</b> Tap a wallet above → it opens FundBeep inside that wallet's browser → connect with one tap.
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, color: C.faint }}>
            <span>🔒</span> No email. No password. Wallet only.
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop / inside wallet browser ──────────────────────────────────────────
  return (
    <div onClick={() => onClose()} style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,.9)", backdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 380, background: C.surface, border: `1px solid ${C.purpleBorder}`, borderRadius: 24, padding: 36, position: "relative", boxShadow: "0 40px 100px rgba(124,58,237,.35)", animation: "fadeUp .25s ease both", textAlign: "center" }}>
        <button onClick={() => onClose()} style={{ position: "absolute", top: 14, right: 14, width: 30, height: 30, borderRadius: 8, border: "none", background: C.faint, color: C.muted, cursor: "pointer" }}>✕</button>

        <div style={{ width: 54, height: 54, borderRadius: 15, background: `linear-gradient(135deg, ${C.purple}, ${C.yellow})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 18px" }}>◎</div>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8, color: C.text }}>Connect Wallet</div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.65 }}>
          {installed.length > 0 ? "Choose your Solana wallet to continue." : "Install a Solana wallet to get started."}
        </div>

        {/* Installed wallets */}
        {installed.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {installed.map(w => {
              const isConnecting = connectingId === w.id && busy;
              return (
                <button key={w.id} onClick={() => handleConnect(w)} disabled={busy}
                  style={{ width: "100%", padding: "14px 20px", borderRadius: 14, border: `1px solid rgba(255,255,255,.1)`, background: isConnecting ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.05)", color: C.text, fontWeight: 700, fontSize: 15, cursor: busy ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 14, fontFamily: "inherit", transition: "all .15s" }}
                  onMouseEnter={e => { if (!busy) { e.currentTarget.style.background = "rgba(255,255,255,.1)"; e.currentTarget.style.borderColor = C.purple; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = isConnecting ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.05)"; e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>{w.icon}</span>
                  <span style={{ flex: 1, textAlign: "left" }}>{w.name}</span>
                  {isConnecting && <Spinner />}
                  {!isConnecting && <span style={{ fontSize: 12, color: C.muted }}>Detected ✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Not-installed wallets (show as install links) */}
        {WALLET_LIST.filter(w => !installed.find(i => i.id === w.id)).length > 0 && (
          <>
            {installed.length > 0 && (
              <div style={{ fontSize: 11, color: C.faint, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Other wallets</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {WALLET_LIST.filter(w => !installed.find(i => i.id === w.id)).map(w => (
                <button key={w.id} onClick={() => handleConnect(w)} disabled={busy}
                  style={{ width: "100%", padding: "12px 20px", borderRadius: 12, border: `1px solid rgba(255,255,255,.06)`, background: "transparent", color: C.muted, fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 14, fontFamily: "inherit", transition: "all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,.04)"; e.currentTarget.style.color = C.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{w.icon}</span>
                  <span style={{ flex: 1, textAlign: "left" }}>{w.name}</span>
                  <span style={{ fontSize: 11, color: C.faint }}>Install →</span>
                </button>
              ))}
            </div>
          </>
        )}

        {error && (
          <div style={{ fontSize: 12, color: "#e07070", marginBottom: 14, padding: "10px 14px", background: "rgba(224,112,112,.1)", borderRadius: 9, lineHeight: 1.5, textAlign: "left" }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, color: C.faint }}>
          <span>🔒</span> No email. No password. Wallet only.
        </div>
      </div>
    </div>
  );
}
