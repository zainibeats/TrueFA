import { Buffer } from 'buffer';

/**
 * Rust crypto module integration
 * 
 * This file provides TypeScript interfaces to the native Rust crypto module
 * with a Web Crypto API fallback for environments where the native module
 * is not available (browser, development, etc.)
 */

// Dynamic import for our Rust module
let rustCrypto: any = null;
let isCryptoInitialized = false;

// Debug helper to log which implementation is being used - disabled in production
function debugCrypto(message: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CRYPTO-DEBUG] ${message}`);
  }
}

/**
 * Result interface matching the Rust module's return format
 */
interface CryptoResult {
  /** Resulting data (encrypted/decrypted) */
  data: string;
  /** Whether the operation succeeded */
  success: boolean;
  /** Optional error message */
  error?: string;
}

/**
 * Browser fallback implementation using Web Crypto API
 * Used when the Rust module is unavailable
 */
const browserFallback = {
  /**
   * Generate a TOTP token using Web Crypto API
   * @param secret - Base32 encoded secret
   * @returns 6-digit OTP code
   */
  generateToken: async (secret: string): Promise<string> => {
    debugCrypto("Using browser fallback for token generation");
    
    // TOTP configuration constants
    const DIGITS = 6;
    const PERIOD = 30;
    
    // Get current time window
    const timeWindow = Math.floor(Date.now() / 1000 / PERIOD);
    
    // Convert time to buffer
    const timeBuffer = new Uint8Array(8);
    let bigIntTime = BigInt(timeWindow);
    for (let i = 7; i >= 0; i--) {
      timeBuffer[i] = Number(bigIntTime & BigInt(0xff));
      bigIntTime >>= BigInt(8);
    }
    
    // Convert secret to buffer
    const secretBuffer = base32ToBuffer(secret);
    
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
  },
  
  /**
   * Calculate remaining seconds in current period
   * @returns Number of seconds until next token
   */
  getRemainingTime: (): number => {
    debugCrypto("Using browser fallback for remaining time");
    const PERIOD = 30;
    const now = Math.floor(Date.now() / 1000);
    const timeWindow = Math.floor(now / PERIOD);
    const nextWindow = (timeWindow + 1) * PERIOD;
    return nextWindow - now;
  },
  
  /**
   * Validate a Base32 secret
   * @param secret - The secret to validate
   * @returns Whether the secret is valid
   */
  validateSecret: (secret: string): boolean => {
    debugCrypto("Using browser fallback for secret validation");
    const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
    return /^[A-Z2-7]+=*$/.test(cleanSecret);
  },
  
  /**
   * Encrypt data using AES-GCM
   * @param data - Plain text to encrypt
   * @param password - Password for encryption
   * @returns Encryption result with data and status
   */
  encrypt: async (data: string, password: string): Promise<CryptoResult> => {
    debugCrypto("Using browser fallback for encryption");
    try {
      // Generate salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Derive key using PBKDF2
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 210000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      // Encrypt data
      const encryptedContent = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        new TextEncoder().encode(data)
      );
      
      // Combine salt, iv, and encrypted data
      const result = new Uint8Array(salt.length + iv.length + new Uint8Array(encryptedContent).length);
      result.set(salt, 0);
      result.set(iv, salt.length);
      result.set(new Uint8Array(encryptedContent), salt.length + iv.length);
      
      return {
        data: Buffer.from(result).toString('base64'),
        success: true
      };
    } catch (error) {
      console.error('Browser encryption error:', error);
      return {
        data: '',
        success: false,
        error: `Encryption failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  },
  
  /**
   * Decrypt data using AES-GCM
   * @param encryptedData - Base64 encoded encrypted data
   * @param password - Password for decryption
   * @returns Decryption result with data and status
   */
  decrypt: async (encryptedData: string, password: string): Promise<CryptoResult> => {
    debugCrypto("Using browser fallback for decryption");
    try {
      // Decode base64
      const data = Buffer.from(encryptedData, 'base64');
      
      // Extract salt, iv, and ciphertext
      const salt = data.slice(0, 16);
      const iv = data.slice(16, 28);
      const ciphertext = data.slice(28);
      
      // Derive key
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt,
          iterations: 210000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      // Decrypt data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv
        },
        key,
        ciphertext
      );
      
      return {
        data: new TextDecoder().decode(decrypted),
        success: true
      };
    } catch (error) {
      console.error('Browser decryption error:', error);
      return {
        data: '',
        success: false,
        error: 'Decryption failed: wrong password'
      };
    }
  }
};

