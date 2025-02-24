import { Buffer } from 'buffer';
import * as nodeCrypto from 'crypto';

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
    try {
      // Get current time window
      const timeWindow = Math.floor(Date.now() / 1000 / this.PERIOD);
      
      // Convert time to buffer
      const timeBuffer = Buffer.alloc(8);
      let bigIntTime = BigInt(timeWindow);
      for (let i = 7; i >= 0; i--) {
        timeBuffer[i] = Number(bigIntTime & BigInt(0xff));
        bigIntTime >>= BigInt(8);
      }
      
      // Convert secret to buffer
      const secretBuffer = this.base32ToBuffer(secret);
      
      // Use Web Crypto API for HMAC
      const key = await crypto.subtle.importKey(
        'raw',
        secretBuffer,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      );
      
      const hmacResult = await crypto.subtle.sign(
        'HMAC',
        key,
        timeBuffer
      );
      
      const hmacArray = new Uint8Array(hmacResult);
      
      // Get offset
      const offset = hmacArray[hmacArray.length - 1] & 0xf;
      
      // Generate 4-byte code
      const code = (
        ((hmacArray[offset] & 0x7f) << 24) |
        ((hmacArray[offset + 1] & 0xff) << 16) |
        ((hmacArray[offset + 2] & 0xff) << 8) |
        (hmacArray[offset + 3] & 0xff)
      ) % 1000000;
      
      // Pad with zeros if needed
      return code.toString().padStart(6, '0');
    } catch (error) {
      console.error('Failed to generate TOTP:', error);
      throw error;
    }
  }

  /**
   * Calculates remaining time in current period
   * @returns number of seconds until next token
   */
  static getRemainingTime(): number {
    const timeWindow = Math.floor(Date.now() / 1000 / this.PERIOD);
    const nextWindow = (timeWindow + 1) * this.PERIOD;
    return nextWindow - Math.floor(Date.now() / 1000);
  }

  /**
   * Validates a Base32 secret key format
   * @param secret - The secret key to validate
   * @returns boolean indicating if secret is valid Base32
   */
  static validateSecret(secret: string): boolean {
    // Remove spaces and convert to uppercase
    const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
    
    // Check if the secret is a valid Base32 string
    return /^[A-Z2-7]+=*$/.test(cleanSecret);
  }

  /**
   * Converts Base32 string to buffer
   * @param base32 - Base32 encoded string
   * @returns Uint8Array of decoded data
   */
  private static base32ToBuffer(base32: string): Uint8Array {
    // Base32 character set (RFC 4648)
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    
    // Remove padding and convert to uppercase
    const cleanBase32 = base32.replace(/=+$/, '').toUpperCase();
    
    // Convert to binary string
    let bits = '';
    for (const char of cleanBase32) {
      const value = charset.indexOf(char);
      if (value === -1) {
        throw new Error('Invalid Base32 character');
      }
      bits += value.toString(2).padStart(5, '0');
    }
    
    // Convert binary string to buffer
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i = 0; i < bytes.length; i++) {
      const byteStr = bits.slice(i * 8, (i + 1) * 8);
      bytes[i] = parseInt(byteStr, 2);
    }
    
    return bytes;
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