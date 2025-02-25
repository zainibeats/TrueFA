#![deny(clippy::all)]

use napi_derive::napi;
use zeroize::Zeroize;

// Import crypto crates
use aes_gcm::{
    aead::{Aead, KeyInit, Payload},
    Aes256Gcm, Key, Nonce,
};
use data_encoding::BASE32;
use hmac::{Hmac, Mac};
use ring::pbkdf2;
use ring::rand::SecureRandom;
use sha1::Sha1;

// TOTP Constants
const TOTP_DIGITS: usize = 6;
const TOTP_PERIOD: u64 = 30;

// Crypto Constants
const SALT_LENGTH: usize = 16;
const IV_LENGTH: usize = 12;
const PBKDF2_ITERATIONS: u32 = 210000; // As mentioned in README

// Type aliases for cleaner code
type HmacSha1 = Hmac<Sha1>;

// Helper struct for securely handling secret keys
// Will automatically zero memory when dropped
#[napi]
pub struct SecureSecret {
    inner: Vec<u8>,
}

#[napi]
impl SecureSecret {
    // Create from a base32 encoded string
    #[napi(constructor)]
    pub fn new(base32_secret: String) -> napi::Result<Self> {
        // Clean the input (remove spaces, uppercase)
        let cleaned = base32_secret.replace(' ', "").to_uppercase();
        
        // Decode base32
        match BASE32.decode(cleaned.as_bytes()) {
            Ok(bytes) => Ok(Self { inner: bytes }),
            Err(_) => Err(napi::Error::from_reason("Invalid Base32 encoding")),
        }
    }
    
    // Explicit clear method that can be called from JavaScript
    #[napi]
    pub fn clear(&mut self) {
        self.inner.zeroize();
    }
}

// Implement Drop to ensure memory is zeroed when object is destroyed
impl Drop for SecureSecret {
    fn drop(&mut self) {
        self.inner.zeroize();
    }
}

#[napi]
pub fn generate_totp(secret: &SecureSecret, timestamp: Option<i64>) -> napi::Result<String> {
    let time = timestamp.unwrap_or_else(|| std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64);
    
    // Calculate time counter: floor(timestamp / period)
    let counter = (time as u64) / TOTP_PERIOD;
    
    // Create buffer for counter bytes (8 bytes, big-endian)
    let mut counter_bytes = [0u8; 8];
    for i in 0..8 {
        counter_bytes[7 - i] = ((counter >> (i * 8)) & 0xff) as u8;
    }
    
    // Create HMAC-SHA1
    let mut mac = <HmacSha1 as Mac>::new_from_slice(&secret.inner)
        .map_err(|e| napi::Error::from_reason(format!("HMAC error: {}", e)))?;
    
    // Update HMAC with counter
    mac.update(&counter_bytes);
    
    // Finalize and get result
    let hmac_result = mac.finalize().into_bytes();
    
    // Dynamic truncation
    let offset = (hmac_result[19] & 0xf) as usize;
    let code = ((hmac_result[offset] & 0x7f) as u32) << 24
        | ((hmac_result[offset + 1] & 0xff) as u32) << 16
        | ((hmac_result[offset + 2] & 0xff) as u32) << 8
        | ((hmac_result[offset + 3] & 0xff) as u32);
    
    // Modulo and stringify
    let code = (code % 10u32.pow(TOTP_DIGITS as u32)).to_string();
    
    // Pad with leading zeros if necessary
    Ok(format!("{:0>width$}", code, width = TOTP_DIGITS))
}

#[napi]
pub fn remaining_seconds() -> i32 {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    
    let next_window = ((now / TOTP_PERIOD) + 1) * TOTP_PERIOD;
    (next_window - now) as i32
}

#[napi]
pub fn validate_base32_secret(secret: String) -> bool {
    // Clean the input (remove spaces, uppercase)
    let cleaned = secret.replace(' ', "").to_uppercase();
    
    // Check if it's valid base32
    if !cleaned.chars().all(|c| {
        matches!(c, 'A'..='Z' | '2'..='7' | '=')
    }) {
        return false;
    }
    
    // Try decoding
    BASE32.decode(cleaned.as_bytes()).is_ok()
}

