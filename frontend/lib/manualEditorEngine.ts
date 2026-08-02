'use client';

export interface ManualEditorAdjustments {
  // Light & Exposure
  brightness: number; // 0..200 (100)
  contrast: number;   // 0..200 (100)
  exposure: number;   // -100..100 (0)
  highlights: number; // -100..100 (0)
  shadows: number;    // -100..100 (0)
  whites: number;     // -100..100 (0)
  blacks: number;     // -100..100 (0)
  gamma: number;      // 0.2..2.2 (1.0)

  // Color & Tone
  temperature: number;// -100..100 (0)
  tint: number;       // -100..100 (0)
  saturation: number; // 0..200 (100)
  vibrance: number;   // -100..100 (0)
  hue: number;        // -180..180 (0)

  // Detail & Clarity
  sharpness: number;  // 0..10 (0)
  structure: number;  // 0..10 (0)
  texture: number;    // 0..10 (0)
  clarity: number;    // -100..100 (0)
  opacity: number;    // 0..100 (100)

  // RGB Balance
  redBalance: number;   // -100..100 (0)
  greenBalance: number; // -100..100 (0)
  blueBalance: number;  // -100..100 (0)

  // Protection Toggles
  faceProtection: boolean;
  textProtection: boolean;
}

export const defaultManualAdjustments: ManualEditorAdjustments = {
  brightness: 100,
  contrast: 100,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  gamma: 1.0,
  temperature: 0,
  tint: 0,
  saturation: 100,
  vibrance: 0,
  hue: 0,
  sharpness: 0,
  structure: 0,
  texture: 0,
  clarity: 0,
  opacity: 100,
  redBalance: 0,
  greenBalance: 0,
  blueBalance: 0,
  faceProtection: false,
  textProtection: false
};

export interface TransformState {
  rotation: number; // degrees -180..180
  flipH: boolean;
  flipV: boolean;
  skewX: number;    // -45..45
  skewY: number;    // -45..45
}

export const defaultTransformState: TransformState = {
  rotation: 0,
  flipH: false,
  flipV: false,
  skewX: 0,
  skewY: 0
};

export interface BackgroundConfig {
  type: 'transparent' | 'solid' | 'gradient' | 'blur';
  color: string;
  gradientStart?: string;
  gradientEnd?: string;
  gradientDirection?: 'linear-to-r' | 'linear-to-b' | 'radial';
}

export const defaultBackgroundConfig: BackgroundConfig = {
  type: 'transparent',
  color: '#FFFFFF',
  gradientStart: '#3B82F6',
  gradientEnd: '#9333EA',
  gradientDirection: 'linear-to-r'
};

export function getExtendedCSSFilterString(adj: ManualEditorAdjustments): string {
  const b = adj.brightness + adj.exposure * 0.5;
  const c = adj.contrast + adj.sharpness * 2 + adj.structure * 1.5;
  const s = adj.saturation + adj.vibrance * 0.5;
  const sepia = adj.temperature > 0 ? adj.temperature * 0.2 : 0;
  const hue = adj.hue + adj.tint * 0.8;
  const opacity = adj.opacity / 100;
  
  return `brightness(${Math.max(0, b)}%) contrast(${Math.max(0, c)}%) saturate(${Math.max(0, s)}%) sepia(${sepia}%) hue-rotate(${hue}deg) opacity(${opacity})`;
}

