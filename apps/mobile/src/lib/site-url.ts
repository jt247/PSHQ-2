// Real bug fixed live: Share.share() calls across every reader screen
// only passed { message: title }, never a url — so sharing any article,
// ebook, template, or build note sent just the title text, with no link
// for the recipient to actually open. This is the one place every reader
// screen builds its real, public, shareable link from.
export const SITE_URL = 'https://www.productslicehq.com'

export function publicContentUrl(path: string): string {
  return `${SITE_URL}${path}`
}