/**
 * Base32 to buffer conversion helper
 * @param base32 - Base32 encoded string
 * @returns Decoded bytes as Uint8Array
 */
function base32ToBuffer(base32: string): Uint8Array {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleanBase32 = base32.replace(/\s/g, '').toUpperCase();
  
  let bits = '';
  for (const char of cleanBase32) {
    const value = charset.indexOf(char);
    if (value === -1) {
      throw new Error('Invalid Base32 character');
    }
    bits += value.toString(2).padStart(5, '0');
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    const byteStr = bits.slice(i * 8, (i + 1) * 8);
    bytes[i] = parseInt(byteStr, 2);
  }
  
  return bytes;
}

/**
 * Initialize the crypto module once
 * Automatically selects the best available implementation:
 * 1. Rust native module (Node.js/Electron)
 * 2. Web Crypto API (browser)
 */
function initCrypto() {
  // Only initialize once
  if (isCryptoInitialized) return;
  
  try {
    // Detect if we're in a browser or Node.js environment
    const isNodeEnvironment = typeof process !== 'undefined' && 
                            process.versions != null && 
                            process.versions.node != null;
    
    if (isNodeEnvironment) {
      // For Node.js (Electron) environment, use dynamic import
      if (process.env.NODE_ENV === 'development') {
        console.log('💻 Running in Node.js environment');
      }
      
      try {
        // Avoid try/catch for performance in production
        if (process.env.NODE_ENV !== 'development') {
          try {
            // @ts-ignore
            rustCrypto = require('../../rust-crypto-core');
          } catch (e) {
            rustCrypto = browserFallback;
          }
        } else {
          // More verbose loading in development
          try {
            // In Node.js, we can use require() for CommonJS modules
            // @ts-ignore
            rustCrypto = require('../../rust-crypto-core');
            console.log('✅ Successfully loaded crypto module with Node.js require');
          } catch (nodeErr) {
            console.warn('⚠️ Failed to load with require, trying dynamic import');
            
            // Fallback to dynamic import if require fails
            try {
              // @ts-ignore
              const module = require('../../rust-crypto-core');
              rustCrypto = module.default || module;
              console.log('✅ Successfully loaded crypto module with dynamic import');
            } catch (importErr) {
              console.error('❌ All loading methods failed, using browser fallback', importErr);
              rustCrypto = browserFallback;
            }
          }
        }
      } catch (err) {
        rustCrypto = browserFallback;
      }
    } else {
      // For browser environment, use browser fallback
      if (process.env.NODE_ENV === 'development') {
        console.log('🌐 Running in browser environment');
      }
      rustCrypto = browserFallback;
    }
  } catch (err) {
    // Log error but continue with fallback
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Error initializing crypto module, using browser fallback', err);
    }
    rustCrypto = browserFallback;
  }
  
  isCryptoInitialized = true;
}

// Initialize on module load
initCrypto();

/**
 * TOTP (Time-based One-Time Password) manager
 * 
 * Provides time-based OTP generation following RFC 6238
 * Uses the Rust implementation when available, with Web Crypto API fallback
 */
export class TOTPManager {
  // TOTP configuration constants
  private static readonly DIGITS = 6;      // Length of generated OTP
  private static readonly PERIOD = 30;     // Time step in seconds

