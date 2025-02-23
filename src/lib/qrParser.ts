import jsQR from 'jsqr';

/**
 * Interface representing a parsed OTP Auth URL
 * Follows the 'otpauth://' URI scheme specification
 * 
 * @interface OTPAuthURL
 * @property {string} type - The OTP type (e.g., 'totp')
 * @property {string} secret - The secret key for OTP generation
 * @property {string} issuer - The service provider or issuer name
 * @property {string} account - The user account identifier
 */
interface OTPAuthURL {
  type: string;
  secret: string;
  issuer: string;
  account: string;
}

/**
 * Parses an OTP Auth URL into its components
 * Handles both standard and legacy formats:
 * - otpauth://totp/issuer:account?secret=...&issuer=...
 * - otpauth://totp/label?secret=...&issuer=...
 * 
 * @param {string} url - The OTP Auth URL to parse
 * @returns {OTPAuthURL | null} Parsed URL components or null if invalid
 * @example
 * const result = parseOTPAuthURL('otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example');
 */
export function parseOTPAuthURL(url: string): OTPAuthURL | null {
  try {
    console.log('Attempting to parse URL:', url);
    const uri = new URL(url);
    console.log('Protocol:', uri.protocol);
    console.log('Pathname:', uri.pathname);
    console.log('Search params:', uri.search);

    if (uri.protocol !== 'otpauth:') {
      console.log('Invalid protocol:', uri.protocol);
      return null;
    }

    const params = new URLSearchParams(uri.search);
    const secret = params.get('secret');
    const issuerParam = params.get('issuer');
    
    // Path format: /totp/label or /totp/issuer:label
    const pathParts = uri.pathname.split('/').filter(Boolean);
    const type = pathParts[0];
    const labelPart = pathParts[1] || '';
    
    // Label might be in format "issuer:account" or just "account"
    const [labelIssuer, account] = labelPart.split(':').map(s => s.trim());
    const issuer = issuerParam || (account ? labelIssuer : '') || '';
    const finalAccount = account || labelIssuer || 'Unknown';

    console.log('Parsed components:', { type, labelPart, secret, issuer, account: finalAccount });
    
    if (!secret || !type) {
      console.log('Missing required fields:', { secret: !!secret, type: !!type });
      return null;
    }

    return {
      type,
      secret,
      issuer,
      account: finalAccount
    };
  } catch (error) {
    console.error('Error parsing OTP Auth URL:', error);
    return null;
  }
}

/**
 * Decodes a QR code from image data using the jsQR library
 * Supports various image formats and sizes
 * 
 * @param {ImageData} imageData - Raw image data from canvas or other source
 * @returns {Promise<string | null>} Decoded QR code content or null if not found
 * @throws {Error} If image data is invalid or processing fails
 * @example
 * const canvas = document.createElement('canvas');
 * const ctx = canvas.getContext('2d');
 * const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
 * const result = await decodeQRFromImage(imageData);
 */
export async function decodeQRFromImage(imageData: ImageData): Promise<string | null> {
  try {
    console.log('Attempting to decode QR code from image:', {
      width: imageData.width,
      height: imageData.height,
      hasData: !!imageData.data
    });
    
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    console.log('QR code decode result:', code ? 'Found code' : 'No code found');
    
    if (code) {
      console.log('Decoded QR data:', code.data);
    }
    
    return code?.data || null;
  } catch (error) {
    console.error('Error decoding QR code:', error);
    return null;
  }
} 