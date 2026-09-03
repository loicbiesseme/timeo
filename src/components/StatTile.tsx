import type { ReactNode } from "react";

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

export function StatTile({ label, value, hint }: Props) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-value">{value}</div>
      {hint != null && <div className="stat-tile-hint">{hint}</div>}
    </div>
  );
}
