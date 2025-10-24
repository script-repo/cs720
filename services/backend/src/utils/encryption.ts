import crypto from 'crypto';
import { AuthTokens } from '../types';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

// Get encryption key from environment or generate one
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;

  if (envKey && envKey.length >= 32) {
    return Buffer.from(envKey.slice(0, 32), 'utf8');
  }

  // Generate a key from a fixed string (not recommended for production)
  const fixedString = 'CS720-LOCAL-ENCRYPTION-KEY-NOT-PROD';
  return crypto.scryptSync(fixedString, 'salt', KEY_LENGTH);
}

export function encryptTokens(tokens: AuthTokens): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(salt);

    const plaintext = JSON.stringify(tokens);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine all components
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ]);

    return combined.toString('base64');
  } catch (error) {
    console.error('Error encrypting tokens:', error);
    throw new Error('Failed to encrypt authentication tokens');
  }
}

export function decryptTokens(encryptedData: string): AuthTokens {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(salt);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting tokens:', error);
    throw new Error('Failed to decrypt authentication tokens');
  }
}

export function generateSecureKey(): string {
  return crypto.randomBytes(32).toString('hex');
}