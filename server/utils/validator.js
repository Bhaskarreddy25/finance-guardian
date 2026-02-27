/**
 * LAYER 6 - VALIDATION ENGINE
 * Mathematical validation and cross-checking of invoice data
 */
class InvoiceValidator {
  /**
   * Validate extracted invoice data mathematically
   * @param {Object} invoiceData - Extracted invoice data
   * @returns {Object} - Validation results
   */
  static validateInvoice(invoiceData) {
    const { totals, subtotals, taxes } = invoiceData;
    
    const validation = {
      validated: false,
      confidenceScore: 0,
      errors: [],
      warnings: [],
      safeValues: {},
      validationDetails: {}
    };
    
    try {
      // Get best values for each category
      const bestTotal = this.getBestValue(totals);
      const bestSubtotal = this.getBestValue(subtotals);
      const totalTax = this.calculateTotalTax(taxes);
      
      validation.safeValues = {
        totalAmount: bestTotal?.value || 0,
        subtotal: bestSubtotal?.value || 0,
        taxAmount: totalTax,
        totalLabel: bestTotal?.label || 'total',
        subtotalLabel: bestSubtotal?.label || 'subtotal',
        taxBreakdown: taxes
      };
      
      // Primary validation: subtotal + tax ≈ total
      const expectedTotal = validation.safeValues.subtotal + validation.safeValues.taxAmount;
      const actualTotal = validation.safeValues.totalAmount;
      const difference = Math.abs(actualTotal - expectedTotal);
      const tolerance = 2; // ±2 tolerance for rounding
      
      validation.validationDetails = {
        expectedTotal,
        actualTotal,
        difference,
        tolerance,
        subtotalFound: bestSubtotal !== null,
        taxFound: totalTax > 0,
        totalFound: bestTotal !== null
      };
      
      if (difference <= tolerance) {
        validation.validated = true;
        validation.confidenceScore = this.calculateConfidence(validation.validationDetails);
      } else if (difference <= tolerance * 5) {
        validation.validated = false;
        validation.confidenceScore = Math.max(40, this.calculateConfidence(validation.validationDetails) - 20);
        validation.warnings.push(`Total mismatch: expected ${expectedTotal}, got ${actualTotal} (diff: ${difference})`);
      } else {
        validation.validated = false;
        validation.confidenceScore = Math.max(20, this.calculateConfidence(validation.validationDetails) - 40);
        validation.errors.push(`Significant total mismatch: expected ${expectedTotal}, got ${actualTotal} (diff: ${difference})`);
        
        // Try fallback strategies
        const fallbackResult = this.applyFallbackStrategies(invoiceData);
        if (fallbackResult.applied) {
          validation.safeValues = { ...validation.safeValues, ...fallbackResult.values };
          validation.warnings.push(`Applied fallback strategy: ${fallbackResult.strategy}`);
          validation.confidenceScore = Math.max(validation.confidenceScore, 50);
        }
      }
      
      // Additional validations
      this.performAdditionalValidations(invoiceData, validation);
      
    } catch (error) {
      validation.errors.push(`Validation error: ${error.message}`);
      validation.confidenceScore = 0;
    }
    
    return validation;
  }

