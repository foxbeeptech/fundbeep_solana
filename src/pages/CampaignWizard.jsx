import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { createCampaign, updateCampaign, uploadCampaignImage, getPlatformSetting, deleteNewCampaign } from "../supabase";
import { useWallet } from "../context/WalletContext";
import { sendSol } from "../utils/solana";
import { initializeEscrow, isEscrowEnabled } from "../utils/escrow";
import { useIsMobile } from "../hooks/useIsMobile";

/* ─── Design tokens ──────────────────────────────────────────────────────── */
const C = {
  bg:           "#F5F3FF",
  surface:      "#FFFFFF",
  panel:        "#EDE9FE",
  border:       "#DDD6FE",
  text:         "#1E0A4C",
  sub:          "#4C1D95",
  muted:        "#6B7280",
  faint:        "#9CA3AF",
  placeholder:  "#B0B8C8",
  purple:       "#6D28D9",
  purpleLight:  "#7C3AED",
  purpleSoft:   "rgba(109,40,217,.07)",
  purpleBorder: "rgba(109,40,217,.18)",
  green:        "#16A34A",
  greenSoft:    "rgba(22,163,74,.08)",
  greenBorder:  "rgba(22,163,74,.2)",
  amber:        "#92400E",
  amberSoft:    "rgba(146,64,14,.06)",
  amberBorder:  "rgba(146,64,14,.18)",
  red:          "#B91C1C",
  redSoft:      "rgba(185,28,28,.06)",
  redBorder:    "rgba(185,28,28,.15)",
};

const validateSol = (a) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a?.trim());
const toUSD       = (sol) => (sol * 148).toLocaleString("en-US", { maximumFractionDigits: 0 });
const wordCount   = (s)   => s.trim().split(/\s+/).filter(Boolean).length;

const CATEGORIES = [
  { id: "Community",       icon: "🏘" },
  { id: "Environment",     icon: "🌿" },
  { id: "Health",          icon: "🏥" },
  { id: "Education",       icon: "🎓" },
  { id: "Tech",            icon: "💡" },
  { id: "Arts",            icon: "🎨" },
  { id: "Animals",         icon: "🐾" },
  { id: "Disaster Relief", icon: "🆘" },
  { id: "Sports",          icon: "🏆" },
  { id: "Music",           icon: "🎵" },
  { id: "Food",            icon: "🍀" },
  { id: "Other",           icon: "✦"  },
];

const EMOJIS = ["🚀","🌍","🏥","🎓","🎨","🐾","⚡","🌊","🏗","💡","🧬","🦁","🎵","🏆","🍀","❤️","🔬","🌱","✨","🔥"];

const SOCIALS = [
  { key: "social_twitter",   label: "Twitter / X",  icon: "𝕏",  ph: "https://twitter.com/handle",      color: "#000000" },
  { key: "social_telegram",  label: "Telegram",     icon: "✈",  ph: "https://t.me/yourgroup",           color: "#229ED9" },
  { key: "social_facebook",  label: "Facebook",     icon: "f",  ph: "https://facebook.com/page",        color: "#1877F2" },
  { key: "social_youtube",   label: "YouTube",      icon: "▶",  ph: "https://youtube.com/watch?v=…",    color: "#FF0000" },
  { key: "social_instagram", label: "Instagram",    icon: "◉",  ph: "https://instagram.com/handle",     color: "#C13584" },
  { key: "social_discord",   label: "Discord",      icon: "◈",  ph: "https://discord.gg/server",        color: "#5865F2" },
  { key: "social_website",   label: "Website",      icon: "⊕",  ph: "https://yoursite.com",             color: C.purple  },
];

const STEPS = [
  { id: "basics",     num: 1, label: "Basics",     desc: "Name, category & goal" },
  { id: "media",      num: 2, label: "Media",      desc: "Image & icon" },
  { id: "story",      num: 3, label: "Story",      desc: "Campaign narrative" },
  { id: "milestones", num: 4, label: "Milestones", desc: "Funding checkpoints" },
  { id: "wallet",     num: 5, label: "Wallet",     desc: "SOL receiving address" },
  { id: "socials",    num: 6, label: "Socials",    desc: "Community links" },
  { id: "review",     num: 7, label: "Review",     desc: "Preview & launch" },
];

/* ─── Primitives ─────────────────────────────────────────────────────────── */
function Spinner({ color = C.purple, size = 14 }) {
  return (
    <span style={{
      width: size, height: size, display: "inline-block", flexShrink: 0,
      border: `2px solid rgba(0,0,0,.1)`, borderTopColor: color,
      borderRadius: "50%", animation: "spin .65s linear infinite",
    }} />
  );
}

function Field({ label, optional, error, hint, children, count }) {
  return (
    <div style={{ marginBottom: 22 }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: .7, textTransform: "uppercase", color: C.muted }}>
            {label}
            {!optional && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
            {optional && <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 5, color: C.faint }}>(optional)</span>}
          </span>
          {count != null && (
            <span style={{ fontSize: 11, color: count > 40 ? C.green : C.faint, fontWeight: 600, transition: "color .3s" }}>
              {count} words {count > 40 ? "✓" : "- aim for 50+"}
            </span>
          )}
        </div>
      )}
      {children}
      {error && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>⚠ {error}</div>}
      {hint && !error && <div style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = "text", error, readOnly, mono, right }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type} value={value} readOnly={readOnly}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: `12px ${right ? 52 : 15}px 12px 15px`,
          borderRadius: 10, fontFamily: mono ? "monospace" : "inherit",
          fontSize: mono ? 12.5 : 14, color: C.text, outline: "none",
          boxSizing: "border-box", transition: "border-color .15s, box-shadow .15s",
          border: `1.5px solid ${focused ? (error ? C.red : C.purple) : (error ? C.red : C.border)}`,
          boxShadow: focused ? `0 0 0 3px ${error ? C.redSoft : C.purpleSoft}` : "none",
          background: readOnly ? "#F9FAFB" : "#fff",
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {right && <span style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 12, fontWeight: 700, color: C.faint }}>{right}</span>}
    </div>
  );
}

