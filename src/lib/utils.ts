import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Sanitize a cell value to prevent formula injection in CSV/XLSX exports.
 * Prepends a single quote to values starting with dangerous characters.
 */
export function sanitizeCellValue(value: string): string {
  if (!value) return value;
  const firstChar = value.charAt(0);
  if ('=+-@\t\r\n'.includes(firstChar)) {
    return `'${value}`;
  }
  return value;
}
