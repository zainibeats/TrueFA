// Dynamically load the compiled Rust module
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

// Set debug flag to false for production builds
const DEBUG = process.env.NODE_ENV === 'development';

// Helper to log debug messages
function debug(...args) {
  if (DEBUG) {
    console.log('[RUST-CRYPTO-DEBUG]', ...args);
  }
}

debug('Starting native module loading...');
debug('Platform:', os.platform());
debug('Architecture:', os.arch());
debug('Current directory:', __dirname);

// This is a simplified version that doesn't rely on node-pre-gyp
// Instead, we directly check for the compiled binary in standard locations
function findNativeModule() {
  const platform = os.platform();
  const isWindows = platform === 'win32';
  const isMacOS = platform === 'darwin';
  const isLinux = platform === 'linux';
  
  let extension;
  if (isWindows) {
    extension = '.dll';
  } else if (isMacOS) {
    extension = '.dylib';
  } else if (isLinux) {
    extension = '.so';
  } else {
    extension = '';
  }
  
  debug('Using file extension:', extension);
  
  // Prioritize most common paths first for faster loading
  // Only check a few known paths to minimize file system operations
  const possiblePaths = [
    path.join(__dirname, 'target', 'release', `truefa_crypto_core${extension}`),
    path.join(__dirname, 'build', 'Release', `truefa_crypto_core${extension}`)
  ];
  
  // Only add additional paths in development environment
  if (process.env.NODE_ENV === 'development') {
    possiblePaths.push(
      path.join(__dirname, 'build', 'Release', 'truefa_crypto_core'),
      ...(!isWindows ? [
        path.join(__dirname, 'target', 'release', 'truefa_crypto_core')
      ] : [])
    );
  }
  
  // Check each path
  for (const modulePath of possiblePaths) {
    debug(`Checking path: ${modulePath}`);
    // Use synchronous file check to reduce overhead
    if (fs.existsSync(modulePath)) {
      debug(`File exists at: ${modulePath}`);
      try {
        // On Windows, we need to use a different approach for loading DLLs
        if (isWindows && extension === '.dll') {
          debug('Found DLL but cannot load it directly from JS. Will use JavaScript fallback implementation.');
          // This would require node-ffi or proper node-gyp binding
          continue;
        }
        
        const module = require(modulePath);
        debug(`Successfully loaded module from: ${modulePath}`);
        return module;
      } catch (err) {
        debug(`Error loading module from ${modulePath}:`, err.message);
      }
    }
  }
  
  debug('Using JavaScript fallback implementation for all crypto functions');
  return null;
}

// Use a variable to ensure we only try to load the module once
let nativeModuleLoaded = false;
const nativeModule = nativeModuleLoaded ? null : findNativeModule();
nativeModuleLoaded = true;

debug('Native module loaded:', nativeModule ? 'SUCCESS' : 'USING FALLBACK');

// ---------------------------------------------------------
// JavaScript fallback implementations for Rust functionality
// ---------------------------------------------------------

// Base32 decoding for TOTP
function base32ToBuffer(base32) {
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
  
  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    const byteStr = bits.slice(i * 8, (i + 1) * 8);
    bytes[i] = parseInt(byteStr, 2);
  }
  
  return bytes;
}

// A secure secret class that mimics the Rust one for the fallback
class FallbackSecureSecret {
  constructor(base32Secret) {
    const cleaned = base32Secret.replace(/\s/g, '').toUpperCase();
    try {
      this.inner = base32ToBuffer(cleaned);
    } catch (error) {
      throw new Error('Invalid Base32 encoding');
    }
  }
  
  clear() {
    // Best effort to clear the memory
    if (this.inner) {
      for (let i = 0; i < this.inner.length; i++) {
        this.inner[i] = 0;
      }
    }
  }
}

// JS Implementation of TOTP token generation
function js_generateToken(secret, timestamp) {
  debug('Using JS fallback for token generation');
  
  // TOTP configuration constants
  const DIGITS = 6;
  const PERIOD = 30;
  
  // Get current time window
  timestamp = timestamp || Math.floor(Date.now() / 1000);
  const timeWindow = Math.floor(timestamp / PERIOD);
  
  // Convert time to buffer
  const timeBuffer = Buffer.alloc(8);
  for (let i = 0; i < 8; i++) {
    timeBuffer[7 - i] = (timeWindow >> (i * 8)) & 0xff;
  }
  
  // Create HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secret.inner);
  hmac.update(timeBuffer);
  const hmacResult = hmac.digest();
  
  // Dynamic truncation
  const offset = hmacResult[19] & 0xf;
  
  // Generate code
  const code = (
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff)
  ) % Math.pow(10, DIGITS);
  
  // Pad with leading zeros
  return code.toString().padStart(DIGITS, '0');
}

