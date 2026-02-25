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
          {invoice.lineItems.map((item, i) => (
            <TableRow key={i}>
              <TableCell className="font-medium">{item.description}</TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">₹{item.unitRate.toLocaleString("en-IN")}</TableCell>
              <TableCell className="text-right">₹{item.lineTotal.toLocaleString("en-IN")}</TableCell>
              <TableCell className="text-right">{item.gstRate}%</TableCell>
              <TableCell className="text-xs text-muted-foreground">{item.hsnCode || "—"}</TableCell>
            </TableRow>
          ))}
          {invoice.surcharges.map((s, i) => (
            <TableRow key={`s-${i}`} className="bg-muted/30">
              <TableCell className="font-medium text-muted-foreground">
                {s.description} {s.percentage ? `(${s.percentage}%)` : ""}
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell className="text-right">₹{s.amount.toLocaleString("en-IN")}</TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end gap-6 border-t px-5 py-3 text-sm">
        <span className="text-muted-foreground">Subtotal: ₹{invoice.subtotal.toLocaleString("en-IN")}</span>
        <span className="font-semibold">Total: ₹{invoice.totalAmount.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}
