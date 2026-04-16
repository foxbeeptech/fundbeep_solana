import { useIsMobile } from "../hooks/useIsMobile";
import usePageMeta from "../hooks/usePageMeta";

const C = {
  bg:          "#F5F3FF",
  surface:     "#FFFFFF",
  panel:       "#EDE9FE",
  border:      "#DDD6FE",
  borderMid:   "#C4B5FD",
  text:        "#1E0A4C",
  textSub:     "#4C1D95",
  muted:       "#6B7280",
  faint:       "#9CA3AF",
  purple:      "#6D28D9",
  purpleLight: "#7C3AED",
  purpleSoft:  "rgba(109,40,217,.07)",
  purpleBorder:"rgba(109,40,217,.18)",
  purpleGlow:  "rgba(109,40,217,.15)",
  green:       "#15803D",
  greenDim:    "rgba(21,128,61,.08)",
  greenBorder: "rgba(21,128,61,.2)",
  blue:        "#1D4ED8",
  blueDim:     "rgba(29,78,216,.08)",
  yellow:      "#C9960C",
  yellowDim:   "rgba(201,150,12,.09)",
};

function StatCard({ value, label, icon }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 24px", textAlign: "center", flex: "1 1 160px" }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontWeight: 900, fontSize: 28, color: C.text, letterSpacing: -1, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: C.muted, marginTop: 6, lineHeight: 1.4 }}>{label}</div>
    </div>
  );
}

function ValueCard({ icon, title, desc }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "26px 24px", display: "flex", gap: 18, alignItems: "flex-start", transition: "all .18s" }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderMid; e.currentTarget.style.boxShadow = "0 8px 32px rgba(109,40,217,.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.7 }}>{desc}</div>
      </div>
    </div>
  );
}

function TeamCard({ emoji, name, role, bio }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 24px", textAlign: "center", flex: "1 1 200px" }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px", boxShadow: `0 6px 20px ${C.purpleGlow}` }}>{emoji}</div>
      <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{role}</div>
      <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{bio}</div>
    </div>
  );
}

