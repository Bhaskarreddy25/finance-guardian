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
  // Overcharge by vendor
  const vendorMap = new Map<string, number>();
  results.forEach((r) => {
    const existing = vendorMap.get(r.invoice.vendorName) ?? 0;
    vendorMap.set(r.invoice.vendorName, existing + r.overchargeDetected);
  });
  const vendorData = Array.from(vendorMap.entries()).map(([name, amount]) => ({
    name: name.split(" ")[0],
    amount: Math.round(amount),
  }));

  // Overcharge by error type
  const typeMap = new Map<string, number>();
  results.forEach((r) => {
    r.discrepancies.forEach((d) => {
      const existing = typeMap.get(d.issueType) ?? 0;
      typeMap.set(d.issueType, existing + d.difference);
    });
  });
  const typeData = Array.from(typeMap.entries()).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  // Risk scores
  const riskData = [
    { name: "Low", value: results.filter((r) => r.riskScore === "Low").length },
    { name: "Medium", value: results.filter((r) => r.riskScore === "Medium").length },
    { name: "High", value: results.filter((r) => r.riskScore === "High").length },
  ].filter((d) => d.value > 0);

  if (results.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Overcharge by Vendor */}
      <div className="rounded-lg border bg-card p-4">
        <h4 className="section-title mb-3">Overcharges by Vendor</h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={vendorData}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
            <Bar dataKey="amount" fill="hsl(210, 90%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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
            <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
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
