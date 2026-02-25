export interface LineItem {
  description: string;
  quantity: number;
  unitRate: number;
  lineTotal: number;
  gstRate: number;
  hsnCode?: string;
}

export interface ExtractedInvoice {
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  lineItems: LineItem[];
  subtotal: number;
  totalAmount: number;
  surcharges: { description: string; amount: number; percentage?: number }[];
  confidence: "High" | "Medium" | "Low";
}

export interface ContractRateCard {
  approvedRates: Record<string, number>;
  approvedGstRate: number;
  approvedFuelSurchargePercent: number;
  allowedSurchargeTypes?: string[];
}

export type DiscrepancyType =
  | "Rate Mismatch"
  | "GST Error"
  | "Duplicate Invoice"
  | "Surcharge Violation"
  | "Calculation Error";

export interface Discrepancy {
  issueType: DiscrepancyType;
  description: string;
  expectedValue: string;
  actualValue: string;
  difference: number;
  explanation: string;
}

export interface AuditResult {
  invoice: ExtractedInvoice;
  discrepancies: Discrepancy[];
  correctAmount: number;
  overchargeDetected: number;
  riskScore: "Low" | "Medium" | "High";
  isDuplicate: boolean;
}

export interface DashboardMetrics {
  totalInvoicedAmount: number;
  correctAmount: number;
  totalOvercharge: number;
  potentialRecovery: number;
  highRiskVendors: number;
  duplicateInvoices: number;
}
