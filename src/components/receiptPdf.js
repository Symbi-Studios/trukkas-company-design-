// Minimal single-page PDF writer for receipts, so downloads work in the static
// client build without adding a PDF dependency. Uses the standard Helvetica
// fonts (WinAnsi), so text is normalised to plain ASCII: "₦" becomes "NGN".
const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 48;

const REPLACEMENTS = [[/₦/g, 'NGN '], [/→/g, '->'], [/•/g, '*'], [/·/g, '-'], [/[—–]/g, '-'], [/[’‘]/g, "'"], [/[“”]/g, '"'], [/…/g, '...']];

function ascii(value) {
  let text = String(value ?? '');
  REPLACEMENTS.forEach(([re, rep]) => { text = text.replace(re, rep); });
  return text.replace(/[^\x20-\x7E]/g, '');
}

function escape(text) {
  return ascii(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

// Approximate Helvetica advance widths (per 1000 em) — enough for right-aligning amounts.
function textWidth(text, size, bold) {
  let units = 0;
  for (const ch of ascii(text)) {
    if (/[0-9]/.test(ch)) units += 556;
    else if (/[ .,:;'!|il]/.test(ch)) units += 278;
    else if (/[A-Z]/.test(ch)) units += bold ? 722 : 667;
    else if (/[mwMW]/.test(ch)) units += 833;
    else units += bold ? 611 : 556;
  }
  return (units / 1000) * size;
}

export function money(amount) {
  const sign = amount < 0 ? '-' : '';
  return `${sign}NGN ${Math.abs(amount).toLocaleString('en-NG')}`;
}

function truncate(text, size, maxWidth, bold) {
  let out = ascii(text);
  while (out.length > 3 && textWidth(out, size, bold) > maxWidth) out = out.slice(0, -2);
  return out === ascii(text) ? out : `${out.trimEnd()}...`;
}

/** Builds the PDF bytes for a receipt view model (see domain/payouts.js). */
export function receiptPdfBlob(receipt) {
  const ops = [];
  const color = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return `${((n >> 16) & 255) / 255} ${((n >> 8) & 255) / 255} ${(n & 255) / 255}`;
  };
  const text = (x, y, value, { size = 10, bold = false, fill = '#0F172A', align = 'left', maxWidth } = {}) => {
    const str = maxWidth ? truncate(value, size, maxWidth, bold) : ascii(value);
    const w = textWidth(str, size, bold);
    const tx = align === 'right' ? x - w : x;
    ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color(fill)} rg ${tx.toFixed(2)} ${y.toFixed(2)} Td (${escape(str)}) Tj ET`);
  };
  const rect = (x, y, w, h, fill) => ops.push(`${color(fill)} rg ${x} ${y} ${w} ${h} re f`);
  const line = (y) => ops.push(`0.886 0.910 0.941 RG 0.8 w ${MARGIN} ${y} m ${PAGE_W - MARGIN} ${y} l S`);

  const right = PAGE_W - MARGIN;
  rect(0, PAGE_H - 110, PAGE_W, 110, '#0B1B3F');
  text(MARGIN, PAGE_H - 58, 'TRUKKAS', { size: 22, bold: true, fill: '#FFFFFF' });
  text(MARGIN, PAGE_H - 78, 'Move. Earn. Grow.', { size: 9, fill: '#C7D2FE' });
  text(right, PAGE_H - 56, receipt.kind, { size: 16, bold: true, fill: '#FFFFFF', align: 'right' });
  text(right, PAGE_H - 76, `No. ${receipt.number}`, { size: 10, fill: '#C7D2FE', align: 'right' });

  let y = PAGE_H - 150;
  text(MARGIN, y, 'ISSUED TO', { size: 8, bold: true, fill: '#64748B' });
  text(PAGE_W / 2 + 10, y, 'DETAILS', { size: 8, bold: true, fill: '#64748B' });
  y -= 16;
  const company = receipt.company || {};
  const left = [company.name, company.rcNumber, company.address, company.email].filter(Boolean);
  left.forEach((row, i) => text(MARGIN, y - i * 14, row, { size: i === 0 ? 11 : 9, bold: i === 0, fill: i === 0 ? '#0F172A' : '#475569', maxWidth: PAGE_W / 2 - MARGIN - 10 }));
  receipt.meta.forEach(([label, value, amount], i) => {
    const ry = y - i * 14;
    text(PAGE_W / 2 + 10, ry, label, { size: 9, fill: '#64748B' });
    text(right, ry, amount != null ? money(amount) : value ?? '-', { size: 9, bold: true, align: 'right', maxWidth: 150 });
  });
  y -= Math.max(left.length, receipt.meta.length) * 14 + 24;

  rect(MARGIN, y - 6, PAGE_W - MARGIN * 2, 24, '#F1F5F9');
  text(MARGIN + 10, y + 2, 'Description', { size: 9, bold: true, fill: '#475569' });
  text(right - 10, y + 2, 'Amount', { size: 9, bold: true, fill: '#475569', align: 'right' });
  y -= 30;
  receipt.lines.forEach((row) => {
    text(MARGIN + 10, y, row.description, { size: 10, bold: true, maxWidth: 360 });
    text(right - 10, y, money(row.amount), { size: 10, bold: true, align: 'right' });
    if (row.detail) text(MARGIN + 10, y - 13, row.detail, { size: 8, fill: '#64748B', maxWidth: 380 });
    y -= 34;
    line(y + 12);
  });

  y -= 8;
  receipt.totals.forEach((row) => {
    if (row.strong) { rect(PAGE_W / 2, y - 8, PAGE_W / 2 - MARGIN, 26, '#EEF2FF'); }
    text(PAGE_W / 2 + 10, y, row.label, { size: row.strong ? 11 : 10, bold: !!row.strong, fill: row.strong ? '#0F172A' : '#475569' });
    text(right - 10, y, money(row.amount), { size: row.strong ? 12 : 10, bold: true, align: 'right', fill: row.strong ? '#0241E8' : '#0F172A' });
    y -= row.strong ? 32 : 20;
  });

  if (receipt.note) text(MARGIN, y - 10, receipt.note, { size: 9, fill: '#475569', maxWidth: PAGE_W - MARGIN * 2 });
  text(MARGIN, 60, `Issued ${receipt.issuedOn || ''} · Status: ${receipt.status}`, { size: 8, fill: '#94A3B8' });
  text(MARGIN, 46, 'This is a system-generated document from the Trukkas platform and does not require a signature.', { size: 8, fill: '#94A3B8' });

  const stream = ops.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const offset = pdf.length;
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n `).join('\n')}\n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadReceiptPdf(receipt) {
  const url = URL.createObjectURL(receiptPdfBlob(receipt));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${receipt.number}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
