import type { ExtractedInvoice, Discrepancy, AuditResult } from "@/types/invoice";
import { contractRateCards } from "@/data/contractRates";

const processedInvoiceNumbers = new Set<string>();

export function auditInvoice(invoice: ExtractedInvoice): AuditResult {
  const discrepancies: Discrepancy[] = [];
  const contract = contractRateCards[invoice.vendorName];
  let correctSubtotal = 0;

  // Defensive numeric handling
  const safeInvoiceNumber = invoice?.invoiceNumber || "";
  const safeVendorName = invoice?.vendorName || "Unknown Vendor";
  const safeTotalAmount = Number(invoice?.totalAmount) || 0;

  // Duplicate check
  const isDuplicate = processedInvoiceNumbers.has(safeInvoiceNumber);
  if (isDuplicate) {
    discrepancies.push({
      issueType: "Duplicate Invoice",
      description: `Invoice ${safeInvoiceNumber} has already been processed`,
      expectedValue: "Unique",
      actualValue: "Duplicate",
      difference: safeTotalAmount,
      explanation: `Invoice #${safeInvoiceNumber} from ${safeVendorName} was submitted previously. This may indicate a duplicate billing attempt worth ₹${safeTotalAmount.toLocaleString("en-IN")}.`,
    });
  }
  processedInvoiceNumbers.add(safeInvoiceNumber);

  if (!contract) {
    // No contract found — can't audit rates
    return {
      invoice,
      discrepancies,
      correctAmount: safeTotalAmount,
      overchargeDetected: 0,
      riskScore: "Low",
      isDuplicate,
    };
  }

  // Rate checks
  for (const item of invoice?.lineItems || []) {
    const approvedRate = contract.approvedRates[item.description];
    const safeUnitRate = Number(item?.unitRate) || 0;
    const safeQuantity = Number(item?.quantity) || 0;
    
    if (approvedRate !== undefined && safeUnitRate > approvedRate) {
      const diff = (safeUnitRate - approvedRate) * safeQuantity;
      discrepancies.push({
        issueType: "Rate Mismatch",
        description: `${item.description} rate exceeds contract`,
        expectedValue: `₹${approvedRate}/unit`,
        actualValue: `₹${safeUnitRate}/unit`,
        difference: diff,
        explanation: `${item.description} billed at ₹${safeUnitRate} per unit but contract rate is ₹${approvedRate}. Overcharge of ₹${diff.toLocaleString("en-IN")} on ${safeQuantity} units.`,
      });
    }
    const effectiveRate = approvedRate ?? safeUnitRate;
    correctSubtotal += effectiveRate * safeQuantity;

    // GST check
    const safeGstRate = Number(item?.gstRate) || 0;
    if (safeGstRate !== contract.approvedGstRate) {
      const correctGst = (effectiveRate * safeQuantity * contract.approvedGstRate) / 100;
      const actualGst = (safeUnitRate * safeQuantity * safeGstRate) / 100;
      discrepancies.push({
        issueType: "GST Error",
        description: `Incorrect GST on ${item.description}`,
        expectedValue: `${contract.approvedGstRate}%`,
        actualValue: `${safeGstRate}%`,
        difference: Math.abs(actualGst - correctGst),
        explanation: `GST applied at ${safeGstRate}% on ${item.description} but contract specifies ${contract.approvedGstRate}%. Difference: ₹${Math.abs(actualGst - correctGst).toLocaleString("en-IN")}.`,
      });
    }

    // Calculation check
    const safeLineTotal = Number(item?.lineTotal) || 0;
    const expectedTotal = safeUnitRate * safeQuantity;
    if (Math.abs(safeLineTotal - expectedTotal) > 1) {
      discrepancies.push({
        issueType: "Calculation Error",
        description: `Line total mismatch on ${item.description}`,
        expectedValue: `₹${expectedTotal.toLocaleString("en-IN")}`,
        actualValue: `₹${safeLineTotal.toLocaleString("en-IN")}`,
        difference: Math.abs(safeLineTotal - expectedTotal),
        explanation: `${item.description}: ${safeQuantity} × ₹${safeUnitRate} should equal ₹${expectedTotal.toLocaleString("en-IN")} but invoice shows ₹${safeLineTotal.toLocaleString("en-IN")}.`,
      });
    }
  }

  // Surcharge checks
  for (const surcharge of invoice?.surcharges || []) {
    const allowed = contract.allowedSurchargeTypes ?? [];
    const safeSurchargeAmount = Number(surcharge?.amount) || 0;
    
    if (!allowed.includes(surcharge.description)) {
      discrepancies.push({
        issueType: "Surcharge Violation",
        description: `Unauthorized surcharge: ${surcharge.description}`,
        expectedValue: "₹0",
        actualValue: `₹${safeSurchargeAmount.toLocaleString("en-IN")}`,
        difference: safeSurchargeAmount,
        explanation: `"${surcharge.description}" is not an approved surcharge type under the contract with ${safeVendorName}. Unauthorized charge of ₹${safeSurchargeAmount.toLocaleString("en-IN")}.`,
      });
    } else if (surcharge.description === "Fuel Surcharge" && surcharge.percentage) {
      const safePercentage = Number(surcharge.percentage) || 0;
      if (safePercentage > contract.approvedFuelSurchargePercent) {
        const correctAmount = (correctSubtotal * contract.approvedFuelSurchargePercent) / 100;
        discrepancies.push({
          issueType: "Surcharge Violation",
          description: `Fuel surcharge exceeds contract rate`,
          expectedValue: `${contract.approvedFuelSurchargePercent}% (₹${correctAmount.toLocaleString("en-IN")})`,
          actualValue: `${safePercentage}% (₹${safeSurchargeAmount.toLocaleString("en-IN")})`,
          difference: safeSurchargeAmount - correctAmount,
          explanation: `Fuel surcharge applied at ${safePercentage}% but contract allows only ${contract.approvedFuelSurchargePercent}%. Overcharge detected: ₹${(safeSurchargeAmount - correctAmount).toLocaleString("en-IN")}.`,
        });
      }
    }
  }

  // Calculate correct total
  const correctGstAmount = (correctSubtotal * contract.approvedGstRate) / 100;
  const correctFuelSurcharge = (correctSubtotal * contract.approvedFuelSurchargePercent) / 100;
  const correctAmount = correctSubtotal + correctGstAmount + correctFuelSurcharge;
  const overchargeDetected = Math.max(0, safeTotalAmount - correctAmount);

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
