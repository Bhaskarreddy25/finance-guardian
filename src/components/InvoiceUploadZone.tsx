import { useCallback, useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { realExtraction } from "@/lib/mockExtraction";

interface InvoiceUploadZoneProps {
  onFileSelected: (file: File) => void;
  isProcessing: boolean;
}

export function InvoiceUploadZone({ onFileSelected, isProcessing }: InvoiceUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        onFileSelected(file);
        void (async () => {
          await realExtraction(file);
        })();
      }
    },
    [onFileSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelected(file);
        void (async () => {
          await realExtraction(file);
        })();
      }
    },
    [onFileSelected]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
        isDragging
          ? "border-accent bg-accent/5"
          : "border-border hover:border-accent/50"
      } ${isProcessing ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
      onClick={() => {
        if (!isProcessing) document.getElementById("invoice-upload")?.click();
      }}
    >
      <input
        id="invoice-upload"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />
      {isProcessing ? (
        <>
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-accent" />
          <p className="text-sm font-medium text-foreground">Processing invoice…</p>
          <p className="mt-1 text-xs text-muted-foreground">Extracting data via AI OCR</p>
          <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-secondary">
            <div className="h-full animate-pulse rounded-full bg-accent" style={{ width: "70%" }} />
          </div>
        </>
      ) : (
        <>
          <div className="mb-3 rounded-full bg-secondary p-3">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Drop invoice here or click to upload
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Supports PDF, JPG, PNG
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>AI-powered extraction &amp; audit</span>
          </div>
        </>
      )}
    </div>
  );
}
