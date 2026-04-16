import { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { getMyCampaignsForKyc, getPlatformSetting } from "../supabase";

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
  green:        "#15803D",
  greenDim:     "rgba(21,128,61,.08)",
  greenBorder:  "rgba(21,128,61,.2)",
};

const TYPES = [
  {
    key:   "kyc",
    icon:  "🪪",
    title: "KYC Verification",
    desc:  "Identity verification for individual campaign creators. Shows a verified identity badge on your campaign, building backer trust.",
    badge: "🪪 KYC Verified",
    color: "#1D4ED8",
    bg:    "rgba(37,99,235,.08)",
    border:"rgba(37,99,235,.25)",
    priceKey: "kyc_price_sol",
    forLabel: "For individuals & solo creators",
    docs: [
      { icon: "🪪", label: "Passport or Government-issued ID", note: "Clear photo of valid document" },
      { icon: "🤳", label: "Face Verification",               note: "Selfie or short video for liveness check" },
      { icon: "📱", label: "Phone Verification",              note: "Active mobile number via OTP" },
    ],
  },
  {
    key:   "org",
    icon:  "🏢",
    title: "Organisation Verification",
    desc:  "Verification for NGOs, charities, companies, and registered organisations. Shows an organisation badge on your campaign.",
    badge: "🏢 Org Verified",
    color: "#065F46",
    bg:    "rgba(6,95,70,.08)",
    border:"rgba(6,95,70,.25)",
    priceKey: "kyc_org_price_sol",
    forLabel: "For NGOs, charities & companies",
    docs: [
      { icon: "📄", label: "Registration Documents",  note: "Certificate of incorporation or NGO registration" },
      { icon: "🌐", label: "Official Website",        note: "Active domain matching the organisation name" },
      { icon: "📣", label: "Social Media Accounts",   note: "Verified or active official social profiles" },
    ],
  },
];

function StepDot({ n, active, done }) {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 900, fontSize: 13,
      background: done ? C.green : active ? C.purple : C.border,
      color: done || active ? "#fff" : C.muted,
      transition: "all .2s",
    }}>
      {done ? "✓" : n}
    </div>
  );
}

