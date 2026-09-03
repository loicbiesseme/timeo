import { useEffect, useRef, useState } from "react";
import type { ExportKind } from "@/lib/export";

const OPTIONS: { kind: ExportKind; label: string }[] = [
  { kind: "csv", label: "CSV (.csv)" },
  { kind: "xlsx", label: "Excel (.xlsx)" },
  { kind: "pdf", label: "PDF (.pdf)" },
];

export function ExportMenu() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const flash = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage((cur) => (cur === text ? null : cur)), 4000);
  };

  const handleExport = async (kind: ExportKind) => {
    setOpen(false);
    setBusy(true);
    try {
      // Chargé à la demande : jsPDF / fflate restent hors du bundle initial.
      const { runExport } = await import("@/lib/export");
      const result = await runExport(kind);
      if (result === "saved") flash("Export enregistré.");
    } catch (e) {
      console.error("[timeo] export :", e);
      flash("Échec de l'export.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="export-menu" ref={rootRef}>
      <button
        className="btn btn-secondary"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
      >
        {busy ? "Export…" : "Exporter ▾"}
      </button>

      {open && (
        <div className="export-menu-list" role="menu">
          {OPTIONS.map((o) => (
            <button key={o.kind} role="menuitem" onClick={() => void handleExport(o.kind)}>
              {o.label}
            </button>
          ))}
        </div>
      )}

      {message && <span className="export-msg">{message}</span>}
    </div>
  );
}
