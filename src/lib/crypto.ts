import { Buffer } from 'buffer';

export class TOTPManager {
  private static readonly DIGITS = 6;
  private static readonly PERIOD = 30;

  static async generateToken(secret: string): Promise<string> {
    const counter = Math.floor(Date.now() / 1000 / this.PERIOD);
    return this.generateTOTP(secret, counter);
  }

  static getRemainingTime(): number {
    return this.PERIOD - (Math.floor(Date.now() / 1000) % this.PERIOD);
  }

  static validateSecret(secret: string): boolean {
    try {
      // Check if it's a valid base32 string
      return /^[A-Z2-7]+=*$/.test(secret);
    } catch {
      return false;
    }
  }

  private static async generateTOTP(secret: string, counter: number): Promise<string> {
    const key = this.base32ToBuffer(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const hmac = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', hmac, counterBuffer);
    const hash = new Uint8Array(signature);
    
    const offset = hash[hash.length - 1] & 0xf;
    const binary = ((hash[offset] & 0x7f) << 24) |
                  ((hash[offset + 1] & 0xff) << 16) |
                  ((hash[offset + 2] & 0xff) << 8) |
                  (hash[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, this.DIGITS);
    return otp.toString().padStart(this.DIGITS, '0');
  }

  private static base32ToBuffer(base32: string): Uint8Array {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    const result = [];

    for (const c of base32.replace(/=+$/, '')) {
      value = (value << 5) | alphabet.indexOf(c);
      bits += 5;

      if (bits >= 8) {
        result.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return new Uint8Array(result);
  }
}

export class SecureStorage {
  private static readonly SALT_LENGTH = 16;
  private static readonly IV_LENGTH = 12;
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly ITERATIONS = 100000;

  static async encrypt(data: string, password: string): Promise<string> {
    const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
    
    const key = await this.deriveKey(password, salt);
    const encodedData = new TextEncoder().encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: this.ALGORITHM, iv },
      key,
      encodedData
    );

    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    return Buffer.from(combined).toString('base64');
  }

  static async decrypt(encryptedData: string, password: string): Promise<string> {
    const data = Buffer.from(encryptedData, 'base64');
    const salt = data.slice(0, this.SALT_LENGTH);
    const iv = data.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
    const encrypted = data.slice(this.SALT_LENGTH + this.IV_LENGTH);

    const key = await this.deriveKey(password, salt);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: this.ALGORITHM, iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

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