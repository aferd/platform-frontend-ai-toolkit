import { z } from 'zod';
import { CallToolResult, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { McpTool, PermissionMapping } from '../types';
import { SERVICES, Service, getKslUrl } from '../services';
import { cachedFetch } from '../cachedFetch';
import { parseKsl } from '../kslParser';

function formatMapping(m: PermissionMapping): string {
  const hostNote = m.hostCentric ? ' [host-centric: also requires inventory_host_view]' : '';
  return `${m.v1Permission} → ${m.v2Relation}${hostNote}`;
}

export function getServicePermissionsTool(): McpTool {
  const tool = async (args: unknown): Promise<CallToolResult> => {
    const { service } = args as { service: Service };

    const kslContent = await cachedFetch<string>(getKslUrl(service)).catch((err: Error) => {
      throw new McpError(
        ErrorCode.InternalError,
        `Failed to fetch KSL schema for service "${service}": ${err.message}`
      );
    });

    const { mappings, deprecatedV1Only } = parseKsl(kslContent, service);

    const lines: string[] = [
      `# Kessel permission mappings for: ${service}`,
      '',
      '## v1 → v2 mappings',
      ...mappings.map(formatMapping),
    ];

    if (deprecatedV1Only.length > 0) {
      lines.push('', '## v1-only (deprecated, no v2 equivalent)', ...deprecatedV1Only);
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
    };
  };

  return [
    'getServicePermissions',
    {
      description:
        'Get all RBAC v1 → Kessel v2 permission mappings for a given HCC service. ' +
        'Returns the v2 relation name for each v1 permission, with notes on host-centric ' +
        'permissions (which also require inventory_host_view) and deprecated v1-only entries.',
      inputSchema: {
        service: z
          .enum(SERVICES)
          .describe('The HCC service to look up permission mappings for (e.g. "notifications", "advisor").'),
      },
    },
    tool,
  ];
}
