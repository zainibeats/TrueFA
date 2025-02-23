import jsQR from 'jsqr';

interface OTPAuthURL {
  type: string;
  secret: string;
  issuer: string;
  account: string;
}

export function parseOTPAuthURL(url: string): OTPAuthURL | null {
  try {
    const uri = new URL(url);
    if (uri.protocol !== 'otpauth:') return null;

    const params = new URLSearchParams(uri.search);
    const secret = params.get('secret');
    const issuer = params.get('issuer') || '';
    
    // Path format: /type/label
    const [, type, label] = uri.pathname.split('/');
    const account = label || 'Unknown';

    if (!secret || !type) return null;

    return {
      type,
      secret,
      issuer,
      account
    };
  } catch {
    return null;
  }
}

export async function decodeQRFromImage(imageData: ImageData): Promise<string | null> {
  const code = jsQR(imageData.data, imageData.width, imageData.height);
  return code?.data || null;
} 