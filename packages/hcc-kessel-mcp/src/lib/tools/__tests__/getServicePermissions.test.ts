import { getServicePermissionsTool } from '../getServicePermissions';

describe('getServicePermissions', () => {
  it('returns mappings for notifications service', async () => {
    const [, , tool] = getServicePermissionsTool();
    const result = await tool({ service: 'notifications' });
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('notifications:events:read → notifications_events_view');
    expect(text).toContain('integrations:endpoints:write → integrations_endpoints_edit');
  });

  it('annotates host-centric permissions', async () => {
    const [, , tool] = getServicePermissionsTool();
    const result = await tool({ service: 'advisor' });
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('host-centric');
    expect(text).toContain('advisor:recommendation_results:read → advisor_recommendation_results_view');
  });

  it('includes deprecated v1-only section when present', async () => {
    const [, , tool] = getServicePermissionsTool();
    const result = await tool({ service: 'compliance' });
    const text = (result.content[0] as { type: 'text'; text: string }).text;
    expect(text).toContain('v1-only (deprecated');
    expect(text).toContain('compliance_policy_update');
  });
});
