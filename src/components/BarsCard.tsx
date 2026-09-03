import {
  ResponsiveContainer,
  BarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Card } from "./Card";
import type { Bar } from "@/domain/stats";

interface Props {
  title: string;
  data: Bar[];
  height?: number;
}

export function BarsCard({ title, data, height = 260 }: Props) {
  return (
    <Card title={title}>
      <div className="chart-wrap">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--text-faint)" fontSize={12} tickMargin={8} />
            <YAxis
              stroke="var(--text-faint)"
              fontSize={12}
              width={48}
              unit="h"
              tickMargin={4}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                color: "var(--text)",
              }}
              labelStyle={{ color: "var(--text-muted)" }}
              formatter={(value: number) => [`${value} h`, "Travaillé"]}
            />
            <RechartsBar dataKey="hours" fill="var(--accent)" radius={[6, 6, 0, 0]} maxBarSize={52} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
