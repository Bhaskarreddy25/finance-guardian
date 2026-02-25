import type { AuditResult } from "@/types/invoice";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

interface AuditReportButtonProps {
  results: AuditResult[];
}

export function AuditReportButton({ results }: AuditReportButtonProps) {
  const generate = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString("en-IN");

    // Title
    doc.setFontSize(18);
    doc.setTextColor(30, 50, 80);
    doc.text("Invoice Audit Report", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${now}`, 14, 30);

    let y = 40;

    // Summary
    const totalInvoiced = results.reduce((s, r) => s + r.invoice.totalAmount, 0);
    const totalOvercharge = results.reduce((s, r) => s + r.overchargeDetected, 0);
    const totalCorrect = results.reduce((s, r) => s + r.correctAmount, 0);
    const duplicates = results.filter((r) => r.isDuplicate).length;

    doc.setFontSize(12);
    doc.setTextColor(30, 50, 80);
    doc.text("Executive Summary", 14, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: [
        ["Total Invoiced", `₹${totalInvoiced.toLocaleString("en-IN")}`],
        ["Correct Amount", `₹${totalCorrect.toLocaleString("en-IN")}`],
        ["Total Overcharge", `₹${totalOvercharge.toLocaleString("en-IN")}`],
        ["Invoices Audited", String(results.length)],
        ["Duplicate Invoices", String(duplicates)],
        ["High-Risk Vendors", String(results.filter((r) => r.riskScore === "High").length)],
      ],
      theme: "striped",
      headStyles: { fillColor: [30, 58, 95] },
      styles: { fontSize: 9 },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Per-invoice details
    results.forEach((result, idx) => {
      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(30, 50, 80);
      doc.text(
        `${idx + 1}. ${result.invoice.vendorName} — ${result.invoice.invoiceNumber}`,
        14,
        y
      );
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        `Total: ₹${result.invoice.totalAmount.toLocaleString("en-IN")} | Overcharge: ₹${result.overchargeDetected.toLocaleString("en-IN")} | Risk: ${result.riskScore}`,
        14,
        y
      );
      y += 6;

      if (result.discrepancies.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [["Issue", "Expected", "Actual", "Difference"]],
          body: result.discrepancies.map((d) => [
            d.issueType,
            d.expectedValue,
            d.actualValue,
            `₹${d.difference.toLocaleString("en-IN")}`,
          ]),
          theme: "grid",
          headStyles: { fillColor: [180, 40, 40] },
          styles: { fontSize: 8 },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setTextColor(40, 120, 70);
        doc.text("No discrepancies found.", 14, y);
        y += 10;
      }
    });

    // Recommendations
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(12);
    doc.setTextColor(30, 50, 80);
    doc.text("Recommended Actions", 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(60);
    const actions = [
      "1. Review all rate mismatches with vendor contracts and negotiate corrections.",
      "2. Flag duplicate invoices for immediate hold on payment processing.",
      "3. Escalate unauthorized surcharges to vendor management for resolution.",
      "4. Update contract rate cards to prevent future GST discrepancies.",
      "5. Schedule quarterly vendor audits for high-risk vendors.",
    ];
    actions.forEach((a) => {
      doc.text(a, 14, y);
      y += 5;
    });

    doc.save(`audit-report-${now.replace(/\//g, "-")}.pdf`);
  };

  return (
    <Button
      onClick={generate}
      disabled={results.length === 0}
      className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
    >
      <FileDown className="h-4 w-4" />
      Generate Audit Report
    </Button>
  );
}
