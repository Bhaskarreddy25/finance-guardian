const Tesseract = require("tesseract.js");

/**
 * LAYER 2 - TESSERACT OCR ENGINE
 * Handles OCR processing with optimized configuration
 */
class OcrEngine {
  /**
   * Perform OCR with enhanced configuration for invoice processing
   * @param {Buffer} imageBuffer - Preprocessed image buffer
   * @param {Object} options - OCR configuration options
   * @returns {Promise<Object>} - OCR results with text and confidence
   */
  static async recognizeInvoice(imageBuffer, options = {}) {
    try {
      const worker = await Tesseract.createWorker("eng", 1, {
        logger: (m) => {
          if (options.debug) {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        },
      });

      // Configure Tesseract for optimal invoice OCR
      await worker.setParameters({
        // Character whitelist for invoice processing
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,₹$:%-",
        
        // Preserve interword spaces for better structure
        preserve_interword_spaces: "1",
        
        // Page segmentation mode - auto detection
        tessedit_pageseg_mode: "1",
        
        // OCR engine mode - LSTM
        tessedit_ocr_engine_mode: "1",
        
        // Enable table detection
        tessedit_do_create_tsv: "1",
        tessedit_create_hocr: "1",
        
        // Improve character recognition
        textord_force_make_prop_words: "F",
        tessedit_reject_mode: "0",
        
        // Numeric bias settings
        tessedit_ocr_engine_mode: "2",
        tessedit_pageseg_mode: "6"
      });

      // Perform OCR
      const result = await worker.recognize(imageBuffer);
      
      // Clean up worker
      await worker.terminate();

      return {
        text: result.data.text || "",
        confidence: result.data.confidence || 0,
        words: result.data.words || [],
        lines: result.data.lines || [],
        blocks: result.data.blocks || [],
        hocr: result.data.hocr || "",
        tsv: result.data.tsv || ""
      };

    } catch (error) {
      console.error("OCR processing failed:", error);
      throw new Error(`OCR Engine Error: ${error.message}`);
    }
  }

  /**
   * Extract text with table structure preservation
   * @param {Buffer} imageBuffer - Input image buffer
   * @returns {Promise<Object>} - Structured OCR results
   */
  static async extractStructuredText(imageBuffer) {
    try {
      const result = await this.recognizeInvoice(imageBuffer, { debug: false });
      
      // Process lines to preserve structure
      const structuredLines = this.processLines(result.lines);
      const tableData = this.extractTableData(result.tsv);
      
      return {
        rawText: result.text,
        confidence: result.confidence,
        structuredLines,
        tableData,
        words: result.words
      };
    } catch (error) {
      console.error("Structured text extraction failed:", error);
      return {
        rawText: "",
        confidence: 0,
        structuredLines: [],
        tableData: [],
        words: []
      };
    }
  }

  /**
   * Process OCR lines to preserve logical structure
   * @param {Array} lines - OCR line data
   * @returns {Array} - Processed lines with metadata
   */
  static processLines(lines) {
    return lines.map((line, index) => ({
      index,
      text: line.text.trim(),
      confidence: line.confidence || 0,
      words: line.words || [],
      bbox: line.bbox || null,
      baseline: line.baseline || null
    })).filter(line => line.text.length > 0);
  }

  /**
   * Extract table data from TSV output
   * @param {string} tsvData - TSV data from OCR
   * @returns {Array} - Table rows and columns
   */
  static extractTableData(tsvData) {
    try {
      if (!tsvData) return [];
      
      const lines = tsvData.split('\n');
      const tableRows = [];
      
      lines.forEach(line => {
        const columns = line.split('\t');
        if (columns.length > 1) {
          tableRows.push(columns.map(col => col.trim()));
        }
      });
      
      return tableRows;
    } catch (error) {
      console.error("Table data extraction failed:", error);
      return [];
    }
  }

  /**
   * Validate OCR results quality
   * @param {Object} result - OCR results
   * @returns {Object} - Quality assessment
   */
  static validateOcrQuality(result) {
    const { confidence, text, words } = result;
    
    const wordCount = words.length;
    const avgWordConfidence = wordCount > 0 
      ? words.reduce((sum, word) => sum + (word.confidence || 0), 0) / wordCount 
      : 0;
    
    const hasNumbers = /\d/.test(text);
    const hasLetters = /[a-zA-Z]/.test(text);
    const textLength = text.trim().length;
    
    return {
      overallConfidence: confidence,
      averageWordConfidence: avgWordConfidence,
      wordCount,
      textLength,
      hasNumbers,
      hasLetters,
      quality: confidence > 70 ? 'high' : confidence > 50 ? 'medium' : 'low'
    };
  }
}

module.exports = OcrEngine;
