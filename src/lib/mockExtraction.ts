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
    surcharges: [
      { description: "Fuel Surcharge", amount: 2376, percentage: 12 },
    ],
    confidence: "Low",
  },
];

let mockIndex = 0;

export function simulateExtraction(_file: File): Promise<ExtractedInvoice> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const invoice = mockInvoices[mockIndex % mockInvoices.length];
      mockIndex++;
      resolve({ ...invoice });
    }, 2000);
  });
}
