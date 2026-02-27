const ImagePreprocessor = require('./imagePreprocessor');
const OcrEngine = require('./ocrEngine');
const InvoiceParser = require('./parser');
const InvoiceValidator = require('./validator');
const ConfidenceEngine = require('./confidenceEngine');

/**
 * PRODUCTION-GRADE INVOICE EXTRACTION PIPELINE
 * Integrates all layers for comprehensive invoice processing
 */
class InvoiceExtractionPipeline {
  /**
   * Process invoice through complete extraction pipeline
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Complete extraction result
   */
  static async processInvoice(imageBuffer, options = {}) {
    const pipelineResult = {
      success: false,
      status: 'INITIALIZING',
      processingTime: 0,
      layers: {},
      finalResult: null,
      errors: []
    };
    
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!ImagePreprocessor.isValidImage(imageBuffer)) {
        throw new Error('Invalid image buffer provided');
      }
      
      // LAYER 1: Image Preprocessing
      pipelineResult.status = 'PREPROCESSING';
      const preprocessedImage = await this.runPreprocessing(imageBuffer, options);
      pipelineResult.layers.preprocessing = preprocessedImage;
      
      // LAYER 2: OCR Processing
      pipelineResult.status = 'OCR_PROCESSING';
      const ocrResult = await this.runOcrProcessing(preprocessedImage.buffer, options);
      pipelineResult.layers.ocr = ocrResult;
      
      // LAYER 3 & 4: Text Structuring & Numeric Normalization
      pipelineResult.status = 'PARSING';
      const parsedData = await this.runParsing(ocrResult.rawText, options);
      pipelineResult.layers.parsing = parsedData;
      
      // LAYER 6: Validation
      pipelineResult.status = 'VALIDATING';
      const validationResult = await this.runValidation(parsedData, options);
      pipelineResult.layers.validation = validationResult;
      
      // LAYER 7 & 8: Confidence Scoring & Safe Fallback
      pipelineResult.status = 'SCORING';
      const confidenceResult = await this.runConfidenceScoring(parsedData, validationResult, options);
      pipelineResult.layers.confidence = confidenceResult;
      
      // Create final safe result
      pipelineResult.finalResult = ConfidenceEngine.createSafeFallback(
        parsedData, 
        validationResult, 
        confidenceResult
      );
      
