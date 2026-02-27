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
  correctAmount: number;
  overcharge: number;
  potentialRecovery: number;
  recoveryRate: number;
  status: string;
  surcharges: { description: string; amount: number; percentage?: number }[];
  confidence: "High" | "Medium" | "Low";
  confidenceScore?: number; // New confidence score
  confidenceLevel?: string; // New confidence level
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
  riskScoreNumber?: number; // New numeric risk score
  riskBreakdown?: {
    duplicateCount: number;
    overchargePercent: number;
    gstMismatchCount: number;
    lineItemErrorCount: number;
  };
}

export interface DashboardMetrics {
  totalInvoicedAmount: number;
  correctAmount: number;
  totalOvercharge: number;
  potentialRecovery: number;
  highRiskVendors: number;
  duplicateInvoices: number;
  savedThisMonth?: number; // New metric
  topRiskVendor?: string; // New metric
  savingsPercentage?: number; // New metric
}

export interface Analytics {
  overchargesByVendor: Record<string, number>;
  errorTypeCounts: Record<string, number>;
  riskDistribution: Record<string, number>;
  trends?: {
    topRiskVendors: { vendor: string; overcharge: number }[];
    overchargePercentByVendor: Record<string, number>;
    monthlyTotals: Record<string, { invoices: number; totalAmount: number; overcharge: number }>;
  };
}
