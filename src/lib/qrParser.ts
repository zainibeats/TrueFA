import jsQR from 'jsqr';
import type { OTPAuthData } from './types';

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
 * @returns {OTPAuthData | null} Parsed OTP data or null if invalid
 * @example
 * const result = parseOTPAuthURL('otpauth://totp/Example:user@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example');
 */
export function parseOTPAuthURL(url: string): OTPAuthData | null {
  try {
    const parsedUrl = new URL(url);
    
    // Validate URL protocol and path
    if (parsedUrl.protocol !== 'otpauth:') return null;
    if (!parsedUrl.pathname.startsWith('//totp/')) return null;

    // Extract account and issuer from path
    const pathParts = parsedUrl.pathname.slice(7).split(':');
    let issuer = '';
    let account = '';

    if (pathParts.length === 2) {
      [issuer, account] = pathParts;
    } else if (pathParts.length === 1) {
      account = pathParts[0];
    } else {
      return null;
    }

    // Get parameters from URL
    const params = parsedUrl.searchParams;
    const secret = params.get('secret');
    const urlIssuer = params.get('issuer');

    // Validate required fields
    if (!secret) return null;
    
    // Use URL issuer parameter if path issuer is not available
    if (!issuer && urlIssuer) {
      issuer = urlIssuer;
    }

    // Clean up issuer and account
    issuer = decodeURIComponent(issuer || urlIssuer || 'Unknown');
    account = decodeURIComponent(account || 'Unknown');

    // Parse optional parameters
    const algorithm = params.get('algorithm') || 'SHA1';
    const digits = parseInt(params.get('digits') || '6', 10);
    const period = parseInt(params.get('period') || '30', 10);

    return {
      type: 'totp',
      account,
      issuer,
      secret,
      algorithm,
      digits,
      period
    };
  } catch (error) {
    console.error('Failed to parse OTP Auth URL:', error);
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
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    return code?.data || null;
  } catch (error) {
    console.error('Failed to decode QR code:', error);
    return null;
  }
}

/**
 * Validates a TOTP secret key
 * Checks if the key is a valid Base32 string
 * 
 * @param {string} secret - The secret key to validate
 * @returns {boolean} Whether the secret is valid
 */
export function validateTOTPSecret(secret: string): boolean {
  // Remove spaces and convert to uppercase
  const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
  
  // Check if the secret is a valid Base32 string
  return /^[A-Z2-7]+=*$/.test(cleanSecret);
} 