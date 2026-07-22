import sharp from 'sharp';
import { BoundingBox } from './geminiClient';

export async function generateMask(width: number, height: number, box: BoundingBox): Promise<Buffer> {
    // coordinates are 0-1000
    const x = Math.floor((box.xmin / 1000) * width);
    const y = Math.floor((box.ymin / 1000) * height);
    const boxWidth = Math.floor(((box.xmax - box.xmin) / 1000) * width);
    const boxHeight = Math.floor(((box.ymax - box.ymin) / 1000) * height);

    const svg = `
        <svg width="${width}" height="${height}">
            <rect x="${x}" y="${y}" width="${boxWidth}" height="${boxHeight}" fill="white" />
        </svg>
    `;

    return sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([{ input: Buffer.from(svg), blend: 'add' }])
    .png()
    .toBuffer();
}