function StepBar({ step }) {
  const steps = ["Choose Type", "Choose Campaign", "Proceed"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 32 }}>
      {steps.map((label, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : undefined }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <StepDot n={i + 1} active={step === i + 1} done={step > i + 1} />
            <span style={{ fontSize: 11, fontWeight: 700, color: step >= i + 1 ? C.purple : C.faint, whiteSpace: "nowrap" }}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 2, background: step > i + 1 ? C.green : C.border, margin: "0 8px", marginBottom: 18, transition: "background .3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function KycPage() {
  const { user, walletAddress } = useWallet();

  const [step,       setStep]      = useState(1);
  const [type,       setType]      = useState(null);   // "kyc" | "org"
  const [campaign,   setCampaign]  = useState(null);   // campaign object
  const [campaigns,  setCampaigns] = useState([]);
  const [prices,     setPrices]    = useState({ kyc: "0.5", org: "1.0" });
  const [telegram,   setTelegram]  = useState("fundbeep");
  const [loading,    setLoading]   = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getMyCampaignsForKyc(user.id),
      getPlatformSetting("kyc_price_sol"),
      getPlatformSetting("kyc_org_price_sol"),
      getPlatformSetting("kyc_telegram"),
    ]).then(([camps, kycP, orgP, tg]) => {
      setCampaigns(camps);
      setPrices({ kyc: kycP || "0.5", org: orgP || "1.0" });
      setTelegram(tg || "fundbeep");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const selectedType = TYPES.find(t => t.key === type);
  const price = type ? prices[type] : "—";

  const buildTelegramLink = () => {
    const tgHandle = telegram.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "");
    const msg = encodeURIComponent(
      `Hi! I'd like to verify my campaign "${campaign?.title}" with ${selectedType?.title}.\n\nWallet: ${walletAddress || "N/A"}\nCampaign: ${campaign?.title}\nVerification: ${selectedType?.title} (${price} SOL)`
    );
    return `https://t.me/${tgHandle}?text=${msg}`;
  };

  if (!user || !walletAddress) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👻</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 8 }}>Connect Your Wallet</div>
        <div style={{ fontSize: 14, color: C.muted }}>Connect your Phantom wallet to apply for verification.</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: "22px 40px", background: C.surface }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 26 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, color: C.text }}>Campaign Verification</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Get your campaign KYC or Organisation verified to build backer trust</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 620, margin: "0 auto", padding: "36px 24px 100px", animation: "fadeUp .4s ease" }}>

        <StepBar step={step} />

        {/* ── Step 1: Choose type ── */}
        {step === 1 && (
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: C.text, marginBottom: 6 }}>Choose Verification Type</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Select the type of verification that applies to your campaign.</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {TYPES.map(t => (
                <button key={t.key} onClick={() => { setType(t.key); setStep(2); }}
                  style={{
                    width: "100%", padding: "20px 22px", borderRadius: 14, textAlign: "left", cursor: "pointer",
                    fontFamily: "inherit", border: `2px solid ${type === t.key ? t.color : C.border}`,
                    background: type === t.key ? t.bg : C.surface,
                    transition: "all .15s", boxShadow: "0 1px 4px rgba(0,0,0,.04)",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = t.color; e.currentTarget.style.background = t.bg; }}
                  onMouseLeave={e => { if (type !== t.key) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; } }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{t.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: t.color, background: t.bg, border: `1px solid ${t.border}`, padding: "1px 7px", borderRadius: 99 }}>{t.forLabel}</span>
                      </div>
                      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, marginBottom: 10 }}>{t.desc}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                        <span style={{ padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800, background: t.bg, border: `1px solid ${t.border}`, color: t.color }}>
                          {t.badge}
                        </span>
                        <span style={{ fontSize: 12, color: C.muted }}>shown on your campaign</span>
                      </div>
                      {/* Required docs preview */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        {t.docs.map((d, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.muted }}>
                            <span style={{ fontSize: 14 }}>{d.icon}</span>
                            <span style={{ fontWeight: 700, color: C.text }}>{d.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 18, color: t.color }}>{prices[t.key]}</div>
                      <div style={{ fontSize: 11, color: C.faint, fontWeight: 600 }}>SOL</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Required Documents section */}
            <div style={{ marginTop: 28 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>Required Documents</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {TYPES.map(t => (
                  <div key={t.key} style={{ background: C.surface, border: `1.5px solid ${t.border}`, borderRadius: 14, overflow: "hidden" }}>
                    {/* Card header */}
                    <div style={{ padding: "12px 16px", background: t.bg, borderBottom: `1px solid ${t.border}`, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{t.icon}</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 13, color: t.color }}>{t.title}</div>
                        <div style={{ fontSize: 10, color: t.color, opacity: .75 }}>{t.forLabel}</div>
                      </div>
                    </div>
                    {/* Docs list */}
                    <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                      {t.docs.map((d, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: t.bg, border: `1px solid ${t.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                            {d.icon}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 12, color: C.text }}>{d.label}</div>
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 1, lineHeight: 1.4 }}>{d.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Choose campaign ── */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} style={{ background: "none", border: "none", color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
              ← Back
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 22 }}>{selectedType?.icon}</span>
              <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{selectedType?.title}</div>
            </div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Choose which campaign you want to verify.</div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}>Loading your campaigns…</div>
            ) : campaigns.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 24px", background: C.surface, borderRadius: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>◈</div>
                <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>No campaigns found</div>
                <div style={{ fontSize: 13, color: C.muted }}>Create a campaign first before applying for verification.</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {campaigns.map(c => {
                  const alreadyHas = type === "kyc" ? c.kyc_verified : c.org_verified;
                  return (
                    <button key={c.id} onClick={() => { if (!alreadyHas) { setCampaign(c); setStep(3); } }}
                      disabled={alreadyHas}
                      style={{
                        width: "100%", padding: "16px 18px", borderRadius: 12, textAlign: "left",
                        fontFamily: "inherit", cursor: alreadyHas ? "default" : "pointer",
                        border: `1.5px solid ${campaign?.id === c.id ? C.purple : alreadyHas ? C.greenBorder : C.border}`,
                        background: alreadyHas ? C.greenDim : campaign?.id === c.id ? C.purpleDim : C.surface,
                        opacity: alreadyHas ? 0.75 : 1,
                        transition: "all .12s",
                      }}
                      onMouseEnter={e => { if (!alreadyHas) { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.background = C.purpleDim; } }}
                      onMouseLeave={e => { if (!alreadyHas && campaign?.id !== c.id) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface; } }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                            <span style={{ padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: c.status === "active" ? "rgba(21,128,61,.1)" : C.purpleDim, color: c.status === "active" ? C.green : C.purple }}>
                              {c.status === "active" ? "● Live" : c.status}
                            </span>
                          </div>
                        </div>
                        {alreadyHas ? (
                          <span style={{ fontSize: 11, fontWeight: 800, color: C.green, background: C.greenDim, border: `1px solid ${C.greenBorder}`, padding: "3px 10px", borderRadius: 99, flexShrink: 0 }}>
                            ✓ Already Verified
                          </span>
                        ) : (
                          <span style={{ fontSize: 18, color: C.faint }}>›</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Proceed ── */}
        {step === 3 && campaign && selectedType && (
          <div>
            <button onClick={() => setStep(2)} style={{ background: "none", border: "none", color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 16, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
              ← Back
            </button>

            {/* Summary card */}
            <div style={{ background: C.surface, border: `1.5px solid ${selectedType.border}`, borderRadius: 16, padding: "24px 22px", marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <span style={{ fontSize: 32 }}>{selectedType.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, color: C.text }}>{selectedType.title}</div>
                  <span style={{ padding: "2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 800, background: selectedType.bg, border: `1px solid ${selectedType.border}`, color: selectedType.color }}>
                    {selectedType.badge}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Campaign</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{campaign.title}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Verification Type</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{selectedType.title}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                  <span style={{ fontSize: 13, color: C.muted }}>Fee</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: selectedType.color }}>{price} SOL</span>
                </div>
              </div>
            </div>

            {/* How it works */}
            <div style={{ background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, borderRadius: 12, padding: "14px 16px", marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.purple, marginBottom: 8 }}>📋 How it works</div>
              <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.textSub, lineHeight: 1.8 }}>
                <li>Click <b>"Proceed to Telegram"</b> below. It opens a pre-filled message to our team</li>
                <li>Our team will guide you through the verification process and payment</li>
                <li>Once verified, your campaign will display the <b>{selectedType.badge}</b> badge</li>
              </ol>
            </div>

            <a
              href={buildTelegramLink()}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                width: "100%", padding: "15px 0", borderRadius: 12,
                background: "linear-gradient(135deg,#0088CC,#229ED9)",
                color: "#fff", fontWeight: 800, fontSize: 15,
                textDecoration: "none", boxSizing: "border-box",
                boxShadow: "0 4px 16px rgba(0,136,204,.3)",
                transition: "box-shadow .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,136,204,.45)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,136,204,.3)"}
            >
              <span style={{ fontSize: 20 }}>✈️</span>
              Proceed to Telegram
            </a>
            <div style={{ textAlign: "center", fontSize: 12, color: C.faint, marginTop: 10 }}>
              Opens Telegram with a pre-filled message to our verification team
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
