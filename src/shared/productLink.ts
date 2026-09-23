/** Navigation only. Never probes the target or forwards prompts/credentials. */
export function productLink(port: string, theme: 'light' | 'dark'): string | null {
  const value = port.trim();
  if (!/^\d{1,5}$/.test(value) || Number(value) < 1 || Number(value) > 65535) return null;
  const url = new URL('http://127.0.0.1');
  url.port = String(Number(value));
  url.searchParams.set('theme', theme);
  return url.href;
}
