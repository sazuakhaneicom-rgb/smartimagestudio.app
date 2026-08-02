'use client';

export interface ImageAdjustments {
  brightness: number; // 0..200 (100 is default)
  contrast: number;   // 0..200 (100 is default)
  saturation: number; // 0..200 (100 is default)
  sharpness: number;  // 0..10  (0 is default)
  exposure: number;   // -100..100 (0 is default)
  highlights: number; // -100..100 (0 is default)
  shadows: number;    // -100..100 (0 is default)
  temperature: number;// -100..100 (0 is default, cold to warm)
  tint: number;       // -100..100 (0 is default, green to magenta)
  gamma: number;      // 0.2..2.2 (1.0 is default)
}

export const defaultAdjustments: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  sharpness: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  tint: 0,
  gamma: 1.0
};

export interface ImageMetadata {
  width: number;
  height: number;
  aspectRatio: string;
  fileSizeFormatted: string;
  fileType: string;
}

export type ExportFormat = 'png' | 'jpeg' | 'webp';

export function getCSSFilterString(adj: ImageAdjustments): string {
  const b = adj.brightness + adj.exposure * 0.5;
  const c = adj.contrast + adj.sharpness * 2;
  const s = adj.saturation;
  const sepia = adj.temperature > 0 ? adj.temperature * 0.2 : 0;
  const hue = adj.tint * 0.9;
  
  return `brightness(${Math.max(0, b)}%) contrast(${Math.max(0, c)}%) saturate(${Math.max(0, s)}%) sepia(${sepia}%) hue-rotate(${hue}deg)`;
}

export async function processCanvasPipeline(
  sourceImage: HTMLImageElement,
  cropArea: { x: number; y: number; width: number; height: number } | null,
  bgColor: string,
  adjustments: ImageAdjustments,
  isBlurBg: boolean = false
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context unavailable');

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

  canvas.width = cropW;
  canvas.height = cropH;

  // 1. Draw Background
  if (isBlurBg) {
    ctx.filter = 'blur(12px) brightness(90%)';
    ctx.drawImage(sourceImage, 0, 0, canvas.width, canvas.height);
    ctx.filter = 'none';
  } else if (bgColor && bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 2. Apply CSS Filter & Draw Main Image
  ctx.filter = getCSSFilterString(adjustments);
  ctx.drawImage(
    sourceImage,
    cropX, cropY, cropW, cropH,
    0, 0, cropW, cropH
  );
  ctx.filter = 'none';

  // 3. Pixel-level Adjustments for Gamma, Exposure, Highlights & Shadows
  if (adjNeedsPixelPass(adjustments)) {
    applyPixelAdjustments(ctx, canvas.width, canvas.height, adjustments);
  }

  return canvas;
}

function adjNeedsPixelPass(adj: ImageAdjustments): boolean {
  return adj.gamma !== 1.0 || adj.highlights !== 0 || adj.shadows !== 0;
}

function applyPixelAdjustments(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  adj: ImageAdjustments
) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const gamma = Math.max(0.2, Math.min(2.2, adj.gamma));
  const gammaCorrection = 1 / gamma;
  const highlights = adj.highlights / 100;
  const shadows = adj.shadows / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Gamma
    if (gamma !== 1.0) {
      r = 255 * Math.pow(r / 255, gammaCorrection);
      g = 255 * Math.pow(g / 255, gammaCorrection);
      b = 255 * Math.pow(b / 255, gammaCorrection);
    }

    // Highlights & Shadows
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    if (luminance > 128 && highlights !== 0) {
      const factor = ((luminance - 128) / 127) * highlights;
      r = Math.min(255, Math.max(0, r + r * factor));
      g = Math.min(255, Math.max(0, g + g * factor));
      b = Math.min(255, Math.max(0, b + b * factor));
    } else if (luminance <= 128 && shadows !== 0) {
      const factor = ((128 - luminance) / 128) * shadows;
      r = Math.min(255, Math.max(0, r + r * factor));
      g = Math.min(255, Math.max(0, g + g * factor));
      b = Math.min(255, Math.max(0, b + b * factor));
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imgData, 0, 0);
}

export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  format: ExportFormat = 'png',
  quality: number = 0.95
) {
  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const extension = format === 'jpeg' ? 'jpg' : format;
  const cleanName = filename.endsWith(`.${extension}`) ? filename : `${filename}.${extension}`;

  const dataUrl = canvas.toDataURL(mimeType, quality);
  const link = document.createElement('a');
  link.download = cleanName;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getImageMetadata(
  image: HTMLImageElement,
  file?: File | null
): ImageMetadata {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height) || 1;
  const aspectRatio = `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;

  let fileSizeFormatted = 'Unknown';
  let fileType = 'PNG / WEBP';

  if (file) {
    fileType = file.type.split('/')[1]?.toUpperCase() || 'IMAGE';
    const bytes = file.size;
    if (bytes < 1024) fileSizeFormatted = `${bytes} B`;
    else if (bytes < 1024 * 1024) fileSizeFormatted = `${(bytes / 1024).toFixed(1)} KB`;
    else fileSizeFormatted = `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return {
    width,
    height,
    aspectRatio,
    fileSizeFormatted,
    fileType
  };
}
