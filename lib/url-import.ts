export const IMPORT_LIMIT = 100;
export type ImportEntry = { input: string; url?: string; error?: string };

// A URL occupies one line; commas can be meaningful parts of a URL.
export function parseImport(text: string): ImportEntry[] {
  const seen = new Set<string>();
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(input => {
    try {
      if (input.length > 3000) throw new Error("Keep URLs under 3,000 characters.");
      const url = new URL(input);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
        throw new Error("Enter an HTTP or HTTPS URL without credentials.");
      url.hash = '';
      const normalized = url.href;
      if (seen.has(normalized)) return { input, error: "Duplicate in this import." };
      seen.add(normalized);
      return { input, url: normalized };
    } catch (error) {
      return { input, error: error instanceof TypeError ? "Enter a complete URL starting with https:// or http://." : (error as Error).message };
    }
  });
}

export async function processImport<T>(items: T[], save: (item: T) => Promise<void>, shouldStop = () => false) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(3, items.length) }, async () => {
    while (!shouldStop() && next < items.length) {
      const item = items[next++];
      await save(item);
    }
  }));
}
