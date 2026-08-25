import * as XLSX from 'xlsx'

// Renders a workbook as read-only HTML tables — no conversion to PDF (which
// would strip formulas/formatting into a static shape) and no third-party
// viewer (which would mean sending a private, gated file to an external
// service just to display it). SheetJS parses entirely in our own process;
// the output is plain HTML served through /api/view like the PDF path.
export function renderSpreadsheetAsHtml(bytes: Uint8Array, title: string): string {
  const workbook = XLSX.read(bytes, { type: 'array' })

  const sections = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name]
    // header/footer '' strips SheetJS's own <html><body> wrapper, leaving
    // just the <table>, so it drops cleanly into our own page shell below.
    const table = XLSX.utils.sheet_to_html(sheet, { header: '', footer: '' })
    const heading = workbook.SheetNames.length > 1
      ? `<h2 class="sheet-name">${escapeHtml(name)}</h2>`
      : ''
    return `<section class="sheet">${heading}${table}</section>`
  }).join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 1.5rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f7f5f1; color: #1a1a2e;
  }
  .sheet { background: #fff; border-radius: 6px; border: 1px solid #e5e0d8; margin-bottom: 1.5rem; overflow-x: auto; padding: 1rem; }
  .sheet-name { font-size: 0.9375rem; font-weight: 700; margin: 0 0 0.75rem; color: #1a1a2e; }
  table { border-collapse: collapse; width: 100%; font-size: 0.8125rem; }
  td { border: 1px solid #e5e0d8; padding: 0.375rem 0.625rem; vertical-align: top; white-space: pre-wrap; }
  tr:nth-child(even) td { background: #fafaf8; }
</style>
</head>
<body>
${sections}
</body>
</html>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
