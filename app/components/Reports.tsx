"use client";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Holding } from "./portfolio-types";

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
  "#06b6d4", "#eab308",
];

function aggregate(
  holdings: Holding[],
  key: (h: Holding) => string
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const h of holdings) {
    const v = h.currentValue ?? 0;
    if (v <= 0) continue;
    const k = key(h);
    map.set(k, (map.get(k) ?? 0) + v);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function DonutCard({
  title,
  data,
}: {
  title: string;
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
      <h3 className="font-semibold mb-2">{title}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No holdings</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => {
                const n = Number(v);
                return `₹${n.toLocaleString("en-IN", {
                  maximumFractionDigits: 0,
                })} (${((n / total) * 100).toFixed(1)}%)`;
              }}
              contentStyle={{
                background: "#111827",
                border: "1px solid #374151",
                borderRadius: 8,
                color: "#f3f4f6",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(val) => <span className="text-gray-300">{val}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function Reports({ holdings }: { holdings: Holding[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <DonutCard
        title="Market-Cap Proportion"
        data={aggregate(holdings, (h) => h.capCategory ?? "Unknown")}
      />
      <DonutCard
        title="Sector-wise Proportion"
        data={aggregate(holdings, (h) => h.sector)}
      />
      <DonutCard
        title="Stock-wise Proportion"
        data={aggregate(holdings, (h) => h.name)}
      />
    </div>
  );
}
