import sharp from 'sharp';

export async function applyMask(imageBuffer: Buffer, maskBuffer: Buffer): Promise<string> {
    const pngBuffer = await sharp(imageBuffer)
        .ensureAlpha()
        .joinChannel(maskBuffer)
        .png()
        .toBuffer();
    return pngBuffer.toString('base64');
}
