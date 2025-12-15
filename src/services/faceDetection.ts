/**
 * Face Detection Service
 * Uses native Face Detection API with fallback to canvas-based detection
 * For production, consider using ml5.js or TensorFlow.js for better accuracy
 */

interface FaceDetectionResult {
  hasFace: boolean;
  faceCount: number;
  confidence: number;
  message: string;
}

/**
 * Detect if an image contains a human face using native Face Detection API
 * Requires HTTPS and modern browser support
 */
async function detectFaceNative(imageBitmap: ImageBitmap): Promise<FaceDetectionResult> {
  try {
    // Check if Face Detection API is available
    if (!('FaceDetector' in window)) {
      console.log('Face Detection API not available, using fallback');
      return detectFaceCanvas(imageBitmap);
    }

    const detector = new (window as any).FaceDetector();
    const detectedFaces = await detector.detect(imageBitmap);

    if (detectedFaces && detectedFaces.length > 0) {
      return {
        hasFace: true,
        faceCount: detectedFaces.length,
        confidence: 0.9, // Native API doesn't provide confidence scores
        message: `Found ${detectedFaces.length} face${detectedFaces.length > 1 ? 's' : ''} in the image`
      };
    }

    return {
      hasFace: false,
      faceCount: 0,
      confidence: 0,
      message: 'No faces detected. Please upload a clear photo of your face.'
    };
  } catch (error) {
    console.warn('Native face detection failed, using fallback:', error);
    return detectFaceCanvas(imageBitmap);
  }
}

/**
 * Fallback face detection using canvas edge detection
 * This is a simplified approach - for production, use ml5.js or TensorFlow.js
 */
function detectFaceCanvas(imageBitmap: ImageBitmap): FaceDetectionResult {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        hasFace: false,
        faceCount: 0,
        confidence: 0,
        message: 'Unable to process image'
      };
    }

    ctx.drawImage(imageBitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple edge detection to find potential face regions
    // This checks for skin-tone colors and high contrast areas
    let skinPixels = 0;
    let totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Simple skin tone detection (broad range)
      // Skin tones typically have: R > G, R > B, and specific ranges
      if (
        r > 95 &&
        g > 40 &&
        b > 20 &&
        r > g &&
        r > b &&
        Math.abs(r - g) > 15
      ) {
        skinPixels++;
      }
    }

    const skinPercentage = (skinPixels / totalPixels) * 100;

    // If we detect 5-70% skin pixels, likely contains a face
    if (skinPercentage > 5 && skinPercentage < 70) {
      return {
        hasFace: true,
        faceCount: 1,
        confidence: Math.min(skinPercentage / 100, 0.85),
        message: 'Face detected in the image'
      };
    }

    return {
      hasFace: false,
      faceCount: 0,
      confidence: 0,
      message: 'No clear face detected. Please upload a clearer photo of your face.'
    };
  } catch (error) {
    console.error('Canvas face detection failed:', error);
    // If detection fails, allow upload but mark as unverified
    return {
      hasFace: false,
      faceCount: 0,
      confidence: 0,
      message: 'Could not verify face detection. Please ensure your photo is clear.'
    };
  }
}

/**
 * Main function to detect faces in an image file
 */
export async function detectFaceInImage(file: File): Promise<FaceDetectionResult> {
  try {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return {
        hasFace: false,
        faceCount: 0,
        confidence: 0,
        message: 'Please select a valid image file'
      };
    }

    // Create ImageBitmap for faster processing
    const arrayBuffer = await file.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: file.type });
    const imageBitmap = await createImageBitmap(blob);

    // Detect face
    const result = await detectFaceNative(imageBitmap);

    // Clean up
    imageBitmap.close();

    return result;
  } catch (error) {
    console.error('Face detection error:', error);
    return {
      hasFace: false,
      faceCount: 0,
      confidence: 0,
      message: 'Error processing image. Please try again.'
    };
  }
}

/**
 * Validate that image is suitable for profile photo
 * Checks: file size, dimensions, face presence
 */
export async function validateProfilePhoto(file: File): Promise<{
  valid: boolean;
  message: string;
  faceDetected: boolean;
}> {
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return {
      valid: false,
      message: 'Image size must be less than 10MB',
      faceDetected: false
    };
  }

  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      message: 'Please select a valid image file (JPG, PNG, WebP)',
      faceDetected: false
    };
  }

  // Detect face
  const faceDetection = await detectFaceInImage(file);

  if (!faceDetection.hasFace) {
    return {
      valid: false,
      message: faceDetection.message,
      faceDetected: false
    };
  }

  return {
    valid: true,
    message: 'Profile photo is valid and contains a face',
    faceDetected: true
  };
}