// JS Implementation of remaining time calculation
function js_getRemainingTime() {
  debug('Using JS fallback for remaining time calculation');
  
  const PERIOD = 30;
  const now = Math.floor(Date.now() / 1000);
  const timeWindow = Math.floor(now / PERIOD);
  const nextWindow = (timeWindow + 1) * PERIOD;
  
  return nextWindow - now;
}

// JS Implementation of Base32 secret validation 
function js_validateSecret(secret) {
  debug('Using JS fallback for secret validation');
  
  const cleanSecret = secret.replace(/\s/g, '').toUpperCase();
  return /^[A-Z2-7]+=*$/.test(cleanSecret);
}

// JS Implementation of data encryption
function js_encrypt(data, password) {
  debug('Using JS fallback for encryption');
  
  try {
    // Generate secure random values
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(12);
    
    // Use PBKDF2 for key derivation
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      210000, // Iterations
      32,     // Key length (256 bits)
      'sha256'
    );
    
    // Create cipher with AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    // Encrypt data
    const encryptedData = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine all components
    const result = Buffer.concat([
      salt,
      iv,
      authTag,
      encryptedData
    ]);
    
    return {
      data: result.toString('base64'),
      success: true,
      error: null
    };
  } catch (error) {
    debug('Encryption error:', error.message);
    return {
      data: '',
      success: false,
      error: `Encryption failed: ${error.message}`
    };
  }
}

// JS Implementation of data decryption
function js_decrypt(encryptedData, password) {
  debug('Using JS fallback for decryption');
  
  try {
    // Decode base64 data
    const data = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = data.slice(0, 16);
    const iv = data.slice(16, 28);
    const authTag = data.slice(28, 44);
    const encrypted = data.slice(44);
    
    // Derive key
    const key = crypto.pbkdf2Sync(
      password,
      salt,
      210000, // Iterations
      32,     // Key length (256 bits)
      'sha256'
    );
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return {
      data: decrypted.toString('utf8'),
      success: true,
      error: null
    };
  } catch (error) {
    debug('Decryption error:', error.message);
    
    // Provide informative error message for wrong password
    const isAuthError = error.message.includes('auth') || 
                      error.message.includes('authentication') || 
                      error.message.includes('tag');
    
    return {
      data: '',
      success: false,
      error: isAuthError 
        ? 'Decryption failed: wrong password'
        : `Decryption failed: ${error.message}`
    };
  }
}

// Export real functions if module is available, fallback JS implementations otherwise
module.exports = nativeModule ? {
  // Generate a TOTP token from a secret key
  generateToken(secret, timestamp) {
    debug('Using native module for token generation');
    const secureSecret = new nativeModule.SecureSecret(secret);
    try {
      return nativeModule.generate_totp(secureSecret, timestamp);
    } finally {
      secureSecret.clear();
    }
  },
  
  // Calculate remaining seconds in current time window
  getRemainingTime() {
    debug('Using native module for remaining time calculation');
    return nativeModule.remaining_seconds();
  },
  
  // Validate if a string is a valid Base32 secret
  validateSecret(secret) {
    debug('Using native module for secret validation');
    return nativeModule.validate_base32_secret(secret);
  },
  
  // Encrypt data with a password using AES-256-GCM
  encrypt(data, password) {
    debug('Using native module for encryption');
    const result = nativeModule.encrypt_data(data, password);
    debug('Encryption result:', result.success);
    return result;
  },
  
  // Decrypt data with a password
  decrypt(encryptedData, password) {
    debug('Using native module for decryption');
    const result = nativeModule.decrypt_data(encryptedData, password);
    debug('Decryption result:', result.success);
    return result;
  },
  
  // Export raw module for advanced use cases
  nativeModule,
  
  // Export the SecureSecret class for compatibility
  SecureSecret: nativeModule.SecureSecret
} : {
  // JavaScript fallback implementations
  generateToken(secret, timestamp) {
    const secureSecret = new FallbackSecureSecret(secret);
    try {
      return js_generateToken(secureSecret, timestamp);
    } finally {
      secureSecret.clear();
    }
  },
  
  getRemainingTime() {
    return js_getRemainingTime();
  },
  
  validateSecret(secret) {
    return js_validateSecret(secret);
  },
  
  encrypt(data, password) {
    return js_encrypt(data, password);
  },
  
  decrypt(encryptedData, password) {
    return js_decrypt(encryptedData, password);
  },
  
  // Null native module
  nativeModule: null,
  
  // Fallback SecureSecret class
  SecureSecret: FallbackSecureSecret
}; 