import { useState, useRef, useEffect } from "react";

const C = {
  purple:      "#6D28D9",
  purpleLight: "#7C3AED",
  purpleSoft:  "rgba(109,40,217,.1)",
  purpleBorder:"rgba(109,40,217,.25)",
  bg:          "#F5F3FF",
  surface:     "#FFFFFF",
  border:      "#DDD6FE",
  text:        "#1E0A4C",
  muted:       "#6B7280",
  faint:       "#9CA3AF",
};

// ── Knowledge base ─────────────────────────────────────────────────────────────
const KB = [
  {
    tags: ["what is fundbeep","about fundbeep","what does fundbeep do","tell me about","how does fundbeep work","overview","explain fundbeep"],
    reply: `FundBeep is a **trust-first crowdfunding platform** built on the Solana blockchain 🚀\n\nCreators launch fundraising campaigns backed by a **smart contract escrow** — funds are held on-chain and released at 4 milestone stages (25%, 50%, 75%, and final). Backers are protected: if Milestone 1 is never reached by the end date, they receive a full refund automatically.\n\nWhat makes us different:\n• On-chain transparency — every contribution is verifiable on Solscan\n• KYC & Org Verification for creator trust\n• Trust Score & Contributor Leaderboard\n• Milestone-based payouts, not lump sums`,
  },
  {
    tags: ["create campaign","launch campaign","start campaign","new campaign","how to create","make a campaign","publish campaign"],
    reply: `To launch a campaign on FundBeep:\n\n1. **Connect Phantom wallet** — click "Connect Wallet" in the sidebar\n2. Go to **Dashboard → New Campaign**\n3. Fill in your title, description, goal (SOL), end date, and category\n4. Add a cover image or emoji\n5. Click **Launch** — pay the **0.02 SOL listing fee** to deploy your escrow contract on-chain\n\nYour campaign goes to Pending for admin review, then gets activated. 🎉\n\nTip: Apply for **KYC or Org Verification** to display trust badges and increase backer confidence!`,
  },
  {
    tags: ["fee","fees","cost","price","charge","how much","listing fee","contribution fee","claim fee","platform fee"],
    reply: `FundBeep's fee structure is fully transparent:\n\n| Action | Fee |\n|---|---|\n| Launch a campaign | **0.02 SOL** (one-time) |\n| Contribute to a campaign | **0.5% on top** of your donation |\n| Claim M1 (25%) | **3%** of payout |\n| Claim M2 (50%) | **2%** of payout |\n| Claim M3 (75%) | **1.5%** of payout |\n| Claim Final | **1%** of payout |\n| KYC Verification | **0.25 SOL** |\n| Org Verification | **0.1 SOL** |\n| Solana network fee | ~**0.000005 SOL** per tx |\n\nContribution fee is charged **on top** — if you donate 1 SOL, a tiny 0.5% fee is added, and your full 1 SOL goes into the escrow.`,
  },
  {
    tags: ["kyc","kyc verification","identity","verified","verify identity","individual","government id","know your customer"],
    reply: `**KYC Verification** proves you're a real, uniquely identified person 🪪\n\n• Cost: **0.25 SOL**\n• Who it's for: Individual campaign creators\n• Required: Government-issued ID (passport, national ID, etc.)\n• Once approved: a **🪪 KYC Verified** badge appears on your campaigns\n\nTo apply: go to **Dashboard → Settings → Verification**\n\nThe FundBeep team reviews all applications manually. Verified creators build significantly more backer trust!`,
  },
  {
    tags: ["org verification","organisation","organization","ngo","company","business","registered","org verified"],
    reply: `**Org Verification** is for registered organizations, NGOs, and companies 🏢\n\n• Cost: **0.1 SOL**\n• Who it's for: Companies, NGOs, registered entities\n• Required: Registration certificates + official correspondence\n• Once approved: a **🏢 Org Verified** badge appears on your campaigns\n\nTo apply: go to **Dashboard → Settings → Verification**\n\nOrg-verified campaigns show backers that a real, accountable entity is behind the fundraise.`,
  },
  {
    tags: ["milestone","m1","m2","m3","m4","25%","50%","75%","payout","milestones","stage","threshold"],
    reply: `FundBeep uses a **4-milestone payout system** to protect backers:\n\n• **M1 — 25%** of goal reached → creator can claim (3% fee)\n• **M2 — 50%** of goal reached → creator can claim (2% fee)\n• **M3 — 75%** of goal reached → creator can claim (1.5% fee)\n• **M4 — Final** → campaign ends (100% or end date) → creator claims all remaining (1% fee)\n\nEach milestone claim sweeps all available balance at that point. Claims are instant — no waiting period.\n\nImportant: If **M1 is never reached** by the end date, backers receive a **full refund** from the escrow. 🔒`,
  },
  {
    tags: ["claim","withdraw","how to claim","get my money","receive funds","payout","creator claim"],
    reply: `Creators can claim funds at each milestone:\n\n1. Go to **Dashboard**\n2. Find your campaign — look for the **"Claim Now"** button\n3. The button appears when a milestone threshold is met\n4. Click it, approve in Phantom — funds transfer instantly\n\nMilestone thresholds:\n• M1: 25% of goal raised\n• M2: 50% of goal raised\n• M3: 75% of goal raised\n• M4: Campaign ends (date or 100% funded) — sweeps all funds including rent\n\nClaim fees (3% → 2% → 1.5% → 1%) are auto-deducted by the smart contract.`,
  },
  {
    tags: ["refund","money back","cancel","backer refund","not reached","failed campaign","unsuccessful"],
    reply: `**Backer Protection on FundBeep:**\n\nIf a campaign **fails to reach Milestone 1 (25% of goal)** by its end date:\n→ All backers receive a **100% full refund** directly from the escrow smart contract.\n\nCreators can cancel their own campaign from Dashboard, **but only before M1 is reached**. Once M1 is hit, cancellation is blocked to protect backers.\n\nAll refunds are handled on-chain — no manual process needed, no trust required. 🔒`,
  },
  {
    tags: ["contribute","donate","back","support","how to donate","send sol","make contribution","fund a campaign"],
    reply: `Contributing to a campaign is simple:\n\n1. Find a campaign in **Campaigns** or **Explore**\n2. Open the campaign page\n3. Enter the SOL amount you want to donate\n4. Click **Contribute** and approve in Phantom\n\nYour SOL goes directly into the campaign's **on-chain escrow contract** — nobody can touch it outside of the milestone rules.\n\nNote: A small **0.5% platform fee** is charged on top of your donation (e.g., donate 1 SOL → ~1.005 SOL total). Your donated amount goes fully into escrow.\n\nYou can track all your contributions in **My Contributions** in the sidebar.`,
  },
  {
    tags: ["trust score","reputation","score","trust","credibility","rating"],
    reply: `The **Trust Score** (0–100) is FundBeep's reputation system ⭐\n\nIt's calculated from:\n• Campaigns launched & completed\n• SOL contributed to other campaigns\n• KYC / Org Verification status\n• Wallet verification\n• Proof of Use posts\n• Followers on the platform\n\nA higher Trust Score = more credibility with potential backers. It's displayed on your public profile and campaign pages.\n\nTo improve your score: get verified, contribute to campaigns, and post Proof of Use updates!`,
  },
  {
    tags: ["leaderboard","top contributor","ranking","monthly","best backer","contributor leaderboard"],
    reply: `The **Contributor Leaderboard** 🏆 ranks the top SOL contributors each month!\n\n• **Live rankings** update in real-time throughout the month\n• **Top 5** contributors are highlighted with gold/silver/bronze medals\n• At month end, winners are recorded in the **Past Champions** history\n• Your leaderboard wins appear as badges on your public profile\n\nYou can find it in the sidebar → Leaderboard. Be the top backer and build your reputation on FundBeep!`,
  },
  {
    tags: ["explore","community","feed","post","explore feed","community feed","social"],
    reply: `The **Explore** page is FundBeep's community feed 🌐\n\n• Campaign creators and backers can post updates, announcements, and thoughts\n• React with 💜 likes and reply to posts\n• YouTube links auto-embed in posts\n• Verified creators get trust badges visible in the feed\n• You can follow campaigns and creators to see their updates\n• Boosted campaigns appear at the top of the feed\n\nNote: Posting costs 1 free post slot per month (or buy extra points). Check your balance in Explore → Post area.`,
  },
  {
    tags: ["phantom","wallet","connect wallet","solana wallet","how to connect","install phantom","which wallet"],
    reply: `FundBeep runs on **Solana** and requires a **Phantom wallet** 👻\n\n**To get started:**\n1. Install Phantom from [phantom.app](https://phantom.app) (browser extension or mobile app)\n2. Create a wallet and fund it with some SOL\n3. Visit FundBeep and click **"Connect Wallet"** in the sidebar\n4. Approve the connection in Phantom\n\nThat's it — you're signed in! FundBeep uses your wallet address as your identity.\n\nMake sure you have enough SOL for any transactions (listing fees, contributions, network fees).`,
  },
  {
    tags: ["solana","sol","blockchain","network","on chain","on-chain","why solana","crypto"],
    reply: `FundBeep is built on **Solana** — one of the fastest and most cost-efficient blockchains ⚡\n\n• Transaction speed: ~400ms finality\n• Network fees: ~$0.0001 per transaction (fractions of a cent!)\n• All campaign funds are held in **on-chain escrow** smart contracts\n• Every contribution is publicly verifiable on Solscan\n\nSolana's low fees make micro-contributions practical — there's no minimum donation threshold that would be eaten by network fees.`,
  },
  {
    tags: ["dashboard","my campaigns","manage","campaign management","creator dashboard"],
    reply: `The **Dashboard** is your campaign management hub:\n\n• View all your campaigns with real-time stats (raised, contributors, progress)\n• **Launch new campaigns** from Draft status\n• **Claim milestone payouts** with one click\n• Track escrow state and on-chain data\n• Pause or cancel campaigns (before M1)\n• See total raised across all campaigns\n\nAccess it via sidebar → Dashboard (you must be connected with a Phantom wallet).`,
  },
  {
    tags: ["edit campaign","change campaign","update campaign","modify","can i change","locked","title locked","goal locked"],
    reply: `After a campaign is published (status: Active), certain fields are **permanently locked** to protect contributors:\n\n🔒 **Locked after launch:**\n• Campaign title\n• Goal amount (SOL)\n• End date\n• Receiving wallet address\n\n✏️ **Always editable:**\n• Description\n• Category\n• Cover image / emoji\n• Tags\n\nThis prevents creators from changing the terms after backers have contributed. The lock is enforced on-chain and in our database.`,
  },
  {
    tags: ["cancel campaign","stop campaign","end early","delete campaign","withdraw campaign"],
    reply: `Creators can cancel their campaign from Dashboard, with one rule:\n\n⚠️ **Cancellation is blocked once Milestone 1 is reached** (raised ≥ 25% of goal).\n\nThis protects backers — once real funding momentum exists, the campaign must continue or funds refund through normal escrow rules.\n\nBefore M1: You can cancel freely → backers get refunded from escrow.\nAfter M1: Cannot cancel — campaign must run to end date or completion.`,
  },
  {
    tags: ["proof of use","proof","use of funds","how funds used","accountability","update","campaign update"],
    reply: `**Proof of Use** is FundBeep's accountability feature 🧾\n\nAfter claiming milestone funds, creators can (and should) post **Proof of Use** updates in Explore showing how the funds were spent. This builds trust with current and future backers.\n\nProof of Use posts:\n• Contribute to your **Trust Score**\n• Show on your public profile\n• Are visible to the entire community in Explore\n\nThis is what separates legitimate campaigns from fly-by-night ones.`,
  },
  {
    tags: ["profile","public profile","my profile","view profile","who can see","profile page"],
    reply: `Your **Public Profile** on FundBeep shows:\n\n• Total SOL contributed\n• Number of contributions\n• Trust Score\n• KYC / Org / Wallet Verified badges\n• Active campaigns (Live / Paused)\n• Past completed campaigns\n• Leaderboard wins\n• Backer badges\n• Followers & Following\n\nAnyone can view public profiles. To view yours, click your name from a campaign or the Leaderboard.`,
  },
  {
    tags: ["badge","verified badge","blue badge","tick","checkmark","verification badge"],
    reply: `FundBeep has several trust badges:\n\n🔵 **Verified Badge** — shown on profiles with active KYC verification (paid, time-limited)\n✅ **Wallet Verified** — proves wallet ownership via cryptographic signature (free)\n🪪 **KYC Verified** — on campaigns of KYC-approved creators (0.25 SOL)\n🏢 **Org Verified** — on campaigns of verified organizations (0.1 SOL)\n\nBadges build backer trust and improve your Trust Score. Apply via Dashboard → Settings → Verification.`,
  },
  {
    tags: ["pending","approved","review","admin review","campaign status","status","rejected","active","completed","paused"],
    reply: `Campaign statuses on FundBeep:\n\n• **Draft** — created but not yet published/paid listing fee\n• **Pending** — submitted for admin review (after listing fee paid)\n• **Active** — live and accepting contributions\n• **Paused** — temporarily paused by creator\n• **Completed** — goal reached or end date passed after M1\n• **Rejected** — not approved by admin (reason provided)\n• **Cancelled** — creator cancelled before M1\n\nAdmin reviews typically happen within 24-48 hours. You'll get a notification when your campaign is approved or rejected.`,
  },
  {
    tags: ["escrow","smart contract","contract","on chain","secure","how funds held","where is my money"],
    reply: `**FundBeep's Smart Contract Escrow** 🔒\n\nEvery campaign deploys its own Solana escrow program. Here's how it works:\n\n1. Contributors send SOL → locked in the escrow contract\n2. Creator can only claim at milestone thresholds\n3. Platform fee is deducted automatically on each claim\n4. If M1 is never reached → backers can reclaim from escrow\n5. Final claim (M4) sweeps ALL remaining funds including rent\n\nThe contract is verifiable by anyone on Solscan. No central authority holds your funds — it's trustless by design.`,
  },
  {
    tags: ["contact","support","help","telegram","talk to","developer","dev","foxbeep","maaxis","human support","real person","customer service"],
    reply: `For direct support, reach our developer on Telegram:\n\n👉 **t.me/maaxis0** (Foxbeep Dev)\n\nSARA can answer most platform questions, but for account issues, disputes, or things that need human attention — the Telegram is your best option.\n\nYou can also check our **Docs** page (sidebar) for detailed platform guides.`,
  },
  {
    tags: ["minimum","minimum contribution","minimum donation","how much to donate","smallest","min"],
    reply: `There's **no enforced minimum contribution** on FundBeep — you can contribute any amount of SOL.\n\nHowever, keep in mind:\n• Solana network fee: ~0.000005 SOL per transaction\n• Platform fee: 0.5% on top of donation\n\nPractically, contributions of 0.01 SOL or more make sense. Very tiny contributions may not be worth the transaction setup overhead.`,
  },
  {
    tags: ["how long","duration","end date","campaign length","time limit","how many days"],
    reply: `Campaign duration is set by the **creator** when launching — you pick any end date.\n\nBest practices:\n• 30–90 days is typical for crowdfunding campaigns\n• Shorter campaigns create urgency\n• Longer campaigns allow more time to spread the word\n\nNote: The end date is **locked after launch** and cannot be changed. Choose wisely! The campaign automatically transitions to the final claim stage when the end date passes.`,
  },
  {
    tags: ["share","promote","marketing","spread","social media","twitter","discord","how to promote"],
    reply: `FundBeep has built-in promotion tools:\n\n• **Boost** your campaign — contact admin for featured placement in Explore\n• Share your campaign's direct link anywhere\n• Post in **Explore** feed to reach the FundBeep community\n• Use your **Promote** page (sidebar) for promotion options\n\nOutside FundBeep:\n• Share on Twitter/X, Discord, Reddit, Telegram\n• Each campaign has a shareable URL: fundbeep.com/#campaign/[id]\n• A Solscan link proves your on-chain legitimacy to skeptics`,
  },
  {
    tags: ["who built","team","founders","company","who made","behind fundbeep","foxbeep"],
    reply: `FundBeep is built by **Foxbeep Tech** — a small team focused on building trust-first Web3 products on Solana.\n\nFor direct contact: **t.me/maaxis0** (lead developer)\n\nWe're actively developing and improving the platform. Your feedback helps us build better! 🙏`,
  },
];

