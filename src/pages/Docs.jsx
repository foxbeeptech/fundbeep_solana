import { useState } from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import usePageMeta from "../hooks/usePageMeta";

const C = {
  purple:       "#6D28D9",
  purpleLight:  "#7C3AED",
  purpleDim:    "rgba(109,40,217,.07)",
  purpleBorder: "rgba(109,40,217,.18)",
  bg:           "#F5F3FF",
  surface:      "#FFFFFF",
  border:       "#DDD6FE",
  text:         "#1E0A4C",
  textSub:      "#4C1D95",
  muted:        "#6B7280",
  faint:        "#9CA3AF",
  green:        "#15803D",
  greenDim:     "rgba(21,128,61,.08)",
  greenBorder:  "rgba(21,128,61,.2)",
  blue:         "#1D4ED8",
  blueDim:      "rgba(29,78,216,.08)",
  blueBorder:   "rgba(29,78,216,.2)",
  yellow:       "#C9960C",
  yellowDim:    "rgba(201,150,12,.09)",
  red:          "#DC2626",
  redDim:       "rgba(220,38,38,.07)",
  redBorder:    "rgba(220,38,38,.18)",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function FeatureGrid({ items }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 12, marginTop: 16 }}>
      {items.map((f, i) => (
        <div key={i} style={{ background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 4 }}>{f.title}</div>
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{f.desc}</div>
        </div>
      ))}
    </div>
  );
}

function StepList({ title, steps }) {
  return (
    <div style={{ marginTop: 20 }}>
      {title && <div style={{ fontWeight: 700, fontSize: 12, color: C.textSub, marginBottom: 10, textTransform: "uppercase", letterSpacing: .8 }}>{title}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{s.n}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.65 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoBox({ icon, title, children, color = "yellow" }) {
  const colors = {
    yellow: { bg: C.yellowDim, border: "rgba(201,150,12,.25)", title: C.yellow, body: "#78580A" },
    blue:   { bg: C.blueDim,   border: C.blueBorder,           title: C.blue,   body: "#1e3a7a" },
    green:  { bg: C.greenDim,  border: C.greenBorder,          title: C.green,  body: "#14532d" },
    red:    { bg: C.redDim,    border: C.redBorder,            title: C.red,    body: "#7f1d1d" },
  };
  const clr = colors[color] || colors.yellow;
  return (
    <div style={{ background: clr.bg, border: `1px solid ${clr.border}`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12 }}>
      <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 13, color: clr.title, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: clr.body, lineHeight: 1.65 }}>{children}</div>
      </div>
    </div>
  );
}

function BadgePill({ icon, label, color = "purple" }) {
  const colors = {
    purple: { bg: C.purpleDim, border: C.purpleBorder, text: C.purple },
    blue:   { bg: C.blueDim,   border: C.blueBorder,   text: C.blue   },
    green:  { bg: C.greenDim,  border: C.greenBorder,  text: C.green  },
  };
  const clr = colors[color] || colors.purple;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: clr.bg, border: `1px solid ${clr.border}`, borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700, color: clr.text }}>
      {icon} {label}
    </span>
  );
}

function FeeTable({ rows }) {
  return (
    <div style={{ borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 160px", background: C.purpleDim, padding: "10px 16px", fontSize: 11, fontWeight: 800, color: C.textSub, letterSpacing: .8, textTransform: "uppercase" }}>
        <span>Action</span><span>Platform Fee</span><span>Network Fee</span>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 130px 160px", padding: "11px 16px", fontSize: 13, borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.surface : "#FAFBFF", color: C.text }}>
          <span>{r.action}</span>
          <span style={{ color: C.green, fontWeight: 700 }}>{r.platform}</span>
          <span style={{ color: C.muted }}>{r.network}</span>
        </div>
      ))}
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", background: C.surface }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "14px 16px", border: "none", background: "transparent", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, fontFamily: "inherit" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.text, lineHeight: 1.4 }}>{q}</span>
        <span style={{ fontSize: 18, color: C.purple, flexShrink: 0, display: "inline-block", transform: open ? "rotate(45deg)" : "none", transition: "transform .2s" }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "12px 16px 14px", fontSize: 13.5, color: C.muted, lineHeight: 1.7, borderTop: `1px solid ${C.border}` }}>{a}</div>
      )}
    </div>
  );
}

