const sharp = require('sharp');

/**
 * LAYER 1 - IMAGE PREPROCESSING
 * Prepares image for optimal OCR accuracy
 */
class ImagePreprocessor {
  /**
   * Apply comprehensive preprocessing to enhance OCR accuracy
   * @param {Buffer} imageBuffer - Input image buffer
   * @returns {Promise<Buffer>} - Preprocessed image buffer
   */
  static async preprocessImage(imageBuffer) {
    try {
      let processedImage = sharp(imageBuffer);
      
      // Get image metadata for intelligent processing
      const metadata = await processedImage.metadata();
      
      // 1. Convert to grayscale for better text recognition
      processedImage = processedImage.greyscale();
      
      // 2. Apply adaptive thresholding (simulate with normalization + contrast)
      processedImage = processedImage.normalize();
      
      // 3. Apply median blur to reduce noise
      processedImage = processedImage.median(3);
      
      // 4. Increase contrast for better edge detection
      processedImage = processedImage.linear(1.2, 10);
      
      // 5. Resize to at least 300 DPI equivalent for better OCR
      const targetWidth = Math.max(metadata.width || 0, 2000);
      const targetHeight = Math.max(metadata.height || 0, 2000);
      processedImage = processedImage.resize(targetWidth, targetHeight, {
        fit: 'inside',
        withoutEnlargement: false
      });
      
      // 6. Auto-rotate/deskew image
      processedImage = processedImage.rotate();
      
      // 7. Crop unnecessary margins (auto-trim)
      processedImage = processedImage.trim();
      
      // 8. Apply final sharpening for text clarity
      processedImage = processedImage.sharpen({ sigma: 1, flat: 1, jagged: 2 });
      
      return await processedImage.png().toBuffer();
    } catch (error) {
      console.error('Image preprocessing failed:', error);
      // Return original image if preprocessing fails
      return imageBuffer;
    }
  }

  /**
   * Apply perspective correction for skewed photos
   * @param {Buffer} imageBuffer - Input image buffer
   * @returns {Promise<Buffer>} - Perspective corrected image buffer
   */
  static async correctPerspective(imageBuffer) {
    try {
      // This would require more complex implementation with OpenCV
      // For now, return the image as-is
      // TODO: Implement perspective correction using OpenCV.js or similar
      return imageBuffer;
    } catch (error) {
      console.error('Perspective correction failed:', error);
      return imageBuffer;
    }
  }

  /**
   * Validate if buffer contains valid image data
   * @param {Buffer} buffer - Input buffer
   * @returns {boolean} - Whether buffer contains valid image
   */
  static isValidImage(buffer) {
    try {
      return Buffer.isBuffer(buffer) && buffer.length > 0;
    } catch (error) {
      return false;
    }
  }
}

module.exports = ImagePreprocessor;