function TextArea({ value, onChange, placeholder, rows = 8, error }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea
      value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} rows={rows}
      style={{
        width: "100%", padding: "12px 15px", borderRadius: 10,
        fontFamily: "inherit", fontSize: 14, color: C.text,
        outline: "none", boxSizing: "border-box", resize: "vertical",
        lineHeight: 1.75, transition: "border-color .15s, box-shadow .15s",
        border: `1.5px solid ${focused ? C.purple : (error ? C.red : C.border)}`,
        boxShadow: focused ? `0 0 0 3px ${C.purpleSoft}` : "none",
        background: "#fff",
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
}

function StepHeader({ icon, title, sub }) {
  return (
    <div style={{ marginBottom: 30 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: C.purple, fontWeight: 700 }}>{icon}</div>
        <h2 style={{ fontSize: 21, fontWeight: 800, color: C.text, letterSpacing: -.4, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ fontSize: 14, color: C.muted, paddingLeft: 48 }}>{sub}</div>
    </div>
  );
}

/* ─── Live preview card ──────────────────────────────────────────────────── */
function PreviewCard({ form }) {
  const activeSocials = SOCIALS.filter(s => form[s.key]);
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,.06)" }}>
      {/* Banner */}
      <div style={{ height: 130, background: "linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {form.image_preview
          ? <img src={form.image_preview} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 54, lineHeight: 1, filter: "drop-shadow(0 3px 8px rgba(0,0,0,.12))" }}>{form.image_emoji || "🚀"}</span>
        }
        {form.category && (
          <div style={{ position: "absolute", top: 10, left: 10, padding: "3px 10px", borderRadius: 99, background: "rgba(255,255,255,.92)", backdropFilter: "blur(6px)", fontSize: 10, fontWeight: 700, color: C.purple }}>{form.category}</div>
        )}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "rgba(0,0,0,.08)" }}>
          <div style={{ height: "100%", width: "3%", background: `linear-gradient(90deg, ${C.purple}, ${C.purpleLight})` }} />
        </div>
      </div>

      <div style={{ padding: "14px 16px" }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: C.text, lineHeight: 1.35, marginBottom: 5, minHeight: 20 }}>
          {form.title || <span style={{ color: C.placeholder, fontWeight: 400 }}>Campaign title…</span>}
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", minHeight: 36, marginBottom: 12 }}>
          {form.description || <span style={{ color: C.placeholder }}>Your story appears here…</span>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: activeSocials.length ? 12 : 0 }}>
          {[
            { l: "Raised", v: "0 SOL" },
            { l: "Goal",   v: form.goal_sol ? `${form.goal_sol} SOL` : "—" },
            { l: "Backers",v: "0" },
          ].map(s => (
            <div key={s.l} style={{ background: "#F8F9FB", border: `1px solid ${C.border}`, borderRadius: 7, padding: "5px 7px" }}>
              <div style={{ fontSize: 9, color: C.faint, marginBottom: 2 }}>{s.l}</div>
              <div style={{ fontWeight: 700, fontSize: 11, color: C.sub }}>{s.v}</div>
            </div>
          ))}
        </div>

        {activeSocials.length > 0 && (
          <div style={{ display: "flex", gap: 5, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
            {activeSocials.slice(0, 6).map(s => (
              <span key={s.key} style={{ width: 22, height: 22, borderRadius: 5, background: `${s.color}12`, border: `1px solid ${s.color}25`, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: s.color, fontWeight: 700 }}>{s.icon}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Steps ──────────────────────────────────────────────────────────────── */
function LockedField({ label, value, icon = "🔒" }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#6B7280", letterSpacing: .6, textTransform: "uppercase" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#D97706", background: "rgba(217,119,6,.1)", border: "1px solid rgba(217,119,6,.25)", borderRadius: 99, padding: "1px 7px" }}>{icon} Locked</span>
      </div>
      <div style={{ width: "100%", padding: "12px 15px", borderRadius: 10, border: "1.5px solid rgba(217,119,6,.25)", background: "rgba(217,119,6,.06)", color: "#92400E", fontSize: 14, fontWeight: 600, boxSizing: "border-box", cursor: "not-allowed" }}>
        {value || "—"}
      </div>
      <div style={{ fontSize: 11, color: "#D97706", marginTop: 4 }}>Cannot be changed after campaign is published.</div>
    </div>
  );
}

function StepBasics({ form, set, errors, locked, isMobile }) {
  return (
    <>
      <StepHeader icon="✦" title="Campaign basics" sub="Set your title, pick a category, and define your funding goal." />

      {locked ? (
        <LockedField label="Campaign Title" value={form.title} />
      ) : (
        <Field label="Campaign Title" error={errors.title} hint="Be specific and inspiring. This is the first thing donors read.">
          <TextInput value={form.title} onChange={v => set("title", v)} placeholder="e.g. Clean water wells for rural Kenya" error={errors.title} />
        </Field>
      )}

      <Field label="Category" error={errors.category}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {CATEGORIES.map(c => {
            const active = form.category === c.id;
            return (
              <button key={c.id} onClick={() => set("category", c.id)}
                style={{ padding: "10px 6px", borderRadius: 10, border: `1.5px solid ${active ? C.purple : C.border}`, background: active ? C.purpleSoft : "#EDE9FE", color: active ? C.purple : C.muted, fontFamily: "inherit", fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all .12s", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <span style={{ fontSize: 11 }}>{c.id}</span>
              </button>
            );
          })}
        </div>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        {locked ? (
          <LockedField label="Fundraising Goal" value={form.goal_sol ? `${form.goal_sol} SOL` : "—"} />
        ) : (
          <Field label="Fundraising Goal" error={errors.goal_sol}
            hint={form.goal_sol && +form.goal_sol > 0 ? `≈ $${toUSD(+form.goal_sol)} USD` : "SOL amount you want to raise"}>
            <TextInput value={form.goal_sol} onChange={v => set("goal_sol", v)} placeholder="e.g. 250" type="number" error={errors.goal_sol} right="SOL" />
          </Field>
        )}
        {locked ? (
          <LockedField label="End Date & Time (UTC)" value={form.end_date ? new Date(form.end_date).toUTCString() : "No end date"} />
        ) : (
          <Field label="End Date & Time" error={errors.end_date} hint="Your local time. Campaign ends at this moment.">
            <input
              type="datetime-local"
              value={form.end_date || ""}
              onChange={e => set("end_date", e.target.value)}
              min={(() => { const n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset()); return n.toISOString().slice(0,16); })()}
              style={{
                width: "100%", padding: "12px 15px", borderRadius: 10, fontFamily: "inherit",
                fontSize: 14, border: `1.5px solid ${errors.end_date ? C.red : C.border}`,
                background: "#fff", color: C.text, outline: "none", boxSizing: "border-box", transition: "border-color .15s"
              }}
              onFocus={e => { e.target.style.borderColor = C.purple; e.target.style.boxShadow = `0 0 0 3px ${C.purpleSoft}`; }}
              onBlur={e => { e.target.style.borderColor = errors.end_date ? C.red : C.border; e.target.style.boxShadow = "none"; }}
            />
          </Field>
        )}
      </div>

      {locked && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(217,119,6,.07)", border: "1px solid rgba(217,119,6,.2)", fontSize: 12, color: "#92400E", marginBottom: 4 }}>
          🔒 Title, goal, and end date are locked because this campaign is already published.
        </div>
      )}
    </>
  );
}

function StepMedia({ form, set, errors, setErrors, userId }) {
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging]   = useState(false);
  const fileRef = useRef();

  const processFile = useCallback(async (file) => {
    if (!file) return;
    if (file.size > 300 * 1024) {
      setErrors(e => ({ ...e, image: "File must be under 300 KB. Compress it first." }));
      return;
    }
    setUploading(true);
    setErrors(e => ({ ...e, image: null }));
    try {
      const url = await uploadCampaignImage(file, userId);
      set("image_url", url);
      set("image_preview", url);
    } catch {
      setErrors(e => ({ ...e, image: "Upload failed. Please try again." }));
    } finally {
      setUploading(false);
    }
  }, [userId, set, setErrors]);

  return (
    <>
      <StepHeader icon="◈" title="Media & visuals" sub="Upload a campaign image. Strong visuals increase contributions by up to 3×." />

      <Field label="Campaign Image" optional error={errors.image}>
        <div
          onClick={() => !uploading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]); }}
          style={{
            border: `2px dashed ${dragging ? C.purple : errors.image ? C.red : form.image_preview ? C.green : C.border}`,
            borderRadius: 14, minHeight: 200, cursor: uploading ? "not-allowed" : "pointer",
            background: dragging ? C.purpleSoft : "#EDE9FE",
            position: "relative", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .2s",
          }}>
          {form.image_preview ? (
            <>
              <img src={form.image_preview} alt="" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.48)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .2s" }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
                onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 13, background: "rgba(0,0,0,.4)", padding: "8px 16px", borderRadius: 8 }}>Click to replace</span>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "32px 24px" }}>
              {uploading
                ? <Spinner color={C.purple} size={32} />
                : <>
                    <div style={{ fontSize: 44, marginBottom: 12, opacity: .3 }}>🖼</div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.muted, marginBottom: 4 }}>Drop image here, or click to upload</div>
                    <div style={{ fontSize: 12, color: C.faint }}>JPG · PNG · WebP · max 300 KB</div>
                  </>
              }
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />
        </div>
        {form.image_preview && !uploading && (
          <button onClick={e => { e.stopPropagation(); set("image_url", ""); set("image_preview", ""); }}
            style={{ marginTop: 8, fontSize: 12, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, padding: 0 }}>
            ✕ Remove image
          </button>
        )}
      </Field>

      <Field label="Fallback Emoji Icon" optional hint="Displayed when no photo is uploaded.">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {EMOJIS.map(e => {
            const active = form.image_emoji === e;
            return (
              <button key={e} onClick={() => set("image_emoji", e)}
                style={{ width: 46, height: 46, fontSize: 22, borderRadius: 10, border: `1.5px solid ${active ? C.purple : C.border}`, background: active ? C.purpleSoft : "#EDE9FE", cursor: "pointer", transition: "all .1s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {e}
              </button>
            );
          })}
        </div>
      </Field>
    </>
  );
}

