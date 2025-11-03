import * as crypto from 'crypto';

/**
 * Simple encryption/decryption utility for sensitive tokens
 * Uses AES-256-CBC with a key derived from environment variable
 */

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Get or generate encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  
  if (!key) {
    // In development, use a default key (NOT FOR PRODUCTION)
    console.warn('⚠️ ENCRYPTION_KEY not set, using default key (NOT FOR PRODUCTION)');
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', 32);
  }
  
  // Derive a 32-byte key from the provided key
  return crypto.scryptSync(key, 'salt', 32);
}

/**
 * Encrypt a string
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return IV + encrypted data
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string
 */
export function decrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const parts = text.split(':');
    
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

