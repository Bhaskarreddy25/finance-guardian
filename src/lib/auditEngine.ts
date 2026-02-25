import type { ExtractedInvoice, Discrepancy, AuditResult } from "@/types/invoice";
import { contractRateCards } from "@/data/contractRates";

const processedInvoiceNumbers = new Set<string>();

export function auditInvoice(invoice: ExtractedInvoice): AuditResult {
  const discrepancies: Discrepancy[] = [];
  const contract = contractRateCards[invoice.vendorName];
  let correctSubtotal = 0;

  // Duplicate check
  const isDuplicate = processedInvoiceNumbers.has(invoice.invoiceNumber);
  if (isDuplicate) {
    discrepancies.push({
      issueType: "Duplicate Invoice",
      description: `Invoice ${invoice.invoiceNumber} has already been processed`,
      expectedValue: "Unique",
      actualValue: "Duplicate",
      difference: invoice.totalAmount,
      explanation: `Invoice #${invoice.invoiceNumber} from ${invoice.vendorName} was submitted previously. This may indicate a duplicate billing attempt worth ₹${invoice.totalAmount.toLocaleString("en-IN")}.`,
    });
  }
  processedInvoiceNumbers.add(invoice.invoiceNumber);

  if (!contract) {
    // No contract found — can't audit rates
    return {
      invoice,
      discrepancies,
      correctAmount: invoice.totalAmount,
      overchargeDetected: 0,
      riskScore: "Low",
      isDuplicate,
    };
  }

  // Rate checks
  for (const item of invoice.lineItems) {
    const approvedRate = contract.approvedRates[item.description];
    if (approvedRate !== undefined && item.unitRate > approvedRate) {
      const diff = (item.unitRate - approvedRate) * item.quantity;
      discrepancies.push({
        issueType: "Rate Mismatch",
        description: `${item.description} rate exceeds contract`,
        expectedValue: `₹${approvedRate}/unit`,
        actualValue: `₹${item.unitRate}/unit`,
        difference: diff,
        explanation: `${item.description} billed at ₹${item.unitRate} per unit but contract rate is ₹${approvedRate}. Overcharge of ₹${diff.toLocaleString("en-IN")} on ${item.quantity} units.`,
      });
    }
    const effectiveRate = approvedRate ?? item.unitRate;
    correctSubtotal += effectiveRate * item.quantity;

    // GST check
    if (item.gstRate !== contract.approvedGstRate) {
      const correctGst = (effectiveRate * item.quantity * contract.approvedGstRate) / 100;
      const actualGst = (item.unitRate * item.quantity * item.gstRate) / 100;
      discrepancies.push({
        issueType: "GST Error",
        description: `Incorrect GST on ${item.description}`,
        expectedValue: `${contract.approvedGstRate}%`,
        actualValue: `${item.gstRate}%`,
        difference: Math.abs(actualGst - correctGst),
        explanation: `GST applied at ${item.gstRate}% on ${item.description} but contract specifies ${contract.approvedGstRate}%. Difference: ₹${Math.abs(actualGst - correctGst).toLocaleString("en-IN")}.`,
      });
    }

    // Calculation check
    const expectedTotal = item.unitRate * item.quantity;
    if (Math.abs(item.lineTotal - expectedTotal) > 1) {
      discrepancies.push({
        issueType: "Calculation Error",
        description: `Line total mismatch on ${item.description}`,
        expectedValue: `₹${expectedTotal.toLocaleString("en-IN")}`,
        actualValue: `₹${item.lineTotal.toLocaleString("en-IN")}`,
        difference: Math.abs(item.lineTotal - expectedTotal),
        explanation: `${item.description}: ${item.quantity} × ₹${item.unitRate} should equal ₹${expectedTotal.toLocaleString("en-IN")} but invoice shows ₹${item.lineTotal.toLocaleString("en-IN")}.`,
      });
    }
  }

  // Surcharge checks
  for (const surcharge of invoice.surcharges) {
    const allowed = contract.allowedSurchargeTypes ?? [];
    if (!allowed.includes(surcharge.description)) {
      discrepancies.push({
        issueType: "Surcharge Violation",
        description: `Unauthorized surcharge: ${surcharge.description}`,
        expectedValue: "₹0",
        actualValue: `₹${surcharge.amount.toLocaleString("en-IN")}`,
        difference: surcharge.amount,
        explanation: `"${surcharge.description}" is not an approved surcharge type under the contract with ${invoice.vendorName}. Unauthorized charge of ₹${surcharge.amount.toLocaleString("en-IN")}.`,
      });
    } else if (surcharge.description === "Fuel Surcharge" && surcharge.percentage) {
      if (surcharge.percentage > contract.approvedFuelSurchargePercent) {
        const correctAmount = (correctSubtotal * contract.approvedFuelSurchargePercent) / 100;
        discrepancies.push({
          issueType: "Surcharge Violation",
          description: `Fuel surcharge exceeds contract rate`,
          expectedValue: `${contract.approvedFuelSurchargePercent}% (₹${correctAmount.toLocaleString("en-IN")})`,
          actualValue: `${surcharge.percentage}% (₹${surcharge.amount.toLocaleString("en-IN")})`,
          difference: surcharge.amount - correctAmount,
          explanation: `Fuel surcharge applied at ${surcharge.percentage}% but contract allows only ${contract.approvedFuelSurchargePercent}%. Overcharge detected: ₹${(surcharge.amount - correctAmount).toLocaleString("en-IN")}.`,
        });
      }
    }
  }

  // Calculate correct total
  const correctGstAmount = (correctSubtotal * contract.approvedGstRate) / 100;
  const correctFuelSurcharge = (correctSubtotal * contract.approvedFuelSurchargePercent) / 100;
  const correctAmount = correctSubtotal + correctGstAmount + correctFuelSurcharge;
  const overchargeDetected = Math.max(0, invoice.totalAmount - correctAmount);

  const riskScore: AuditResult["riskScore"] =
    discrepancies.length >= 4 || overchargeDetected > 5000
      ? "High"
      : discrepancies.length >= 2 || overchargeDetected > 1000
      ? "Medium"
      : "Low";

  return { invoice, discrepancies, correctAmount, overchargeDetected, riskScore, isDuplicate };
}

export function resetProcessedInvoices() {
  processedInvoiceNumbers.clear();
}
