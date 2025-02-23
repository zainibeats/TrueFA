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