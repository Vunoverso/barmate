import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Augment jsPDF interface for autoTable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

export async function downloadAsPDF(title: string, headers: string[][], data: (string | number)[][], filename:string) {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  doc.autoTable({
    head: headers,
    body: data,
    startY: 30,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [31, 41, 55] },
  });

  doc.save(filename);
}
