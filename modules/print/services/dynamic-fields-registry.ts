/**
 * Dynamic Fields Registry
 * Maps clinical and hospital templates double-brace placeholders to runtime objects.
 */

export interface RegistryContext {
  Patient?: Record<string, unknown>;
  Doctor?: Record<string, unknown>;
  Hospital?: Record<string, unknown>;
  Invoice?: Record<string, unknown>;
  OPD?: Record<string, unknown>;
  IPD?: Record<string, unknown>;
  OT?: Record<string, unknown>;
  Laboratory?: Record<string, unknown>;
  Radiology?: Record<string, unknown>;
  Pharmacy?: Record<string, unknown>;
  [key: string]: any;
}

export class DynamicFieldsRegistry {
  /**
   * Resolves a dotted field placeholder (e.g. "Patient.Name", "Hospital.GST") against a data context
   */
  static resolve(placeholder: string, context: RegistryContext): string {
    const key = placeholder.trim().replace(/^\{\{/, "").replace(/\}\}$/, "");
    const parts = key.split(".");
    if (parts.length < 2) {
      const flatVal = context[key];
      if (flatVal !== undefined && flatVal !== null) {
        if (flatVal instanceof Date) {
          return flatVal.toLocaleDateString("en-IN") + " " + flatVal.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        }
        return String(flatVal);
      }
      return "";
    }

    const namespace = parts[0];
    const field = parts.slice(1).join(".");

    const subContext = context[namespace];
    if (!subContext) {
      return "";
    }

    // Direct match or nested property access
    const val = subContext[field];
    if (val === undefined || val === null) {
      return "";
    }

    if (val instanceof Date) {
      return val.toLocaleDateString("en-IN") + " " + val.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }

    return String(val);
  }

  /**
   * Replaces all placeholders inside a target string with resolved data context values
   */
  static interpolate(text: string, context: RegistryContext): string {
    if (!text) return "";
    return text.replace(/\{\{[A-Za-z0-9_.]+\}\}/g, (match) => {
      return this.resolve(match, context);
    });
  }
}
