'use client';

/**
 * Face Detection Engine for Passport Photo Auto-Crop
 * Uses the browser's native FaceDetector API (Chrome/Edge) 
 * with a canvas-based fallback for unsupported browsers.
 */

export interface FaceRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface PassportCropResult {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  /** Percentage values for ReactCrop */
  percentCrop: {
    x: number;
    y: number;
    width: number;
    height: number;
    unit: '%';
  };
  faceRegion: FaceRegion;
  confidence: number;
}

export interface ICAOGuidelines {
  /** Face should be 70-80% of photo height */
  faceHeightRatio: { min: number; max: number };
  /** Top of head to top of photo margin */
  topMarginRatio: { min: number; max: number };
  /** Eyes should be at roughly 55-65% from bottom */
  eyeLineRatio: { min: number; max: number };
}

export const ICAO_PASSPORT_GUIDELINES: ICAOGuidelines = {
  faceHeightRatio: { min: 0.70, max: 0.80 },
  topMarginRatio: { min: 0.05, max: 0.15 },
  eyeLineRatio: { min: 0.55, max: 0.65 },
};

/**
 * Detect faces in an image using browser's FaceDetector API
 * Falls back to a heuristic-based center crop if not available
 */
export async function detectFaces(imageSource: string): Promise<FaceRegion[]> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = imageSource;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
  });

  // Try native FaceDetector API (Chrome 70+, Edge)
  if ('FaceDetector' in window) {
    try {
      // @ts-ignore - FaceDetector is not in TypeScript's lib
      const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      const faces = await detector.detect(img);
      
      if (faces.length > 0) {
        return faces.map((face: any) => {
          const box = face.boundingBox;
          return {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            centerX: box.x + box.width / 2,
            centerY: box.y + box.height / 2,
          };
        });
      }
    } catch (e) {
      console.warn('FaceDetector API failed, using fallback:', e);
    }
  }

  // Fallback: Skin-tone heuristic detection using canvas pixel analysis
  return detectFacesByHeuristic(img);
}

/**
 * Heuristic-based face detection using skin-tone color analysis
 */
function detectFacesByHeuristic(img: HTMLImageElement): FaceRegion[] {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 400 / Math.max(img.width, img.height));
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Find skin-tone regions
  let sumX = 0, sumY = 0, count = 0;
  let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];

      // Skin tone detection (simplified RGB rule)
      if (isSkinTone(r, g, b)) {
        sumX += x;
        sumY += y;
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count < 100) {
    // Not enough skin pixels found, assume center portrait
    const w = img.width * 0.4;
    const h = img.height * 0.5;
    return [{
      x: (img.width - w) / 2,
      y: img.height * 0.1,
      width: w,
      height: h,
      centerX: img.width / 2,
      centerY: img.height * 0.35,
    }];
  }

  // Scale back to original image coordinates
  const faceX = minX / scale;
  const faceY = minY / scale;
  const faceW = (maxX - minX) / scale;
  const faceH = (maxY - minY) / scale;

  // Estimate actual face region (skin region is usually larger than face)
  // Narrow down to the upper portion which is more likely the face
  const estimatedFaceH = faceH * 0.5;
  const estimatedFaceY = faceY;
  const estimatedFaceW = faceW * 0.6;
  const estimatedFaceX = faceX + (faceW - estimatedFaceW) / 2;

  return [{
    x: estimatedFaceX,
    y: estimatedFaceY,
    width: estimatedFaceW,
    height: estimatedFaceH,
    centerX: estimatedFaceX + estimatedFaceW / 2,
    centerY: estimatedFaceY + estimatedFaceH / 2,
  }];
}

function isSkinTone(r: number, g: number, b: number): boolean {
  // Multiple skin tone detection rules for diverse skin colors
  const isRule1 = r > 95 && g > 40 && b > 20 && 
                  r > g && r > b && 
                  Math.abs(r - g) > 15 && 
                  r - b > 15;
  
  const isRule2 = r > 60 && g > 40 && b > 20 && 
                  r > g - 10 && r > b && 
                  Math.max(r, g, b) - Math.min(r, g, b) > 15;
  
  return isRule1 || isRule2;
}

/**
 * Calculate optimal passport crop based on detected face
 * Following ICAO 9303 guidelines for passport photos
 */
export function calculatePassportCrop(
  face: FaceRegion,
  imageWidth: number,
  imageHeight: number,
  photoAspect: number // w/h ratio, e.g., 35/45 = 0.778
): PassportCropResult {
  const guidelines = ICAO_PASSPORT_GUIDELINES;
  
  // Target: face should be ~75% of the crop height
  const targetFaceRatio = (guidelines.faceHeightRatio.min + guidelines.faceHeightRatio.max) / 2;
  
  // Calculate crop height based on face height
  const cropHeight = face.height / targetFaceRatio;
  const cropWidth = cropHeight * photoAspect;

  // Position: center horizontally on face, position vertically with proper margins
  // Top margin should be ~10% of crop height
  const targetTopMargin = (guidelines.topMarginRatio.min + guidelines.topMarginRatio.max) / 2;
  
  let cropX = face.centerX - cropWidth / 2;
  let cropY = face.y - (cropHeight * targetTopMargin);

  // Clamp to image bounds
  cropX = Math.max(0, Math.min(cropX, imageWidth - cropWidth));
  cropY = Math.max(0, Math.min(cropY, imageHeight - cropHeight));

  // If crop is larger than image, scale down
  let finalCropWidth = Math.min(cropWidth, imageWidth);
  let finalCropHeight = Math.min(cropHeight, imageHeight);

  // Maintain aspect ratio
  if (finalCropWidth / finalCropHeight > photoAspect) {
    finalCropWidth = finalCropHeight * photoAspect;
  } else {
    finalCropHeight = finalCropWidth / photoAspect;
  }

  // Re-center after clamping
  cropX = Math.max(0, Math.min(face.centerX - finalCropWidth / 2, imageWidth - finalCropWidth));
  cropY = Math.max(0, Math.min(face.y - (finalCropHeight * targetTopMargin), imageHeight - finalCropHeight));

  return {
    cropX,
    cropY,
    cropWidth: finalCropWidth,
    cropHeight: finalCropHeight,
    percentCrop: {
      x: (cropX / imageWidth) * 100,
      y: (cropY / imageHeight) * 100,
      width: (finalCropWidth / imageWidth) * 100,
      height: (finalCropHeight / imageHeight) * 100,
      unit: '%',
    },
    faceRegion: face,
    confidence: face.width > 0 ? 0.85 : 0.5,
  };
}

/**
 * Generate ICAO guideline overlay data for rendering on canvas
 */
export function getGuidelineOverlay(
  face: FaceRegion,
  cropWidth: number,
  cropHeight: number,
  cropX: number,
  cropY: number
): {
  eyeLine: number; // Y position relative to crop
  chinLine: number;
  topHeadLine: number;
  centerLine: number; // X position relative to crop
  faceBox: { x: number; y: number; w: number; h: number };
} {
  return {
    eyeLine: (face.centerY - cropY) - face.height * 0.15, // Eyes are ~15% above face center
    chinLine: (face.y + face.height - cropY),
    topHeadLine: (face.y - face.height * 0.15 - cropY), // Head top with hair margin
    centerLine: cropWidth / 2,
    faceBox: {
      x: face.x - cropX,
      y: face.y - cropY,
      w: face.width,
      h: face.height,
    },
  };
}
