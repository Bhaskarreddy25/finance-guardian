import React from "react";
import type { ExtractedInvoice } from "@/types/invoice";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ExtractedDataTableProps {
  invoice: ExtractedInvoice;
}

const confidenceColor = {
  High: "bg-success text-success-foreground",
  Medium: "bg-warning text-warning-foreground",
  Low: "bg-destructive text-destructive-foreground",
};

export function ExtractedDataTable({ invoice }: ExtractedDataTableProps) {
  if (!invoice) return null;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold text-card-foreground">{invoice.vendorName}</h3>
          <p className="text-xs text-muted-foreground">
            {invoice.invoiceNumber} · {invoice.invoiceDate}
          </p>
        </div>
        <Badge className={confidenceColor[invoice.confidence]}>
          {invoice.confidence} Confidence
        </Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Rate</TableHead>
            <TableHead className="text-right">Line Total</TableHead>
            <TableHead className="text-right">GST</TableHead>
            <TableHead>HSN</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(invoice?.lineItems || []).map((item, i) => {
            // Safe expected vs actual calculation for display only
            const hasValidValues = item.quantity != null && item.unitRate != null && item.lineTotal != null;
            const expected = hasValidValues ? item.quantity * item.unitRate : null;
            const difference = hasValidValues ? item.lineTotal - expected : null;
            
            return (
              <React.Fragment key={i}>
                <TableRow>
                  <TableCell className="font-medium">{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">₹{item.unitRate.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right">₹{item.lineTotal.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-right">{item.gstRate}%</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.hsnCode || "—"}</TableCell>
                </TableRow>
                {/* Safe Expected vs Actual Display */}
                {hasValidValues && expected !== null && difference !== null && (
                  <TableRow className="bg-muted/20">
                    <TableCell className="text-xs text-muted-foreground" colSpan={2}>
                      Expected vs Actual
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      Expected: ₹{expected.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      Charged: ₹{item.lineTotal.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium" colSpan={2}>
                      Difference: ₹{difference.toLocaleString("en-IN")}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
          {(invoice?.surcharges || []).map((s, i) => (
            <TableRow key={`s-${i}`} className="bg-muted/30">
              <TableCell className="font-medium text-muted-foreground">
                {s.description} {s.percentage ? `(${s.percentage}%)` : ""}
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right">
                ₹{Number(s?.amount || 0).toLocaleString("en-IN")}
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end gap-6 border-t px-5 py-3 text-sm">
        <span className="text-muted-foreground">
          Subtotal: ₹{Number(invoice?.subtotal || 0).toLocaleString("en-IN")}
        </span>
        {/* Safe GST Display */}
        {(invoice as any)?.gstPercent != null && (invoice as any)?.totalAmount != null && (invoice as any)?.actualSubtotal != null && (
          <span className="text-muted-foreground">
            GST ({(invoice as any)?.gstPercent}%): ₹{Number(((invoice as any)?.totalAmount - (invoice as any)?.actualSubtotal) || 0).toLocaleString("en-IN")}
          </span>
        )}
        <span className="font-semibold">
          Total: ₹{Number(invoice?.totalAmount || 0).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}
