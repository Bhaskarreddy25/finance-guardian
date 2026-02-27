import type { AuditResult } from "@/types/invoice";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AuditChartsProps {
  results: AuditResult[];
}

const COLORS = [
  "hsl(217, 71%, 25%)",
  "hsl(210, 90%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(152, 60%, 38%)",
  "hsl(38, 92%, 50%)",
];

export function AuditCharts({ results }: AuditChartsProps) {
  if (!results) return null;

  // Overcharge by vendor
  const vendorMap = new Map<string, number>();
  (results || []).forEach((r) => {
    const vendorName =
      typeof r?.invoice?.vendorName === "string" ? r.invoice.vendorName : "Unknown";

    const existing = vendorMap.get(vendorName) ?? 0;

    vendorMap.set(vendorName, existing + (Number(r?.overchargeDetected) || 0));
  });
  const vendorData = Array.from(vendorMap.entries()).map(([name, amount]) => {
    const safeName =
      typeof name === "string" && name.length > 0 ? name.split(" ")[0] : "Unknown";
    const safeAmount = Number.isFinite(amount) ? Math.round(amount) : 0;
    return {
      name: safeName,
      amount: safeAmount,
    };
  });

  // Overcharge by error type
  const typeMap = new Map<string, number>();
  (results || []).forEach((r) => {
    (r?.discrepancies || []).forEach((d) => {
      const existing = typeMap.get(d.issueType) ?? 0;
      typeMap.set(d.issueType, existing + d.difference);
    });
  });
  const typeData = Array.from(typeMap.entries()).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  // Risk scores with visual scoring
  const riskFillMap = {
    Low: 25,
    Medium: 60,
    High: 90
  };
  
  const riskData = [
    {
      name: "Low",
      value: (results || []).filter((r) => r && r.riskScore === "Low").length,
      fill: riskFillMap.Low,
    },
    {
      name: "Medium",
      value: (results || []).filter((r) => r && r.riskScore === "Medium").length,
      fill: riskFillMap.Medium,
    },
    {
      name: "High",
      value: (results || []).filter((r) => r && r.riskScore === "High").length,
      fill: riskFillMap.High,
    },
  ].filter((d) => (d?.value || 0) > 0);

  if (!results || results.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Overcharge by Vendor */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="section-title mb-3">Overcharges by Vendor</h4>
        {!vendorData?.length || vendorData.every(v => v.amount === 0) ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            No overcharges detected
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={vendorData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`}
              />
              <Bar dataKey="amount" fill="hsl(210, 90%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Overcharge by Type */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="section-title mb-3">By Error Type</h4>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2}>
              {typeData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => `₹${Number(v || 0).toLocaleString("en-IN")}`}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Vendor Risk */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="section-title mb-3">Vendor Risk Score</h4>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={riskData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2}>
              <Cell fill="hsl(152, 60%, 38%)" />
              <Cell fill="hsl(38, 92%, 50%)" />
              <Cell fill="hsl(0, 72%, 51%)" />
            </Pie>
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