function matchReply(input) {
  const q = input.toLowerCase().trim();
  let best = null, bestScore = 0;
  for (const item of KB) {
    for (const tag of item.tags) {
      if (q.includes(tag)) {
        const score = tag.length;
        if (score > bestScore) { bestScore = score; best = item.reply; }
      }
    }
    // partial word matching
    const words = q.split(/\s+/);
    for (const tag of item.tags) {
      const tagWords = tag.split(/\s+/);
      const matches = tagWords.filter(tw => words.some(w => w.includes(tw) || tw.includes(w))).length;
      const score = matches / tagWords.length;
      if (score > 0.6 && tagWords.length * score > bestScore) {
        bestScore = tagWords.length * score;
        best = item.reply;
      }
    }
  }
  return best;
}

function formatReply(text) {
  // Convert **bold**, bullet points, and newlines to JSX-friendly elements
  return text.split("\n").map((line, i) => {
    if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
    // Bold
    const parts = line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part
    );
    return <div key={i} style={{ lineHeight: 1.65, marginBottom: 1 }}>{parts}</div>;
  });
}

const SUGGESTIONS = [
  "How do I create a campaign?",
  "What are the fees?",
  "How do milestones work?",
  "What is KYC Verification?",
  "How do I claim funds?",
  "What happens if goal isn't reached?",
];

