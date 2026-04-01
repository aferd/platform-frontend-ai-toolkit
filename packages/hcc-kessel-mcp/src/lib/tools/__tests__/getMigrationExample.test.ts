import { getMigrationExampleTool } from '../getMigrationExample';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

describe('getMigrationExample', () => {
  it('generates a useSelfAccessCheck snippet for a standard permission', async () => {
    const [, , tool] = getMigrationExampleTool();
    const result = await tool({ v1Permission: 'notifications:events:read' });
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain("relation: 'notifications_events_view'");
    expect(text).toContain('useSelfAccessCheck');
    expect(text).toContain('defaultWorkspaceId');
    expect(text).toContain("type: 'workspace'");
  });

  it('includes a host-centric note for host-centric permissions', async () => {
    const [, , tool] = getMigrationExampleTool();
    const result = await tool({ v1Permission: 'advisor:recommendation_results:read' });
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('host-centric');
    expect(text).toContain("relation: 'advisor_recommendation_results_view'");
  });

  it('throws McpError for unknown permission', async () => {
    const [, , tool] = getMigrationExampleTool();
    await expect(tool({ v1Permission: 'unknown:resource:read' })).rejects.toThrow(McpError);
  });
});
