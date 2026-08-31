// Whether a file can be rendered inline in the reader (/content/[slug]/read
// and /api/view). PDFs render via the browser's native viewer; xlsx/xls get
// parsed and rendered as HTML tables (see spreadsheet-viewer.ts). Everything
// else only ever gets Download + Share. Used independently by the detail
// page, the reader page, and /api/view — that route is reachable directly
// by content id, so it re-checks rather than trusting the caller.
export function isViewableInline(fileUrl: string | null | undefined): boolean {
  if (!fileUrl) return false
  const lower = fileUrl.toLowerCase()
  return lower.endsWith('.pdf') || lower.endsWith('.xlsx') || lower.endsWith('.xls')
}
