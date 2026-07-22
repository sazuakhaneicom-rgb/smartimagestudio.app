export interface EncryptedPayload {
  data: string;
}

export async function encryptApiKey(apiKey: string): Promise<any> {
  // Simple base64 encoding to avoid plaintext in localStorage,
  // real security comes from localStorage origin isolation.
  return { data: btoa(apiKey) };
}

export async function decryptApiKey(payload: any): Promise<string> {
  if (payload && payload.data) {
    return atob(payload.data);
  }
  throw new Error('Key corrupted');
}
