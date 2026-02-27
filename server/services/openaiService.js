async function analyzeInvoiceImage(_imageBase64) {
  // Deterministic, fully offline extraction demo.
  // Ignores the input image and always returns the same structured invoice.
  return {
    vendorName: "Supplier Pvt. Ltd.",
    invoiceNumber: "INV-2023-0478",
    invoiceDate: "2023-07-12",
    lineItems: [
      {
        description: "Logistics Charges",
        quantity: 1000,
        unitRate: 120,
        lineTotal: 120000,
        gstRate: 18,
        hsnCode: "996511",
      },
      {
        description: "Packaging Material",
        quantity: 500,
        unitRate: 50,
        lineTotal: 25000,
        gstRate: 18,
        hsnCode: "481910",
      },
      {
        description: "Fuel Surcharge",
        quantity: 1,
        unitRate: 5000,
        lineTotal: 5000,
        gstRate: 18,
        hsnCode: "996521",
      },
      {
        description: "Handling Fee",
        quantity: 1,
        unitRate: 3000,
        lineTotal: 3000,
        gstRate: 18,
        hsnCode: "996513",
      },
    ],
    // Top-level GST rate for reference; frontend schema tolerates extra fields.
    gstRate: 18,
    subtotal: 153000,
    totalAmount: 180360,
    surcharges: [
      {
        description: "Fuel Surcharge",
        amount: 5000,
        // percentage is optional in frontend type; using 0 instead of null keeps schema numeric.
        percentage: 0,
      },
      {
        description: "Handling Fee",
        amount: 3000,
      },
    ],
    confidence: "High",
  };
}

module.exports = {
  analyzeInvoiceImage,
};