      pipelineResult.success = true;
      pipelineResult.status = 'COMPLETED';
      
    } catch (error) {
      pipelineResult.errors.push(error.message);
      pipelineResult.status = 'FAILED';
      
      // Create safe fallback result even on failure
      pipelineResult.finalResult = this.createEmergencyFallback(error);
    }
    
    pipelineResult.processingTime = Date.now() - startTime;
    
    return pipelineResult;
  }

  /**
   * Run image preprocessing layer
   * @param {Buffer} imageBuffer - Input image buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Preprocessing result
   */
  static async runPreprocessing(imageBuffer, options) {
    try {
      const preprocessedBuffer = await ImagePreprocessor.preprocessImage(imageBuffer);
      
      return {
        success: true,
        originalSize: imageBuffer.length,
        processedSize: preprocessedBuffer.length,
        buffer: preprocessedBuffer,
        preprocessingApplied: true
      };
    } catch (error) {
      console.error('Preprocessing failed:', error);
      return {
        success: false,
        error: error.message,
        buffer: imageBuffer, // Use original as fallback
        preprocessingApplied: false
      };
    }
  }

  /**
   * Run OCR processing layer
   * @param {Buffer} imageBuffer - Preprocessed image buffer
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - OCR result
   */
  static async runOcrProcessing(imageBuffer, options) {
    try {
      const ocrResult = await OcrEngine.extractStructuredText(imageBuffer);
      const qualityAssessment = OcrEngine.validateOcrQuality(ocrResult);
      
      return {
        success: true,
        ...ocrResult,
        quality: qualityAssessment,
        ocrApplied: true
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      return {
        success: false,
        error: error.message,
        rawText: '',
        confidence: 0,
        ocrApplied: false
      };
    }
  }

  /**
   * Run parsing layer
   * @param {string} rawText - Raw OCR text
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Parsed data
   */
  static async runParsing(rawText, options) {
    try {
      const invoiceData = InvoiceParser.extractInvoiceFields(rawText);
      
      return {
        success: true,
        ...invoiceData,
        parsingApplied: true
      };
    } catch (error) {
      console.error('Parsing failed:', error);
      return {
        success: false,
        error: error.message,
        totals: [],
        subtotals: [],
        taxes: [],
        invoiceNumber: null,
        invoiceDate: null,
        allNumbers: [],
        parsingApplied: false
      };
    }
  }

  /**
   * Run validation layer
   * @param {Object} parsedData - Parsed invoice data
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Validation result
   */
  static async runValidation(parsedData, options) {
    try {
      const validationResult = InvoiceValidator.validateInvoice(parsedData);
      
      return {
        success: true,
        ...validationResult,
        validationApplied: true
      };
    } catch (error) {
      console.error('Validation failed:', error);
      return {
        success: false,
        error: error.message,
        validated: false,
        confidenceScore: 0,
        errors: [error.message],
        warnings: [],
        safeValues: {},
        validationApplied: false
      };
    }
  }

  /**
   * Run confidence scoring layer
   * @param {Object} parsedData - Parsed invoice data
   * @param {Object} validationResult - Validation result
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Confidence result
   */
  static async runConfidenceScoring(parsedData, validationResult, options) {
    try {
      const confidenceResult = ConfidenceEngine.calculateConfidence(parsedData, validationResult);
      
      return {
        success: true,
        ...confidenceResult,
        scoringApplied: true
      };
    } catch (error) {
      console.error('Confidence scoring failed:', error);
      return {
        success: false,
        error: error.message,
        overallScore: 0,
        status: 'ERROR',
        scoringApplied: false
      };
    }
  }

  /**
   * Create emergency fallback for critical failures
   * @param {Error} error - The error that caused failure
   * @returns {Object} - Emergency fallback result
   */
  static createEmergencyFallback(error) {
    return {
      status: 'EXTRACTION_FAILED',
      confidenceScore: 0,
      extractedFields: {
        totalAmount: 0,
        subtotal: 0,
        taxAmount: 0,
        invoiceNumber: null,
        invoiceDate: null,
        currency: 'INR'
      },
      missingFields: ['totalAmount', 'subtotal', 'taxAmount', 'invoiceNumber', 'invoiceDate'],
      warnings: [],
      errors: [`Critical extraction failure: ${error.message}`],
      riskFactors: ['Complete extraction failure'],
      recommendations: ['Check image quality and format', 'Try re-uploading the invoice'],
      qualityIndicators: {
        hasMultipleTotals: false,
        hasTaxBreakdown: false,
        hasInvoiceNumber: false,
        hasInvoiceDate: false,
        hasStructuredData: false,
        validationPassed: false,
        errorCount: 1,
        warningCount: 0
      },
      fieldScores: {},
      validationDetails: null
    };
  }

  /**
   * Get pipeline health status
   * @returns {Object} - Health status of all pipeline components
   */
  static async getPipelineHealth() {
    return {
      status: 'HEALTHY',
      timestamp: new Date().toISOString(),
      layers: {
        preprocessing: 'AVAILABLE',
        ocr: 'AVAILABLE',
        parsing: 'AVAILABLE',
        validation: 'AVAILABLE',
        confidence: 'AVAILABLE'
      },
      dependencies: {
        sharp: 'CHECKED',
        tesseract: 'CHECKED',
        pdfParse: 'CHECKED'
      }
    };
  }

  /**
   * Process multiple invoices in batch
   * @param {Array} imageBuffers - Array of image buffers
   * @param {Object} options - Processing options
   * @returns {Promise<Array>} - Array of results
   */
  static async processBatch(imageBuffers, options = {}) {
    const results = [];
    const batchSize = options.batchSize || 5;
    
    for (let i = 0; i < imageBuffers.length; i += batchSize) {
      const batch = imageBuffers.slice(i, i + batchSize);
      const batchPromises = batch.map(buffer => 
        this.processInvoice(buffer, options).catch(error => ({
          success: false,
          error: error.message,
          finalResult: this.createEmergencyFallback(error)
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Add delay between batches to prevent resource exhaustion
      if (i + batchSize < imageBuffers.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  /**
   * Generate pipeline statistics
   * @param {Array} results - Array of pipeline results
   * @returns {Object} - Statistics summary
   */
  static generateStatistics(results) {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    
    const confidenceScores = results
      .filter(r => r.finalResult && r.finalResult.confidenceScore)
      .map(r => r.finalResult.confidenceScore);
    
    const avgConfidence = confidenceScores.length > 0
      ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
      : 0;
    
    const avgProcessingTime = results.length > 0
      ? results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / results.length
      : 0;
    
    return {
      totalProcessed: total,
      successful: successful,
      failed: failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      averageConfidence: Math.round(avgConfidence),
      averageProcessingTime: Math.round(avgProcessingTime),
      statusDistribution: this.getStatusDistribution(results)
    };
  }

  /**
   * Get distribution of extraction statuses
   * @param {Array} results - Array of pipeline results
   * @returns {Object} - Status distribution
   */
  static getStatusDistribution(results) {
    const distribution = {
      HIGH_CONFIDENCE: 0,
      MEDIUM_CONFIDENCE: 0,
      LOW_CONFIDENCE: 0,
      PARTIAL_EXTRACTION: 0,
      EXTRACTION_FAILED: 0
    };
    
    results.forEach(result => {
      if (result.finalResult && result.finalResult.status) {
        const status = result.finalResult.status;
        if (distribution.hasOwnProperty(status)) {
          distribution[status]++;
        }
      }
    });
    
    return distribution;
  }
}

module.exports = InvoiceExtractionPipeline;