#[napi]
pub struct CryptoResult {
    pub data: String,
    pub success: bool,
    pub error: Option<String>,
}

#[napi]
pub fn encrypt_data(data: String, password: String) -> CryptoResult {
    // Generate salt and iv
    let mut salt = [0u8; SALT_LENGTH];
    let mut iv = [0u8; IV_LENGTH];
    
    // Use ring's secure random number generator
    let rng = ring::rand::SystemRandom::new();
    rng.fill(&mut salt).unwrap();
    rng.fill(&mut iv).unwrap();
    
    // Derive key using PBKDF2
    let mut key_bytes = [0u8; 32]; // 256 bits
    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA256,
        std::num::NonZeroU32::new(PBKDF2_ITERATIONS).unwrap(),
        &salt,
        password.as_bytes(),
        &mut key_bytes,
    );
    
    // Create AES-GCM cipher
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&iv);
    
    // Create authenticated data (AAD): salt
    let aad = salt.to_vec();
    
    // Encrypt
    match cipher.encrypt(
        nonce,
        Payload {
            msg: data.as_bytes(),
            aad: &aad,
        },
    ) {
        Ok(ciphertext) => {
            // Clear sensitive data from memory
            key_bytes.zeroize();
            
            // Combine salt + iv + ciphertext
            let mut result = Vec::with_capacity(salt.len() + iv.len() + ciphertext.len());
            result.extend_from_slice(&salt);
            result.extend_from_slice(&iv);
            result.extend_from_slice(&ciphertext);
            
            // Encode as base64
            CryptoResult {
                data: base64::encode(&result),
                success: true,
                error: None,
            }
        }
        Err(e) => {
            key_bytes.zeroize();
            CryptoResult {
                data: String::new(),
                success: false,
                error: Some(format!("Encryption error: {}", e)),
            }
        }
    }
}

#[napi]
pub fn decrypt_data(encrypted_data: String, password: String) -> CryptoResult {
    // Decode base64
    let encrypted = match base64::decode(&encrypted_data) {
        Ok(data) => data,
        Err(e) => {
            return CryptoResult {
                data: String::new(),
                success: false,
                error: Some(format!("Base64 decode error: {}", e)),
            }
        }
    };
    
    // Check if the data is long enough
    if encrypted.len() < SALT_LENGTH + IV_LENGTH {
        return CryptoResult {
            data: String::new(),
            success: false,
            error: Some("Invalid encrypted data format".to_string()),
        };
    }
    
    // Extract salt, iv, and ciphertext
    let salt = &encrypted[0..SALT_LENGTH];
    let iv = &encrypted[SALT_LENGTH..SALT_LENGTH + IV_LENGTH];
    let ciphertext = &encrypted[SALT_LENGTH + IV_LENGTH..];
    
    // Derive key using PBKDF2
    let mut key_bytes = [0u8; 32]; // 256 bits
    pbkdf2::derive(
        pbkdf2::PBKDF2_HMAC_SHA256,
        std::num::NonZeroU32::new(PBKDF2_ITERATIONS).unwrap(),
        salt,
        password.as_bytes(),
        &mut key_bytes,
    );
    
    // Create AES-GCM cipher
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(iv);
    
    // Create authenticated data (AAD): salt
    let aad = salt.to_vec();
    
    // Decrypt
    match cipher.decrypt(
        nonce,
        Payload {
            msg: ciphertext,
            aad: &aad,
        },
    ) {
        Ok(plaintext) => {
            // Clear sensitive data from memory
            key_bytes.zeroize();
            
            // Convert plaintext to string
            match String::from_utf8(plaintext) {
                Ok(data) => CryptoResult {
                    data,
                    success: true,
                    error: None,
                },
                Err(e) => CryptoResult {
                    data: String::new(),
                    success: false,
                    error: Some(format!("UTF-8 decode error: {}", e)),
                },
            }
        }
        Err(e) => {
            key_bytes.zeroize();
            CryptoResult {
                data: String::new(),
                success: false,
                error: Some(format!("Decryption error (possibly wrong password): {}", e)),
            }
        }
    }
} 