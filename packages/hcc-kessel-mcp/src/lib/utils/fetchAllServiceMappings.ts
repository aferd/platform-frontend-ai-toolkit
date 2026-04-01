import { ServicePermissions } from '../types';
import { SERVICES, Service, getKslUrl } from '../services';
import { cachedFetch } from '../cachedFetch';
import { parseKsl } from '../kslParser';

export interface ServiceResult {
  service: Service;
  permissions: ServicePermissions;
}

/**
 * Fetches and parses all service KSL schemas in parallel.
 * Services that fail to fetch are silently skipped (e.g. network errors, 404s).
 */
export async function fetchAllServiceMappings(): Promise<ServiceResult[]> {
  const results = await Promise.allSettled(
    SERVICES.map(async (service) => {
      const kslContent = await cachedFetch<string>(getKslUrl(service));
      return { service, permissions: parseKsl(kslContent, service) };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<ServiceResult> => r.status === 'fulfilled')
    .map((r) => r.value);
}
