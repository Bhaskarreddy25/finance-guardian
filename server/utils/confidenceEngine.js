/**
 * LAYER 7 & 8 - CONFIDENCE ENGINE & SAFE FALLBACK STRATEGY
 * Comprehensive confidence scoring and safe fallback handling
 */
class ConfidenceEngine {
  /**
   * Calculate comprehensive confidence score for invoice extraction
   * @param {Object} extractionResult - Complete extraction result
   * @param {Object} validationResult - Validation result
   * @returns {Object} - Confidence assessment with scoring details
   */
  static calculateConfidence(extractionResult, validationResult) {
    const scoring = {
      overallScore: 0,
      fieldScores: {},
      qualityIndicators: {},
      riskFactors: [],
      recommendations: [],
      status: 'UNKNOWN'
    };
    
    try {
      // Field availability scoring (40 points total)
      scoring.fieldScores.totalAmount = this.scoreFieldAvailability(extractionResult.totals, 15);
      scoring.fieldScores.subtotal = this.scoreFieldAvailability(extractionResult.subtotals, 12);
      scoring.fieldScores.taxAmount = this.scoreFieldAvailability(extractionResult.taxes, 8);
      scoring.fieldScores.invoiceNumber = this.scoreFieldAvailability(extractionResult.invoiceNumber ? [true] : [], 5);
      
      // Validation scoring (30 points)
      scoring.fieldScores.validation = validationResult.validated ? 30 : Math.max(0, 30 - validationResult.errors.length * 10);
      
      // OCR quality scoring (20 points)
      scoring.fieldScores.ocrQuality = this.scoreOcrQuality(extractionResult);
      
      // Mathematical consistency scoring (10 points)
      scoring.fieldScores.mathConsistency = this.scoreMathConsistency(validationResult);
      
      // Calculate overall score
      scoring.overallScore = Object.values(scoring.fieldScores).reduce((sum, score) => sum + score, 0);
      
      // Determine quality indicators
      scoring.qualityIndicators = this.assessQualityIndicators(extractionResult, validationResult);
      
      // Identify risk factors
      scoring.riskFactors = this.identifyRiskFactors(extractionResult, validationResult);
      
      // Generate recommendations
      scoring.recommendations = this.generateRecommendations(scoring);
      
      // Determine status
      scoring.status = this.determineStatus(scoring.overallScore, validationResult);
      
    } catch (error) {
      console.error('Confidence calculation error:', error);
      scoring.overallScore = 0;
      scoring.status = 'ERROR';
      scoring.riskFactors.push('Confidence calculation failed');
    }
    
    return scoring;
  }

  /**
   * Score field availability
   * @param {Array|boolean} fieldData - Field data or boolean
   * @param {number} maxPoints - Maximum points for this field
   * @returns {number} - Score for this field
   */
  static scoreFieldAvailability(fieldData, maxPoints) {
    if (!fieldData) return 0;
    
    if (Array.isArray(fieldData)) {
      if (fieldData.length === 0) return 0;
      if (fieldData.length === 1) return maxPoints * 0.8;
      return maxPoints; // Multiple values found
    }
    
    if (typeof fieldData === 'boolean') {
      return fieldData ? maxPoints : 0;
    }
    
    return maxPoints * 0.6; // Partial data
  }

  /**
   * Score OCR quality
   * @param {Object} extractionResult - Extraction result
   * @returns {number} - OCR quality score
   */
  static scoreOcrQuality(extractionResult) {
    let score = 10; // Base score
    
    const { allNumbers, textBlocks } = extractionResult;
    
    // Bonus for good numeric extraction
    if (allNumbers && allNumbers.length > 0) {
      score += Math.min(5, allNumbers.length); // Up to 5 points
      
      // Bonus for high-confidence numbers
      const highConfidenceNumbers = allNumbers.filter(n => (n.confidence || 0) > 80);
      score += Math.min(3, highConfidenceNumbers.length); // Up to 3 points
    }
    
    // Bonus for structured text
    if (textBlocks && textBlocks.length > 0) {
      score += Math.min(2, textBlocks.length); // Up to 2 points
    }
    
    return Math.min(20, score);
  }

