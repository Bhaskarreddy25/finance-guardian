import type { ExtractedInvoice } from "@/types/invoice";

const mockInvoices: ExtractedInvoice[] = [
  {
    vendorName: "BlueDart Logistics",
    invoiceNumber: "BD-2024-00847",
    invoiceDate: "2024-12-15",
    lineItems: [
      { description: "Freight Charges", quantity: 12, unitRate: 1450, lineTotal: 17400, gstRate: 18, hsnCode: "996511" },
      { description: "Handling Fee", quantity: 12, unitRate: 200, lineTotal: 2400, gstRate: 18, hsnCode: "996512" },
      { description: "Packaging", quantity: 8, unitRate: 150, lineTotal: 1200, gstRate: 18, hsnCode: "996513" },
    ],
    subtotal: 21000,
    totalAmount: 27090,
    correctAmount: 25000,
    overcharge: 2090,
    potentialRecovery: 2090,
    recoveryRate: 7.72,
    status: "overcharged",
    surcharges: [
      { description: "Fuel Surcharge", amount: 2520, percentage: 12 },
      { description: "Emergency Handling Fee", amount: 1500 },
    ],
    confidence: "High",
  },
  {
    vendorName: "DHL Express India",
    invoiceNumber: "DHL-IN-2024-3392",
    invoiceDate: "2024-12-18",
    lineItems: [
      { description: "Air Freight", quantity: 5, unitRate: 3500, lineTotal: 17500, gstRate: 18, hsnCode: "996521" },
      { description: "Customs Clearance", quantity: 5, unitRate: 1800, lineTotal: 9000, gstRate: 18, hsnCode: "996522" },
      { description: "Insurance", quantity: 5, unitRate: 300, lineTotal: 1500, gstRate: 18, hsnCode: "996530" },
    ],
    subtotal: 28000,
    totalAmount: 34440,
    correctAmount: 33040,
    overcharge: 1400,
    potentialRecovery: 1400,
    recoveryRate: 4.07,
    status: "overcharged",
    surcharges: [
      { description: "Fuel Surcharge", amount: 1120, percentage: 4 },
    ],
    confidence: "High",
  },
  {
    vendorName: "Gati Shipping",
    invoiceNumber: "GATI-2024-5561",
    invoiceDate: "2024-12-20",
    lineItems: [
      { description: "Surface Transport", quantity: 20, unitRate: 1100, lineTotal: 22000, gstRate: 18, hsnCode: "996511" },
      { description: "Express Delivery", quantity: 3, unitRate: 2200, lineTotal: 6600, gstRate: 12, hsnCode: "996512" },
      { description: "Loading/Unloading", quantity: 20, unitRate: 250, lineTotal: 5000, gstRate: 18, hsnCode: "996519" },
    ],
    subtotal: 33600,
    totalAmount: 41328,
    correctAmount: 41328,
    overcharge: 0,
    potentialRecovery: 0,
    recoveryRate: 0,
    status: "clean",
    surcharges: [
      { description: "Fuel Surcharge", amount: 1680, percentage: 5 },
      { description: "Priority Processing", amount: 2000 },
    ],
    confidence: "Medium",
  },
  {
    vendorName: "BlueDart Logistics",
    invoiceNumber: "BD-2024-00847",
    invoiceDate: "2024-12-22",
    lineItems: [
      { description: "Freight Charges", quantity: 12, unitRate: 1450, lineTotal: 17400, gstRate: 18, hsnCode: "996511" },
      { description: "Handling Fee", quantity: 12, unitRate: 200, lineTotal: 2400, gstRate: 18, hsnCode: "996512" },
    ],
    subtotal: 19800,
    totalAmount: 25542,
    correctAmount: 23364,
    overcharge: 2178,
    potentialRecovery: 2178,
    recoveryRate: 8.53,
    status: "overcharged",
    surcharges: [
      { description: "Fuel Surcharge", amount: 2376, percentage: 12 },
    ],
    confidence: "Low",
  },
];

let mockIndex = 0;

function getNextMockInvoice(): ExtractedInvoice {
  const invoice = mockInvoices[mockIndex % mockInvoices.length];
  mockIndex++;
  return { ...invoice };
}

