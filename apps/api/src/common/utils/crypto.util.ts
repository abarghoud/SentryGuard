import * as crypto from 'crypto';

/**
 * Encryption/decryption utility for sensitive tokens
 * Uses AES-256-GCM with a key derived from environment variable
 * Fallback to AES-256-CBC is supported for backward compatibility
 */

const GCM_ALGORITHM = 'aes-256-gcm';
const CBC_ALGORITHM = 'aes-256-cbc';
const GCM_IV_LENGTH = 12;

/**
 * Get or generate encryption key from environment
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY must be defined; generate a strong 32+ character value.'
    );
  }

  if (key.length < 32) {
    throw new Error(
      'ENCRYPTION_KEY is too short; it must be at least 32 characters.'
    );
  }

  // Derive a 32-byte key from the provided key
  return crypto.scryptSync(key, 'salt', 32);
}

/**
 * Encrypt a string using AES-256-GCM
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Return IV + auth tag + encrypted data
  return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
}

/**
 * Decrypt a string using AES-256-GCM, with AES-256-CBC fallback
 */
export function decrypt(text: string): string {
  const key = getEncryptionKey();
  try {
    const parts = text.split(':');

    if (parts.length === 3) {
      // AES-256-GCM
      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encryptedText = parts[2];

      const decipher = crypto.createDecipheriv(GCM_ALGORITHM, key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } else if (parts.length === 2) {
      // AES-256-CBC Fallback
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = parts[1];

      const decipher = crypto.createDecipheriv(CBC_ALGORITHM, key, iv);

      let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } else {
      throw new Error('Invalid encrypted text format');
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}


