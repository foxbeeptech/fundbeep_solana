import { useState, useEffect, useRef } from "react";
import { getImpactReport, submitImpactReport, updateImpactReport } from "../supabase";

const MAX_FILE_BYTES = 400 * 1024; // 400 KB
const MAX_PHOTOS    = 5;
const MAX_RECEIPTS  = 5;

const C = {
  surface: "#FFFFFF", bg: "#F5F3FF", border: "#DDD6FE", borderHover: "#C4B5FD",
  text: "#1E0A4C", muted: "#6B7280", faint: "#9CA3AF",
  purple: "#6D28D9", purpleLight: "#7C3AED", purpleSoft: "rgba(109,40,217,.07)",
  green: "#15803D", greenDim: "rgba(21,128,61,.08)", greenBorder: "rgba(21,128,61,.2)",
  red: "#B91C1C", redDim: "rgba(185,28,28,.08)",
  teal: "#0D9488", tealDim: "rgba(13,148,136,.08)", tealBorder: "rgba(13,148,136,.25)",
};

const Spinner = ({ color = C.purple, size = 14 }) => (
  <span style={{ width: size, height: size, border: `2px solid rgba(0,0,0,.08)`, borderTopColor: color, borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite", flexShrink: 0 }} />
);

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Photo/Receipt uploader ────────────────────────────────────────────────────
function FileUploader({ label, items, onAdd, onRemove, onCaptionChange, showAmount = false, max }) {
  const inputRef = useRef();
  const [err, setErr] = useState("");

  const handleFiles = async (files) => {
    setErr("");
    for (const file of Array.from(files)) {
      if (items.length >= max) { setErr(`Max ${max} files allowed`); return; }
      if (file.size > MAX_FILE_BYTES) { setErr(`"${file.name}" exceeds 400 KB limit`); continue; }
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        setErr("Only images (JPG, PNG, WebP) and PDFs allowed"); continue;
      }
      const data = await readFileAsBase64(file);
      onAdd({ data, name: file.name, caption: "", amount_sol: "", type: file.type });
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: .6, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>

      {/* Uploaded items */}
      {items.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          {items.map((item, i) => (
            <div key={i} style={{ position: "relative", width: 110, flexShrink: 0 }}>
              {item.type?.startsWith("image/") ? (
                <img src={item.data} alt={item.name} style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 8, border: `1px solid ${C.border}` }} />
              ) : (
                <div style={{ width: "100%", height: 80, borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <span style={{ fontSize: 9, color: C.faint, textAlign: "center", wordBreak: "break-all", padding: "0 4px" }}>{item.name}</span>
                </div>
              )}
              <button onClick={() => onRemove(i)}
                style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", border: "none", background: C.red, color: "#fff", fontSize: 9, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                ✕
              </button>
              <input
                value={item.caption || ""}
                onChange={e => onCaptionChange(i, "caption", e.target.value)}
                placeholder="Caption…"
                style={{ marginTop: 5, width: "100%", padding: "4px 6px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 10, color: C.text, background: C.bg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
              {showAmount && (
                <input
                  type="number"
                  value={item.amount_sol || ""}
                  onChange={e => onCaptionChange(i, "amount_sol", e.target.value)}
                  placeholder="Amount (SOL)"
                  style={{ marginTop: 4, width: "100%", padding: "4px 6px", borderRadius: 5, border: `1px solid ${C.border}`, fontSize: 10, color: C.text, background: C.bg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {items.length < max && (
        <button onClick={() => inputRef.current?.click()}
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 8, border: `1.5px dashed ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .14s" }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = C.purple; e.currentTarget.style.color = C.purple; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}>
          + Add {label.toLowerCase()} <span style={{ fontSize: 10, color: C.faint }}>({items.length}/{max} · max 400KB)</span>
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*,.pdf" multiple style={{ display: "none" }}
        onChange={e => { handleFiles(e.target.files); e.target.value = ""; }} />
      {err && <div style={{ marginTop: 6, fontSize: 11, color: C.red }}>{err}</div>}
    </div>
  );
}

// ── Public report view ────────────────────────────────────────────────────────
function ReportView({ report, onEdit, isCreator }) {
  const [lightbox, setLightbox] = useState(null);
  const photos   = report.photos   || [];
  const receipts = report.receipts || [];

  return (
    <div>
      {/* Header */}
      <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>📊</span>
            <span style={{ fontWeight: 900, fontSize: 16, color: C.text }}>Impact Report</span>
            <span style={{ padding: "2px 9px", borderRadius: 99, fontSize: 10, fontWeight: 800, background: C.tealDim, color: C.teal, border: `1px solid ${C.tealBorder}` }}>✓ Verified</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{report.title}</div>
          <div style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>
            Submitted {new Date(report.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            {report.updated_at !== report.created_at && " · updated"}
          </div>
        </div>
        {isCreator && (
          <button onClick={onEdit}
            style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ✏️ Edit
          </button>
        )}
      </div>

      <div style={{ padding: "20px 22px" }}>
        {/* Summary */}
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, margin: "0 0 20px", whiteSpace: "pre-wrap" }}>{report.content}</p>

        {/* Photos */}
        {photos.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 10 }}>📷 Photos</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
              {photos.map((p, i) => (
                <div key={i} onClick={() => setLightbox(p)}
                  style={{ cursor: "pointer", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  {p.type?.startsWith("image/") || p.data?.startsWith("data:image") ? (
                    <img src={p.data} alt={p.caption || `Photo ${i + 1}`}
                      style={{ width: "100%", height: 120, objectFit: "cover", display: "block", transition: "transform .2s" }}
                      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"} />
                  ) : (
                    <div style={{ height: 120, background: C.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <span style={{ fontSize: 28 }}>📄</span>
                      <span style={{ fontSize: 10, color: C.faint }}>{p.name}</span>
                    </div>
                  )}
                  {p.caption && (
                    <div style={{ padding: "6px 8px", fontSize: 11, color: C.muted, background: C.surface }}>{p.caption}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Receipts */}
        {receipts.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 10 }}>🧾 Receipts & Proof of Spending</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {receipts.map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, alignItems: "center" }}>
                  <div onClick={() => setLightbox(r)} style={{ cursor: "pointer", flexShrink: 0 }}>
                    {r.type?.startsWith("image/") || r.data?.startsWith("data:image") ? (
                      <img src={r.data} alt={r.caption || "Receipt"} style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 7, border: `1px solid ${C.border}` }} />
                    ) : (
                      <div style={{ width: 60, height: 60, borderRadius: 7, border: `1px solid ${C.border}`, background: C.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}>
                        <span style={{ fontSize: 20 }}>📄</span>
                        <span style={{ fontSize: 8, color: C.faint }}>PDF</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 2 }}>{r.caption || r.name || `Receipt ${i + 1}`}</div>
                    {r.amount_sol && (
                      <div style={{ fontSize: 12, color: C.teal, fontWeight: 700 }}>◎ {r.amount_sol} SOL spent</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, cursor: "zoom-out" }}>
          {lightbox.type?.startsWith("image/") || lightbox.data?.startsWith("data:image") ? (
            <img src={lightbox.data} alt="" style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: 12, boxShadow: "0 20px 80px rgba(0,0,0,.6)" }} onClick={e => e.stopPropagation()} />
          ) : (
            <div style={{ background: "#fff", borderRadius: 12, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <div style={{ fontWeight: 700 }}>{lightbox.name}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Submission/edit form ──────────────────────────────────────────────────────
function ReportForm({ campaignId, creatorId, existing, onSaved, onCancel }) {
  const [title,    setTitle]    = useState(existing?.title    || "");
  const [content,  setContent]  = useState(existing?.content  || "");
  const [photos,   setPhotos]   = useState(existing?.photos   || []);
  const [receipts, setReceipts] = useState(existing?.receipts || []);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");

  const addPhoto   = (f) => setPhotos(p => [...p, f]);
  const addReceipt = (f) => setReceipts(p => [...p, f]);
  const removePhoto   = (i) => setPhotos(p => p.filter((_, idx) => idx !== i));
  const removeReceipt = (i) => setReceipts(p => p.filter((_, idx) => idx !== i));
  const updatePhoto   = (i, key, val) => setPhotos(p => p.map((x, idx) => idx === i ? { ...x, [key]: val } : x));
  const updateReceipt = (i, key, val) => setReceipts(p => p.map((x, idx) => idx === i ? { ...x, [key]: val } : x));

  const save = async () => {
    if (!title.trim()) return setErr("Title is required");
    if (!content.trim()) return setErr("Summary is required");
    setSaving(true); setErr("");
    try {
      const payload = { title, content, photos, receipts };
      let saved;
      if (existing) {
        saved = await updateImpactReport(existing.id, creatorId, payload);
      } else {
        saved = await submitImpactReport(campaignId, creatorId, payload);
      }
      onSaved(saved);
    } catch (e) {
      setErr(e.message || "Failed to save report");
    } finally { setSaving(false); }
  };

  const inputStyle = { width: "100%", padding: "11px 14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit", transition: "border-color .15s" };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: .6, textTransform: "uppercase", marginBottom: 7, display: "block" };

  return (
    <div style={{ padding: "20px 22px" }}>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Report Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 'How we spent the funds - Q1 2025'"
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = C.purple}
          onBlur={e => e.target.style.borderColor = C.border} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Summary / Narrative</label>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          placeholder="Describe what was accomplished, how funds were used, and the impact created…"
          rows={5}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }}
          onFocus={e => e.target.style.borderColor = C.purple}
          onBlur={e => e.target.style.borderColor = C.border} />
      </div>

      <FileUploader
        label="Photos"
        items={photos}
        onAdd={addPhoto}
        onRemove={removePhoto}
        onCaptionChange={updatePhoto}
        max={MAX_PHOTOS}
      />

      <FileUploader
        label="Receipts"
        items={receipts}
        onAdd={addReceipt}
        onRemove={removeReceipt}
        onCaptionChange={updateReceipt}
        showAmount={true}
        max={MAX_RECEIPTS}
      />

      {err && (
        <div style={{ marginBottom: 12, padding: "8px 12px", background: C.redDim, border: "1px solid rgba(185,28,28,.2)", borderRadius: 8, fontSize: 12, color: C.red }}>{err}</div>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={save} disabled={saving}
          style={{ flex: 1, padding: "12px 0", borderRadius: 10, border: "none", background: saving ? C.border : `linear-gradient(135deg, ${C.teal}, #0F766E)`, color: saving ? C.muted : "#fff", fontWeight: 800, fontSize: 14, cursor: saving ? "not-allowed" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .15s" }}>
          {saving ? <><Spinner color={C.muted} /> Saving…</> : existing ? "💾 Update Report" : "📊 Publish Impact Report"}
        </button>
        {onCancel && (
          <button onClick={onCancel}
            style={{ padding: "12px 18px", borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function ImpactReport({ campaignId, creatorId, isCreator, campaignEnded }) {
  const [report,  setReport]  = useState(undefined); // undefined = loading
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    getImpactReport(campaignId)
      .then(setReport)
      .catch(() => setReport(null));
  }, [campaignId]);

  const handleSaved = (saved) => {
    setReport(saved);
    setEditing(false);
  };

  // Don't show anything until loaded
  if (report === undefined) return null;

  // Campaign still active and creator hasn't submitted yet — nothing to show
  if (!report && !campaignEnded && !isCreator) return null;

  const showForm = isCreator && (editing || (!report && campaignEnded));
  const showPrompt = isCreator && !report && !campaignEnded;

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.tealBorder}`, borderRadius: 16, overflow: "hidden", marginTop: 24 }}>
      {/* Section header */}
      {!showForm && (
        <div style={{ height: 3, background: `linear-gradient(90deg, ${C.teal}, #0D9488aa)` }} />
      )}
      {showForm ? (
        <>
          <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: C.text, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              {editing ? "Edit Impact Report" : "Submit Impact Report"}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
              Share photos, receipts and a summary of how funds were used. Builds trust with donors and increases repeat backing.
            </div>
          </div>
          <ReportForm
            campaignId={campaignId}
            creatorId={creatorId}
            existing={editing ? report : null}
            onSaved={handleSaved}
            onCancel={editing ? () => setEditing(false) : null}
          />
        </>
      ) : report ? (
        <ReportView report={report} isCreator={isCreator} onEdit={() => setEditing(true)} />
      ) : showPrompt ? (
        // Campaign still running — show a teaser for creator
        <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>📊</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Impact Report</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>You can submit an impact report once your campaign ends.</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
