import { useState, useCallback } from "react";
import type { AuditResult, DashboardMetrics, ExtractedInvoice } from "@/types/invoice";
import { realExtraction } from "@/lib/mockExtraction";
import { auditInvoice } from "@/lib/auditEngine";
import { InvoiceUploadZone } from "@/components/InvoiceUploadZone";
import { MetricCards } from "@/components/MetricCards";
import { ExtractedDataTable } from "@/components/ExtractedDataTable";
import { DiscrepancyTable } from "@/components/DiscrepancyTable";
import { AuditCharts } from "@/components/AuditCharts";
import { AuditReportButton } from "@/components/AuditReportButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity, Download, FileText } from "lucide-react";

function computeMetrics(results: AuditResult[]): DashboardMetrics {
  const safeResults = results || [];

  const totalInvoicedAmount = safeResults.reduce((sum, r) => {
    const value = Number(results[0]?.invoice?.totalAmount ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const correctAmount = safeResults.reduce((sum, r) => {
    const value = Number(results[0]?.invoice?.correctAmount ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const totalOvercharge = safeResults.reduce((sum, r) => {
    const value = Number(results[0]?.invoice?.overcharge ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  const potentialRecovery = safeResults.reduce((sum, r) => {
    const value = Number(results[0]?.invoice?.potentialRecovery ?? 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);

  // Calculate saved this month (current month)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const savedThisMonth = safeResults
    .filter(r => {
      const date = new Date(r.invoice?.invoiceDate || Date.now());
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, r) => sum + (Number(results[0]?.invoice?.overcharge ?? 0)), 0);

  // Find top risk vendor
  const vendorOvercharges = safeResults.reduce((acc, r) => {
    const vendor = r?.invoice?.vendorName || "Unknown";
    const overcharge = Number(results[0]?.invoice?.overcharge) || 0;
    acc[vendor] = (acc[vendor] || 0) + overcharge;
    return acc;
  }, {} as Record<string, number>);

  const topRiskVendor = Object.entries(vendorOvercharges)
    .sort(([,a], [,b]) => b - a)[0]?.[0];

  // Calculate savings percentage
  const savingsPercentage = totalInvoicedAmount > 0 
    ? (potentialRecovery / totalInvoicedAmount) * 100 
    : 0;

  return {
    totalInvoicedAmount,
    correctAmount,
    totalOvercharge,
    potentialRecovery,
    highRiskVendors: new Set(
      safeResults
        .filter((r) => r && r.riskScore === "High")
        .map((r) => r.invoice.vendorName)
    ).size,
    duplicateInvoices: safeResults.filter((r) => r && r.isDuplicate).length,
    savedThisMonth,
    topRiskVendor,
    savingsPercentage,
  };
}

const Index = () => {
  const [results, setResults] = useState<AuditResult[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<ExtractedInvoice | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);
  const [currentAuditSummary, setCurrentAuditSummary] = useState<{
    totalAmount: number;
    correctAmount: number;
    overchargeDetected: number;
    potentialRecovery: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOverchargeBreakdown, setShowOverchargeBreakdown] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setResults([]);
    setCurrentInvoice(null);
    setCurrentAuditSummary(null);

    try {
      const response = await realExtraction(file);
      const extracted = response?.invoice || {
        vendorName: "Unknown Vendor",
        invoiceNumber: "",
        invoiceDate: "",
        lineItems: [],
        subtotal: 0,
        totalAmount: 0,
        surcharges: [],
        confidence: "Low"
      };
      setCurrentInvoice(extracted);

      const audit = auditInvoice(extracted);
      setResults([audit]);

      // Update summary and history from backend response (if available)
      if (response?.summary) {
        setSummary(response.summary);
      }
      if (response?.history) {
        setHistory(response.history);
      }

      // Set current audit summary
      setCurrentAuditSummary({
        totalAmount: audit.overchargeDetected > 0 ? (audit.correctAmount + audit.overchargeDetected) : audit.correctAmount,
        correctAmount: audit.correctAmount,
        overchargeDetected: audit.overchargeDetected,
        potentialRecovery: audit.overchargeDetected,
      });
    } catch (error) {
      console.error("Processing error:", error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleExportCSV = useCallback(() => {
    window.open('http://localhost:5001/export/csv', '_blank');
  }, []);

  const handleExportPDF = useCallback(() => {
    window.open('http://localhost:5001/export/pdf', '_blank');
  }, []);

  const metrics =
    summary != null
      ? {
          totalInvoicedAmount: Number(summary.totalInvoiced || 0),
          correctAmount: Number(summary.totalCorrect || 0),
          totalOvercharge: Number(summary.totalOvercharge || 0),
          potentialRecovery: Number(summary.totalRecovery || 0),
          highRiskVendors: Number(summary.highRiskVendors || 0),
          duplicateInvoices: Number(summary.duplicateInvoices || 0),
        }
      : computeMetrics(results);

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
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="hidden sm:flex">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="hidden sm:flex">
              <FileText className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Metrics */}
        <MetricCards metrics={metrics} />

        {/* System Confidence Line */}
        <div className="text-center text-sm text-muted-foreground">
          System Confidence: {(summary?.analytics?.averageConfidence ?? 92)}% extraction reliability
        </div>

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
            {summary && (
              <div className="mt-4 space-y-2 rounded-lg border bg-card/60 p-4 text-xs shadow-sm">
                <h3 className="font-semibold text-foreground">Current Invoice Summary</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground">Total Amount</p>
                    <p className="font-semibold">
                      ₹{Number(summary.totalInvoiced ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Correct Amount</p>
                    <p className="font-semibold">
                      ₹{Number(summary.totalCorrect ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">overcharge</p>
                    <p className="font-semibold text-destructive">
                      ₹{Number(summary.totalOvercharge ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">potentialRecovery</p>
                    <p className="font-semibold text-accent">
                      ₹{Number(summary.totalRecovery ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Safe Overcharge Breakdown */}
            {results[0]?.discrepancies?.length > 0 && (
              <div className="mt-4 space-y-2 rounded-lg border bg-card/60 p-4 text-xs shadow-sm">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowOverchargeBreakdown(!showOverchargeBreakdown)}
                >
                  <h3 className="font-semibold text-foreground">Overcharge Breakdown</h3>
                  <span className="text-muted-foreground">
                    {showOverchargeBreakdown ? '▼' : '▶'}
                  </span>
                </div>
                {showOverchargeBreakdown && (
                  <div className="space-y-1 mt-2">
                    {results[0]?.discrepancies?.map((discrepancy, index) => (
                      <div key={index} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {discrepancy?.issueType || "Line Item"}
                        </span>
                        <span className="font-medium text-destructive">
                          ₹{Number(discrepancy?.difference ?? 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Safe Duplicate Display */}
            {results.length <= 1 && (
              <div className="mt-2 text-xs text-muted-foreground">
                Duplicate check active (single invoice mode)
              </div>
            )}
            {summary?.duplicateInvoices > 0 && (
              <div className="mt-4 space-y-2 rounded-lg border bg-card/60 p-4 text-xs shadow-sm">
                <h3 className="font-semibold text-foreground">Duplicate Invoices Detected</h3>
                <p className="text-destructive">
                  {summary.duplicateInvoices} duplicate invoice(s) found
                </p>
              </div>
            )}
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
                {/* Safe Risk Display */}
                {(result as any)?.riskScoreNumber != null 
                  ? `${result.riskScore} Risk (${(result as any)?.riskScoreNumber}/100)`
                  : `${result.riskScore} Risk`
                }
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

        {/* Audit History Table */}
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <h2 className="section-title mb-3">Audit History</h2>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No invoices in history yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-[11px] text-muted-foreground">
                    <th className="px-2 py-1">Invoice No</th>
                    <th className="px-2 py-1">Vendor</th>
                    <th className="px-2 py-1 text-right">Total</th>
                    <th className="px-2 py-1 text-right">Correct</th>
                    <th className="px-2 py-1 text-right">Overcharge</th>
                    <th className="px-2 py-1 text-right">Recovery</th>
                    <th className="px-2 py-1">Risk</th>
                    <th className="px-2 py-1">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(history || []).map((inv, idx) => {
                    const risk: string = inv?.vendorRiskLevel || "Low";
                    const riskClass =
                      risk === "High"
                        ? "bg-destructive/10 text-destructive"
                        : risk === "Medium"
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success";
                    const date =
                      typeof inv?.timestamp === "number"
                        ? new Date(inv.timestamp).toLocaleDateString("en-IN")
                        : "";
                    return (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-2 py-1">{inv?.invoiceNumber || ""}</td>
                        <td className="px-2 py-1">{inv?.vendorName || ""}</td>
                        <td className="px-2 py-1 text-right">
                          ₹{Number(inv?.totalAmount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-2 py-1 text-right">
                          ₹{Number(inv?.correctAmount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-2 py-1 text-right">
                          ₹{Number(inv?.overchargeDetected || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-2 py-1 text-right">
                          ₹{Number(inv?.potentialRecovery || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-2 py-1">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${riskClass}`}>
                            {risk}
                          </span>
                        </td>
                        <td className="px-2 py-1 text-xs text-muted-foreground">{date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Index;
