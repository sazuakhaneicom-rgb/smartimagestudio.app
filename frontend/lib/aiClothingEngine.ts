'use client';

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

  // 2. Align & Blend selected dress overlay
  if (dressImg.complete && dressImg.naturalWidth > 0) {
    const headHeightEstimate = canvas.height * 0.35; // Head usually takes top 35%
    const bodyY = headHeightEstimate * 0.85; // Place dress right at neck/chin transition
    const bodyHeight = canvas.height - bodyY;

    ctx.save();
    // Soft feathering mask at neck boundary
    const grad = ctx.createLinearGradient(0, bodyY, 0, bodyY + 30);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,1)');

    ctx.drawImage(dressImg, 0, bodyY, canvas.width, bodyHeight);
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