// ── TOC config ────────────────────────────────────────────────────────────────

const TOC = [
  { id: "overview",      icon: "◎",  label: "What is FundBeep?"       },
  { id: "how-it-works",  icon: "▤",  label: "How It Works"             },
  { id: "verification",  icon: "🪪", label: "KYC & Org Verification"   },
  { id: "trust-score",   icon: "⭐", label: "Trust Score"              },
  { id: "leaderboard",   icon: "🏆", label: "Contributor Leaderboard"  },
  { id: "explore",       icon: "🔭", label: "Explore & Social Feed"    },
  { id: "reporting",     icon: "🚩", label: "Scam Reporting"           },
  { id: "campaign-rules",icon: "📋", label: "Campaign Rules"           },
  { id: "wallet",        icon: "👻", label: "Phantom Wallet"           },
  { id: "fees",          icon: "◈",  label: "Fees & Costs"             },
  { id: "faq",           icon: "?",  label: "FAQ"                      },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Docs() {
  usePageMeta({
    title: "Docs - How FundBeep Works",
    description: "Complete documentation for FundBeep: how to launch a campaign, contribute SOL, claim milestone payouts, KYC verification, Trust Score, fees, and FAQ.",
    keywords: "fundbeep docs, how to crowdfund on solana, solana crowdfunding guide, campaign creation guide, crypto fundraising tutorial, solana escrow docs",
    url: "https://fundbeep.com/#docs",
  });
  const isMobile = useIsMobile();
  const [active, setActive] = useState("overview");
  const [tocOpen, setTocOpen] = useState(false);

  const scrollTo = (id) => {
    setActive(id);
    setTocOpen(false);
    document.getElementById(`doc-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, position: "relative" }}>

      {/* Backdrop for mobile TOC */}
      {isMobile && tocOpen && (
        <div onClick={() => setTocOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 109, background: "rgba(0,0,0,.4)" }} />
      )}

      {/* ── Left TOC ── */}
      <div
        className={`docs-toc${tocOpen ? " toc-open" : ""}`}
        style={{
          width: 220, flexShrink: 0,
          position: isMobile ? "fixed" : "sticky",
          top: 0, left: 0,
          height: "100vh", overflowY: "auto",
          borderRight: `1px solid ${C.border}`,
          padding: "28px 12px",
          background: C.surface,
          zIndex: isMobile ? 110 : undefined,
          display: isMobile ? (tocOpen ? "flex" : "none") : "block",
          flexDirection: "column",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 12px" }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.faint, letterSpacing: 1.3, textTransform: "uppercase" }}>On this page</div>
          {isMobile && (
            <button onClick={() => setTocOpen(false)} style={{ width: 26, height: 26, borderRadius: 7, border: `1px solid ${C.border}`, background: C.bg, cursor: "pointer", fontSize: 14, color: C.muted, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          )}
        </div>
        {TOC.map(t => {
          const isActive = active === t.id;
          return (
            <button key={t.id} onClick={() => scrollTo(t.id)}
              style={{ width: "100%", padding: "9px 12px", marginBottom: 2, borderRadius: 8, border: "none", textAlign: "left", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 9, background: isActive ? C.purpleDim : "transparent", color: isActive ? C.purple : C.muted, fontWeight: isActive ? 700 : 500, fontSize: 13, transition: "all .12s" }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = C.bg; e.currentTarget.style.color = C.text; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; } }}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}>{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div className="docs-content" style={{ flex: 1, overflowY: "auto", padding: isMobile ? "24px 18px 80px" : "40px 52px 100px" }}>
        <div style={{ maxWidth: 760 }}>

          {/* Page header */}
          <div style={{ marginBottom: 44 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: C.purpleDim, border: `1px solid ${C.purpleBorder}`, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 16 }}>◎ FundBeep Docs</div>
            <h1 style={{ fontSize: 30, fontWeight: 900, color: C.text, marginBottom: 10, letterSpacing: -.5 }}>Platform Documentation</h1>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, margin: 0 }}>Everything you need to know about FundBeep - from launching your first campaign to on-chain verification, trust features, and platform rules.</p>
          </div>

          {/* ── Section: Overview ── */}
          <Section id="overview" icon="◎" title="What is FundBeep?">
            <p>FundBeep is a <strong style={{ color: C.textSub }}>trust-first crowdfunding platform</strong> built on the Solana blockchain. It lets anyone - individuals, creators, developers, and non-profits - launch a fundraising campaign backed by a <strong style={{ color: C.textSub }}>Solana smart contract escrow</strong> that protects both creators and backers.</p>
            <p>Unlike traditional crowdfunding platforms that operate as black boxes and charge 5–10%, FundBeep uses an on-chain escrow program. Contributions are held in a verifiable smart contract and released to the creator at four milestones - 25%, 50%, 75%, and campaign end. A small listing fee and low contribution/claim fees keep the platform sustainable.</p>
            <p>What sets FundBeep apart is its full trust layer - KYC identity verification, organizational verification, a reputation-based Trust Score, contributor leaderboards, and on-chain Proof of Use - so backers can give confidently and creators can build a lasting reputation.</p>
            <FeatureGrid items={[
              { icon: "⚡", title: "Smart Contract Escrow", desc: "Contributions are held in a Solana escrow program - verifiable by anyone, released at milestones." },
              { icon: "◎", title: "Milestone Payouts",      desc: "Claim at M1 (25%), M2 (50%), M3 (75%), and Final. Small claim fees: 3% → 2% → 1.5% → 1%." },
              { icon: "🔒", title: "Backer Protection",     desc: "If M1 is never reached by end date, backers receive full refunds from the escrow contract." },
              { icon: "🪪", title: "KYC Verified",          desc: "Real-identity verification badge for creators who pass KYC checks." },
              { icon: "⭐", title: "Trust Score",           desc: "A reputation score built from campaigns, contributions, and community standing." },
              { icon: "✦", title: "On-Chain Transparent",   desc: "Every contribution is a verifiable Solana transaction anyone can inspect on Solscan." },
            ]} />
          </Section>

          {/* ── Section: How It Works ── */}
          <Section id="how-it-works" icon="▤" title="How It Works">
            <p>FundBeep has two roles: <strong style={{ color: C.textSub }}>Creators</strong> who launch campaigns, and <strong style={{ color: C.textSub }}>Backers</strong> who contribute SOL.</p>
            <StepList title="For Creators" steps={[
              { n: "1", title: "Connect Phantom",      desc: 'Click "Connect Wallet" in the sidebar and approve the connection in your Phantom browser extension.' },
              { n: "2", title: "Create a Campaign",    desc: "Go to Dashboard → New Campaign. Fill in your title, description, goal amount (SOL), end date, and category. Pay the listing fee to launch on-chain and deploy your escrow contract." },
              { n: "3", title: "Get Verified",         desc: "Apply for KYC or Org Verification to display trust badges on your campaign - this significantly increases backer confidence." },
              { n: "4", title: "Share & Promote",      desc: "Your campaign gets a unique shareable link. Post it on Twitter, Discord, Reddit, or anywhere your audience is." },
              { n: "5", title: "Claim at Milestones",  desc: "When your campaign hits 25%, 50%, 75%, or reaches its end date, claim your escrow funds instantly - no waiting period. Each claim sweeps all available balance at that point." },
              { n: "6", title: "Post Proof of Use",    desc: "Attach Solana TX signatures as Proof of Use to show backers exactly what funds were spent on - builds trust for future campaigns." },
            ]} />
            <StepList title="For Backers" steps={[
              { n: "1", title: "Connect Phantom",  desc: "You need a Phantom wallet with some SOL to contribute to campaigns." },
              { n: "2", title: "Browse Campaigns", desc: "Use Explore or Campaigns to find projects you believe in. Filter by category, look for KYC and Org Verified badges." },
              { n: "3", title: "Check Trust",      desc: "View a creator's Trust Score, verify their KYC/Org badges, and review their campaign history and Proof of Use posts before contributing." },
              { n: "4", title: "Contribute SOL",   desc: "Open a campaign, enter an amount, and click Contribute. Approve in Phantom - your SOL goes into the campaign's on-chain escrow. A small platform fee is charged on top of your contribution amount." },
              { n: "5", title: "Track Impact",     desc: "Your contributions appear in your Profile. Watch campaign progress in real time. If M1 is never reached by end date, you receive a full refund from the escrow." },
            ]} />
          </Section>

          {/* ── Section: KYC & Org Verification ── */}
          <Section id="verification" icon="🪪" title="KYC & Org Verification">
            <p>FundBeep offers two types of identity verification that display trust badges on campaigns and profiles, giving backers confidence that a creator is who they say they are.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
              <div style={{ background: C.blueDim, border: `1px solid ${C.blueBorder}`, borderRadius: 12, padding: "18px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>🪪</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: C.blue }}>KYC Verified</span>
                </div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0 }}>For <strong style={{ color: C.text }}>individuals</strong>. Proves that the campaign creator is a real, uniquely identified person. Required documents typically include a government-issued ID. Once approved, the <BadgePill icon="🪪" label="KYC Verified" color="blue" /> badge appears on the creator's campaigns in Browse and on the campaign page.</p>
              </div>
              <div style={{ background: C.greenDim, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: "18px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>🏢</span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: C.green }}>Org Verified</span>
                </div>
                <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.65, margin: 0 }}>For <strong style={{ color: C.text }}>organizations, NGOs, and companies</strong>. Proves the campaign is run by a legitimate registered entity. Required documents include registration certificates and official correspondence. The <BadgePill icon="🏢" label="Org Verified" color="green" /> badge appears on campaigns once approved.</p>
              </div>
            </div>

            <StepList title="How to apply" steps={[
              { n: "1", title: "Go to Settings",       desc: "In your Dashboard, navigate to Settings → Verification." },
              { n: "2", title: "Submit Documents",      desc: "Upload required identity or organization documents. The FundBeep team reviews all submissions manually." },
              { n: "3", title: "Wait for Approval",     desc: "Review times vary. You will be notified once your verification is approved or if additional documents are needed." },
              { n: "4", title: "Badge Appears",         desc: "Approved badges are permanently displayed on your campaigns in Browse, on your campaign pages, and on your public profile." },
            ]} />

            <InfoBox icon="🔒" title="Privacy note" color="blue">
              Verification documents are reviewed by the FundBeep admin team and never shared publicly. Only the resulting badge is visible to other users - your personal documents remain private.
            </InfoBox>
          </Section>

          {/* ── Section: Trust Score ── */}
          <Section id="trust-score" icon="⭐" title="Trust Score">
            <p>The <strong style={{ color: C.textSub }}>Trust Score</strong> is FundBeep's on-platform reputation system. It gives every user a score from 0 to 100 based on their activity, history, and standing in the community. It is visible on public profiles and helps backers make informed decisions.</p>

            <FeatureGrid items={[
              { icon: "📋", title: "Campaigns Launched",   desc: "Score increases as you successfully run campaigns and build a track record." },
              { icon: "💸", title: "Contributions Made",   desc: "Active backers who support other campaigns earn higher scores." },
              { icon: "🪪", title: "KYC / Org Verified",   desc: "Verified identity significantly boosts your Trust Score." },
              { icon: "✅", title: "Wallet Verified",       desc: "Proving wallet ownership adds to your score." },
              { icon: "🧾", title: "Proof of Use Posts",    desc: "Creators who post Proof of Use on funded campaigns earn bonus points." },
              { icon: "👥", title: "Followers",             desc: "Community following reflects real-world trust in your work." },
            ]} />

            <div style={{ marginTop: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.textSub, marginBottom: 12 }}>Score Tiers</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { range: "80–100", label: "Excellent",  color: "#15803D", bg: "rgba(21,128,61,.08)",   desc: "Highly trusted creator or contributor with strong verified history." },
                  { range: "60–79",  label: "Good",       color: "#1D4ED8", bg: "rgba(29,78,216,.08)",   desc: "Solid track record with some verified identity signals." },
                  { range: "40–59",  label: "Fair",       color: "#C9960C", bg: "rgba(201,150,12,.09)",  desc: "Active on the platform but limited verification or history." },
                  { range: "0–39",   label: "New",        color: "#6B7280", bg: "rgba(107,114,128,.09)", desc: "New or inactive account. Score grows with activity." },
                ].map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: t.bg, border: `1px solid ${t.color}30`, borderRadius: 9, padding: "11px 14px" }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: t.color, width: 60, flexShrink: 0 }}>{t.range}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: t.color, width: 70, flexShrink: 0 }}>{t.label}</div>
                    <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{t.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <InfoBox icon="⭐" title="Where to find Trust Scores" color="blue">
              Trust Scores are shown on every public profile page under the "Trust Score" section. When viewing a creator's profile, you can see their full breakdown - campaigns, contributions, verifications, and followers.
            </InfoBox>
          </Section>

          {/* ── Section: Leaderboard ── */}
          <Section id="leaderboard" icon="🏆" title="Contributor Leaderboard">
            <p>The <strong style={{ color: C.textSub }}>Contributor Leaderboard</strong> ranks users by total SOL contributed across all campaigns on FundBeep. It celebrates the most active and generous members of the community.</p>

            <FeatureGrid items={[
              { icon: "🥇", title: "Top Contributors",    desc: "The leaderboard shows the top contributors ranked by total SOL given across all campaigns." },
              { icon: "◎",  title: "Total SOL Shown",     desc: "Each entry shows the wallet address, display name, total SOL contributed, and number of campaigns backed." },
              { icon: "🏆", title: "Live Rankings",        desc: "Rankings update in real time as new contributions are made. Your rank can move up with every contribution." },
              { icon: "👤", title: "Profile Links",        desc: "Leaderboard entries link to public profiles, so you can see the full history and Trust Score of top contributors." },
            ]} />

            <InfoBox icon="🏆" title="How to climb the leaderboard" color="green">
              Contribute SOL to any active campaign - every fraction counts. There are no minimum requirements. Your total is cumulative across all campaigns you have backed on FundBeep.
            </InfoBox>
          </Section>

          {/* ── Section: Explore & Social Feed ── */}
          <Section id="explore" icon="🔭" title="Explore & Social Feed">
            <p>The <strong style={{ color: C.textSub }}>Explore</strong> page is FundBeep's social discovery feed. It shows recent activity across the entire platform - new campaigns, recent contributions, updates from creators - in a Twitter-style scrollable feed.</p>

            <FeatureGrid items={[
              { icon: "📰", title: "Activity Feed",      desc: "See a live stream of new campaigns, contributions, and updates from across the platform." },
              { icon: "🔍", title: "Discover Creators",  desc: "Find new campaigns and creators you haven't backed yet based on recent activity." },
              { icon: "❤️", title: "Likes & Reactions",  desc: "Like posts in the Explore feed to show support. Popular posts surface higher in the feed." },
              { icon: "🪪", title: "Trust Badges",       desc: "KYC and Org Verified badges are visible directly in the feed so you can spot trusted campaigns at a glance." },
              { icon: "🔗", title: "Click Through",      desc: "Every feed item links to the full campaign page for contributions, comments, and details." },
              { icon: "⚡", title: "Real-Time Updates",  desc: "The feed uses Supabase Realtime - new posts appear instantly without refreshing the page." },
            ]} />
          </Section>

          {/* ── Section: Scam Reporting ── */}
          <Section id="reporting" icon="🚩" title="Scam Reporting">
            <p>FundBeep has a built-in <strong style={{ color: C.textSub }}>scam reporting system</strong> that lets any user flag suspicious campaigns for admin review. This keeps the platform safe and helps protect backers from fraudulent campaigns.</p>

            <StepList title="How to report a campaign" steps={[
              { n: "1", title: "Open the Campaign",   desc: "Navigate to the campaign page you want to report." },
              { n: "2", title: "Click Report",        desc: 'Find the "🚩 Report" button on the campaign page and click it.' },
              { n: "3", title: "Select a Reason",     desc: "Choose from reasons like: Fake/misleading, Spam, Duplicate campaign, Harmful content, or Other." },
              { n: "4", title: "Add Details",         desc: "Optionally provide additional context to help the admin team investigate." },
              { n: "5", title: "Submit",              desc: "Your report is sent to the admin team for review. The campaign creator is not notified of who filed the report." },
            ]} />

            <InfoBox icon="🚩" title="What happens after a report" color="yellow">
              Reports are reviewed by the FundBeep admin team. If a campaign is found to be fraudulent, it will be paused or removed and the creator may be banned. False reports submitted in bad faith may result in account action.
            </InfoBox>

            <InfoBox icon="🔒" title="Reporter privacy" color="blue">
              Reports are anonymous. Campaign creators cannot see who reported them - only that a report exists and its category.
            </InfoBox>
          </Section>

          {/* ── Section: Campaign Rules ── */}
          <Section id="campaign-rules" icon="📋" title="Campaign Rules">
            <p>FundBeep enforces several rules to protect backers and ensure campaign integrity. Understanding these rules will help you create campaigns that run smoothly.</p>

            <div style={{ marginTop: 4 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>Field Locking - Published Campaigns</div>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>Once a campaign is published (status: Active, Paused, or Completed), three core fields are <strong style={{ color: C.text }}>permanently locked</strong> and cannot be changed. This prevents campaigns from misleading backers after they have contributed.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                {[
                  { icon: "🏷️", field: "Campaign Title",    reason: "Backers contribute based on the title they saw. Changing it after launch would be deceptive." },
                  { icon: "◎",  field: "Goal Amount (SOL)", reason: "The fundraising goal shown to backers at the time of their contribution cannot be retroactively altered." },
                  { icon: "📅", field: "End Date",          reason: "The campaign deadline seen by backers is fixed at launch. Extending or shortening it without transparency is not allowed." },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", background: C.redDim, border: `1px solid ${C.redBorder}`, borderRadius: 10, padding: "12px 16px" }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.red, marginBottom: 3 }}>🔒 {item.field} - Locked</div>
                      <div style={{ fontSize: 13, color: "#7f1d1d", lineHeight: 1.6 }}>{item.reason}</div>
                    </div>
                  </div>
                ))}
              </div>

              <InfoBox icon="✏️" title="What can still be edited after publishing" color="green">
                Creators can still update their campaign <strong>Description</strong>, <strong>Category</strong>, <strong>Cover Image</strong>, and <strong>Status</strong> (e.g., pausing a campaign) after publishing. Only the title, goal, and end date are locked.
              </InfoBox>
            </div>

            <div style={{ marginTop: 28 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>Campaign Status Lifecycle</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { status: "Draft",     color: "#6B7280", desc: "Not yet visible to the public. You are still editing. All fields can be changed." },
                  { status: "Active",    color: C.green,   desc: "Live and accepting contributions. Title, goal, and end date are now locked." },
                  { status: "Paused",    color: C.yellow,  desc: "Temporarily hidden from Browse. Contributions are paused. Core fields still locked." },
                  { status: "Completed", color: C.purple,  desc: "Campaign has ended. No new contributions accepted. Historical record is preserved." },
                  { status: "Cancelled", color: C.red,     desc: "Campaign was cancelled by the creator or removed by an admin." },
                ].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9 }}>
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: 13, color: s.color, width: 80, flexShrink: 0 }}>{s.status}</span>
                    <span style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 28 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>Escrow & Milestone Logic</div>
              <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7, margin: 0 }}>All contributions are held in a Solana smart contract escrow. Creators claim funds at four milestones: M1 (25% of goal), M2 (50%), M3 (75%), and Final (campaign end date). A 30-minute wait is required after each threshold is crossed before the claim becomes available. If a campaign ends without M1 ever being reached, backers are entitled to full refunds from the escrow. Backers may also request an early withdrawal before the end date (only when M1 is not yet reached), subject to a 5% early-withdrawal penalty.</p>
            </div>
          </Section>

          {/* ── Section: Wallet ── */}
          <Section id="wallet" icon="👻" title="Using Phantom Wallet">
            <p>FundBeep uses <strong style={{ color: C.textSub }}>Phantom</strong> - the most popular Solana wallet - for all on-chain actions. Phantom is available as a browser extension (Chrome, Firefox, Brave) and a mobile app.</p>
            <StepList title="First-time setup" steps={[
              { n: "1", title: "Install Phantom",       desc: "Download from phantom.app. Create a new wallet and write down your seed phrase - store it offline, never share it." },
              { n: "2", title: "Fund your wallet",      desc: "Buy SOL on any exchange (Coinbase, Binance, Kraken, etc.) and send it to your Phantom wallet address." },
              { n: "3", title: "Connect to FundBeep",   desc: 'Click "Connect Wallet" on FundBeep and approve the connection request in the Phantom popup. Your address is saved to your FundBeep profile.' },
              { n: "4", title: "Verify Ownership",      desc: "Go to your Profile and click Verify Wallet. Phantom will sign a challenge message (no funds move) to prove you own the address. You get a ✓ badge and a Trust Score boost." },
            ]} />
            <InfoBox icon="🔒" title="Security note" color="yellow">
              FundBeep never asks for your seed phrase or private key. We only request your public wallet address and, for ownership verification, a signed message - which cannot move funds. Always verify you are on the correct domain before approving any Phantom prompt.
            </InfoBox>
          </Section>

          {/* ── Section: Fees ── */}
          <Section id="fees" icon="◈" title="Fees & Costs">
            <FeeTable rows={[
              { action: "Launch a campaign (listing fee)",        platform: "0.02 SOL", network: "~0.000005 SOL" },
              { action: "Contribute to a campaign",               platform: "0.5% on top", network: "~0.000005 SOL" },
              { action: "Claim M1 (25% milestone reached)",       platform: "3%",       network: "~0.000005 SOL" },
              { action: "Claim M2 (50% milestone reached)",       platform: "2%",       network: "~0.000005 SOL" },
              { action: "Claim M3 (75% milestone reached)",       platform: "1.5%",     network: "~0.000005 SOL" },
              { action: "Claim Final (end date / 100%)",          platform: "1%",       network: "~0.000005 SOL" },
              { action: "Early withdrawal (backer, pre-M1 only)", platform: "5% penalty", network: "~0.000005 SOL" },
              { action: "Apply for KYC Verification",             platform: "0.25 SOL", network: "~0.000005 SOL" },
              { action: "Apply for Org Verification",             platform: "0.1 SOL",  network: "~0.000005 SOL" },
              { action: "Post a comment",                         platform: "Free",     network: "None (off-chain)" },
              { action: "Wallet verification",                    platform: "Free",     network: "None (sign only)" },
              { action: "Post Proof of Use",                      platform: "Free",     network: "None (off-chain)" },
              { action: "Report a campaign",                      platform: "Free",     network: "None" },
            ]} />
            <p style={{ marginTop: 14, fontSize: 13.5, color: C.muted, lineHeight: 1.7 }}>
              Solana network fees are fractions of a cent and are paid by the sender. The listing fee (0.02 SOL) is a one-time on-chain payment per campaign. KYC and Org Verification fees are paid at time of application. The contribution fee is charged <strong>on top</strong> of your donation - if you contribute 1 SOL, a small fee is added and your 1 SOL goes fully into the escrow. Claim fees are deducted from the payout automatically by the smart contract. All fees are set by the platform and baked into the escrow at campaign creation.
            </p>
          </Section>

          {/* ── Section: FAQ ── */}
          <Section id="faq" icon="?" title="Frequently Asked Questions">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { q: "Do I need an account to browse campaigns?",
                  a: "No. Anyone can browse all campaigns, read updates, and view contribution history without connecting a wallet. However, you need a connected Phantom wallet to contribute, comment, or launch a campaign." },
                { q: "What happens if a campaign doesn't reach its goal?",
                  a: "If a campaign ends without ever reaching its first milestone (M1 = 25% of goal), backers are entitled to full refunds from the escrow contract. If M1 was reached but the goal was not fully met, creators keep the funds they have already claimed through milestones - there is no clawback on claimed milestones." },
                { q: "Can I get a refund after contributing?",
                  a: "Yes, in two scenarios: (1) If the campaign ends and M1 (25% of goal) was never reached, backers receive a full refund from the escrow. (2) Backers can request an early withdrawal before the campaign end date - only if M1 has not yet been reached - subject to a 5% early-withdrawal penalty. Once M1 is reached, contributions are committed and cannot be withdrawn early." },
                { q: "Can I change my campaign title or goal after publishing?",
                  a: "No. Once a campaign is published (status: Active, Paused, or Completed), the title, goal amount, and end date are permanently locked to protect contributors. You can still edit the description, category, and cover image." },
                { q: "What is KYC Verification and how do I get it?",
                  a: "KYC (Know Your Customer) Verification proves you are a real, uniquely identified person. To apply, go to Dashboard → Settings → Verification and submit a government-issued ID. The FundBeep team reviews all applications manually. Verified users display a 🪪 KYC Verified badge on their campaigns." },
                { q: "What is Org Verification?",
                  a: "Org Verification is for registered organizations, NGOs, or companies. It requires submitting official registration documents. Approved organizations display a 🏢 Org Verified badge, signaling to backers that a real entity stands behind the campaign." },
                { q: "What is the Trust Score?",
                  a: "The Trust Score (0–100) is a reputation score calculated from your activity on FundBeep - campaigns launched, contributions made, verifications, wallet verification, Proof of Use posts, and followers. It is displayed on your public profile and helps backers assess your credibility." },
                { q: "What is Proof of Use?",
                  a: "Proof of Use lets creators attach real Solana TX signatures to their campaign to show how raised funds were spent. Each proof links to Solscan for on-chain verification. Posting Proof of Use also boosts your Trust Score." },
                { q: "What is the Contributor Leaderboard?",
                  a: "The Leaderboard ranks users by total SOL contributed across all FundBeep campaigns. It celebrates the most active backers and updates in real time. Anyone can see it in the Leaderboard section." },
                { q: "How does the Explore feed work?",
                  a: "Explore is a social discovery feed showing recent activity across the platform - new campaigns, recent contributions, and creator updates. It updates in real time using Supabase Realtime. You can like posts to support creators." },
                { q: "How do I report a suspicious campaign?",
                  a: "Open the campaign page and click the 🚩 Report button. Select a reason (Fake/misleading, Spam, Duplicate, Harmful content, or Other), optionally add details, and submit. Reports are reviewed by the admin team. Your identity is not disclosed to the campaign creator." },
                { q: "Is FundBeep open to everyone globally?",
                  a: "Yes. Solana is permissionless. Anyone with a Phantom wallet can launch or back campaigns from anywhere in the world." },
                { q: "Can I run multiple campaigns?",
                  a: "Yes. There is no limit on the number of campaigns a creator can launch." },
                { q: "What blockchain network does FundBeep use?",
                  a: "FundBeep runs on Solana Mainnet. All transactions use real SOL." },
                { q: "How does the live donations feed work?",
                  a: "FundBeep uses Supabase Realtime to stream new contributions instantly. The live ticker in the bottom-right corner updates automatically across all campaigns as contributions happen." },
                { q: "Who can become an Admin?",
                  a: "Admins are manually assigned by the FundBeep team. Admins can review campaigns, manage badges, manually add contributions, and moderate content through a dedicated Admin Panel." },
                { q: "Is there a mobile app?",
                  a: "FundBeep is a Progressive Web App (PWA) and works in mobile browsers. Use Phantom's in-app browser to connect your wallet on iOS or Android." },
              ].map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
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

function Section({ id, icon, title, children }) {
  return (
    <section id={`doc-${id}`} style={{ marginBottom: 60, scrollMarginTop: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#fff", flexShrink: 0 }}>{icon}</div>
        <h2 style={{ fontSize: 21, fontWeight: 900, color: C.text, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ fontSize: 14.5, color: C.muted, lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
      <div style={{ height: 1, background: C.border, marginTop: 44 }} />
    </section>
  );
}
