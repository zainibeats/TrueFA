import { Buffer } from 'buffer';

/**
 * TOTP (Time-based One-Time Password) implementation
 * Follows RFC 6238 specifications for time-based OTP generation
 */
export class TOTPManager {
  // TOTP configuration constants
  private static readonly DIGITS = 6;      // Length of generated OTP
  private static readonly PERIOD = 30;     // Time step in seconds

  /**
   * Generates a TOTP token for the current time period
   * @param secret - Base32 encoded secret key
   * @returns Promise<string> 6-digit OTP
   */
  static async generateToken(secret: string): Promise<string> {
    const counter = Math.floor(Date.now() / 1000 / this.PERIOD);
    return this.generateTOTP(secret, counter);
  }

  /**
   * Calculates remaining time in current period
   * @returns number of seconds until next token
   */
  static getRemainingTime(): number {
    return this.PERIOD - (Math.floor(Date.now() / 1000) % this.PERIOD);
  }

  /**
   * Validates a Base32 secret key format
   * @param secret - The secret key to validate
   * @returns boolean indicating if secret is valid Base32
   */
  static validateSecret(secret: string): boolean {
    try {
      // Check if it's a valid base32 string (A-Z, 2-7)
      return /^[A-Z2-7]+=*$/.test(secret);
    } catch {
      return false;
    }
  }

  /**
   * Generates TOTP using HMAC-SHA1
   * @param secret - Base32 encoded secret key
   * @param counter - Time-based counter value
   * @returns Promise<string> 6-digit OTP
   */
  private static async generateTOTP(secret: string, counter: number): Promise<string> {
    // Convert secret to buffer and prepare counter
    const key = this.base32ToBuffer(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    // Create HMAC key for signing
    const hmac = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    // Generate HMAC signature
    const signature = await crypto.subtle.sign('HMAC', hmac, counterBuffer);
    const hash = new Uint8Array(signature);
    
    // Dynamic truncation (RFC 4226)
    const offset = hash[hash.length - 1] & 0xf;
    const binary = ((hash[offset] & 0x7f) << 24) |
                  ((hash[offset + 1] & 0xff) << 16) |
                  ((hash[offset + 2] & 0xff) << 8) |
                  (hash[offset + 3] & 0xff);

    // Generate 6-digit token
    const otp = binary % Math.pow(10, this.DIGITS);
    return otp.toString().padStart(this.DIGITS, '0');
  }

  /**
   * Converts Base32 string to buffer
   * @param base32 - Base32 encoded string
   * @returns Uint8Array of decoded data
   */
  private static base32ToBuffer(base32: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const result = [];

    // Process each character, converting to 5-bit chunks
    for (const c of base32.replace(/=+$/, '')) {
      value = (value << 5) | alphabet.indexOf(c);
      bits += 5;

      // Extract complete bytes when available
      if (bits >= 8) {
        result.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return new Uint8Array(result);
  }
}

/**
 * Secure storage implementation using Web Crypto API
 * Provides encryption and decryption using AES-256-GCM
 */
export class SecureStorage {
  // Cryptographic parameters
  private static readonly SALT_LENGTH = 16;     // Salt length in bytes
  private static readonly IV_LENGTH = 12;       // IV length for GCM mode
  private static readonly ALGORITHM = 'AES-GCM'; // Encryption algorithm
  private static readonly KEY_LENGTH = 256;     // Key length in bits
  private static readonly ITERATIONS = 100000;  // PBKDF2 iterations

  /**
   * Encrypts data using AES-256-GCM
   * @param data - String data to encrypt
   * @param password - Password for key derivation
   * @returns Promise<string> Base64 encoded encrypted data
   */
  static async encrypt(data: string, password: string): Promise<string> {
    // Generate cryptographic parameters
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    
    // Derive encryption key and prepare data
    const key = await this.deriveKey(password, salt);
    const encodedData = new TextEncoder().encode(data);
    
    // Encrypt data using AES-GCM
    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      encodedData
    );

    // Combine parameters and encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return Buffer.from(combined).toString('base64');
  }

  /**
   * Decrypts data using AES-256-GCM
   * @param encryptedData - Base64 encoded encrypted data
   * @param password - Password for key derivation
   * @returns Promise<string> Decrypted string data
   */
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    // Extract parameters and encrypted data
    const data = Buffer.from(encryptedData, 'base64');
    const salt = data.slice(0, this.SALT_LENGTH);
    const iv = data.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
    const encrypted = data.slice(this.SALT_LENGTH + this.IV_LENGTH);

    // Derive decryption key
    const key = await this.deriveKey(password, salt);
    
    // Decrypt data using AES-GCM
    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  /**
   * Derives encryption key using PBKDF2
   * @param password - Password for key derivation
   * @param salt - Salt for key derivation
   * @returns Promise<CryptoKey> Derived key for encryption/decryption
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    // Import password as base key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive final key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }
} 