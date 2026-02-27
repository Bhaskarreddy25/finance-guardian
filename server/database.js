const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "invoices.db");
const db = new sqlite3.Database(dbPath);

// =============================
// Create Table
// =============================
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoiceNumber TEXT,
      vendorName TEXT,
      totalAmount REAL,
      status TEXT,
      overcharge REAL,
      correctAmount REAL,
      recoveryRate REAL,
      lineItems TEXT,
      extractedData TEXT,
      auditResult TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// =============================
// Insert Invoice
// =============================
function insertInvoice(data) {
  const sql = `
    INSERT INTO invoices (
      invoiceNumber,
      vendorName,
      totalAmount,
      status,
      overcharge,
      correctAmount,
      recoveryRate,
      lineItems,
      extractedData,
      auditResult
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    data.invoiceNumber,
    data.vendorName,
    data.totalAmount,
    data.status,
    data.overcharge,
    data.correctAmount,
    data.recoveryRate,
    data.lineItems,
    data.extractedData,
    data.auditResult
  ]);
}

// =============================
// Vendor Contract Mock (Per-Line-Item Rates)
// =============================
function getVendorContract(vendorKey) {
  const contracts = {
    testlogistics: {
      rates: {
        "Logistics Charges": 1000,
        "Packaging Material": 500
      }
    }
  };

  return contracts[vendorKey] || null;
}

// =============================
// Export
// =============================
module.exports = {
  insertInvoice,
  getVendorContract
};
