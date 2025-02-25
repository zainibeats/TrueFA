import jsQR from 'jsqr';
import type { OTPAuthData } from './types';
import { TOTPManager } from './crypto';

/**
 * Represents a parsed OTP Auth URL structure
 * Follows the otpauth:// URI scheme specification
 */
interface OTPAuthURL {
  /** OTP type (totp) */
  type: string;
  /** Base32 encoded secret key */
  secret: string;
  /** Service provider name */
  issuer: string;
  /** User account identifier */
  account: string;
}

/**
 * Parses an OTP Auth URL into its components
 * 
 * Handles both standard and legacy formats:
 * - otpauth://totp/issuer:account?secret=...&issuer=...
 * - otpauth://totp/label?secret=...&issuer=...
 * 
 * @param url - OTP Auth URL to parse
 * @returns Parsed OTP data or null if invalid
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
 * 
 * @param imageData - Raw image data from canvas
 * @returns Decoded QR code content or null if not found
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
 * Validates a TOTP secret key using the Rust crypto module
 * 
 * @param secret - The secret key to validate
 * @returns Whether the secret is valid Base32
 */
export function validateTOTPSecret(secret: string): boolean {
  return TOTPManager.validateSecret(secret);
} 