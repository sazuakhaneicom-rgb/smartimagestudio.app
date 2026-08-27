export interface PrintSheetConfig {
  sheetSize: '4r' | '6r' | 'a4' | 'letter';
  photoSize: 'passport' | 'visa' | 'epass' | 'birth' | 'stamp';
  showCropMarks: boolean;
  spacing: number; // mm between photos
  backgroundColor: string;
  customCopyCount?: number; // Optional limit on number of copies
}

export const SHEET_DIMENSIONS: Record<string, { w: number; h: number; name: string }> = {
  '4r': { w: 102, h: 152, name: '4R (102×152 mm)' },
  '6r': { w: 152, h: 203, name: '6R (152×203 mm)' },
  'a4': { w: 210, h: 297, name: 'A4 (210×297 mm)' },
  'letter': { w: 216, h: 279, name: 'Letter (216×279 mm)' }
};

export const PHOTO_SIZES_FOR_PRINT: Record<string, { w: number; h: number; name: string }> = {
  'passport': { w: 35, h: 45, name: 'পাসপোর্ট (35×45mm)' },
  'visa': { w: 51, h: 51, name: 'ভিসা (51×51mm)' },
  'epass': { w: 35, h: 45, name: 'ই-পাসপোর্ট (35×45mm)' },
  'birth': { w: 35, h: 45, name: 'জন্ম নিবন্ধন (35×45mm)' },
  'stamp': { w: 25, h: 30, name: 'স্ট্যাম্প সাইজ (25×30mm)' }
};

// Convert mm to pixels at specific DPI
const mmToPx = (mm: number, dpi: number) => Math.round((mm * dpi) / 25.4);

export function calculateCopyCount(config: PrintSheetConfig): { cols: number; rows: number; total: number } {
  const sheet = SHEET_DIMENSIONS[config.sheetSize];
  const photo = PHOTO_SIZES_FOR_PRINT[config.photoSize];
  
  if (!sheet || !photo) return { cols: 0, rows: 0, total: 0 };
  
  // Safe margin of 5mm on all sides
  const margin = 5;
  const availableW = sheet.w - (margin * 2);
  const availableH = sheet.h - (margin * 2);
  
  // Cell size is photo size + spacing
  const cellW = photo.w + config.spacing;
  const cellH = photo.h + config.spacing;
  
  // Calculate how many fit
  const cols = Math.floor((availableW + config.spacing) / cellW);
  const rows = Math.floor((availableH + config.spacing) / cellH);
  
  return {
    cols: Math.max(0, cols),
    rows: Math.max(0, rows),
    total: Math.max(0, cols * rows)
  };
}

export async function generatePrintSheet(
  sourceImage: string,
  config: PrintSheetConfig,
  dpi: number = 300
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const sheet = SHEET_DIMENSIONS[config.sheetSize];
    const photo = PHOTO_SIZES_FOR_PRINT[config.photoSize];
    
    if (!sheet || !photo) {
      reject(new Error('Invalid sheet or photo size'));
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Calculate canvas dimensions in pixels based on DPI
      const canvasW = mmToPx(sheet.w, dpi);
      const canvasH = mmToPx(sheet.h, dpi);
      
      canvas.width = canvasW;
      canvas.height = canvasH;
      
      // Fill background
      ctx.fillStyle = config.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const counts = calculateCopyCount(config);
      if (counts.total === 0) {
        resolve(canvas); // Return empty sheet if nothing fits
        return;
      }
      
      const pxSpacing = mmToPx(config.spacing, dpi);
      const pxPhotoW = mmToPx(photo.w, dpi);
      const pxPhotoH = mmToPx(photo.h, dpi);
      
      // Total grid size
      const gridW = (counts.cols * pxPhotoW) + ((counts.cols - 1) * pxSpacing);
      const gridH = (counts.rows * pxPhotoH) + ((counts.rows - 1) * pxSpacing);
      
      // Center offsets
      const startX = (canvasW - gridW) / 2;
      const startY = (canvasH - gridH) / 2;
      
      // Draw grid
      let drawnCount = 0;
      const targetCount = config.customCopyCount && config.customCopyCount > 0 ? Math.min(config.customCopyCount, counts.total) : counts.total;

      for (let row = 0; row < counts.rows; row++) {
        for (let col = 0; col < counts.cols; col++) {
          if (drawnCount >= targetCount) break;

          const x = startX + col * (pxPhotoW + pxSpacing);
          const y = startY + row * (pxPhotoH + pxSpacing);
          
          // Draw image
          ctx.drawImage(img, x, y, pxPhotoW, pxPhotoH);
          
          // Draw crop marks if requested
          if (config.showCropMarks) {
            ctx.strokeStyle = '#cccccc';
            ctx.lineWidth = 1; // 1px line for print guide
            ctx.strokeRect(x, y, pxPhotoW, pxPhotoH);
          }
          drawnCount++;
        }
        if (drawnCount >= targetCount) break;
      }
      
      resolve(canvas);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for print sheet'));
    };
    
    img.src = sourceImage;
  });
}
