import type { DashboardMetrics } from "@/types/invoice";
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Copy,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function MetricCards({ metrics }: MetricCardsProps) {
  const cards = [
    {
      label: "Total Invoiced",
      value: fmt(metrics.totalInvoicedAmount),
      icon: DollarSign,
      color: "text-foreground",
    },
    {
      label: "Correct Amount",
      value: fmt(metrics.correctAmount),
      icon: ShieldCheck,
      color: "text-success",
    },
    {
      label: "Overcharge Detected",
      value: fmt(metrics.totalOvercharge),
      icon: TrendingDown,
      color: "text-destructive",
    },
    {
      label: "Potential Recovery",
      value: fmt(metrics.potentialRecovery),
      icon: ArrowUpRight,
      color: "text-accent",
    },
    {
      label: "High-Risk Vendors",
      value: String(metrics.highRiskVendors),
      icon: AlertTriangle,
      color: "text-warning",
    },
    {
      label: "Duplicate Invoices",
      value: String(metrics.duplicateInvoices),
      icon: Copy,
      color: "text-destructive",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="metric-card">
          <div className="flex items-center justify-between">
            <span className="section-title text-xs">{c.label}</span>
            <c.icon className={`h-4 w-4 ${c.color}`} />
          </div>
          <p className={`mt-2 text-xl font-bold ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