function StepStory({ form, set, errors }) {
  const wc = wordCount(form.description);
  return (
    <>
      <StepHeader icon="≡" title="Tell your story" sub="Honest, detailed stories raise more. Contributors want to understand the impact." />
      <Field label="Campaign Description" error={errors.description} count={wc}>
        <TextArea
          value={form.description}
          onChange={v => set("description", v)}
          rows={10}
          placeholder={"Why does this campaign exist? Start with the core problem.\n\nWho benefits, and how will the funds be used specifically?\n\nWhat happens after the goal is reached?\n\nShare any personal connection you have to this cause."}
          error={errors.description}
        />
      </Field>
      <div style={{ background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.purple, marginBottom: 8 }}>💡 Tips for higher trust</div>
        {["Open with human impact, not logistics", "Use specific numbers: '47 families' beats 'many families'", "Break down the budget: what each SOL pays for", "End with a clear ask and a deadline"].map(tip => (
          <div key={tip} style={{ fontSize: 12, color: C.purple, opacity: .8, marginBottom: 4, display: "flex", gap: 7 }}>
            <span style={{ flexShrink: 0 }}>→</span>{tip}
          </div>
        ))}
      </div>
    </>
  );
}

function StepWallet({ form, set, errors, locked }) {
  const valid = validateSol(form.wallet);
  return (
    <>
      <StepHeader icon="◎" title="Receiving wallet" sub="Funds are held in escrow and claimed to this address at milestones. Cannot be changed after launch." />
      <Field label="Solana Wallet Address" error={errors.wallet}>
        {locked ? (
          <div style={{ padding: "13px 15px", borderRadius: 10, background: "#F9FAFB", border: `1.5px solid ${C.border}`, fontFamily: "monospace", fontSize: 12.5, color: C.muted, wordBreak: "break-all", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span>{form.wallet}</span>
            <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <input
              value={form.wallet}
              onChange={e => set("wallet", e.target.value.trim())}
              placeholder="Base58 address, e.g. 4nRpcc…GcZ9"
              style={{
                width: "100%", padding: "13px 48px 13px 15px",
                borderRadius: 10, fontFamily: "monospace", fontSize: 12.5,
                color: C.text, outline: "none", boxSizing: "border-box",
                border: `1.5px solid ${errors.wallet ? C.red : valid ? C.green : C.border}`,
                boxShadow: valid ? `0 0 0 3px ${C.greenSoft}` : "none",
                background: "#fff", transition: "all .15s",
              }}
            />
            {valid && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: C.green, fontSize: 18 }}>✓</span>}
          </div>
        )}
        {!locked && valid && !errors.wallet && <div style={{ fontSize: 11, color: C.green, marginTop: 6 }}>✓ Valid Solana address</div>}
        {locked && <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>🔒 Wallet address is locked. Cannot be changed after launch.</div>}
      </Field>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ background: C.greenSoft, border: `1px solid ${C.greenBorder}`, borderRadius: 12, padding: "16px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 8 }}>🔒 On-chain escrow smart contract</div>
          {["Contributions are held in a Solana escrow program (not by FundBeep)", "Funds are released to this wallet when you claim at milestones (25%, 50%, 75%, final)", "0.5% contribution fee deducted on-chain; claim fees: M1=3%, M2=2%, M3=1.5%, Final=1%", "Every transaction publicly verifiable on Solscan"].map(t => (
            <div key={t} style={{ fontSize: 12, color: C.green, opacity: .85, marginBottom: 4, display: "flex", gap: 7 }}>
              <span>→</span>{t}
            </div>
          ))}
        </div>
        <div style={{ background: C.amberSoft, border: `1px solid ${C.amberBorder}`, borderRadius: 10, padding: "12px 15px" }}>
          <div style={{ fontSize: 12, color: C.amber }}>⚠️ <b>Double-check this address.</b> Milestone claims will be sent to this wallet and cannot be redirected.</div>
        </div>
      </div>
    </>
  );
}

