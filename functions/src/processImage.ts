import * as functions from 'firebase-functions';
import * as logger from 'firebase-functions/logger';
import busboy from 'busboy';
import { GeminiClient, DailyQuotaExhaustedError, InvalidKeyError } from './services/geminiClient';
import { generateMask } from './services/maskGenerator';
import { applyMask } from './services/compositor';
import sharp from 'sharp';

export interface ProcessImageResponse {
    status: string;
    layers: Array<{ label: string; type: string; base64: string }>;
    processing_time_ms: number;
}

export const processImage = functions.https.onRequest((req, res) => {
    // Manual CORS — works in all environments (emulator + production)
    res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized: Missing or invalid API key' });
        return;
    }
    const apiKey = authHeader.split('Bearer ')[1];

    if (!req.headers['content-type']?.includes('multipart/form-data')) {
        res.status(400).json({ error: 'Bad Request: Expected multipart/form-data' });
        return;
    }

    const bb = busboy({ headers: req.headers });
    let imageBuffer: Buffer | null = null;
    const startTime = Date.now();

    bb.on('file', (name, file, info) => {
        if (name === 'image') {
            // mimeType captured via info.mimeType but we always convert to JPEG for analysis
            const chunks: Buffer[] = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => {
                imageBuffer = Buffer.concat(chunks);
            });
        } else {
            file.resume();
        }
    });

    bb.on('finish', async () => {
        if (!imageBuffer) {
            res.status(400).json({ error: 'Bad Request: No image provided' });
            return;
        }

        try {
            const client = new GeminiClient(apiKey);
            const metadata = await sharp(imageBuffer).metadata();
            const width = metadata.width || 0;
            const height = metadata.height || 0;

            if (width === 0 || height === 0) {
                res.status(400).json({ error: 'Bad Request: Invalid image dimensions' });
                return;
            }

            // Downscale for Gemini to stay within free-tier token limits
            const analysisBuffer = await sharp(imageBuffer)
                .resize({ width: 1024, height: 1024, fit: 'inside' })
                .jpeg({ quality: 85 })
                .toBuffer();

            const boundingBoxes = await client.analyzeImage(analysisBuffer);

            const layers: Array<{ label: string; type: string; base64: string }> = await Promise.all(
                boundingBoxes.map(async (box) => {
                    const maskBuffer = await generateMask(width, height, box);
                    const base64 = await applyMask(imageBuffer!, maskBuffer);
                    return {
                        label: box.label,
                        type: box.type || 'object',
                        base64
                    };
                })
            );

            // Prepend original image as clean_bg layer
            layers.unshift({
                label: 'Original Background',
                type: 'clean_bg',
                base64: `data:image/jpeg;base64,${imageBuffer!.toString('base64')}`
            });

            const response: ProcessImageResponse = {
                status: 'success',
                layers,
                processing_time_ms: Date.now() - startTime
            };

            res.status(200).json(response);

        } catch (error: any) {
            logger.error('Error processing image:', error.message || error);

            if (error instanceof InvalidKeyError) {
                // Bad API key — frontend should mark key as exhausted and rotate
                res.status(401).json({ error: 'API_KEY_INVALID: Your Gemini API key is invalid or revoked.' });
                return;
            }

            if (error instanceof DailyQuotaExhaustedError) {
                // Daily quota used up — frontend should rotate to a different key
                res.status(402).json({ error: 'DAILY_QUOTA_EXHAUSTED: This API key has used up its daily free-tier quota. Please add a new API key.' });
                return;
            }

            const status = error.status || error.code;
            if (status === 429) {
                // Transient per-minute rate limit — just ask user to wait
                res.status(429).json({ error: 'RATE_LIMIT: All models are temporarily rate-limited. Please wait 1 minute and try again.' });
                return;
            }

            res.status(500).json({ error: `Processing failed: ${error.message || 'Unknown error'}` });
        }
    });

    bb.on('error', (err) => {
        logger.error('Busboy error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    });

    if ((req as any).rawBody) {
        bb.end((req as any).rawBody);
    } else {
        req.pipe(bb);
    }
});
