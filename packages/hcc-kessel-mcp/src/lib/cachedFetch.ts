const cache = new Map<string, unknown>();

export async function cachedFetch<T = unknown>(url: string, options?: RequestInit): Promise<T> {
  const cacheKey = `${url}:${JSON.stringify(options)}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)! as T;
  }

  try {
    const resp = await fetch(url, options);
    if (!resp.ok) {
      throw new Error(`Network response was not ok: ${resp.status} ${resp.statusText}`);
    }

    if (resp.headers.get('Content-Type')?.includes('application/json')) {
      const data: T = (await resp.json()) as T;
      cache.set(cacheKey, data);
      return data;
    }

    const textData = (await resp.text()) as T;
    cache.set(cacheKey, textData);
    return textData;
  } catch (error) {
    throw new Error(`Fetch failed for ${url}: ${(error as Error).message}`);
  }
}
