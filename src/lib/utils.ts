import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function toValidDate(value: unknown): Date | null {
  const rawValue = value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function'
    ? value.toDate()
    : value;
  const date = rawValue instanceof Date ? rawValue : new Date(rawValue as string | number);

  return Number.isNaN(date.getTime()) ? null : date;
}


export function downloadAsCSV(headers: string[], data: (string | number)[][], filename: string) {
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      row.map(field => {
        const str = String(field ?? '');
        // Escape quotes and wrap in quotes if it contains a comma, quote, or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