export default function About() {
  usePageMeta({
    title: "About FundBeep - Solana Crowdfunding Platform",
    description: "Learn about FundBeep, a Solana crowdfunding platform built on smart contract escrow. Our mission: transparent, trustworthy, on-chain fundraising for creators worldwide.",
    keywords: "about fundbeep, solana crowdfunding platform, web3 fundraising mission, crypto crowdfunding team, blockchain fundraising",
    url: "https://fundbeep.com/#about",
  });
  const isMobile = useIsMobile();
  return (
    <div style={{ background: C.bg, minHeight: "100vh", animation: "fadeUp .4s ease both" }}>

      {/* ── HERO ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: isMobile ? "48px 20px 56px" : "72px 32px 80px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Background glow */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, rgba(139,92,246,.12) 0%, transparent 65%)`, top: -250, left: "50%", transform: "translateX(-50%)", filter: "blur(50px)" }} />
        </div>

        <div style={{ position: "relative", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 99, padding: "5px 16px", fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 24 }}>
            ◎ About FundBeep
          </div>
          <h1 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 900, color: C.text, letterSpacing: -2, lineHeight: 1.1, marginBottom: 22 }}>
            Built for Creators.<br />
            <span style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Trusted by Backers.</span>
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 18px)", color: C.muted, lineHeight: 1.75, maxWidth: 600, margin: "0 auto" }}>
            FundBeep is a trust-first crowdfunding platform on the Solana blockchain - where contributions are secured in smart contract escrow, every creator is verifiable, and every SOL raised is traceable on-chain.
          </p>
        </div>
      </div>

      <div className="about-content" style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? "0 16px 80px" : "0 32px 100px" }}>

        {/* ── STATS ── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, margin: "52px 0" }}>
          <StatCard icon="◎" value="0.01"  label="SOL listing fee per campaign" />
          <StatCard icon="⚡" value="<1s"  label="Average settlement time" />
          <StatCard icon="🔒" value="100%" label="Non-custodial - your keys" />
          <StatCard icon="🌍" value="∞"    label="Open to anyone, globally" />
        </div>

        {/* ── MISSION ── */}
        <div style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, borderRadius: 20, padding: isMobile ? "32px 24px" : "48px 52px", marginBottom: 52, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
          <div style={{ position: "absolute", bottom: -60, left: -20, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.6)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Our Mission</div>
            <p style={{ fontSize: "clamp(18px, 2.5vw, 26px)", fontWeight: 800, color: "#fff", lineHeight: 1.55, maxWidth: 680, margin: "0 0 20px" }}>
              "To make fundraising radically transparent - where trust is earned on-chain, not promised in fine print."
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.75)", lineHeight: 1.7, maxWidth: 600 }}>
              Traditional crowdfunding platforms take 5–8% of every campaign, hold funds in opaque escrow for weeks, and provide backers no real protection. We believe that's broken. FundBeep uses a Solana smart contract escrow - contributions are held on-chain, released to creators at transparent milestones, and fully refundable to backers if the campaign fails to reach its first milestone.
            </p>
          </div>
        </div>

        {/* ── OUR STORY ── */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#fff" }}>📖</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0, letterSpacing: -.5 }}>Our Story</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 15, color: C.muted, lineHeight: 1.8 }}>
            <p>FundBeep started with a simple frustration: crowdfunding platforms were designed for the platform, not the creator. High fees, slow payouts, opaque processes - and backers had no way to verify if a campaign was even run by a real person.</p>
            <p>We built FundBeep on Solana because Solana is fast, cheap, and completely transparent. Every transaction costs fractions of a cent and settles in under a second. We deploy a Solana smart contract for each campaign - an on-chain escrow that holds contributions and releases them at four milestones. Anyone can verify the escrow account on Solscan - no trust required, just math.</p>
            <p>We added the trust layer - KYC verification, organizational verification, Trust Scores, Proof of Use - because transparency without accountability is just data. FundBeep gives backers the tools to confidently support campaigns and gives creators the credibility to build a real following.</p>
          </div>
        </div>

        {/* ── CORE VALUES ── */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.purple, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>What We Stand For</div>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 900, color: C.text, letterSpacing: -.8, margin: 0 }}>Core Values</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            <ValueCard icon="🔒" title="Smart Contract Escrow"
              desc="Contributions are held in a Solana on-chain escrow program - not by FundBeep. We cannot freeze, redirect, or access your funds. The contract releases funds only at verified milestones." />
            <ValueCard icon="◎" title="Transparent Fee Structure"
              desc="A small listing fee launches your campaign on-chain. Contributors pay a small platform fee on top of their donation - not deducted from it. Creators pay platform claim fees at milestones: 3% → 2% → 1.5% → 1%. No hidden charges." />
            <ValueCard icon="🪪" title="Verified Identity"
              desc="KYC and Org Verification give backers confidence that real, accountable humans stand behind every campaign. Trust is earned, not assumed." />
            <ValueCard icon="🧾" title="Radical Transparency"
              desc="Every contribution has a Solscan link. Creators post Proof of Use to show exactly how funds were spent. The blockchain doesn't lie." />
            <ValueCard icon="🌍" title="Permissionless Access"
              desc="Solana is borderless. Anyone with a Phantom wallet - regardless of country, bank account, or credit history - can launch or back a campaign." />
            <ValueCard icon="⭐" title="Reputation Over Time"
              desc="The Trust Score system rewards consistent, honest creators. Good actors build reputation that compounds. Bad actors have nowhere to hide." />
          </div>
        </div>

        {/* ── WHY SOLANA ── */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: "40px 44px", marginBottom: 52 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 320px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.purple, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Why Solana</div>
              <h3 style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: -.5, marginBottom: 16 }}>The fastest, cheapest blockchain - by far.</h3>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.75 }}>
                We chose Solana because it's the only blockchain where micropayments make sense. A $0.00025 transaction fee means a backer can contribute $1 without losing 3% to fees. 400ms block times mean a contributor in Tokyo sees their contribution land on a campaign in London before the page even refreshes.
              </p>
            </div>
            <div style={{ flex: "1 1 240px", display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: "⚡", label: "~400ms",      desc: "Transaction finality" },
                { icon: "◎", label: "$0.00025",   desc: "Average transaction fee" },
                { icon: "🔍", label: "Solscan",    desc: "Every TX publicly verifiable" },
                { icon: "🌐", label: "Permissionless", desc: "No banks, no borders" },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: "12px 16px" }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: C.text, lineHeight: 1 }}>{s.label}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── TEAM ── */}
        <div style={{ marginBottom: 60 }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.purple, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>The People</div>
            <h2 style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 900, color: C.text, letterSpacing: -.8, margin: 0 }}>Built by a small, focused team</h2>
            <p style={{ fontSize: 14, color: C.muted, marginTop: 10, maxWidth: 480, margin: "10px auto 0" }}>
              We're a lean team obsessed with building tools that give creators real power and backers real confidence.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
            <TeamCard emoji="🏗️" name="Product & Vision"    role="Strategy"    bio="Defining the trust-first crowdfunding model and ensuring every feature serves creators and backers equally." />
            <TeamCard emoji="⚙️"  name="Engineering"         role="Development" bio="Building the Solana integrations, Supabase backend, and real-time infrastructure that powers FundBeep." />
            <TeamCard emoji="🎨" name="Design & UX"          role="Experience"  bio="Crafting an interface that feels simple and professional, making on-chain technology approachable for everyone." />
            <TeamCard emoji="🛡️" name="Trust & Safety"       role="Integrity"   bio="Reviewing KYC and Org verifications, moderating reports, and keeping the platform safe from bad actors." />
          </div>
        </div>

        {/* ── CTA ── */}
        <div style={{ background: `linear-gradient(135deg, ${C.panel}, ${C.border})`, border: `1px solid ${C.borderMid}`, borderRadius: 20, padding: "52px 44px", textAlign: "center" }}>
          <div style={{ fontSize: 42, marginBottom: 16 }}>◎</div>
          <h2 style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 900, color: C.text, letterSpacing: -.8, marginBottom: 14 }}>
            Ready to raise with confidence?
          </h2>
          <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
            Launch your campaign today - smart contract escrow, milestone payouts, full on-chain transparency.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#campaigns"
              style={{ padding: "13px 32px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", textDecoration: "none", boxShadow: `0 6px 22px ${C.purpleGlow}`, transition: "all .18s", display: "inline-block" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 10px 32px rgba(109,40,217,.35)`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = `0 6px 22px ${C.purpleGlow}`; }}
              onClick={e => { e.preventDefault(); window.location.hash = "campaigns"; }}
            >
              Browse Campaigns →
            </a>
            <a href="#docs"
              style={{ padding: "13px 32px", borderRadius: 10, border: `1.5px solid ${C.borderMid}`, background: C.surface, color: C.purple, fontWeight: 700, fontSize: 14, cursor: "pointer", textDecoration: "none", transition: "all .18s", display: "inline-block" }}
              onMouseEnter={e => { e.currentTarget.style.background = C.panel; e.currentTarget.style.borderColor = C.purple; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.borderMid; }}
              onClick={e => { e.preventDefault(); window.location.hash = "docs"; }}
            >
              Read the Docs
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
