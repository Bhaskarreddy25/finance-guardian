/**
 * LAYER 3 & 4 - RAW TEXT STRUCTURING & NUMERIC NORMALIZATION
 * Handles text processing and numeric value normalization
 */
class InvoiceParser {
  /**
   * Helper function to find line by exact label
   * @param {Array} lines - Array of text lines
   * @param {RegExp} labelRegex - Label regex pattern
   * @returns {string|null} - Matching line or null
   */
  static findLineByExactLabel(lines, labelRegex) {
    return lines.find(line => labelRegex.test(line));
  }

  /**
   * Helper function to extract last number from line
   * @param {string} line - Text line
   * @returns {number|null} - Last number or null
   */
  static extractLastNumber(line) {
    if (!line) return null;
    const numbers = line.match(/[\d,]+(\.\d+)?/g);
    if (!numbers) return null;
    return parseFloat(numbers[numbers.length - 1].replace(/,/g, ""));
  }

  /**
   * Extract invoice fields using strict line-based matching
   * @param {string} text - OCR text
   * @returns {Object} - Extracted invoice fields
   */
  static extractInvoiceFields(text) {
    // Split OCR text into lines and trim
    const lines = text.split(/\r?\n/).map(l => l.trim());

    // Filter out problematic lines
    const filteredLines = lines.filter(line => {
      const lowerLine = line.toLowerCase();
      
      // Ignore lines with GSTIN
      if (lowerLine.includes('gstin')) return false;
      
      // Ignore lines that are mostly numeric (table rows)
      const numericChars = line.replace(/[^\d]/g, '').length;
      const totalChars = line.replace(/\s/g, '').length;
      if (totalChars > 0 && numericChars / totalChars > 0.7) return false;
      
      // Ignore table headers
      if (lowerLine.includes('qty') || lowerLine.includes('unit') || lowerLine.includes('rate')) return false;
      
      return true;
    });

    // Extract Subtotal with strict label matching
    const subtotalLine = this.findLineByExactLabel(filteredLines, /^subtotal\b/i);
    const subtotal = this.extractLastNumber(subtotalLine);

    // Extract GST with strict label matching (avoid GSTIN)
    const gstLine = this.findLineByExactLabel(filteredLines, /^gst\s*\(?\d*%?\)?/i);
    const gstAmount = this.extractLastNumber(gstLine);

    // Extract Total with strict label matching (handle split case)
    let totalLine = this.findLineByExactLabel(filteredLines, /^total\b/i);
    
    if (!totalLine) {
      // Handle multi-line case where "Total" and "Invoice Amount" are on different lines
      const totalIndex = filteredLines.findIndex(l => /^total\b/i.test(l));
      if (totalIndex !== -1 && filteredLines[totalIndex + 1]) {
        totalLine = filteredLines[totalIndex] + " " + filteredLines[totalIndex + 1];
      }
    }

    const totalAmount = this.extractLastNumber(totalLine);

    // Extract invoice number with strict pattern
    const invoiceNumberMatch = text.match(
      /Invoice\s*No\s*[:\-]?\s*([A-Za-z0-9\-]+)/i
    );
    const invoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1].trim() : null;

