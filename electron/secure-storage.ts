/**
 * Secure Storage — Abstract Encryption Layer
 *
 * Windows: Uses DPAPI (Data Protection API) via PowerShell invocation.
 * The encryption is tied to the Windows user profile and survives
 * hardware replacement. No manual key management required.
 *
 * Abstract interface allows future Linux (libsecret) and macOS (Keychain)
 * implementations without changing application code.
 */

import { execFileSync } from "child_process";
import * as crypto from "crypto";

// ── Abstract Interface ──────────────────────────────────────────────────

export interface SecureStorage {
  encrypt(data: Buffer): Buffer;
  decrypt(data: Buffer): Buffer;
}

// ── Windows DPAPI Implementation ────────────────────────────────────────

/**
 * Uses Windows Data Protection API via PowerShell.
 * Encryption scope: CurrentUser — tied to the Windows login credentials.
 * Data encrypted by one user cannot be decrypted by another user.
 */
class DPAPIStorage implements SecureStorage {
  encrypt(data: Buffer): Buffer {
    const base64Input = data.toString("base64");

    // PowerShell script to encrypt using DPAPI CurrentUser scope
    const script = `
      Add-Type -AssemblyName System.Security
      $bytes = [System.Convert]::FromBase64String('${base64Input}')
      $encrypted = [System.Security.Cryptography.ProtectedData]::Protect(
        $bytes,
        $null,
        [System.Security.Cryptography.DataProtectionScope]::CurrentUser
      )
      [System.Convert]::ToBase64String($encrypted)
    `.trim();

    try {
      const result = execFileSync("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        script,
      ], {
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true,
      });

      return Buffer.from(result.trim(), "base64");
    } catch (err: unknown) {
      throw new Error(
        `DPAPI encryption failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  decrypt(data: Buffer): Buffer {
    const base64Input = data.toString("base64");

    const script = `
      Add-Type -AssemblyName System.Security
      $bytes = [System.Convert]::FromBase64String('${base64Input}')
      $decrypted = [System.Security.Cryptography.ProtectedData]::Unprotect(
        $bytes,
        $null,
        [System.Security.Cryptography.DataProtectionScope]::CurrentUser
      )
      [System.Convert]::ToBase64String($decrypted)
    `.trim();

    try {
      const result = execFileSync("powershell.exe", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        script,
      ], {
        encoding: "utf8",
        timeout: 10000,
        windowsHide: true,
      });

      return Buffer.from(result.trim(), "base64");
    } catch (err: unknown) {
      throw new Error(
        `DPAPI decryption failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

// ── Fallback AES Implementation (for non-Windows development) ───────────

/**
 * AES-256-GCM fallback for development on non-Windows platforms.
 * Uses a static derived key — NOT suitable for production on non-Windows.
 * Future: Replace with libsecret (Linux) or Keychain (macOS).
 */
class FallbackAESStorage implements SecureStorage {
  private key: Buffer;

  constructor() {
    // Derive a machine-specific key for dev fallback
    const machineId = `${process.env.USERNAME || "dev"}-${process.env.COMPUTERNAME || "local"}-hms-fallback`;
    this.key = crypto.pbkdf2Sync(machineId, "hms-dev-salt", 100000, 32, "sha512");
  }

  encrypt(data: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Format: [IV (16 bytes)] [AuthTag (16 bytes)] [Encrypted Data]
    return Buffer.concat([iv, authTag, encrypted]);
  }

  decrypt(data: Buffer): Buffer {
    if (data.length < 33) {
      throw new Error("Invalid encrypted data: too short");
    }

    const iv = data.subarray(0, 16);
    const authTag = data.subarray(16, 32);
    const encrypted = data.subarray(32);

    const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}

// ── Factory ─────────────────────────────────────────────────────────────

/**
 * Returns the platform-appropriate SecureStorage implementation.
 * Windows → DPAPI, Others → AES fallback (dev only).
 */
export function createSecureStorage(): SecureStorage {
  if (process.platform === "win32") {
    return new DPAPIStorage();
  }

  // Future: Linux → LibsecretStorage, macOS → KeychainStorage
  console.warn(
    "[SecureStorage] Non-Windows platform detected. Using AES fallback (development only)."
  );
  return new FallbackAESStorage();
}