function StepSocials({ form, set }) {
  return (
    <>
      <StepHeader icon="⊞" title="Community & socials" sub="All optional. Campaigns with social links receive 40% more contributions on average." />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {SOCIALS.map(s => {
          const filled = !!form[s.key];
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: filled ? `${s.color}10` : "#F5F3FF", border: `1px solid ${filled ? s.color + "30" : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: filled ? s.color : C.faint, transition: "all .2s" }}>{s.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: .5, marginBottom: 4 }}>{s.label.toUpperCase()}</div>
                <input
                  value={form[s.key] || ""}
                  onChange={e => set(s.key, e.target.value)}
                  placeholder={s.ph}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 9, fontFamily: "inherit", fontSize: 12, border: `1.5px solid ${filled ? s.color + "35" : C.border}`, background: filled ? `${s.color}05` : "#EDE9FE", color: C.text, outline: "none", boxSizing: "border-box", transition: "all .15s" }}
                  onFocus={e => { e.target.style.borderColor = s.color; e.target.style.boxShadow = `0 0 0 2px ${s.color}15`; }}
                  onBlur={e => { e.target.style.borderColor = filled ? `${s.color}35` : C.border; e.target.style.boxShadow = "none"; }}
                />
              </div>
              {filled && <a href={form[s.key]} target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: 8, background: `${s.color}10`, border: `1px solid ${s.color}25`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, fontSize: 12, flexShrink: 0 }}>↗</a>}
            </div>
          );
        })}
      </div>
    </>
  );
}

function StepMilestones({ form, set, isMobile }) {
  const milestones = Array.isArray(form.milestones) ? form.milestones : [];
  const goalSol = +form.goal_sol || 0;

  const add = () => {
    if (milestones.length >= 5) return;
    set("milestones", [...milestones, { title: "", description: "", target_sol: "" }]);
  };

  const update = (i, field, value) => {
    const next = milestones.map((m, idx) => idx === i ? { ...m, [field]: value } : m);
    set("milestones", next);
  };

  const remove = (i) => {
    set("milestones", milestones.filter((_, idx) => idx !== i));
  };

  return (
    <>
      <StepHeader icon="🏁" title="Funding milestones" sub="Set up to 5 checkpoints so donors can see exactly what each amount unlocks. All optional." />

      {milestones.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0 32px", border: `2px dashed ${C.border}`, borderRadius: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🏁</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.muted, marginBottom: 4 }}>No milestones yet</div>
          <div style={{ fontSize: 12, color: C.faint, marginBottom: 16 }}>Milestones build trust and show donors the impact of each SOL.</div>
          <button onClick={add} style={{ padding: "9px 22px", borderRadius: 9, border: `1px solid ${C.purpleBorder}`, background: C.purpleSoft, color: C.purple, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>+ Add first milestone</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
          {milestones.map((m, i) => (
            <div key={i} style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.purple, color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>Milestone {i + 1}</span>
                <button onClick={() => remove(i)} style={{ marginLeft: "auto", border: "none", background: "none", color: C.faint, cursor: "pointer", fontSize: 16, padding: "0 4px", lineHeight: 1 }}
                  onMouseEnter={e => e.currentTarget.style.color = C.red}
                  onMouseLeave={e => e.currentTarget.style.color = C.faint}>✕</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 140px", gap: 10, marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: .5, marginBottom: 5 }}>MILESTONE TITLE *</div>
                  <input value={m.title} onChange={e => update(i, "title", e.target.value)} placeholder="e.g. Buy equipment"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                    onFocus={e => { e.target.style.borderColor = C.purple; e.target.style.boxShadow = `0 0 0 3px ${C.purpleSoft}`; }}
                    onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: .5, marginBottom: 5 }}>TARGET (SOL) *</div>
                  <div style={{ position: "relative" }}>
                    <input type="number" value={m.target_sol} onChange={e => update(i, "target_sol", e.target.value)} placeholder="e.g. 25"
                      min={0.1} max={goalSol || undefined}
                      style={{ width: "100%", padding: "10px 36px 10px 12px", borderRadius: 9, border: `1.5px solid ${+m.target_sol > goalSol && goalSol ? C.red : C.border}`, background: "#fff", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                      onFocus={e => { e.target.style.borderColor = C.purple; e.target.style.boxShadow = `0 0 0 3px ${C.purpleSoft}`; }}
                      onBlur={e => { e.target.style.borderColor = +m.target_sol > goalSol && goalSol ? C.red : C.border; e.target.style.boxShadow = "none"; }} />
                    <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 700, color: C.faint }}>◎</span>
                  </div>
                  {+m.target_sol > goalSol && goalSol > 0 && (
                    <div style={{ fontSize: 10, color: C.red, marginTop: 4 }}>Exceeds goal ({goalSol} SOL)</div>
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.faint, letterSpacing: .5, marginBottom: 5 }}>WHAT THIS UNLOCKS (optional)</div>
                <input value={m.description} onChange={e => update(i, "description", e.target.value)} placeholder="e.g. Purchase tools & materials for phase 1"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  onFocus={e => { e.target.style.borderColor = C.purple; e.target.style.boxShadow = `0 0 0 3px ${C.purpleSoft}`; }}
                  onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {milestones.length > 0 && milestones.length < 5 && (
        <button onClick={add} style={{ width: "100%", padding: "11px 0", borderRadius: 10, border: `1.5px dashed ${C.purpleBorder}`, background: "transparent", color: C.purple, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "background .15s" }}
          onMouseEnter={e => e.currentTarget.style.background = C.purpleSoft}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
          + Add milestone ({milestones.length}/5)
        </button>
      )}

      {milestones.length > 0 && (
        <div style={{ marginTop: 14, background: C.purpleSoft, border: `1px solid ${C.purpleBorder}`, borderRadius: 10, padding: "11px 14px", fontSize: 12, color: C.purple }}>
          💡 Milestones are sorted by SOL amount on the campaign page. Each unlocks visually when that amount is raised.
        </div>
      )}
    </>
  );
}

function StepReview({ form, errors, onLaunch, busy, busyMsg, isEdit, isDraft, listingFee }) {
  const checks = [
    { label: "Title",    ok: !!form.title.trim(),                           preview: form.title || "—" },
    { label: "Category", ok: !!form.category,                               preview: form.category || "—" },
    { label: "Goal",     ok: !!form.goal_sol && +form.goal_sol > 0,         preview: form.goal_sol ? `${form.goal_sol} SOL ≈ $${toUSD(+form.goal_sol)}` : "—" },
    { label: "End Date", ok: !!form.end_date && new Date(form.end_date) > new Date(), preview: form.end_date ? new Date(form.end_date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—" },
    { label: "Wallet",   ok: validateSol(form.wallet),                      preview: form.wallet ? `${form.wallet.slice(0,8)}…${form.wallet.slice(-6)}` : "—" },
    { label: "Story",    ok: wordCount(form.description) >= 10,             preview: `${wordCount(form.description)} words` },
    { label: "Image",      ok: true, preview: form.image_preview ? "Photo uploaded ✓" : `Emoji ${form.image_emoji}` },
    { label: "Milestones", ok: true, preview: `${(form.milestones || []).filter(m => m.title?.trim() && +m.target_sol > 0).length} added` },
    { label: "Socials",    ok: true, preview: `${SOCIALS.filter(s => form[s.key]).length} / ${SOCIALS.length} linked` },
  ];
  const allReady = checks.every(c => c.ok);

  return (
    <>
      <StepHeader icon="✓" title={isEdit && !isDraft ? "Review changes" : "Ready to publish?"} sub={isEdit && !isDraft ? "Confirm your edits then save." : "Review your campaign details before publishing."} />
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 24 }}>
        {checks.map(c => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", padding: "11px 14px", borderRadius: 10, background: c.ok ? C.greenSoft : C.redSoft, border: `1px solid ${c.ok ? C.greenBorder : C.redBorder}`, gap: 10 }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: c.ok ? C.green : C.red, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.ok ? "✓" : "✗"}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.text, minWidth: 70 }}>{c.label}</span>
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{c.preview}</span>
          </div>
        ))}
      </div>

      {errors.global && <div style={{ fontSize: 12, color: C.red, background: C.redSoft, border: `1px solid ${C.redBorder}`, padding: "12px 15px", borderRadius: 10, marginBottom: 16 }}>⚠ {errors.global}</div>}
      {!allReady && <div style={{ background: C.amberSoft, border: `1px solid ${C.amberBorder}`, borderRadius: 10, padding: "11px 14px", marginBottom: 20, fontSize: 12, color: C.amber }}>Complete all required fields (marked ✗) first.</div>}

      <button onClick={onLaunch} disabled={busy || !allReady}
        style={{ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", fontWeight: 800, fontSize: 15, cursor: busy || !allReady ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: busy || !allReady ? C.border : `linear-gradient(135deg, ${C.purple} 0%, ${C.purpleLight} 100%)`, color: busy || !allReady ? C.faint : "#fff", boxShadow: allReady && !busy ? "0 6px 24px rgba(109,40,217,.28)" : "none", transition: "all .2s" }}>
        {busy ? <><Spinner color="#fff" size={16} /> {busyMsg || (isEdit && !isDraft ? "Saving…" : "Publishing…")}</> : isEdit && !isDraft ? "💾 Save Changes" : "🚀 Publish Campaign"}
      </button>
      {(!isEdit || isDraft) && (
        <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(109,40,217,.06)", border: "1px solid rgba(109,40,217,.15)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: C.muted }}>◎ Listing fee required to publish</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.purple }}>
            {listingFee == null ? "…" : `${listingFee} SOL`}
          </span>
        </div>
      )}
    </>
  );
}

/* ─── Main Wizard ────────────────────────────────────────────────────────── */
export default function CampaignWizard({ campaign, onClose, onSave }) {
  const isMobile = useIsMobile();
  const { user, walletAddress, walletProvider } = useWallet();
  const isEdit = !!campaign;
  const isDraft = isEdit && campaign?.status === "draft";
  const isPublished = isEdit && ["active", "paused", "completed"].includes(campaign?.status);

  const [stepIdx, setStepIdx] = useState(0);
  const [busy, setBusy]       = useState(false);
  const [busyMsg, setBusyMsg] = useState("");
  const [done, setDone]       = useState(false);
  const [errors, setErrors]   = useState({});
  const [animDir, setAnimDir] = useState("forward");
  const [listingFee, setListingFee] = useState(null);
  const contentRef = useRef();

  useEffect(() => {
    if (!isEdit) getPlatformSetting("contract_listing_fee_sol").then(v => setListingFee(parseFloat(v || "0.05"))).catch(() => setListingFee(0.05));
  }, [isEdit]);

  const EMPTY = {
    title: "", category: "", goal_sol: "", end_date: "",
    image_emoji: "🚀", image_url: "", image_preview: "",
    description: "", wallet: walletAddress || "", accent_color: C.purple,
    milestones: [],
    social_twitter: "", social_telegram: "", social_facebook: "",
    social_youtube: "", social_instagram: "", social_discord: "", social_website: "",
  };

  const [form, setFormState] = useState(() =>
    campaign ? { ...EMPTY, ...campaign, image_preview: campaign.image_url || "" } : EMPTY
  );

  const set = useCallback((k, v) => setFormState(f => ({ ...f, [k]: v })), []);

  const validate = (idx) => {
    const e = {};
    if (idx === 0) {
      if (!form.title.trim()) e.title = "Please enter a title";
      if (!form.category) e.category = "Pick a category";
      if (!form.goal_sol || isNaN(form.goal_sol) || +form.goal_sol <= 0) e.goal_sol = "Enter a valid SOL amount";
      if (!form.end_date) e.end_date = "Please set an end date and time";
      else if (new Date(form.end_date) <= new Date()) e.end_date = "End date must be in the future";
    }
    if (idx === 2 && !form.description.trim()) e.description = "Tell your story first";
    if (idx === 4 && !validateSol(form.wallet)) e.wallet = "Invalid Solana address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const navigate = (dir) => {
    if (dir > 0 && !validate(stepIdx)) return;
    setAnimDir(dir > 0 ? "forward" : "back");
    setStepIdx(i => Math.min(Math.max(i + dir, 0), STEPS.length - 1));
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const jumpTo = (idx) => {
    if (idx > stepIdx) { for (let i = stepIdx; i < idx; i++) { if (!validate(i)) return; } }
    setAnimDir(idx > stepIdx ? "forward" : "back");
    setStepIdx(idx);
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLaunch = async () => {
    if (!validate(stepIdx)) return;
    setBusy(true); setBusyMsg("");
    try {
      const { image_preview, ...data } = form;
      if (!data.end_date) delete data.end_date;
      data.milestones = (data.milestones || [])
        .filter(m => m.title.trim() && +m.target_sol > 0)
        .sort((a, b) => +a.target_sol - +b.target_sol);
      const now = new Date().toISOString();
      const payload = { ...data, goal_sol: +form.goal_sol, creator_id: user.id, status: "active", approved_at: now };
      if (isPublished) {
        payload.title    = campaign.title;
        payload.goal_sol = campaign.goal_sol;
        payload.end_date = campaign.end_date ?? null;
      }

      if (isEdit && !isDraft) {
        // Edit of published/pending campaign — just update DB, no escrow changes
        const result = await updateCampaign(campaign.id, payload);
        onSave(result);
        setDone(true);
        return;
      }

      // ── New campaign OR draft publish: init escrow ────────────────────────
      // 1. Fetch admin settings
      const [adminWallet, listingFeeStr, m1FeeStr, m2FeeStr, m3FeeStr, finalFeeStr] = await Promise.all([
        getPlatformSetting("contract_admin_wallet"),
        getPlatformSetting("contract_listing_fee_sol"),
        getPlatformSetting("contract_claim_fee_m1_bps"),
        getPlatformSetting("contract_claim_fee_m2_bps"),
        getPlatformSetting("contract_claim_fee_m3_bps"),
        getPlatformSetting("contract_claim_fee_final_bps"),
      ]);
      const resolvedAdminWallet = adminWallet || "6coG2GcQV1uAkuzHFMqYAk5piGrn2ivoMeAcSQEMHQ56";
      const listingFeeSol = parseFloat(listingFeeStr || "0");
      const m1Bps         = parseInt(m1FeeStr    || "200", 10);
      const m2Bps         = parseInt(m2FeeStr    || "200", 10);
      const m3Bps         = parseInt(m3FeeStr    || "200", 10);
      const finalBps      = parseInt(finalFeeStr || "200", 10);

      // 2. Save campaign data (create new or update existing draft)
      setBusyMsg("Step 1/2: Saving campaign…");
      const result = isDraft
        ? await updateCampaign(campaign.id, { ...payload, status: "draft" })
        : await createCampaign({ ...payload, status: "draft" });

      // 3. Initialize on-chain escrow (listing fee paid inside the contract tx)
      if (isEscrowEnabled() && walletAddress) {
        setBusyMsg("Step 2/2: Deploying escrow & paying listing fee…");
        try {
          const { escrowPda } = await initializeEscrow(
            walletProvider,
            walletAddress,
            result.id,
            +form.goal_sol,
            form.end_date || null,
            form.wallet,
            resolvedAdminWallet,
            listingFeeSol,
            m1Bps,
            m2Bps,
            m3Bps,
            finalBps,
          );
          // Escrow deployed — go live immediately (no admin approval needed)
          const approvedAt = new Date().toISOString();
          await updateCampaign(result.id, { contract_pda: escrowPda, milestone_claimed: 0, status: "active", approved_at: approvedAt });
          onSave({ ...result, contract_pda: escrowPda, milestone_claimed: 0, status: "active", approved_at: approvedAt });
        } catch (escrowErr) {
          // Escrow failed — keep as draft so creator can complete later
          onSave({ ...result, status: "draft" });
          throw new Error(`Campaign saved as draft. Complete the listing fee payment from your dashboard to submit.\n\n(${escrowErr.message})`);
        }
      } else {
        onSave(result);
      }

      setDone(true);
    } catch (e) {
      setErrors({ global: e.message || "Something went wrong. Please try again." });
    } finally {
      setBusy(false); setBusyMsg("");
    }
  };

  const STEP_CONTENT = [
    <StepBasics      key={0} form={form} set={set} errors={errors} locked={isPublished} isMobile={isMobile} />,
    <StepMedia       key={1} form={form} set={set} errors={errors} setErrors={setErrors} userId={user?.id} />,
    <StepStory       key={2} form={form} set={set} errors={errors} />,
    <StepMilestones  key={3} form={form} set={set} isMobile={isMobile} />,
    <StepWallet      key={4} form={form} set={set} errors={errors} locked={isPublished} />,
    <StepSocials     key={5} form={form} set={set} />,
    <StepReview      key={6} form={form} errors={errors} onLaunch={handleLaunch} busy={busy} busyMsg={busyMsg} isEdit={isEdit} isDraft={isDraft} listingFee={listingFee} />,
  ];

  /* ── Success ──────────────────────────────────────────────── */
  if (done) return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 600, background: "rgba(0,0,0,.55)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.surface, borderRadius: 20, padding: isMobile ? "36px 24px" : "52px 44px", textAlign: "center", maxWidth: 400, width: "100%", boxShadow: "0 32px 80px rgba(0,0,0,.2)", animation: "fadeUp .4s ease both" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: C.greenSoft, border: `2px solid ${C.green}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 20px", color: C.green }}>✓</div>
        <div style={{ fontWeight: 900, fontSize: 22, color: C.text, marginBottom: 8 }}>{isEdit && !isDraft ? "Changes saved!" : "Campaign is live!"}</div>
        <div style={{ fontSize: 14, color: C.muted, marginBottom: 28, lineHeight: 1.7 }}>
          {isEdit && !isDraft ? "Your campaign has been updated." : "Your campaign is now live and accepting contributions."}
        </div>
        <button onClick={onClose} style={{ padding: "12px 32px", borderRadius: 10, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  , document.body);

  /* ── Wizard shell ─────────────────────────────────────────── */
  return createPortal(
    <div style={{
      position: "fixed", inset: 0, zIndex: 600,
      background: "rgba(13,15,20,.6)", backdropFilter: "blur(14px)",
      display: "flex", alignItems: isMobile ? "flex-end" : "stretch",
      justifyContent: "center",
      padding: isMobile ? 0 : "16px",
    }}>
      <style>{`
        @keyframes slideInForward { from { opacity:0; transform:translateX(26px) } to { opacity:1; transform:translateX(0) } }
        @keyframes slideInBack    { from { opacity:0; transform:translateX(-26px) } to { opacity:1; transform:translateX(0) } }
        @keyframes fadeUp         { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes slideUp        { from { opacity:0; transform:translateY(100%) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin           { to { transform:rotate(360deg) } }
        .step-forward { animation: slideInForward .22s ease both }
        .step-back    { animation: slideInBack .22s ease both }
        .wizard-mobile-sheet { animation: slideUp .3s cubic-bezier(.4,0,.2,1) both }
        .wizard-desktop       { animation: fadeUp .3s ease both }
      `}</style>

      <div className={isMobile ? "wizard-mobile-sheet" : "wizard-desktop"} style={{
        width: "100%",
        maxWidth: isMobile ? "100%" : 1340,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        borderRadius: isMobile ? "20px 20px 0 0" : 18,
        overflow: "hidden",
        boxShadow: "0 48px 120px rgba(0,0,0,.35)",
        background: C.surface,
        maxHeight: isMobile ? "95dvh" : "100%",
      }}>

        {/* ══ MOBILE: top bar ══════════════════════════════════════ */}
        {isMobile && (
          <div style={{ background: C.panel, borderBottom: `1px solid ${C.border}`, padding: "14px 16px 12px", flexShrink: 0 }}>
            {/* drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 99, background: C.border, margin: "0 auto 12px" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{isEdit ? "Edit Campaign" : "New Campaign"}</div>
                <div style={{ fontSize: 11, color: C.faint }}>Step {stepIdx + 1} of {STEPS.length}: {STEPS[stepIdx].label}</div>
              </div>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.faint, cursor: "pointer", fontFamily: "inherit", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            {/* step dots */}
            <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
              {STEPS.map((_, i) => (
                <div key={i} onClick={() => i < stepIdx && jumpTo(i)} style={{
                  height: 4, borderRadius: 99, cursor: i < stepIdx ? "pointer" : "default",
                  flex: i === stepIdx ? 2 : 1,
                  background: i < stepIdx ? C.green : i === stepIdx ? C.purple : C.border,
                  transition: "all .3s ease",
                }} />
              ))}
            </div>
          </div>
        )}

        {/* ══ DESKTOP: LEFT rail ════════════════════════════════════ */}
        {!isMobile && (
          <div style={{ width: 240, background: C.panel, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "26px 22px 16px" }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginBottom: 2 }}>{isEdit ? "Edit Campaign" : "New Campaign"}</div>
              <div style={{ fontSize: 11, color: C.faint, marginBottom: 12 }}>Step {stepIdx + 1} of {STEPS.length}</div>
              <div style={{ height: 3, background: C.border, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${((stepIdx + 1) / STEPS.length) * 100}%`, background: `linear-gradient(90deg, ${C.purple}, ${C.purpleLight})`, borderRadius: 99, transition: "width .4s ease" }} />
              </div>
            </div>

            <div style={{ flex: 1, padding: "2px 10px" }}>
              {STEPS.map((s, i) => {
                const state = i < stepIdx ? "done" : i === stepIdx ? "active" : "idle";
                return (
                  <button key={s.id} onClick={() => i < stepIdx && jumpTo(i)}
                    style={{ width: "100%", padding: "10px 12px", marginBottom: 2, borderRadius: 10, border: "none", textAlign: "left", cursor: i < stepIdx ? "pointer" : "default", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 11, background: state === "active" ? C.purpleSoft : "transparent", transition: "background .15s" }}
                    onMouseEnter={e => { if (i < stepIdx) e.currentTarget.style.background = "#EFEFF3"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = state === "active" ? C.purpleSoft : "transparent"; }}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: state === "done" ? 12 : 11, fontWeight: 800, background: state === "done" ? C.greenSoft : state === "active" ? C.purple : C.border, color: state === "done" ? C.green : state === "active" ? "#fff" : C.faint, border: state === "done" ? `1px solid ${C.greenBorder}` : "none", transition: "all .2s" }}>
                      {state === "done" ? "✓" : s.num}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: state === "active" ? 700 : 500, color: state === "active" ? C.purple : state === "done" ? C.text : C.muted, lineHeight: 1.2 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: C.faint, marginTop: 1 }}>{s.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ padding: "14px 18px", borderTop: `1px solid ${C.border}` }}>
              <button onClick={onClose}
                style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: C.faint, fontWeight: 500, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "color .15s" }}
                onMouseEnter={e => e.currentTarget.style.color = C.text}
                onMouseLeave={e => e.currentTarget.style.color = C.faint}
              >✕ Cancel</button>
            </div>
          </div>
        )}

        {/* ══ CENTRE form ═══════════════════════════════════════════ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
          <div ref={contentRef} style={{ flex: 1, overflowY: "auto", padding: isMobile ? "20px 16px" : "38px 52px", WebkitOverflowScrolling: "touch" }}>
            <div key={stepIdx} className={`step-${animDir}`}>
              {STEP_CONTENT[stepIdx]}
            </div>
          </div>

          {stepIdx < STEPS.length - 1 && (
            <div style={{
              borderTop: `1px solid ${C.border}`,
              padding: isMobile ? "12px 16px" : "14px 52px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: C.panel, flexShrink: 0,
            }}>
              <button onClick={() => navigate(-1)} disabled={stepIdx === 0}
                style={{ padding: isMobile ? "10px 18px" : "10px 22px", borderRadius: 9, border: `1px solid ${C.border}`, background: "transparent", color: stepIdx === 0 ? C.faint : C.muted, fontWeight: 600, fontSize: 13, cursor: stepIdx === 0 ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                ← Back
              </button>
              <span style={{ fontSize: 12, color: C.faint }}>{stepIdx + 1} / {STEPS.length}</span>
              <button onClick={() => navigate(1)}
                style={{ padding: isMobile ? "10px 20px" : "10px 26px", borderRadius: 9, border: "none", background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", boxShadow: "0 4px 14px rgba(109,40,217,.28)" }}>
                Continue →
              </button>
            </div>
          )}
        </div>

        {/* ══ DESKTOP: RIGHT preview ════════════════════════════════ */}
        {!isMobile && (
          <div style={{ width: 290, borderLeft: `1px solid ${C.border}`, background: C.panel, display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "20px 18px 14px", borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: .9, color: C.faint, textTransform: "uppercase" }}>Live Preview</div>
            </div>
            <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
              <PreviewCard form={form} />
              <div style={{ marginTop: 12, fontSize: 11, color: C.faint, textAlign: "center", lineHeight: 1.6 }}>
                How your card looks to contributors
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  , document.body);
}
