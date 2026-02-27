const express = require("express");
const router = express.Router();
const multer = require("multer");
const sharp = require("sharp");
const { createWorker } = require("tesseract.js");
const db = require("../database");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// =============================
// OCR Preprocess
// =============================
async function preprocessImage(buffer) {
  return await sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .toBuffer();
}

// =============================
// Safe Money Parser
// =============================
function parseAmount(text) {
  if (!text) return 0;

  let cleaned = text
    .replace(/₹/g, "")
    .replace(/Rs/gi, "")
    .replace(/[^0-9.,]/g, "")
    .replace(/,/g, "");

  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

// =============================
// Extract Line Items (Robust)
// =============================
function extractLineItems(text) {
  const lines = text.split(/\r?\n/);
  const items = [];

  for (const line of lines) {
    const match = line.match(/(.+?)\s+(\d+)\s+([\d,]+)\s+([\d,]+)/);

    if (match) {
      const description = match[1].trim();
      const quantity = parseInt(match[2]);
      const unitRate = parseAmount(match[3]);
      const lineTotal = parseAmount(match[4]);

      if (description && quantity > 0 && unitRate > 0 && lineTotal > 0) {
        items.push({
          description,
          quantity,
          unitRate,
          lineTotal
        });
      }
    }
  }

  return items;
}

// =============================
// Parse Invoice Fields
// =============================
function parseInvoice(text) {
  const vendorMatch = text.match(/TEST\s*LOGISTICS/i);
  const vendorName = vendorMatch ? "Test Logistics" : "Unknown Vendor";

  const invoiceNumber =
    (text.match(/Invoice\s*No[:\s]*([A-Z0-9-]+)/i) || [])[1] || "";

  const invoiceDate =
    (text.match(/Invoice\s*Date[:\s]*([\d/-]+)/i) || [])[1] || "";

  const totalMatch =
    text.match(/Total\s*(Invoice)?\s*(Amount)?\s*[:\-]?\s*₹?\s*([\d,]+)/i) || [];

  const totalAmount = parseAmount(totalMatch[3]);

  return {
    vendorName,
    invoiceNumber,
    invoiceDate,
    totalAmount
  };
}

// =============================
// Audit Engine (Production-Grade Per-Line-Item Logic)
// =============================
function runAudit(invoice, vendorContract) {
  const lineItems = invoice.lineItems || [];

  if (!lineItems.length) {
    return {
      status: "extraction_failed",
      overcharge: 0,
      correctAmount: 0,
      recoveryRate: 0,
      finalTotal: 0,
      expectedTotal: 0,
      issues: ["No line items extracted"]
    };
  }

  // STEP 1: Calculate invoice subtotal from LINE TOTAL column
  const invoiceSubtotal = lineItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );

  const invoiceGST = invoiceSubtotal * 0.18;
  const invoiceTotal = invoiceSubtotal + invoiceGST;

  // STEP 2: Apply per-line-item contract rates
  let contractSubtotal = 0;
  const adjustedLineItems = [];

  if (vendorContract && vendorContract.rates) {
    for (const item of lineItems) {
      // Look up contract rate using item.description
      const contractRate = vendorContract.rates[item.description] || null;
      
      if (contractRate !== null) {
        // Use contract rate
        const contractLineTotal = item.quantity * contractRate;
        contractSubtotal += contractLineTotal;
        adjustedLineItems.push({
          ...item,
          contractRate,
          contractLineTotal,
          rateApplied: "contract"
        });
      } else {
        // Use invoice unitRate (no contract rate)
        contractSubtotal += item.lineTotal;
        adjustedLineItems.push({
          ...item,
          contractRate: item.unitRate,
          contractLineTotal: item.lineTotal,
          rateApplied: "invoice"
        });
      }
    }
  } else {
    // No contract - use invoice rates
    contractSubtotal = invoiceSubtotal;
    adjustedLineItems.push(...lineItems.map(item => ({
      ...item,
      contractRate: item.unitRate,
      contractLineTotal: item.lineTotal,
      rateApplied: "invoice"
    })));
  }

  // STEP 3: Calculate contract totals
  const contractGST = contractSubtotal * 0.18;
  const contractTotal = contractSubtotal + contractGST;

  // STEP 4: Compare and calculate overcharge
  let correctTotal = contractTotal;
  let status = "clean";

  if (invoiceTotal > contractTotal) {
    status = "overcharged";
  }

  const overcharge = Math.max(0, invoiceTotal - contractTotal);

  const recoveryRate =
    invoiceTotal > 0
      ? Number(((overcharge / invoiceTotal) * 100).toFixed(2))
      : 0;

  return {
    status,
    overcharge,
    correctAmount: correctTotal,
    recoveryRate,
    finalTotal: invoiceTotal,
    expectedTotal: correctTotal,
    issues: overcharge > 0 ? ["Rate mismatch detected"] : [],
    adjustedLineItems // Include line-by-line breakdown
  };
}

// =============================
// Route
// =============================
router.post("/analyze", upload.single("invoice"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const processedImage = await preprocessImage(req.file.buffer);

    const worker = await createWorker("eng");
    const { data: { text } } = await worker.recognize(processedImage);
    await worker.terminate();

    const parsed = parseInvoice(text);
    parsed.lineItems = extractLineItems(text);

    const vendorKey =
      parsed.vendorName?.toLowerCase().replace(/\s+/g, "") || "";

    const vendorContract = db.getVendorContract(vendorKey);
    const auditResult = runAudit(parsed, vendorContract);

    db.insertInvoice({
      invoiceNumber: parsed.invoiceNumber,
      vendorName: parsed.vendorName,
      totalAmount: auditResult.finalTotal,
      status: auditResult.status,
      overcharge: auditResult.overcharge,
      correctAmount: auditResult.correctAmount,
      recoveryRate: auditResult.recoveryRate,
      lineItems: JSON.stringify(parsed.lineItems),
      extractedData: JSON.stringify(parsed),
      auditResult: JSON.stringify(auditResult)
    });

    return res.json({
      success: true,
      results: [
        {
          invoice: {
            vendorName: parsed.vendorName,
            invoiceNumber: parsed.invoiceNumber,
            invoiceDate: parsed.invoiceDate,
            totalAmount: auditResult.finalTotal,
            correctAmount: auditResult.correctAmount,
            overcharge: auditResult.overcharge,
            potentialRecovery: auditResult.overcharge,
            recoveryRate: auditResult.recoveryRate,
            status: auditResult.status
          },
          lineItems: parsed.lineItems,
          discrepancies: auditResult.issues
        }
      ]
    });

  } catch (error) {
    console.error("ANALYZE ERROR:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;