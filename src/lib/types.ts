/**
 * Represents an authentication account for TOTP generation
 * Contains all necessary information for managing 2FA tokens
 * 
 * @interface AuthAccount
 * @property {string} id - Unique identifier for the account
 * @property {string} name - User account name or email
 * @property {string} issuer - Service provider name (e.g., "Google", "GitHub")
 * @property {string} secret - Base32 encoded secret key for TOTP generation
 * @property {number} createdAt - Unix timestamp of account creation
 */
export interface AuthAccount {
  id: string;
  name: string;
  issuer: string;
  secret: string;
  createdAt: number;
}

/**
 * Result interface for QR code scanning operations
 * Used to handle both successful scans and errors
 * 
 * @interface QRCodeResult
 * @property {string | null} data - Decoded QR code content or null if not found
 * @property {string} [error] - Optional error message if scanning fails
 */
export interface QRCodeResult {
  data: string | null;
  error?: string;
}

/**
 * Interface for parsed OTP authentication data from QR codes or manual entry
 * @interface OTPAuthData
 * @property {string} type - The type of OTP (e.g., 'totp')
 * @property {string} account - The account name or identifier
 * @property {string} issuer - The service provider name
 * @property {string} secret - The secret key for generating codes
 * @property {string} [algorithm='SHA1'] - The hash algorithm to use
 * @property {number} [digits=6] - The number of digits in the generated code
 * @property {number} [period=30] - The time period for code generation in seconds
 */
export interface OTPAuthData {
  type: string;
  account: string;
  issuer: string;
  secret: string;
  algorithm?: string;
  digits?: number;
  period?: number;
} 