  /**
   * Score mathematical consistency
   * @param {Object} validationResult - Validation result
   * @returns {number} - Math consistency score
   */
  static scoreMathConsistency(validationResult) {
    if (!validationResult.validationDetails) return 0;
    
    const { difference, tolerance } = validationResult.validationDetails;
    
    if (difference <= tolerance) {
      return 10; // Perfect match
    } else if (difference <= tolerance * 5) {
      return 6; // Close match
    } else if (difference <= tolerance * 10) {
      return 3; // Some match
    } else {
      return 0; // No match
    }
  }

  /**
   * Assess quality indicators
   * @param {Object} extractionResult - Extraction result
   * @param {Object} validationResult - Validation result
   * @returns {Object} - Quality indicators
   */
  static assessQualityIndicators(extractionResult, validationResult) {
    const indicators = {
      hasMultipleTotals: (extractionResult.totals || []).length > 1,
      hasTaxBreakdown: (extractionResult.taxes || []).length > 0,
      hasInvoiceNumber: !!extractionResult.invoiceNumber,
      hasInvoiceDate: !!extractionResult.invoiceDate,
      hasStructuredData: (extractionResult.tableRows || []).length > 0,
      validationPassed: validationResult.validated,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length
    };
    
    return indicators;
  }

  /**
   * Identify risk factors
   * @param {Object} extractionResult - Extraction result
   * @param {Object} validationResult - Validation result
   * @returns {Array} - Array of risk factors
   */
  static identifyRiskFactors(extractionResult, validationResult) {
    const risks = [];
    
    // Validation risks
    if (!validationResult.validated) {
      risks.push('Mathematical validation failed');
    }
    
    if (validationResult.errors.length > 0) {
      risks.push(`Validation errors: ${validationResult.errors.length}`);
    }
    
    // Data completeness risks
    if (!extractionResult.totals || extractionResult.totals.length === 0) {
      risks.push('No total amount detected');
    }
    
    if (!extractionResult.invoiceNumber) {
      risks.push('Invoice number missing');
    }
    
    if (!extractionResult.invoiceDate) {
      risks.push('Invoice date missing');
    }
    
    // Data quality risks
    if (extractionResult.allNumbers && extractionResult.allNumbers.length > 0) {
      const lowConfidenceNumbers = extractionResult.allNumbers.filter(n => (n.confidence || 0) < 50);
      if (lowConfidenceNumbers.length > extractionResult.allNumbers.length * 0.5) {
        risks.push('Many low-confidence numeric values');
      }
    }
    
    // Mathematical risks
    if (validationResult.validationDetails) {
      const { difference, tolerance } = validationResult.validationDetails;
      if (difference > tolerance * 10) {
        risks.push('Large mathematical discrepancy detected');
      }
    }
    
    return risks;
  }

  /**
   * Generate recommendations based on confidence assessment
   * @param {Object} scoring - Confidence scoring
   * @returns {Array} - Array of recommendations
   */
  static generateRecommendations(scoring) {
    const recommendations = [];
    
    if (scoring.overallScore < 50) {
      recommendations.push('Manual review recommended due to low confidence');
    }
    
    if (scoring.fieldScores.totalAmount < 10) {
      recommendations.push('Verify total amount manually');
    }
    
    if (scoring.fieldScores.validation < 20) {
      recommendations.push('Check mathematical calculations');
    }
    
    if (scoring.qualityIndicators.errorCount > 0) {
      recommendations.push('Address validation errors before processing');
    }
    
    if (scoring.riskFactors.includes('Many low-confidence numeric values')) {
      recommendations.push('Consider re-scanning with better image quality');
    }
    
    if (scoring.qualityIndicators.hasTaxBreakdown && scoring.fieldScores.taxAmount < 5) {
      recommendations.push('Review tax calculation accuracy');
    }
    
    return recommendations;
  }

  /**
   * Determine extraction status
   * @param {number} score - Overall confidence score
   * @param {Object} validationResult - Validation result
   * @returns {string} - Status string
   */
  static determineStatus(score, validationResult) {
    if (score >= 80 && validationResult.validated) {
      return 'HIGH_CONFIDENCE';
    } else if (score >= 60) {
      return 'MEDIUM_CONFIDENCE';
    } else if (score >= 40) {
      return 'LOW_CONFIDENCE';
    } else {
      return 'PARTIAL_EXTRACTION';
    }
  }

