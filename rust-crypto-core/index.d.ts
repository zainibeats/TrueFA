declare module 'truefa-crypto-core' {
  /**
   * Secure container for TOTP secrets
   * Automatically wipes memory when garbage collected
   */
  export class SecureSecret {
    /**
     * Creates a new secure secret container from a Base32 string
     * @param base32Secret - The Base32 encoded secret key
     */
    constructor(base32Secret: string);
    
    /**
     * Explicitly clear the secret from memory
     * Proactive memory cleanup for sensitive data
     */
    clear(): void;
  }

  /**
   * Result of a cryptographic operation
   */
  export interface CryptoResult {
    /** Resulting data (encrypted/decrypted content) */
    data: string;
    
    /** Whether the operation was successful */
    success: boolean;
    
    /** Error message if operation failed */
    error?: string;
  }

  /**
   * Raw native module exports
   * For advanced usage only
   */
  export interface NativeModule {
    /** SecureSecret class constructor */
    SecureSecret: typeof SecureSecret;
    
    /** Generate TOTP token (Rust implementation) */
    generate_totp(secret: SecureSecret, timestamp?: number): string;
    
    /** Calculate seconds until next token (Rust implementation) */
    remaining_seconds(): number;
    
    /** Validate Base32 secret format (Rust implementation) */
    validate_base32_secret(secret: string): boolean;
    
    /** Encrypt data with AES-256-GCM (Rust implementation) */
    encrypt_data(data: string, password: string): CryptoResult;
    
    /** Decrypt data with AES-256-GCM (Rust implementation) */
    decrypt_data(encryptedData: string, password: string): CryptoResult;
  }

  /**
   * Generate a TOTP token from a secret key
   * 
   * @param secret - Base32 encoded secret key
   * @param timestamp - Optional timestamp (seconds since epoch)
   * @returns 6-digit TOTP code
   */
  export function generateToken(secret: string, timestamp?: number): string;

  /**
   * Calculate remaining seconds in current time window
   * 
   * @returns Seconds until next token generation
   */
  export function getRemainingTime(): number;

  /**
   * Validate if a string is a valid Base32 secret
   * 
   * @param secret - The secret to validate
   * @returns Whether the secret is valid
   */
  export function validateSecret(secret: string): boolean;

  /**
   * Encrypt data with a password using AES-256-GCM
   * 
   * @param data - Plain text data to encrypt
   * @param password - Password for encryption
   * @returns Result with encrypted data (base64) and status
   */
  export function encrypt(data: string, password: string): CryptoResult;

  /**
   * Decrypt data with a password
   * 
   * @param encryptedData - Base64 encoded encrypted data
   * @param password - Password for decryption
   * @returns Result with decrypted text and status
   */
  export function decrypt(encryptedData: string, password: string): CryptoResult;

  /**
   * Raw native module for advanced use cases
   * May be null if native module couldn't be loaded
   */
  export const nativeModule: NativeModule | null;
} 