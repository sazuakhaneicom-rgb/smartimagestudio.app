import { callWithRotation } from './apiKeyManager';

export interface LayerResponse {
  id: string;
  type: 'background' | 'object' | 'text' | 'clean_bg';
  label: string;
  base64: string; // base64
}

export interface ProcessImageResponse {
  status: string;
  layers: LayerResponse[];
  processing_time_ms: number;
}

export async function processImage(file: File): Promise<ProcessImageResponse> {
  const formData = new FormData();
  formData.append('image', file);

  // In production, this would be your actual Firebase Cloud Function URL
  const CLOUD_FUNCTION_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001/smart-image-73059/us-central1/processImage';

  const response = await callWithRotation(async (apiKey) => {
    return fetch(CLOUD_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Processing failed: ${response.status} - ${errText}`);
  }

  return await response.json();
}
