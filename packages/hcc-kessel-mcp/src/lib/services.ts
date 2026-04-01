export const SERVICES = [
  'advisor',
  'compliance',
  'config-manager',
  'content-sources',
  'hbi',
  'malware',
  'notifications',
  'patch',
  'playbook-dispatcher',
  'rbac',
  'remediations',
  'ros',
  'tasks',
  'vulnerability',
] as const;

export type Service = (typeof SERVICES)[number];

const KSL_BASE_URL =
  'https://raw.githubusercontent.com/RedHatInsights/rbac-config/master/configs/prod/schemas/src';

export function getKslUrl(service: Service): string {
  return `${KSL_BASE_URL}/${service}.ksl`;
}
