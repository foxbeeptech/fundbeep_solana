import { useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import usePageMeta from "../hooks/usePageMeta";

const C = {
  bg:           "#F5F3FF",
  surface:      "#FFFFFF",
  panel:        "#EDE9FE",
  border:       "#DDD6FE",
  borderMid:    "#C4B5FD",
  text:         "#1E0A4C",
  textSub:      "#4C1D95",
  muted:        "#6B7280",
  faint:        "#9CA3AF",
  purple:       "#6D28D9",
  purpleLight:  "#7C3AED",
  purpleSoft:   "rgba(109,40,217,.07)",
  purpleBorder: "rgba(109,40,217,.18)",
  purpleGlow:   "rgba(109,40,217,.15)",
  green:        "#15803D",
  greenDim:     "rgba(21,128,61,.08)",
  greenBorder:  "rgba(21,128,61,.2)",
  red:          "#B91C1C",
  redDim:       "rgba(185,28,28,.07)",
  redBorder:    "rgba(185,28,28,.18)",
  yellow:       "#C9960C",
  yellowDim:    "rgba(201,150,12,.09)",
  yellowBorder: "rgba(201,150,12,.25)",
};

const TOC = [
  { id: "problem",     icon: "⚠️",  label: "The Problem"             },
  { id: "solution",    icon: "◎",   label: "Our Solution"            },
  { id: "trust-layer", icon: "🛡️",  label: "The Trust Layer"         },
  { id: "vision",      icon: "🔭",  label: "Vision"                  },
  { id: "roadmap",     icon: "🗺️",  label: "Roadmap"                 },
  { id: "goals",       icon: "🎯",  label: "Goals & Metrics"         },
  { id: "why-solana",  icon: "⚡",  label: "Why Solana"              },
];

function Section({ id, icon, title, subtitle, children }) {
  return (
    <section id={`lp-${id}`} style={{ marginBottom: 72, scrollMarginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", flexShrink: 0, boxShadow: `0 4px 14px ${C.purpleGlow}` }}>{icon}</div>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: C.text, margin: 0, letterSpacing: -.6 }}>{title}</h2>
          {subtitle && <div style={{ fontSize: 13, color: C.faint, marginTop: 3 }}>{subtitle}</div>}
        </div>
      </div>
      <div style={{ height: 1, background: C.border, marginBottom: 28 }} />
      <div style={{ fontSize: 15, color: C.muted, lineHeight: 1.85, display: "flex", flexDirection: "column", gap: 18 }}>
        {children}
      </div>
    </section>
  );
}

function ProblemCard({ icon, title, stat, desc }) {
  return (
    <div style={{ background: C.redDim, border: `1px solid ${C.redBorder}`, borderRadius: 14, padding: "20px 22px", display: "flex", gap: 16, alignItems: "flex-start" }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(185,28,28,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icon}</div>
      <div>
        {stat && <div style={{ fontWeight: 900, fontSize: 18, color: C.red, marginBottom: 4, letterSpacing: -.5 }}>{stat}</div>}
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 5 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: "#7f1d1d", lineHeight: 1.65 }}>{desc}</div>
      </div>
    </div>
  );
}

function SolutionCard({ icon, title, desc, color = "purple" }) {
  const clr = {
    purple: { bg: C.purpleSoft, border: C.purpleBorder, icon: C.purple },
    green:  { bg: C.greenDim,   border: C.greenBorder,   icon: C.green  },
    yellow: { bg: C.yellowDim,  border: C.yellowBorder,  icon: C.yellow },
  }[color] || { bg: C.purpleSoft, border: C.purpleBorder, icon: C.purple };
  return (
    <div style={{ background: clr.bg, border: `1px solid ${clr.border}`, borderRadius: 14, padding: "18px 20px", display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: `${clr.icon}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 5 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.65 }}>{desc}</div>
      </div>
    </div>
  );
}

function RoadmapPhase({ phase, label, status, items }) {
  const statusStyle = {
    done:       { bg: C.greenDim,   border: C.greenBorder,   color: C.green,  text: "✓ Shipped"      },
    active:     { bg: C.purpleSoft, border: C.purpleBorder,  color: C.purple, text: "● In Progress"   },
    upcoming:   { bg: C.yellowDim,  border: C.yellowBorder,  color: C.yellow, text: "◌ Upcoming"      },
    future:     { bg: "#f3f4f6",    border: "#E5E7EB",        color: C.faint,  text: "◌ Future"        },
  }[status] || {};
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 20px", background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 12, color: statusStyle.color, flexShrink: 0 }}>{phase}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{label}</div>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, borderRadius: 99, padding: "3px 10px", whiteSpace: "nowrap" }}>
          {statusStyle.text}
        </span>
      </div>
      <div style={{ padding: "14px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <span style={{ color: statusStyle.color, fontSize: 13, marginTop: 2, flexShrink: 0 }}>{status === "done" ? "✓" : "◌"}</span>
            <div>
              <span style={{ fontSize: 13.5, color: status === "done" ? C.muted : C.text, fontWeight: status === "done" ? 400 : 600 }}>{item.title}</span>
              {item.desc && <span style={{ fontSize: 13, color: C.faint }}> - {item.desc}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalRow({ icon, metric, target, desc }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{metric}</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{desc}</div>
      </div>
      <div style={{ fontWeight: 900, fontSize: 18, color: C.purple, flexShrink: 0, letterSpacing: -.5 }}>{target}</div>
    </div>
  );
}

export default function Lightpaper() {
  usePageMeta({
    title: "Lightpaper - FundBeep Protocol",
    description: "Read the FundBeep lightpaper: Solana smart contract escrow protocol for crowdfunding, milestone-based payouts, tokenomics roadmap, and the future of on-chain fundraising.",
    keywords: "fundbeep lightpaper, solana crowdfunding protocol, web3 fundraising whitepaper, crypto crowdfunding tokenomics, blockchain escrow protocol",
    url: "https://fundbeep.com/#lightpaper",
  });
  const isMobile = useIsMobile();
  const [active, setActive] = useState("problem");
  const [tocOpen, setTocOpen] = useState(false);

  const scrollTo = (id) => {
    setActive(id);
    setTocOpen(false);
    document.getElementById(`lp-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, position: "relative" }}>

      {/* Backdrop for mobile TOC */}
      {isMobile && tocOpen && (
        <div onClick={() => setTocOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 109, background: "rgba(0,0,0,.4)" }} />
      )}

      {/* ── Left TOC ── */}
      <div
        className={`lp-toc${tocOpen ? " toc-open" : ""}`}
        style={{
          width: 230, flexShrink: 0,
          position: isMobile ? "fixed" : "sticky",
          top: 0, left: 0,
          height: "100vh", overflowY: "auto",
          borderRight: `1px solid ${C.border}`,
          background: C.surface,
          padding: "28px 12px",
          zIndex: isMobile ? 110 : undefined,
          display: isMobile ? (tocOpen ? "flex" : "none") : "block",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 14px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.faint, letterSpacing: 1.3, textTransform: "uppercase" }}>Contents</div>
          {isMobile && (
            <button onClick={() => setTocOpen(false)} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", fontSize: 14, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          )}
        </div>
        {TOC.map(t => {
          const on = active === t.id;
          return (
            <button key={t.id} onClick={() => scrollTo(t.id)}
              style={{ width: "100%", padding: "9px 12px", marginBottom: 2, borderRadius: 8, border: "none", borderLeft: `3px solid ${on ? C.purple : "transparent"}`, textAlign: "left", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9, background: on ? C.purpleSoft : "transparent", color: on ? C.purple : C.muted, fontWeight: on ? 700 : 500, fontSize: 13, transition: "all .12s" }}
              onMouseEnter={e => { if (!on) { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.text; } }}
              onMouseLeave={e => { if (!on) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; } }}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}

        {/* Version tag */}
        <div style={{ margin: "24px 8px 0", padding: "10px 12px", background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 9 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.purple, letterSpacing: 1 }}>VERSION</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginTop: 3 }}>V1.5 - 2026</div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 4, lineHeight: 1.5 }}>Living document - updated as the platform evolves.</div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="lp-content" style={{ flex: 1, overflowY: "auto", padding: isMobile ? "24px 18px 80px" : "48px 60px 100px" }}>
        <div style={{ maxWidth: 760 }}>

          {/* Header */}
          <div style={{ marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 99, padding: "5px 16px", fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 20 }}>◎ FundBeep Lightpaper · v1.0</div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: C.text, letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 18 }}>
              Rethinking Crowdfunding<br />
              <span style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>From the Ground Up.</span>
            </h1>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.8, maxWidth: 640 }}>
              This document outlines the fundamental failures of traditional crowdfunding, why the existing system is broken for creators and backers alike, and how FundBeep is building the transparent, trust-first alternative on the Solana blockchain.
            </p>
            {/* Pull stats */}
            <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
              {[
                { v: "$2.4B+",   l: "lost to crowdfunding fraud (2015–2024)" },
                { v: "5–10%",    l: "average platform fee on funds raised"   },
                { v: "7–21",     l: "days to receive funds after campaign"    },
                { v: "0.1 SOL",  l: "FundBeep listing fee - one-time, on-chain" },
              ].map((s, i) => (
                <div key={i} style={{ background: i === 3 ? C.purpleSoft : C.redDim, border: `1px solid ${i === 3 ? C.purpleBorder : C.redBorder}`, borderRadius: 10, padding: "12px 18px", flex: "1 1 140px" }}>
                  <div style={{ fontWeight: 900, fontSize: 20, color: i === 3 ? C.purple : C.red, letterSpacing: -.5 }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 1.4 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════
              SECTION 1 - THE PROBLEM
          ══════════════════════════════════════ */}
          <Section id="problem" icon="⚠️" title="The Problem" subtitle="Why traditional crowdfunding is broken">
            <p>
              Crowdfunding as a concept is powerful - it democratises capital access and lets anyone with an idea find backers around the world. But in practice, the dominant platforms have built a system that serves the platform first, and creators and backers a distant second.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              <ProblemCard icon="💸" stat="5–10%" title="Crushing Platform Fees"
                desc="Kickstarter takes 5% of all funds raised plus 3–5% payment processing. Indiegogo charges up to 8%. On a $50,000 campaign, that's up to $6,500 taken before a single dollar reaches the creator." />
              <ProblemCard icon="🏦" stat="7–21 days" title="Slow, Custodial Payouts"
                desc="Platforms hold all funds in escrow and batch-process payouts days or weeks after a campaign ends. Creators have no real-time visibility into their balance and no access to funds mid-campaign." />
              <ProblemCard icon="🎭" stat="$2.4B+" title="No Identity Verification"
                desc="Anyone can launch a campaign with a fake name, stolen photos, and fabricated promises. Most platforms do not require identity verification, making fraud trivially easy and nearly impossible to prosecute." />
              <ProblemCard icon="🌍" title="Geographic Exclusion"
                desc="Traditional platforms require a bank account in an approved country. Creators in emerging markets - where access to capital is most needed - are systematically excluded from the largest platforms." />
              <ProblemCard icon="🔒" title="Opaque Fund Management"
                desc="Once a creator receives funds, backers have zero visibility into how the money is spent. There is no on-chain record, no audit trail, and no accountability mechanism beyond the platform's self-reported trust system." />
              <ProblemCard icon="📋" title="Rigid All-or-Nothing Rules"
                desc="Many platforms force all-or-nothing campaigns - if a campaign doesn't hit its goal, contributors may wait months before seeing refunds, with no interest paid and no transparency during the waiting period." />
            </div>

            <div style={{ background: C.redDim, border: `1px solid ${C.redBorder}`, borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.red, marginBottom: 10 }}>The Core Failure</div>
              <p style={{ margin: 0, fontSize: 14, color: "#7f1d1d", lineHeight: 1.75 }}>
                Traditional crowdfunding platforms are <strong>centralised financial intermediaries</strong> dressed up as community tools. They hold money, control payouts, define the rules, take a large cut, and provide no independently verifiable record of any of it. Backers are forced to trust a company. Creators are forced to accept terms that penalise success. The blockchain makes all of this unnecessary.
              </p>
            </div>
          </Section>

          {/* ══════════════════════════════════════
              SECTION 2 - OUR SOLUTION
          ══════════════════════════════════════ */}
          <Section id="solution" icon="◎" title="Our Solution" subtitle="How FundBeep fixes what's broken">
            <p>
              FundBeep is not a marginal improvement on existing crowdfunding - it is a structural replacement. By building on Solana, we replace the opaque centralised escrow with a transparent, verifiable smart contract. Contributions are held on-chain in the campaign's escrow program and released to creators at milestone checkpoints - 25%, 50%, 75%, and campaign end. Backers get real protection; creators get accountability and liquidity as they prove progress.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              <SolutionCard icon="⚡" color="green" title="On-Chain Escrow, Not Black Box"
                desc="Contributions go into a Solana smart contract escrow - visible and verifiable by anyone on Solscan. No opaque platform holding; just code and cryptographic finality." />
              <SolutionCard icon="◎" color="green" title="Milestone-Based Payouts"
                desc="Creators claim funds at four milestones (25%, 50%, 75%, end date). Small claim fees apply: M1 = 3%, M2 = 2%, M3 = 1.5%, Final = 1%. A 0.1 SOL listing fee and 0.5% contribution fee fund the platform." />
              <SolutionCard icon="🪪" color="purple" title="Real Identity Verification"
                desc="KYC and Org Verification give every campaign a verifiable identity layer. Backers can see whether a campaign is run by a real, uniquely identified person or a registered organisation before contributing a single cent." />
              <SolutionCard icon="🌍" color="green" title="Permissionless Global Access"
                desc="Anyone with a Phantom wallet can launch or back a campaign - regardless of country, bank, or credit history. Solana is borderless. So is FundBeep." />
              <SolutionCard icon="🧾" color="purple" title="On-Chain Proof of Use"
                desc="Creators attach real Solana transaction signatures to their campaign as Proof of Use - showing exactly how funds were spent, with every entry verifiable on Solscan. Accountability built into the platform." />
              <SolutionCard icon="⭐" color="yellow" title="Reputation That Compounds"
                desc="The Trust Score system rewards consistent, honest creators with a growing reputation that carries across campaigns. It factors in contributions, verifications, Proof of Use posts, and community following." />
            </div>

            {/* Comparison table */}
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, marginTop: 8, overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", background: C.purpleSoft, padding: "11px 18px", fontSize: 11, fontWeight: 800, color: C.textSub, letterSpacing: .8, textTransform: "uppercase", minWidth: 360 }}>
                <span>Feature</span><span style={{ textAlign: "center" }}>Traditional</span><span style={{ textAlign: "center", color: C.purple }}>FundBeep</span>
              </div>
              {[
                ["Platform fee",           "5–10%",          "0.5% contrib + small claim fees" ],
                ["Listing to go live",     "Free + approval","0.1 SOL, instant on-chain"       ],
                ["Payout speed",           "7–21 days",      "Milestone-based (M1–M4)"          ],
                ["Identity verification",  "Rarely",         "KYC + Org verified"               ],
                ["Fund custody",           "Platform holds", "On-chain smart contract"          ],
                ["Backer protection",      "None",           "Full refund if M1 not reached"    ],
                ["Contribution audit",     "None",           "Solscan link"                     ],
                ["Geographic access",      "Restricted",     "Global, permissionless"           ],
                ["Proof of fund use",      "Not required",   "Attachable on-chain"              ],
                ["Creator reputation",     "None",           "Trust Score (0–100)"              ],
              ].map(([feat, old, ours], i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "11px 18px", fontSize: 13, borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.surface : C.bg, minWidth: 360 }}>
                  <span style={{ color: C.text, fontWeight: 500 }}>{feat}</span>
                  <span style={{ textAlign: "center", color: C.red, fontWeight: 600 }}>{old}</span>
                  <span style={{ textAlign: "center", color: C.green, fontWeight: 700 }}>{ours}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ══════════════════════════════════════
              SECTION 3 - THE TRUST LAYER
          ══════════════════════════════════════ */}
          <Section id="trust-layer" icon="🛡️" title="The Trust Layer" subtitle="Why transparency alone isn't enough">
            <p>
              Putting crowdfunding on a public blockchain solves the transparency problem - every transaction is verifiable. But transparency alone doesn't answer the most important question a backer has: <strong style={{ color: C.text }}>"Is the person asking for my money who they say they are?"</strong>
            </p>
            <p>
              FundBeep's Trust Layer is the answer. It is a multi-signal identity and reputation system built on top of the blockchain's financial transparency, adding the human accountability layer that crypto alone cannot provide.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { icon: "🪪", color: "#1D4ED8", bg: "rgba(29,78,216,.08)", border: "rgba(29,78,216,.2)", title: "KYC Verification - Individual Identity",
                  desc: "Creators submit government-issued identity documents for review. Approved creators display a KYC Verified badge on every campaign - proving a real, uniquely identified person stands behind the fundraise." },
                { icon: "🏢", color: C.green, bg: C.greenDim, border: C.greenBorder, title: "Org Verification - Institutional Credibility",
                  desc: "Registered organisations, NGOs, and companies can submit incorporation documents. An Org Verified badge signals that a legitimate, accountable entity - not an anonymous individual - is running the campaign." },
                { icon: "✅", color: C.purple, bg: C.purpleSoft, border: C.purpleBorder, title: "Wallet Verification - Proof of Ownership",
                  desc: "Any connected wallet can be cryptographically verified through a signed challenge. This proves the creator actually controls the wallet receiving funds - preventing address spoofing." },
                { icon: "⭐", color: C.yellow, bg: C.yellowDim, border: C.yellowBorder, title: "Trust Score - Longitudinal Reputation",
                  desc: "A 0–100 score calculated from campaigns run, contributions made, verifications earned, Proof of Use posts, and community following. Trust builds over time and is permanently associated with a creator's profile." },
                { icon: "🧾", color: C.green, bg: C.greenDim, border: C.greenBorder, title: "Proof of Use - Spending Accountability",
                  desc: "After receiving funds, creators can attach Solana transaction signatures to show how money was spent - from buying equipment to paying team members. Each entry links to an independently verifiable Solscan record." },
                { icon: "🚩", color: C.red, bg: C.redDim, border: C.redBorder, title: "Scam Reporting - Community Enforcement",
                  desc: "Any user can flag suspicious campaigns for admin review. Reports are categorised, investigated, and acted upon - pausing or removing fraudulent campaigns before significant harm occurs." },
              ].map((item, i) => (
                <div key={i} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 13, padding: "18px 20px", display: "flex", gap: 14 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: `${item.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 5 }}>{item.title}</div>
                    <div style={{ fontSize: 13.5, color: C.muted, lineHeight: 1.65 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ══════════════════════════════════════
              SECTION 4 - VISION
          ══════════════════════════════════════ */}
          <Section id="vision" icon="🔭" title="Vision" subtitle="Where we are going">
            <div style={{ background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, borderRadius: 16, padding: "32px 36px", position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
              <div style={{ position: "relative", fontSize: 18, fontWeight: 800, color: "#fff", lineHeight: 1.65, maxWidth: 580 }}>
                "A world where anyone - regardless of geography, banking access, or institutional backing - can raise money with credibility, receive funds instantly, and prove to backers exactly how every coin was spent."
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,.65)" }}>- FundBeep Vision Statement</div>
            </div>

            <p>
              We see FundBeep as infrastructure - not just a product. In the same way that Stripe normalised internet payments and GitHub normalised open-source collaboration, FundBeep should become the default layer for decentralised fundraising: trusted by creators, understood by backers, and open to the entire world.
            </p>
            <p>
              The long-term vision extends beyond individual campaigns. We are building toward a world where a creator's on-chain fundraising history becomes a form of reputational capital - a permanent, verifiable record that can open doors to grants, institutional investment, and community partnerships.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
              {[
                { icon: "🌐", title: "Global Default Layer", desc: "Become the go-to platform for on-chain crowdfunding, accessible from every country without restrictions." },
                { icon: "🏛️", title: "Reputational Capital", desc: "A creator's Trust Score and campaign history become a permanent, portable reputation they own - not a platform metric." },
                { icon: "🤝", title: "Ecosystem Integrations", desc: "Connect with DAOs, grant programmes, and Web3 protocols that use FundBeep reputation as a trust signal." },
                { icon: "📊", title: "Campaign Analytics", desc: "Give creators deep insight into backer behaviour, contribution patterns, and campaign performance in real time." },
              ].map((v, i) => (
                <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 13, padding: "20px 18px" }}>
                  <div style={{ fontSize: 24, marginBottom: 10 }}>{v.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 6 }}>{v.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{v.desc}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* ══════════════════════════════════════
              SECTION 5 - ROADMAP
          ══════════════════════════════════════ */}
          <Section id="roadmap" icon="🗺️" title="Roadmap" subtitle="What has been built and what comes next">
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <RoadmapPhase phase="01" label="Foundation · Core Platform" status="done" items={[
                { title: "Campaign creation and management",         desc: "title, goal, description, end date, category" },
                { title: "Solana / Phantom wallet integration",      desc: "on-chain escrow contributions via smart contract" },
                { title: "Smart contract escrow (4 milestones)",     desc: "0.1 SOL listing fee, 0.5% contrib fee, claim fees M1–M4" },
                { title: "User profiles and wallet verification",    desc: "cryptographic proof of wallet ownership" },
                { title: "Live donations feed",                       desc: "real-time Supabase Realtime ticker" },
                { title: "Campaign comments and updates",            desc: "threaded discussion per campaign" },
                { title: "Proof of Use attachments",                 desc: "Solscan-linked spending transparency" },
                { title: "Admin panel",                              desc: "review, approve, reject, moderate" },
              ]} />

              <RoadmapPhase phase="02" label="Trust Layer · Verification & Reputation" status="done" items={[
                { title: "KYC Individual Verification",              desc: "admin-reviewed identity badge" },
                { title: "Org Verification",                         desc: "organisation/NGO credibility badge" },
                { title: "Trust Score (DID)",                        desc: "0–100 reputation score on all profiles" },
                { title: "Scam Reporting system",                    desc: "community-driven fraud flagging" },
                { title: "Contributor Leaderboard",                  desc: "gamified giving with real rankings" },
                { title: "Explore social feed",                      desc: "Twitter-style activity discovery feed" },
                { title: "Campaign field locking",                   desc: "title, goal, end date locked post-publish" },
              ]} />

              <RoadmapPhase phase="03" label="Growth · Discovery & Monetisation" status="active" items={[
                { title: "Campaign Boost system",                    desc: "paid 24h/48h homepage prominence" },
                { title: "Featured Campaign slots",                  desc: "curated homepage placements" },
                { title: "✦ Verified Badge",                         desc: "purchasable creator credibility badge" },
                { title: "Promote page",                             desc: "self-serve campaign promotion tools" },
                { title: "Embed Widget",                             desc: "iframe campaign widget for external sites" },
                { title: "Social media integration",                 desc: "Telegram and Twitter/X links in sidebar" },
              ]} />

              <RoadmapPhase phase="04" label="Scale · Analytics & Ecosystem" status="upcoming" items={[
                { title: "Campaign analytics dashboard",             desc: "contribution charts, backer demographics" },
                { title: "Email/Telegram notifications",             desc: "backer and creator alerts" },
                { title: "Multi-currency display",                   desc: "USD/EUR equivalent alongside SOL" },
                { title: "Mobile-first redesign",                    desc: "optimised PWA for Phantom mobile" },
                { title: "Public API",                               desc: "third-party integrations and data access" },
              ]} />

              <RoadmapPhase phase="05" label="Vision · Web3 Ecosystem Integration" status="future" items={[
                { title: "DAO treasury fundraising",                 desc: "governance-gated campaign types" },
                { title: "On-chain grant programmes",                desc: "protocol-funded campaign matching" },
                { title: "Reputation-gated access",                  desc: "Trust Score used as external trust signal" },
                { title: "Cross-chain support",                      desc: "Ethereum and EVM-compatible contributions" },
                { title: "NFT backer rewards",                       desc: "campaign-specific contributor NFTs" },
              ]} />
            </div>
          </Section>

          {/* ══════════════════════════════════════
              SECTION 6 - GOALS & METRICS
          ══════════════════════════════════════ */}
          <Section id="goals" icon="🎯" title="Goals & Metrics" subtitle="How we measure success">
            <p>
              We measure success not by platform revenue, but by creator outcomes and backer confidence. The following targets represent milestones in building the most trusted decentralised crowdfunding platform.
            </p>

            <div style={{ fontWeight: 700, fontSize: 12, color: C.textSub, letterSpacing: .8, textTransform: "uppercase", marginBottom: 10, marginTop: 4 }}>Near-Term (12 Months)</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              <GoalRow icon="📋" metric="Active Campaigns"     target="1,000+"  desc="Live, verified campaigns across all categories" />
              <GoalRow icon="◎"  metric="SOL Raised on Platform" target="10,000+" desc="Total SOL contributed through FundBeep campaigns" />
              <GoalRow icon="👥" metric="Verified Creators"     target="500+"    desc="KYC or Org verified campaign creators" />
              <GoalRow icon="💸" metric="Contributors"          target="10,000+" desc="Unique wallets that have made at least one contribution" />
            </div>

            <div style={{ fontWeight: 700, fontSize: 12, color: C.textSub, letterSpacing: .8, textTransform: "uppercase", marginBottom: 10 }}>Platform Health Targets</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              <GoalRow icon="🚩" metric="Fraud Rate"              target="< 0.1%"  desc="Campaigns confirmed fraudulent as a share of total" />
              <GoalRow icon="⭐" metric="Avg Creator Trust Score"  target="> 60"    desc="Average Trust Score across all active creators" />
              <GoalRow icon="🧾" metric="Proof of Use Rate"        target="> 70%"   desc="Share of funded campaigns posting at least one Proof of Use" />
              <GoalRow icon="🪪" metric="Verification Rate"        target="> 40%"   desc="Share of active creators with KYC or Org Verification" />
            </div>

            <div style={{ fontWeight: 700, fontSize: 12, color: C.textSub, letterSpacing: .8, textTransform: "uppercase", marginBottom: 10 }}>Long-Term North Star</div>
            <div style={{ background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 14, padding: "22px 24px" }}>
              <p style={{ margin: 0, fontSize: 15, color: C.textSub, fontWeight: 700, lineHeight: 1.7 }}>
                Become the highest-trust crowdfunding platform on the internet - where a FundBeep KYC badge carries more backer confidence than any traditional platform's campaign approval process.
              </p>
            </div>
          </Section>

          {/* ══════════════════════════════════════
              SECTION 7 - WHY SOLANA
          ══════════════════════════════════════ */}
          <Section id="why-solana" icon="⚡" title="Why Solana" subtitle="The technical foundation of trust">
            <p>
              The choice of blockchain is not an implementation detail - it defines what is possible. We evaluated multiple chains and chose Solana because it is the only blockchain where the economics and speed of crowdfunding actually work.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {[
                { icon: "⚡", title: "400ms Finality",      color: "purple",
                  desc: "A contribution confirmed in under half a second means the live donations ticker updates before the backer's cursor has moved. Speed builds confidence." },
                { icon: "◎", title: "$0.00025 Per TX",     color: "green",
                  desc: "A fee so small it is economically irrelevant. Backers can contribute $1 without losing 25% to fees. Micropayments are viable for the first time." },
                { icon: "🔍", title: "Public Ledger",       color: "purple",
                  desc: "Every contribution, every wallet, every transaction is on Solscan and verifiable by anyone in the world with no account or permission required." },
                { icon: "🌐", title: "Global, Permissionless", color: "green",
                  desc: "Solana has no geographic restrictions. Anyone with a wallet - from Lagos to Lisbon to Los Angeles - has identical access to the platform." },
                { icon: "🔒", title: "Verifiable Escrow",    color: "purple",
                  desc: "Funds are held by a Solana smart contract - not FundBeep. The escrow account is publicly auditable on Solscan. Code enforces the rules, not promises." },
                { icon: "🏗️", title: "Proven Infrastructure", color: "green",
                  desc: "Solana processes over 2,000 transactions per second with near-zero downtime. It is battle-tested infrastructure with a large, growing developer ecosystem." },
              ].map((c, i) => (
                <SolutionCard key={i} icon={c.icon} title={c.title} desc={c.desc} color={c.color} />
              ))}
            </div>

            {/* Closing */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px", marginTop: 8 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 10 }}>A Final Note</div>
              <p style={{ margin: 0, fontSize: 14, color: C.muted, lineHeight: 1.8 }}>
                This lightpaper is a living document. As FundBeep grows, as we learn from creators and backers, and as the Solana ecosystem evolves, we will update our plans and our commitments. The core principle remains unchanged: <strong style={{ color: C.text }}>funds are secured in verifiable on-chain escrow, identities are verifiable on-chain, milestones protect backers, and fees are small, transparent, and deducted automatically by the smart contract.</strong>
              </p>
              <div style={{ marginTop: 16, fontSize: 12, color: C.faint }}>FundBeep · Lightpaper v1.0 · 2025 · Subject to revision as the platform evolves.</div>
            </div>
          </Section>

        </div>
      </div>

      {/* Floating Contents button - mobile only */}
      {isMobile && (
        <button
          onClick={() => setTocOpen(o => !o)}
          style={{ position: "fixed", bottom: 80, right: 16, zIndex: 108, padding: "10px 18px", borderRadius: 99, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", boxShadow: "0 4px 16px rgba(109,40,217,.35)", display: "flex", alignItems: "center", gap: 6 }}
        >
          📋 Contents
        </button>
      )}
    </div>
  );
}
