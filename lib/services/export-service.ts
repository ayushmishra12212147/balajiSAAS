/**
 * ExportService
 * Reusable utility to convert tabular data lists into CSV formatted string buffers.
 */
export class ExportService {
  /**
   * generateCSV
   * Maps dataset arrays to escaped comma-separated values format.
   */
  static generateCSV<T>(
    headers: string[],
    data: T[],
    mapper: (row: T) => string[]
  ): string {
    const escape = (val: unknown): string => {
      if (val === null || val === undefined) return "";
      const str = String(val);
      // Escape enclosing quotes or delimiters
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [];

    // Append Header Row
    lines.push(headers.map(escape).join(","));

    // Append Records Rows
    data.forEach((item) => {
      lines.push(mapper(item).map(escape).join(","));
    });

    return lines.join("\n");
  }
}
export default ExportService;
