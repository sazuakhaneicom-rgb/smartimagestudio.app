import type { NextConfig } from "next";

const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://firebasestorage.googleapis.com https://api.deepai.org;
    font-src 'self' data: https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    connect-src 'self' http://127.0.0.1:* http://localhost:* https://*.cloudfunctions.net https://*.firebaseio.com wss://*.firebaseio.com https://staticimgly.com https://unpkg.com https://cdn.jsdelivr.net blob: https://api.deepai.org;
    worker-src 'self' blob:;
`;

const nextConfig: NextConfig = {
  output: 'export',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
        ],
      },
    ]
  },
};

export default nextConfig;
