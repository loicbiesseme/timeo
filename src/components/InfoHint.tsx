import { useState } from "react";

/**
 * Petite pastille « ? » affichant une bulle d'aide au survol, au focus
 * clavier, ou au clic (utile sur écran tactile).
 */
export function InfoHint({ text, label = "Plus d'informations" }: { text: string; label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <span className={"info-hint" + (open ? " is-open" : "")}>
      <button
        type="button"
        className="info-hint-trigger"
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
      >
        ?
      </button>
      <span className="info-hint-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