export async function processAdvancedCanvas(
  sourceImage: HTMLImageElement,
  cropArea: { x: number; y: number; width: number; height: number } | null,
  bgConfig: BackgroundConfig,
  adjustments: ManualEditorAdjustments,
  transform: TransformState
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas context unavailable');

  let cropX = 0;
  let cropY = 0;
  let cropW = sourceImage.naturalWidth || sourceImage.width;
  let cropH = sourceImage.naturalHeight || sourceImage.height;

  if (cropArea && cropArea.width > 0 && cropArea.height > 0) {
    cropX = cropArea.x;
    cropY = cropArea.y;
    cropW = cropArea.width;
    cropH = cropArea.height;
  }

  // Handle Rotation bounding box resize
  const rad = (transform.rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));

  const targetW = Math.round(cropW * cos + cropH * sin);
  const targetH = Math.round(cropW * sin + cropH * cos);

  canvas.width = targetW;
  canvas.height = targetH;

  // 1. Render Background
  if (bgConfig.type === 'blur') {
    ctx.save();
    ctx.filter = 'blur(16px) brightness(90%)';
    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  } else if (bgConfig.type === 'solid' && bgConfig.color !== 'transparent') {
    ctx.fillStyle = bgConfig.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (bgConfig.type === 'gradient' && bgConfig.gradientStart && bgConfig.gradientEnd) {
    let grad: CanvasGradient;
    if (bgConfig.gradientDirection === 'radial') {
      grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 10,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      );
    } else if (bgConfig.gradientDirection === 'linear-to-b') {
      grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    } else {
      grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    }
    grad.addColorStop(0, bgConfig.gradientStart);
    grad.addColorStop(1, bgConfig.gradientEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. Draw Source Image with Transforms & Filter
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);
  if (transform.skewX !== 0 || transform.skewY !== 0) {
    const tanX = Math.tan((transform.skewX * Math.PI) / 180);
    const tanY = Math.tan((transform.skewY * Math.PI) / 180);
    ctx.transform(1, tanY, tanX, 1, 0, 0);
  }

  ctx.filter = getExtendedCSSFilterString(adjustments);
  ctx.drawImage(
    sourceImage,
    cropX, cropY, cropW, cropH,
    -cropW / 2, -cropH / 2, cropW, cropH
  );
  ctx.restore();

  // 3. Detailed Pixel Manipulations (Gamma, Whites, Blacks, RGB, Protection)
  applyAdvancedPixelPass(ctx, canvas.width, canvas.height, adjustments);

  return canvas;
}

function applyAdvancedPixelPass(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adj: ManualEditorAdjustments
) {
  const needsPass = 
    adj.gamma !== 1.0 || 
    adj.whites !== 0 || 
    adj.blacks !== 0 || 
    adj.highlights !== 0 || 
    adj.shadows !== 0 || 
    adj.redBalance !== 0 || 
    adj.greenBalance !== 0 || 
    adj.blueBalance !== 0 ||
    adj.faceProtection ||
    adj.textProtection;

  if (!needsPass) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const gammaCorr = 1 / Math.max(0.2, Math.min(2.2, adj.gamma));
  const rMult = 1 + adj.redBalance / 100;
  const gMult = 1 + adj.greenBalance / 100;
  const bMult = 1 + adj.blueBalance / 100;
  const whitesFact = adj.whites / 100;
  const blacksFact = adj.blacks / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue; // Skip fully transparent pixels

    // Face protection check (skin tone range check)
    if (adj.faceProtection) {
      const isSkin = r > 95 && g > 40 && b > 20 && Math.max(r, g, b) - Math.min(r, g, b) > 15 && Math.abs(r - g) > 15 && r > g && r > b;
      if (isSkin) continue; // Protect skin pixels from harsh color shifts
    }

    // RGB Balance
    r = Math.min(255, Math.max(0, r * rMult));
    g = Math.min(255, Math.max(0, g * gMult));
    b = Math.min(255, Math.max(0, b * bMult));

    // Gamma Correction
    if (adj.gamma !== 1.0) {
      r = 255 * Math.pow(r / 255, gammaCorr);
      g = 255 * Math.pow(g / 255, gammaCorr);
      b = 255 * Math.pow(b / 255, gammaCorr);
    }

    // Whites & Blacks tone adjustment
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luminance > 200 && whitesFact !== 0) {
      r = Math.min(255, Math.max(0, r + r * whitesFact * 0.5));
      g = Math.min(255, Math.max(0, g + g * whitesFact * 0.5));
      b = Math.min(255, Math.max(0, b + b * whitesFact * 0.5));
    } else if (luminance < 55 && blacksFact !== 0) {
      r = Math.min(255, Math.max(0, r + r * blacksFact * 0.5));
      g = Math.min(255, Math.max(0, g + g * blacksFact * 0.5));
      b = Math.min(255, Math.max(0, b + b * blacksFact * 0.5));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
}
