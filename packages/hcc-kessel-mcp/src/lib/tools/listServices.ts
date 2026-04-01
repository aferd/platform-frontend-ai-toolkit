import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { McpTool } from '../types';
import { SERVICES } from '../services';

export function getListServicesTool(): McpTool {
  const tool = async (_args: unknown): Promise<CallToolResult> => {
    return {
      content: [
        {
          type: 'text',
          text: SERVICES.join('\n'),
        },
      ],
    };
  };

  return [
    'listServices',
    {
      description:
        'List all HCC services that have Kessel (RBAC v2) permission schemas. ' +
        'Use the returned service names with getServicePermissions or getKesselPermission.',
      inputSchema: {},
    },
    tool,
  ];
}
