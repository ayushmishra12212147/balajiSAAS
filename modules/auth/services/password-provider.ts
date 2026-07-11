import bcrypt from "bcryptjs";

// Lazy-load argon2 to prevent startup failure in environments lacking binary compiler tools
let argon2Module: typeof import("argon2") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  argon2Module = require("argon2");
} catch {
  // Argon2 is not compiled or installed; service will fall back to BcryptProvider
}

/**
 * PasswordProvider
 * Abstraction layer decoupling the hashing algorithm from core business logic.
 */
export interface PasswordProvider {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

/**
 * Argon2Provider
 * Default provider using Argon2id for password hashing.
 */
export class Argon2Provider implements PasswordProvider {
  async hash(password: string): Promise<string> {
    if (!argon2Module) {
      throw new Error("Argon2 package is not compiled or available. Switch to BcryptProvider.");
    }
    // Using standard recommended parameters for Argon2id
    return argon2Module.hash(password, {
      type: argon2Module.argon2id,
      memoryCost: 65536, // 64MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  async compare(password: string, hash: string): Promise<boolean> {
    if (!argon2Module) {
      throw new Error("Argon2 package is not compiled or available. Switch to BcryptProvider.");
    }
    try {
      return await argon2Module.verify(hash, password);
    } catch {
      return false;
    }
  }
}

/**
 * BcryptProvider
 * Fallback provider using pure JS bcryptjs.
 */
export class BcryptProvider implements PasswordProvider {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async compare(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      return false;
    }
  }
}

/**
 * PasswordService
 * Static entrypoint used by services. Handles dynamic fallback selection.
 */
export class PasswordService {
  private static provider: PasswordProvider = argon2Module
    ? new Argon2Provider()
    : new BcryptProvider();

  /**
   * Allows manual runtime replacement of the active provider.
   */
  static setProvider(customProvider: PasswordProvider) {
    this.provider = customProvider;
  }

  /**
   * Hashes a plain-text password using the active provider.
   */
  static async hash(password: string): Promise<string> {
    return this.provider.hash(password);
  }

  /**
   * Compares a password against a hash using the active provider.
   * Dynamically routes to the correct provider based on the hash prefix.
   */
  static async compare(password: string, hash: string): Promise<boolean> {
    if (hash.startsWith("$argon2")) {
      if (argon2Module) {
        return new Argon2Provider().compare(password, hash);
      }
      return false; // Argon2 hash in DB but Argon2 module not available
    }

    // Default to Bcrypt for fallback compatibility
    return new BcryptProvider().compare(password, hash);
  }

  /**
   * Reports the active provider class name for system diagnostics.
   */
  static getActiveProviderName(): string {
    return this.provider.constructor.name;
  }
}
