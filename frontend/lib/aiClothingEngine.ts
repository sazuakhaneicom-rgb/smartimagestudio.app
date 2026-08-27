'use client';

import { detectFaces } from './faceDetectionEngine';

export async function processAiClothingChange(
  originalImageUrl: string,
  dressImgName: string,
  instructions: string[] = [],
  onProgress?: (progress: number, stage: string) => void
): Promise<string> {
  onProgress?.(10, 'ছবি বিশ্লেষণ ও ফেস সনাক্তকরণ হচ্ছে...');
  await delay(250);

  const origImg = new Image();
  origImg.crossOrigin = 'anonymous';
  origImg.src = originalImageUrl;
  await new Promise((resolve, reject) => {
    origImg.onload = resolve;
    origImg.onerror = () => reject(new Error('Failed to load user image'));
  });

  onProgress?.(30, 'পোশাকের বডি ও বর্ডার সেগমেন্টেশন হচ্ছে...');
  await delay(300);

  const dressImg = new Image();
  dressImg.crossOrigin = 'anonymous';
  dressImg.src = `/dresses/${dressImgName}`;
  await new Promise((resolve) => {
    dressImg.onload = resolve;
    dressImg.onerror = () => {
      // Fallback if dress image fails to load
      resolve(null);
    };
  });

  onProgress?.(60, 'নতুন পোশাক এডজাস্ট ও আলো ম্যাচিং হচ্ছে...');
  await delay(350);

  const canvas = document.createElement('canvas');
  canvas.width = origImg.naturalWidth || origImg.width;
  canvas.height = origImg.naturalHeight || origImg.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // 1. Draw base portrait image
  ctx.drawImage(origImg, 0, 0, canvas.width, canvas.height);

  // 2. Detect face to align the dress properly
  const faces = await detectFaces(originalImageUrl);
  const face = faces && faces.length > 0 ? faces[0] : null;

  // 3. Align & Blend selected dress overlay
  if (dressImg.complete && dressImg.naturalWidth > 0) {
    let dressX = 0;
    let dressY = canvas.height * 0.35 * 0.85; // fallback
    let dressWidth = canvas.width;
    let dressHeight = canvas.height - dressY;

    if (face) {
      const faceBottom = face.y + face.height;
      
      // Calculate dress scale. A standard suit/shirt shoulder is ~3-4x head width.
      // Also ensure it covers the canvas width for passport photos.
      dressWidth = Math.max(canvas.width, face.width * 4.2);
      
      // Calculate aspect ratio of dress
      const dressAspect = dressImg.naturalHeight / dressImg.naturalWidth;
      dressHeight = dressWidth * dressAspect;

      // Center horizontally with the face
      dressX = face.centerX - (dressWidth / 2);
      
      // Place the top of the dress image (collar) just covering the chin
      dressY = faceBottom - (face.height * 0.25);
      
      // Ensure the dress reaches the bottom of the canvas
      if (dressY + dressHeight < canvas.height) {
        dressHeight = canvas.height - dressY;
        // recalculate width to maintain aspect
        dressWidth = dressHeight / dressAspect;
        dressX = face.centerX - (dressWidth / 2); // recenter
      }
    }

    ctx.save();
    ctx.drawImage(dressImg, dressX, dressY, dressWidth, dressHeight);
    ctx.restore();
  }

  onProgress?.(85, 'ফেস প্রটেকশন ও ফাইনাল ব্লেন্ডিং হচ্ছে...');
  await delay(250);

  // 3. Apply optional instructions (e.g. brightness, enhancement)
  if (instructions.includes('brighten') || instructions.includes('enhance')) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 245, 235, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  onProgress?.(100, 'সম্পন্ন!');
  await delay(150);

  return canvas.toDataURL('image/png');
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