export default function SaraAI() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([
    { from: "sara", text: "Hi! I'm **SARA** — FundBeep's virtual assistant 👋\n\nI can answer anything about the platform: fees, campaigns, milestones, verification, and more. What would you like to know?" }
  ]);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const [showSugg, setShowSugg] = useState(true);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = (text) => {
    const q = (text || input).trim();
    if (!q) return;
    setInput("");
    setShowSugg(false);
    setMessages(m => [...m, { from: "user", text: q }]);
    setTyping(true);
    setTimeout(() => {
      const reply = matchReply(q);
      setTyping(false);
      setMessages(m => [...m, {
        from: "sara",
        text: reply || `I'm not sure about that specific topic, but I'm always learning! 😊\n\nFor direct help, reach our developer on Telegram:\n👉 **t.me/maaxis0** (Foxbeep Dev)\n\nOr check the **Docs** page for detailed platform guides.`
      }]);
    }, 800 + Math.random() * 600);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Chat with SARA AI"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(135deg,#6D28D9,#8B5CF6)",
          border: "none", cursor: "pointer",
          boxShadow: open ? "0 4px 20px rgba(109,40,217,.5)" : "0 4px 20px rgba(109,40,217,.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all .2s", transform: open ? "scale(1.08)" : "scale(1)",
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform = open ? "scale(1.08)" : "scale(1)"}
      >
        {open ? (
          <svg width="22" height="22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="5" x2="17" y2="17"/><line x1="17" y1="5" x2="5" y2="17"/></svg>
        ) : (
          <span style={{ fontSize: 22 }}>✨</span>
        )}
      </button>

      {/* Unread dot when closed */}
      {!open && (
        <div style={{
          position: "fixed", bottom: 68, right: 22, zIndex: 10000,
          width: 10, height: 10, borderRadius: "50%",
          background: "#22C55E", border: "2px solid #fff",
        }} />
      )}

      {/* Chat panel */}
      {open && (
        <div style={{
          position: "fixed", bottom: 92, right: 24, zIndex: 9998,
          width: 360, maxWidth: "calc(100vw - 32px)",
          height: 520, maxHeight: "calc(100vh - 120px)",
          background: C.surface, borderRadius: 20,
          border: `1px solid ${C.border}`,
          boxShadow: "0 12px 48px rgba(109,40,217,.18), 0 4px 16px rgba(0,0,0,.08)",
          display: "flex", flexDirection: "column",
          animation: "saraSlideUp .25s ease",
          overflow: "hidden",
        }}>
          <style>{`
            @keyframes saraSlideUp {
              from { opacity:0; transform:translateY(16px); }
              to   { opacity:1; transform:translateY(0); }
            }
            @keyframes saraBlink {
              0%,80%,100% { opacity:0.2; transform:scale(0.8); }
              40%          { opacity:1;   transform:scale(1); }
            }
          `}</style>

          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg,#6D28D9,#8B5CF6)",
            padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(255,255,255,.2)", border: "2px solid rgba(255,255,255,.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}>✨</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>SARA AI</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#86EFAC", display: "inline-block" }} />
                FundBeep Virtual Assistant
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.from === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-end" }}>
                {m.from === "sara" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6D28D9,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginBottom: 2 }}>✨</div>
                )}
                <div style={{
                  maxWidth: "80%", padding: "10px 13px", borderRadius: m.from === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: m.from === "user" ? "linear-gradient(135deg,#6D28D9,#8B5CF6)" : C.bg,
                  color: m.from === "user" ? "#fff" : C.text,
                  fontSize: 13, lineHeight: 1.6,
                  border: m.from === "sara" ? `1px solid ${C.border}` : "none",
                  boxShadow: "0 1px 4px rgba(0,0,0,.06)",
                }}>
                  {m.from === "sara" ? formatReply(m.text) : m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {typing && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#6D28D9,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>✨</div>
                <div style={{ padding: "12px 16px", background: C.bg, borderRadius: "16px 16px 16px 4px", border: `1px solid ${C.border}`, display: "flex", gap: 4, alignItems: "center" }}>
                  {[0,1,2].map(i => (
                    <span key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: C.purple, display: "inline-block", animation: `saraBlink 1.2s ${i*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSugg && messages.length === 1 && (
              <div style={{ marginTop: 4 }}>
                <div style={{ fontSize: 11, color: C.faint, marginBottom: 6, fontWeight: 600, letterSpacing: .5 }}>QUICK QUESTIONS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SUGGESTIONS.map((s, i) => (
                    <button key={i} onClick={() => send(s)} style={{
                      textAlign: "left", padding: "8px 12px", borderRadius: 10,
                      border: `1px solid ${C.purpleBorder}`, background: C.purpleSoft,
                      color: C.purple, fontSize: 12, fontWeight: 600, cursor: "pointer",
                      fontFamily: "inherit", transition: "background .12s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(109,40,217,.15)"}
                    onMouseLeave={e => e.currentTarget.style.background = C.purpleSoft}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, flexShrink: 0, display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask SARA anything about FundBeep…"
              rows={1}
              style={{
                flex: 1, resize: "none", border: `1px solid ${C.border}`, borderRadius: 12,
                padding: "9px 12px", fontSize: 13, fontFamily: "inherit",
                outline: "none", background: C.bg, color: C.text,
                lineHeight: 1.5, maxHeight: 80, overflowY: "auto",
              }}
              onFocus={e => e.target.style.borderColor = C.purple}
              onBlur={e => e.target.style.borderColor = C.border}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || typing}
              style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: input.trim() && !typing ? "linear-gradient(135deg,#6D28D9,#8B5CF6)" : C.border,
                border: "none", cursor: input.trim() && !typing ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background .15s",
              }}
            >
              <svg width="16" height="16" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          {/* Powered by */}
          <div style={{ padding: "4px 0 8px", textAlign: "center", fontSize: 10, color: C.faint }}>
            SARA AI · FundBeep Virtual Assistant
          </div>
        </div>
      )}
    </>
  );
}
