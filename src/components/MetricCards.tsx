import type { DashboardMetrics } from "@/types/invoice";
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Copy,
  ShieldCheck,
  ArrowUpRight,
  TrendingUp,
  Target,
} from "lucide-react";

interface MetricCardsProps {
  metrics: DashboardMetrics;
}

const fmt = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;

export function MetricCards({ metrics }: MetricCardsProps) {
  // Calculate savings percentage
  const savingsPercentage = metrics.totalInvoicedAmount > 0 
    ? (metrics.potentialRecovery / metrics.totalInvoicedAmount) * 100 
    : 0;

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
    {
      label: "Saved This Month",
      value: fmt(metrics.savedThisMonth || 0),
      icon: TrendingUp,
      color: "text-success",
    },
    {
      label: "Top Risk Vendor",
      value: metrics.topRiskVendor || "N/A",
      icon: Target,
      color: "text-warning",
    },
  ];

  return (
    <>
      {/* Savings Summary Bar */}
      <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-green-800">Total Savings</h3>
            {metrics.potentialRecovery === 0 ? (
              <p className="text-sm text-green-600">
                No financial discrepancies detected.
              </p>
            ) : (
              <p className="text-sm text-green-600">
                {fmt(metrics.potentialRecovery)} recovered ({pct(savingsPercentage)} of total invoiced)
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-700">
              {pct(savingsPercentage)}
            </div>
            <div className="text-xs text-green-600">Recovery Rate</div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {cards.map((c) => (
          <div key={c.label} className="metric-card animate-in">
            <div className="flex items-center justify-between">
              <span className="section-title text-xs">{c.label}</span>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </div>
            <p className={`mt-2 text-xl font-bold ${c.color} ${c.label === "Saved This Month" || c.label === "Potential Recovery" ? "animate-pulse" : ""}`}>
              {c.value}
            </p>
            {/* Duplicate Reason Transparency */}
            {c.label === "Duplicate Invoices" && metrics.duplicateInvoices > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Duplicate Reason: Same invoice number + same total
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
