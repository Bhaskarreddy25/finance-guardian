import { useState, useCallback } from "react";
import type { AuditResult, DashboardMetrics } from "@/types/invoice";
import { simulateExtraction } from "@/lib/mockExtraction";
import { auditInvoice } from "@/lib/auditEngine";
import { InvoiceUploadZone } from "@/components/InvoiceUploadZone";
import { MetricCards } from "@/components/MetricCards";
import { ExtractedDataTable } from "@/components/ExtractedDataTable";
import { DiscrepancyTable } from "@/components/DiscrepancyTable";
import { AuditCharts } from "@/components/AuditCharts";
import { AuditReportButton } from "@/components/AuditReportButton";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Activity } from "lucide-react";

function computeMetrics(results: AuditResult[]): DashboardMetrics {
  return {
    totalInvoicedAmount: results.reduce((s, r) => s + r.invoice.totalAmount, 0),
    correctAmount: results.reduce((s, r) => s + r.correctAmount, 0),
    totalOvercharge: results.reduce((s, r) => s + r.overchargeDetected, 0),
    potentialRecovery: results.reduce((s, r) => s + r.overchargeDetected, 0),
    highRiskVendors: new Set(results.filter((r) => r.riskScore === "High").map((r) => r.invoice.vendorName)).size,
    duplicateInvoices: results.filter((r) => r.isDuplicate).length,
  };
}

const Index = () => {
  const [results, setResults] = useState<AuditResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const extracted = await simulateExtraction(file);
      const audit = auditInvoice(extracted);
      setResults((prev) => [audit, ...prev]);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const metrics = computeMetrics(results);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <ShieldCheck className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-tight text-foreground">Invoice Auditor</h1>
              <p className="text-[10px] text-muted-foreground">Financial Intelligence Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden gap-1.5 text-xs sm:flex">
              <Activity className="h-3 w-3 text-success" />
              {results.length} Invoices Audited
            </Badge>
            <AuditReportButton results={results} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Metrics */}
        <MetricCards metrics={metrics} />

        {/* Upload + Charts */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <h2 className="section-title mb-3">Upload Invoice</h2>
            <InvoiceUploadZone onFileSelected={handleFile} isProcessing={isProcessing} />
            <p className="mt-3 text-xs text-muted-foreground">
              Upload vendor invoices to automatically detect rate mismatches,
              GST errors, duplicate billing, and unauthorized surcharges.
              Uses AI-powered OCR for structured data extraction.
            </p>
          </div>
          <div className="lg:col-span-2">
            <h2 className="section-title mb-3">Analytics Overview</h2>
            {results.length > 0 ? (
              <AuditCharts results={results} />
            ) : (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed bg-card text-sm text-muted-foreground">
                Upload invoices to see analytics
              </div>
            )}
          </div>
        </div>

        {/* Audit Results */}
        {results.map((result, i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="section-title">
                Audit #{results.length - i}: {result.invoice.vendorName}
              </h2>
              <Badge
                className={
                  result.riskScore === "High"
                    ? "bg-destructive/10 text-destructive"
                    : result.riskScore === "Medium"
                    ? "bg-warning/10 text-warning"
                    : "bg-success/10 text-success"
                }
              >
                {result.riskScore} Risk
              </Badge>
              {result.isDuplicate && (
                <Badge className="bg-destructive/10 text-destructive">Duplicate</Badge>
              )}
            </div>
            <ExtractedDataTable invoice={result.invoice} />
            <DiscrepancyTable discrepancies={result.discrepancies} />
          </div>
        ))}

        {results.length === 0 && (
          <div className="py-16 text-center">
            <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold text-foreground">No invoices audited yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload an invoice to begin detecting discrepancies and revenue leakage
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
