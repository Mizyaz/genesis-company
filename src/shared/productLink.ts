export const DEFAULT_PRODUCT_URL = 'http://localhost:4300/';

/** Navigation only. Never probes the target or forwards prompts/credentials. */
export function productLink(address: string, theme: 'light' | 'dark'): string | null {
  try {
    const url = new URL(address.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    url.searchParams.set('theme', theme);
    return url.href;
  } catch { return null; }
}
