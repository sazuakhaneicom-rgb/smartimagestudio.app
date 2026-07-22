import { GoogleGenAI } from '@google/genai';
import * as logger from 'firebase-functions/logger';

export interface BoundingBox {
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    label: string;
    type: 'object' | 'text';
}

export class DailyQuotaExhaustedError extends Error {
    status = 402; // Custom: "daily quota exhausted" — key should be rotated
    constructor(model: string) {
        super(`DAILY_QUOTA_EXHAUSTED: Daily free-tier quota for ${model} has been exhausted. Rotate to a new API key.`);
    }
}

export class InvalidKeyError extends Error {
    status = 401;
    constructor() {
        super('API_KEY_INVALID');
    }
}

// Only models confirmed working with @google/genai SDK v2 (v1beta API)
const MODEL_CHAIN = [
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
];

const PROMPT = `Analyze this image and return a JSON array identifying all distinct foreground subjects (people, objects, animals, text, logos, products etc.). For each:
- "ymin","xmin","ymax","xmax": normalized integer coordinates 0-1000
- "label": short name
- "type": exactly "object" or "text"`;

const SCHEMA = {
    type: 'ARRAY',
    items: {
        type: 'OBJECT',
        properties: {
            ymin: { type: 'INTEGER' },
            xmin: { type: 'INTEGER' },
            ymax: { type: 'INTEGER' },
            xmax: { type: 'INTEGER' },
            label: { type: 'STRING' },
            type:  { type: 'STRING' }
        },
        required: ['ymin', 'xmin', 'ymax', 'xmax', 'label', 'type']
    }
};

function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms));
}

function isDailyQuota(err: any): boolean {
    const msg = err.message || '';
    const details = JSON.stringify(err.errorDetails || err.details || '');
    return (
        msg.includes('PerDay') ||
        msg.includes('per_day') ||
        details.includes('PerDay') ||
        details.includes('GenerateRequestsPerDayPerProjectPerModel')
    );
}

export class GeminiClient {
    private ai: GoogleGenAI;

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    async analyzeImage(imageBuffer: Buffer): Promise<BoundingBox[]> {
        const b64 = imageBuffer.toString('base64');

        for (const model of MODEL_CHAIN) {
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    logger.info(`Trying model: ${model}, attempt ${attempt}`);

                    const response = await this.ai.models.generateContent({
                        model,
                        contents: [{
                            role: 'user',
                            parts: [
                                { inlineData: { data: b64, mimeType: 'image/jpeg' } },
                                { text: PROMPT }
                            ]
                        }],
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: SCHEMA as any
                        }
                    });

                    if (response.text) {
                        const parsed = JSON.parse(response.text) as BoundingBox[];
                        logger.info(`✓ Success with ${model}: ${parsed.length} objects`);
                        return parsed;
                    }
                    return [];

                } catch (err: any) {
                    const httpStatus = err.status ?? err.code;
                    logger.warn(`✗ ${model} attempt ${attempt} → status ${httpStatus}: ${(err.message || '').substring(0, 150)}`);

                    if (httpStatus === 400 && (err.message || '').includes('API key not valid')) {
                        throw new InvalidKeyError();
                    }

                    if (httpStatus === 429) {
                        // Check: is this a daily quota exhaustion or a per-minute rate limit?
                        if (isDailyQuota(err)) {
                            logger.warn(`${model} daily quota exhausted for this key — signaling key rotation`);
                            throw new DailyQuotaExhaustedError(model);
                        }

                        // Per-minute rate limit — wait then retry same model
                        if (attempt === 1) {
                            logger.info(`${model} per-minute rate limited, waiting 5s...`);
                            await sleep(5000);
                            continue;
                        }
                        // 2nd attempt also rate limited → try next model
                        logger.info(`${model} still rate limited on attempt 2, trying next model...`);
                        break;
                    }

                    if (httpStatus === 404 || (err.message || '').includes('not found')) {
                        logger.info(`${model} not available, skipping...`);
                        break;
                    }

                    // Other error — try next model
                    break;
                }
            }
        }

        // All models exhausted their per-minute limits
        const e: any = new Error('All models are temporarily rate-limited. Please wait 1 minute and try again.');
        e.status = 429;
        e.isTransient = true;
        throw e;
    }
}