  /**
   * Generates a TOTP token for the current time period
   * 
   * @param secret - Base32 encoded secret key
   * @returns 6-digit OTP token
   */
  static async generateToken(secret: string): Promise<string> {
    try {
      // Ensure crypto is initialized
      if (!rustCrypto) {
        initCrypto();
        if (!rustCrypto) {
          throw new Error('Crypto module not initialized');
        }
      }
      // All implementations are now handled by the module
      return rustCrypto.generateToken(secret);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to generate TOTP:', error);
      }
      
      // If crypto module failed, use browser fallback as last resort
      return browserFallback.generateToken(secret);
    }
  }

  /**
   * Calculates remaining time in current period
   * 
   * @returns Seconds until next token generation
   */
  static getRemainingTime(): number {
    try {
      if (!rustCrypto) {
        throw new Error('Crypto module not initialized');
      }
      // All implementations are now handled by the module
      return rustCrypto.getRemainingTime();
    } catch (error) {
      console.error('Failed to get remaining time:', error);
      
      // If crypto module failed, use browser fallback as last resort
      return browserFallback.getRemainingTime();
    }
  }

  /**
   * Validates a Base32 secret format
   * 
   * @param secret - Secret key to validate
   * @returns Whether the secret is valid Base32
   */
  static validateSecret(secret: string): boolean {
    try {
      if (!rustCrypto) {
        throw new Error('Crypto module not initialized');
      }
      // All implementations are now handled by the module
      return rustCrypto.validateSecret(secret);
    } catch (error) {
      console.error('Failed to validate secret:', error);
      
      // If crypto module failed, use browser fallback as last resort
      return browserFallback.validateSecret(secret);
    }
  }
}

/**
 * Secure storage implementation
 * 
 * Provides encryption and decryption using AES-256-GCM
 * Uses the Rust native module when available, with Web Crypto API fallback
 */
export class SecureStorage {
  /**
   * Encrypts data using AES-256-GCM
   * 
   * @param data - Data to encrypt
   * @param password - Password for key derivation
   * @returns Base64 encoded encrypted data
   * @throws Error if encryption fails
   */
  static async encrypt(data: string, password: string): Promise<string> {
    try {
      if (!rustCrypto) {
        throw new Error('Crypto module not initialized');
      }
      
      // All implementations are now handled by the module
      const result = rustCrypto.encrypt(data, password);
      
      if (!result.success) {
        throw new Error(result.error || 'Encryption failed');
      }
      
      return result.data;
    } catch (error) {
      console.error('Encryption error:', error);
      
      // Try browser fallback as last resort
      const fallbackResult = await browserFallback.encrypt(data, password);
      if (!fallbackResult.success) {
        throw new Error(fallbackResult.error || 'Encryption failed in fallback');
      }
      return fallbackResult.data;
    }
  }

  /**
   * Decrypts data using AES-256-GCM
   * 
   * @param encryptedData - Base64 encoded encrypted data
   * @param password - Password for key derivation
   * @returns Decrypted data as string
   * @throws Error if decryption fails or password is incorrect
   */
  static async decrypt(encryptedData: string, password: string): Promise<string> {
    try {
      if (!rustCrypto) {
        throw new Error('Crypto module not initialized');
      }
      
      // All implementations are now handled by the module
      const result = rustCrypto.decrypt(encryptedData, password);
      
      if (!result.success) {
        // Use specific error name for incorrect password
        const error = new Error(result.error || 'Decryption failed');
        
        if (result.error?.includes('wrong password')) {
          error.name = 'IncorrectPasswordError';
        }
        
        throw error;
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Decryption error:', error);
      
      // Try browser fallback as last resort
      try {
        const fallbackResult = await browserFallback.decrypt(encryptedData, password);
        if (!fallbackResult.success) {
          const fallbackError = new Error(fallbackResult.error || 'Decryption failed in fallback');
          fallbackError.name = 'IncorrectPasswordError';
          throw fallbackError;
        }
        return fallbackResult.data;
      } catch (fallbackError: any) {
        // Preserve error name if it exists
        if (error.name !== 'Error') {
          throw error;
        }
        
        // Otherwise create a generic error
        const newError = new Error('Decryption failed (possibly wrong password)');
        newError.name = 'IncorrectPasswordError';
        throw newError;
      }
    }
  }
} 