  /**
   * Create safe fallback response
   * @param {Object} extractionResult - Extraction result
   * @param {Object} validationResult - Validation result
   * @param {Object} confidence - Confidence assessment
   * @returns {Object} - Safe fallback response
   */
  static createSafeFallback(extractionResult, validationResult, confidence) {
    const safeValues = validationResult.safeValues || {};
    
    return {
      status: confidence.status,
      confidenceScore: confidence.overallScore,
      extractedFields: {
        totalAmount: safeValues.totalAmount || 0,
        subtotal: safeValues.subtotal || 0,
        taxAmount: safeValues.taxAmount || 0,
        invoiceNumber: extractionResult.invoiceNumber || null,
        invoiceDate: extractionResult.invoiceDate || null,
        currency: this.detectCurrency(extractionResult.allNumbers)
      },
      missingFields: this.identifyMissingFields(extractionResult),
      warnings: validationResult.warnings,
      errors: validationResult.errors,
      riskFactors: confidence.riskFactors,
      recommendations: confidence.recommendations,
      qualityIndicators: confidence.qualityIndicators,
      fieldScores: confidence.fieldScores,
      validationDetails: validationResult.validationDetails
    };
  }

  /**
   * Identify missing fields
   * @param {Object} extractionResult - Extraction result
   * @returns {Array} - Array of missing field names
   */
  static identifyMissingFields(extractionResult) {
    const missing = [];
    
    if (!extractionResult.totals || extractionResult.totals.length === 0) {
      missing.push('totalAmount');
    }
    
    if (!extractionResult.subtotals || extractionResult.subtotals.length === 0) {
      missing.push('subtotal');
    }
    
    if (!extractionResult.taxes || extractionResult.taxes.length === 0) {
      missing.push('taxAmount');
    }
    
    if (!extractionResult.invoiceNumber) {
      missing.push('invoiceNumber');
    }
    
    if (!extractionResult.invoiceDate) {
      missing.push('invoiceDate');
    }
    
    return missing;
  }

  /**
   * Detect dominant currency from extracted numbers
   * @param {Array} numbers - Extracted numeric values
   * @returns {string} - Currency code
   */
  static detectCurrency(numbers) {
    if (!numbers || numbers.length === 0) return 'INR';
    
    const currencyCounts = {};
    
    numbers.forEach(num => {
      if (num.original) {
        if (num.original.includes('₹') || num.original.includes('INR')) {
          currencyCounts.INR = (currencyCounts.INR || 0) + 1;
        } else if (num.original.includes('$') || num.original.includes('USD')) {
          currencyCounts.USD = (currencyCounts.USD || 0) + 1;
        } else if (num.original.includes('€') || num.original.includes('EUR')) {
          currencyCounts.EUR = (currencyCounts.EUR || 0) + 1;
        }
      }
    });
    
    // Find most frequent currency
    let maxCount = 0;
    let dominantCurrency = 'INR'; // Default
    
    Object.entries(currencyCounts).forEach(([currency, count]) => {
      if (count > maxCount) {
        maxCount = count;
        dominantCurrency = currency;
      }
    });
    
    return dominantCurrency;
  }

  /**
   * Generate user-friendly confidence message
   * @param {Object} confidence - Confidence assessment
   * @returns {string} - User-friendly message
   */
  static generateConfidenceMessage(confidence) {
    const { status, overallScore, riskFactors } = confidence;
    
    switch (status) {
      case 'HIGH_CONFIDENCE':
        return `✅ High confidence extraction (${overallScore}% - All fields validated)`;
      
      case 'MEDIUM_CONFIDENCE':
        return `⚠️ Medium confidence extraction (${overallScore}% - Review recommended)`;
      
      case 'LOW_CONFIDENCE':
        return `❌ Low confidence extraction (${overallScore}% - Manual review required)`;
      
      case 'PARTIAL_EXTRACTION':
        return `🔍 Partial extraction (${overallScore}% - Some fields missing - Review required)`;
      
      default:
        return `❓ Extraction confidence: ${overallScore}% - Status uncertain`;
    }
  }
}

module.exports = ConfidenceEngine;