    // Extract invoice date
    const datePatterns = [
      /\b(\d{4}-\d{2}-\d{2})\b/,
      /\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})\b/,
      /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i
    ];
    
    let invoiceDate = null;
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        invoiceDate = match[1].trim();
        break;
      }
    }

    // Return structured parsed invoice
    return {
      vendorName: null, // Will be extracted by separate logic
      invoiceNumber,
      invoiceDate,
      subtotal,
      gstAmount,
      totalAmount,
      // Keep legacy fields for compatibility but mark as deprecated
      totals: totalAmount ? [{ label: 'total', value: totalAmount, original: totalAmount.toString() }] : [],
      subtotals: subtotal ? [{ label: 'subtotal', value: subtotal, original: subtotal.toString() }] : [],
      taxes: gstAmount ? [{ label: 'gst', value: gstAmount, original: gstAmount.toString() }] : [],
      allNumbers: [], // Deprecated - use specific fields
      textBlocks: this.structureTextBlocks(text),
      tableRows: this.extractTableRows(this.structureTextBlocks(text)),
      debugInfo: {
        subtotalLine,
        gstLine,
        totalLine,
        filteredLines: filteredLines.slice(0, 10) // First 10 lines for debugging
      }
    };
  }

  /**
   * Split text into logical blocks preserving structure
   * @param {string} text - OCR text
   * @returns {Array} - Array of text blocks
   */
  static structureTextBlocks(text) {
    if (!text) return [];
    
    // Split by lines while preserving empty lines
    const lines = text.split(/\r?\n/);
    const blocks = [];
    let currentBlock = [];
    
    lines.forEach(line => {
      const trimmed = line.trim();
      
      if (trimmed === '') {
        // Empty line indicates block separation
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
      } else {
        currentBlock.push(trimmed);
      }
    });
    
    // Add last block if it exists
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }
    
    return blocks;
  }

  /**
   * Extract table-like rows from structured text
   * @param {Array} blocks - Text blocks
   * @returns {Array} - Array of table rows
   */
  static extractTableRows(blocks) {
    const tableRows = [];
    
    blocks.forEach(block => {
      block.forEach(line => {
        // Check if line looks like a table row (multiple numeric values)
        const numericValues = this.extractNumericPatterns(line);
        
        if (numericValues.length >= 2) {
          tableRows.push({
            text: line,
            values: numericValues,
            type: 'table_row'
          });
        }
      });
    });
    
    return tableRows;
  }

  /**
   * Extract all numeric patterns from OCR text (DEPRECATED - use extractAmountFromLine)
   * @param {string} text - Raw OCR text
   * @returns {Array} - Array of detected numeric values with metadata
   */
  static extractNumericPatterns(text) {
    if (!text || typeof text !== 'string') return [];
    
    // Enhanced numeric pattern matching
    const patterns = [
      // Currency amounts with symbols (highest priority)
      /(?:₹|INR|\$|USD|€|EUR|£|GBP)?\s?[\d,]+(?:\.\d{1,2})?/gi,
      
      // Large numbers (likely totals/invoices)
      /\b[\d,]{4,}(?:\.\d{1,2})?\b/g,
      
      // Decimal numbers
      /\b[\d,]+\.\d{1,2}\b/g,
      
      // Integer numbers
      /\b[\d,]+\b/g,
      
      // Percentages
      /\b\d+(?:\.\d+)?\s*%/gi
    ];
    
    const extractedNumbers = new Map();
    let matchIndex = 0;
    
    patterns.forEach((pattern, passIndex) => {
      const matches = text.match(pattern) || [];
      
      matches.forEach(match => {
        const position = text.indexOf(match);
        const normalized = this.normalizeNumber(match);
        
        if (normalized !== null && normalized > 0) {
          const key = `${passIndex}-${matchIndex}-${normalized}`;
          extractedNumbers.set(key, {
            value: normalized,
            original: match,
            position,
            pass: passIndex,
            confidence: this.calculateNumericConfidence(match, passIndex),
            context: this.extractContext(text, position)
          });
          matchIndex++;
        }
      });
    });
    
    return Array.from(extractedNumbers.values())
      .sort((a, b) => b.confidence - a.confidence)
      .sort((a, b) => b.value - a.value);
  }

  /**
   * Normalize numeric value with OCR error correction
   * @param {string} value - Raw numeric string
   * @returns {number|null} - Normalized number or null if invalid
   */
  static normalizeNumber(value) {
    if (!value || typeof value !== 'string') return null;
    
    let normalized = value.trim();
    
    // Replace common OCR misreads in numeric context
    normalized = normalized
      .replace(/([0-9])O([0-9])/g, '$10$2') // O between digits -> 0
      .replace(/([0-9])l([0-9])/g, '$11$2') // l between digits -> 1
      .replace(/([0-9])I([0-9])/g, '$11$2') // I between digits -> 1
      .replace(/O([0-9])/g, '0$1') // O before digit -> 0
      .replace(/l([0-9])/g, '1$1') // l before digit -> 1
      .replace(/([0-9])O/g, '$10') // O after digit -> 0
      .replace(/([0-9])l/g, '$11') // l after digit -> 1
      .replace(/([0-9])I/g, '$11'); // I after digit -> 1
    
    // Remove spaces between numeric clusters
    normalized = normalized.replace(/(\d)\s+(\d)/g, '$1$2');
    
    // Remove currency symbols and other non-numeric characters
    normalized = normalized.replace(/[^\d.,-]/g, '');
    
    // Normalize Indian comma format (1,80,360.00 → 180360.00)
    normalized = normalized.replace(/(\d),(\d{2}),(\d{3})/g, '$1$2$3');
    normalized = normalized.replace(/(\d),(\d{3})/g, '$1$2');
    
    // Handle multiple decimal points (keep only the first)
    const decimalParts = normalized.split('.');
    if (decimalParts.length > 2) {
      normalized = decimalParts[0] + '.' + decimalParts.slice(1).join('');
    }
    
    // Remove trailing commas/periods
    normalized = normalized.replace(/[,.]+$/, '');
    
    // Parse to number safely
    const parsed = parseFloat(normalized);
    
    return Number.isFinite(parsed) && parsed > 0 && parsed < 10000000 ? parsed : null;
  }

  /**
   * Extract context around a numeric value
   * @param {string} text - Full text
   * @param {number} position - Position of numeric value
   * @param {number} radius - Context radius in characters
   * @returns {string} - Context string
   */
  static extractContext(text, position, radius = 50) {
    const start = Math.max(0, position - radius);
    const end = Math.min(text.length, position + radius);
    return text.substring(start, end).trim();
  }

  /**
   * Calculate confidence score for numeric extraction
   * @param {string} original - Original matched string
   * @param {number} pass - Pattern pass index
   * @returns {number} - Confidence score (0-100)
   */
  static calculateNumericConfidence(original, pass) {
    let confidence = 50; // Base confidence
    
    // Higher confidence for currency symbols
    if (/^(?:₹|INR|\$|USD|€|EUR|£|GBP)/i.test(original)) {
      confidence += 20;
    }
    
    // Higher confidence for decimal numbers
    if (/\.\d{1,2}$/.test(original)) {
      confidence += 15;
    }
    
    // Higher confidence for larger numbers (likely totals)
    const value = parseFloat(original.replace(/[^\d.]/g, ''));
    if (value >= 1000) {
      confidence += 10;
    }
    
    // Lower confidence for patterns from later passes
    confidence -= pass * 10;
    
    // Penalize common OCR errors
    if (/[OlI]/.test(original)) {
      confidence -= 10;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Find values by label patterns (DEPRECATED - use extractAmountFromLine)
   * @param {string} text - OCR text
   * @param {Array} labels - Array of label patterns
   * @returns {Array} - Matching values with labels
   */
  static findByLabels(text, labels) {
    const matches = [];
    
    labels.forEach(label => {
      const pattern = new RegExp(`(${label})[^\\d]*([\\d,]+(?:\\.\\d{1,2})?)`, 'gi');
      let match;
      
      while ((match = pattern.exec(text)) !== null) {
        const value = this.normalizeNumber(match[2]);
        
        if (value !== null) {
          matches.push({
            label: match[1].toLowerCase(),
            value: value,
            original: match[2],
            position: match.index,
            context: this.extractContext(text, match.index)
          });
        }
      }
    });
    
    return matches;
  }
}

module.exports = InvoiceParser;
