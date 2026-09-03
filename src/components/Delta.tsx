import { formatHm } from "@/lib/time";

/** Écart signé par rapport à la période précédente. */
export function Delta({ ms, zeroLabel = "±0" }: { ms: number; zeroLabel?: string }) {
  if (Math.round(ms / 60_000) === 0) {
    return <span className="delta delta-flat">{zeroLabel}</span>;
  }
  const up = ms > 0;
  return (
    <span className={"delta " + (up ? "delta-up" : "delta-down")}>
      {up ? "▲" : "▼"} {formatHm(Math.abs(ms))}
    </span>
  );
}