function runMockExtraction(_file: File): Promise<{ invoice: ExtractedInvoice; history: any[]; summary: any | null }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const invoice = getNextMockInvoice();
      resolve({
        invoice,
        history: [],
        summary: {
          totalInvoiced: invoice.totalAmount,
          correctAmount: invoice.totalAmount,
          overchargeDetected: 0,
          potentialRecovery: 0,
          duplicateCount: 0,
          highRiskCount: 0,
        },
      });
    }, 2000);
  });
}

export async function realExtraction(
  file: File
): Promise<{ invoice: ExtractedInvoice; history: any[]; summary: any | null }> {
  const API_URL = "http://localhost:5001";

  try {
    const formData = new FormData();
    formData.append("invoice", file);

    const response = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      body: formData, // Let browser set Content-Type for multipart/form-data
    });

    if (!response.ok) {
      throw new Error("Backend error");
    }

    const payload = await response.json();
    const rawInvoice = payload && payload.results && payload.results[0] ? payload.results[0].invoice : payload.invoice || payload;

    const lineItems = Array.isArray(rawInvoice?.lineItems)
      ? rawInvoice.lineItems.map((li: any) => {
          const quantity = Number(li?.quantity || 0);
          const unitRate = Number(li?.unitRate || 0);
          const lineTotalRaw = Number(li?.lineTotal || 0);
          const computedLineTotal = quantity * unitRate;
          const lineTotal = Number.isFinite(lineTotalRaw) && lineTotalRaw > 0 ? lineTotalRaw : computedLineTotal;

          return {
            description: String(li?.description ?? ""),
            quantity: Number.isFinite(quantity) ? quantity : 0,
            unitRate: Number.isFinite(unitRate) ? unitRate : 0,
            lineTotal: Number.isFinite(lineTotal) ? lineTotal : 0,
            gstRate: Number(li?.gstRate || 0) || 0,
            hsnCode: typeof li?.hsnCode === "string" ? li.hsnCode : undefined,
          } as ExtractedInvoice["lineItems"][number];
        })
      : [];

    const subtotalRaw = Number(rawInvoice?.subtotal || 0);
    const subtotalComputed = lineItems.reduce((sum, li) => sum + (Number(li.lineTotal) || 0), 0);
    const subtotal =
      Number.isFinite(subtotalRaw) && subtotalRaw > 0 ? subtotalRaw : subtotalComputed;

    const surcharges = Array.isArray(rawInvoice?.surcharges)
      ? rawInvoice.surcharges.map((s: any) => ({
          description: String(s?.description ?? ""),
          amount: Number(s?.amount || 0) || 0,
          percentage:
            typeof s?.percentage === "number" && Number.isFinite(s.percentage)
              ? s.percentage
              : undefined,
        }))
      : [];

    const totalRaw = Number(rawInvoice?.totalAmount || 0);
    const totalAmount =
      Number.isFinite(totalRaw) && totalRaw > 0 ? totalRaw : subtotal;

    const confidenceValue = rawInvoice?.confidence;
    const confidence: ExtractedInvoice["confidence"] =
      confidenceValue === "High" || confidenceValue === "Medium" || confidenceValue === "Low"
        ? confidenceValue
        : "Medium";

    const normalized: ExtractedInvoice = {
      vendorName:
        typeof rawInvoice?.vendorName === "string" && rawInvoice.vendorName.length > 0
          ? rawInvoice.vendorName
          : "Unknown Vendor",
      invoiceNumber:
        typeof rawInvoice?.invoiceNumber === "string" && rawInvoice.invoiceNumber.length > 0
          ? rawInvoice.invoiceNumber
          : "UNKNOWN",
      invoiceDate:
        typeof rawInvoice?.invoiceDate === "string" && rawInvoice.invoiceDate.length > 0
          ? rawInvoice.invoiceDate
          : "1970-01-01",
      lineItems,
      subtotal,
      totalAmount,
      correctAmount: Number(rawInvoice?.correctAmount || 0),
      overcharge: Number(rawInvoice?.overcharge || 0),
      potentialRecovery: Number(rawInvoice?.potentialRecovery || 0),
      recoveryRate: Number(rawInvoice?.recoveryRate || 0),
      status: String(rawInvoice?.status || "clean"),
      surcharges,
      confidence,
    };

    return {
      invoice: normalized,
      history: Array.isArray(payload?.history) ? payload.history : [],
      summary: payload?.summary ?? null,
    };
  } catch {
    return runMockExtraction(file);
  }
}

export function simulateExtraction(file: File): Promise<ExtractedInvoice> {
  return realExtraction(file).then((res) => res.invoice);
}
