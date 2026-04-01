import { getKesselPermissionTool } from '../getKesselPermission';
import { McpError } from '@modelcontextprotocol/sdk/types.js';

describe('getKesselPermission', () => {
  it('finds a permission across services', async () => {
    const [, , tool] = getKesselPermissionTool();
    const result = await tool({ v1Permission: 'notifications:events:read' });
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('notifications_events_view');
    expect(text).toContain('service       : notifications');
  });

  it('correctly identifies a host-centric permission', async () => {
    const [, , tool] = getKesselPermissionTool();
    const result = await tool({ v1Permission: 'advisor:recommendation_results:read' });
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('host-centric  : true');
    expect(text).toContain('advisor_recommendation_results_view');
  });

  it('expands a wildcard to all matching v2 relations', async () => {
    const [, , tool] = getKesselPermissionTool();
    const result = await tool({ v1Permission: 'notifications:*:*' });
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('notifications_events_view');
    expect(text).toContain('notifications_notifications_edit');
    expect(text).toContain('notifications_notifications_view');
    expect(text).toContain('In v2 there is no wildcard');
  });

  it('expands a partial wildcard (verb only) correctly', async () => {
    const [, , tool] = getKesselPermissionTool();
    const result = await tool({ v1Permission: 'advisor:disable_recommendations:*' });
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('advisor_disable_recommendations_view');
    expect(text).toContain('advisor_disable_recommendations_edit');
    expect(text).not.toContain('advisor_exports_view');
  });

  it('throws McpError for unknown permission', async () => {
    const [, , tool] = getKesselPermissionTool();
    await expect(tool({ v1Permission: 'unknown:resource:read' })).rejects.toThrow(McpError);
  });
});
