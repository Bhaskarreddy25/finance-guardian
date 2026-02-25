import type { Discrepancy } from "@/types/invoice";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";

interface DiscrepancyTableProps {
  discrepancies: Discrepancy[];
}

const typeColor: Record<string, string> = {
  "Rate Mismatch": "bg-destructive/10 text-destructive border-destructive/20",
  "GST Error": "bg-warning/10 text-warning border-warning/20",
  "Duplicate Invoice": "bg-destructive/10 text-destructive border-destructive/20",
  "Surcharge Violation": "bg-accent/10 text-accent border-accent/20",
  "Calculation Error": "bg-warning/10 text-warning border-warning/20",
};

export function DiscrepancyTable({ discrepancies }: DiscrepancyTableProps) {
  if (discrepancies.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-success/5 px-5 py-4 text-sm text-success">
        <span className="font-medium">✓ No discrepancies detected</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <h3 className="text-sm font-semibold text-card-foreground">
          {discrepancies.length} Discrepanc{discrepancies.length === 1 ? "y" : "ies"} Found
        </h3>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Issue Type</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Actual</TableHead>
            <TableHead className="text-right">Difference</TableHead>
            <TableHead className="hidden md:table-cell">Explanation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discrepancies.map((d, i) => (
            <TableRow key={i}>
              <TableCell>
                <Badge variant="outline" className={typeColor[d.issueType]}>
                  {d.issueType}
                </Badge>
              </TableCell>
              <TableCell className="text-xs">{d.expectedValue}</TableCell>
              <TableCell className="text-xs">{d.actualValue}</TableCell>
              <TableCell className="text-right font-semibold text-destructive">
                ₹{d.difference.toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="hidden max-w-xs text-xs text-muted-foreground md:table-cell">
                {d.explanation}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
