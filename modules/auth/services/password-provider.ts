import bcrypt from "bcryptjs";

/**
 * PasswordProvider
 * Abstraction layer decoupling the hashing algorithm from core business logic.
 */
export interface PasswordProvider {
  hash(password: string): Promise<string>;
  compare(password: string, hash: string): Promise<boolean>;
}

/**
 * BcryptProvider
 * Default provider using pure JS bcryptjs.
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
 * Static entrypoint used by services. Defaults to BcryptProvider.
 */
export class PasswordService {
  private static provider: PasswordProvider = new BcryptProvider();

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
   */
  static async compare(password: string, hash: string): Promise<boolean> {
    // Default to Bcrypt for compatibility
    return this.provider.compare(password, hash);
  }

  /**
   * Reports the active provider class name for system diagnostics.
   */
  static getActiveProviderName(): string {
    return this.provider.constructor.name;
  }
}