  /**
   * Get the best value from an array of extracted values
   * @param {Array} values - Array of extracted values
   * @returns {Object|null} - Best value or null
   */
  static getBestValue(values) {
    if (!values || values.length === 0) return null;
    
    // Sort by value (highest first) then by confidence
    return values
      .sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        return (b.confidence || 0) - (a.confidence || 0);
      })[0];
  }

  /**
   * Calculate total tax from tax breakdown
   * @param {Array} taxes - Array of tax values
   * @returns {number} - Total tax amount
   */
  static calculateTotalTax(taxes) {
    if (!taxes || taxes.length === 0) return 0;
    
    return taxes.reduce((sum, tax) => sum + tax.value, 0);
  }

  /**
   * Calculate confidence score based on validation results
   * @param {Object} details - Validation details
   * @returns {number} - Confidence score (0-100)
   */
  static calculateConfidence(details) {
    let score = 0;
    
    // Base score for having required fields
    if (details.totalFound) score += 30;
    if (details.subtotalFound) score += 25;
    if (details.taxFound) score += 20;
    
    // Bonus for mathematical validation
    if (details.difference <= details.tolerance) {
      score += 25; // Perfect match
    } else if (details.difference <= details.tolerance * 5) {
      score += 10; // Close match
    }
    
    return Math.min(100, score);
  }

  /**
   * Apply fallback strategies when primary validation fails
   * @param {Object} invoiceData - Extracted invoice data
   * @returns {Object} - Fallback result
   */
  static applyFallbackStrategies(invoiceData) {
    const { totals, subtotals, taxes, allNumbers } = invoiceData;
    
    // Strategy 1: Use highest detected numeric value as total
    if (allNumbers && allNumbers.length > 0) {
      const highestNumber = allNumbers[0]; // Already sorted by value
      
      if (highestNumber.value > 1000) { // Reasonable total threshold
        return {
          applied: true,
          strategy: 'highest_numeric_value',
          values: {
            totalAmount: highestNumber.value,
            totalLabel: 'inferred_total'
          }
        };
      }
    }
    
    // Strategy 2: Try different tax combinations
    if (subtotals && subtotals.length > 0 && taxes && taxes.length > 0) {
      const bestSubtotal = this.getBestValue(subtotals);
      
      // Try using only the largest tax
      const largestTax = taxes.sort((a, b) => b.value - a.value)[0];
      const expectedWithLargestTax = bestSubtotal.value + largestTax.value;
      
      const closestTotal = this.findClosestTotal(totals, expectedWithLargestTax);
      if (closestTotal && Math.abs(closestTotal.value - expectedWithLargestTax) <= 5) {
        return {
          applied: true,
          strategy: 'largest_tax_only',
          values: {
            totalAmount: closestTotal.value,
            taxAmount: largestTax.value
          }
        };
      }
    }
    
    // Strategy 3: Assume standard tax rate (last resort)
    if (subtotals && subtotals.length > 0) {
      const bestSubtotal = this.getBestValue(subtotals);
      
      // Try common tax rates
      const commonRates = [18, 12, 5, 28]; // GST rates
      for (const rate of commonRates) {
        const expectedTax = (bestSubtotal.value * rate) / 100;
        const expectedTotal = bestSubtotal.value + expectedTax;
        
        const closestTotal = this.findClosestTotal(totals, expectedTotal);
        if (closestTotal && Math.abs(closestTotal.value - expectedTotal) <= 5) {
          return {
            applied: true,
            strategy: `assumed_tax_rate_${rate}`,
            values: {
              totalAmount: closestTotal.value,
              taxAmount: expectedTax
            }
          };
        }
      }
    }
    
    return { applied: false, strategy: null, values: {} };
  }

  /**
   * Find closest total value to expected amount
   * @param {Array} totals - Array of total values
   * @param {number} expected - Expected amount
   * @returns {Object|null} - Closest total or null
   */
  static findClosestTotal(totals, expected) {
    if (!totals || totals.length === 0) return null;
    
    return totals.reduce((closest, total) => {
      const currentDiff = Math.abs(total.value - expected);
      const closestDiff = Math.abs(closest.value - expected);
      return currentDiff < closestDiff ? total : closest;
    });
  }

  /**
   * Perform additional validations on invoice data
   * @param {Object} invoiceData - Extracted invoice data
   * @param {Object} validation - Validation object to update
   */
  static performAdditionalValidations(invoiceData, validation) {
    const { invoiceNumber, invoiceDate, totals } = invoiceData;
    
    // Validate invoice number format
    if (!invoiceNumber) {
      validation.warnings.push('Invoice number not found');
    } else if (invoiceNumber.length < 3) {
      validation.warnings.push('Invoice number seems too short');
    }
    
    // Validate invoice date
    if (!invoiceDate) {
      validation.warnings.push('Invoice date not found');
    } else {
      const dateObj = new Date(invoiceDate);
      if (isNaN(dateObj.getTime())) {
        validation.warnings.push('Invalid invoice date format');
      } else {
        // Check for future dates
        const today = new Date();
        if (dateObj > today) {
          validation.warnings.push('Invoice date is in the future');
        }
        
        // Check for very old dates
        const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
        if (dateObj < oneYearAgo) {
          validation.warnings.push('Invoice date is more than one year old');
        }
      }
    }
    
    // Validate total amount reasonableness
    if (validation.safeValues.totalAmount > 0) {
      if (validation.safeValues.totalAmount < 10) {
        validation.warnings.push('Total amount seems unusually low');
      } else if (validation.safeValues.totalAmount > 1000000) {
        validation.warnings.push('Total amount seems unusually high');
      }
    } else {
      validation.errors.push('No valid total amount found');
    }
    
    // Check for duplicate totals
    if (totals && totals.length > 1) {
      const uniqueTotals = new Set(totals.map(t => t.value));
      if (uniqueTotals.size < totals.length) {
        validation.warnings.push('Duplicate total values detected');
      }
    }
  }

  /**
   * Generate validation summary
   * @param {Object} validation - Validation results
   * @returns {string} - Validation summary
   */
  static generateSummary(validation) {
    if (validation.validated) {
      return `✅ Invoice validated with ${validation.confidenceScore}% confidence`;
    } else if (validation.errors.length > 0) {
      return `❌ Validation failed: ${validation.errors[0]}`;
    } else {
      return `⚠️ Low confidence extraction: ${validation.warnings[0]}`;
    }
  }
}

module.exports = InvoiceValidator;
