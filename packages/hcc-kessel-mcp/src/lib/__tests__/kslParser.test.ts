import { parseKsl } from '../kslParser';
import { MOCK_NOTIFICATIONS_KSL, MOCK_ADVISOR_KSL, MOCK_COMPLIANCE_KSL, MOCK_RBAC_KSL } from './mocks/handlers';

describe('parseKsl', () => {
  describe('notifications.ksl', () => {
    it('extracts all v1→v2 mappings', () => {
      const { mappings } = parseKsl(MOCK_NOTIFICATIONS_KSL, 'notifications');
      expect(mappings).toHaveLength(5);
    });

    it('maps notifications:events:read → notifications_events_view', () => {
      const { mappings } = parseKsl(MOCK_NOTIFICATIONS_KSL, 'notifications');
      const m = mappings.find((x) => x.v1Permission === 'notifications:events:read');
      expect(m).toBeDefined();
      expect(m?.v2Relation).toBe('notifications_events_view');
      expect(m?.hostCentric).toBe(false);
    });

    it('maps integrations:endpoints:write → integrations_endpoints_edit', () => {
      const { mappings } = parseKsl(MOCK_NOTIFICATIONS_KSL, 'notifications');
      const m = mappings.find((x) => x.v1Permission === 'integrations:endpoints:write');
      expect(m?.v2Relation).toBe('integrations_endpoints_edit');
    });

    it('returns no deprecated v1-only permissions', () => {
      const { deprecatedV1Only } = parseKsl(MOCK_NOTIFICATIONS_KSL, 'notifications');
      expect(deprecatedV1Only).toHaveLength(0);
    });
  });

  describe('advisor.ksl — host-centric permissions', () => {
    it('resolves host-centric permission to the non-assigned contingent relation', () => {
      const { mappings } = parseKsl(MOCK_ADVISOR_KSL, 'advisor');
      const m = mappings.find((x) => x.v1Permission === 'advisor:recommendation_results:read');
      expect(m?.v2Relation).toBe('advisor_recommendation_results_view');
      expect(m?.hostCentric).toBe(true);
    });

    it('leaves non-host-centric permissions unchanged', () => {
      const { mappings } = parseKsl(MOCK_ADVISOR_KSL, 'advisor');
      const m = mappings.find((x) => x.v1Permission === 'advisor:disable_recommendations:read');
      expect(m?.v2Relation).toBe('advisor_disable_recommendations_view');
      expect(m?.hostCentric).toBe(false);
    });
  });

  describe('rbac.ksl — unified permissions', () => {
    it('extracts unified permissions with colons → underscores', () => {
      const { mappings } = parseKsl(MOCK_RBAC_KSL, 'rbac');
      const m = mappings.find((x) => x.v1Permission === 'rbac:principal:write');
      expect(m).toBeDefined();
      expect(m?.v2Relation).toBe('rbac_principal_write');
      expect(m?.unified).toBe(true);
      expect(m?.hostCentric).toBe(false);
    });

    it('extracts all unified entries', () => {
      const { mappings } = parseKsl(MOCK_RBAC_KSL, 'rbac');
      expect(mappings).toHaveLength(4);
      expect(mappings.every((m) => m.unified)).toBe(true);
    });
  });

  describe('compliance.ksl — deprecated v1-only permissions', () => {
    it('extracts deprecated v1-only permission names', () => {
      const { deprecatedV1Only } = parseKsl(MOCK_COMPLIANCE_KSL, 'compliance');
      expect(deprecatedV1Only).toContain('compliance_policy_update');
      expect(deprecatedV1Only).toContain('compliance_report_delete');
    });

    it('does not include v1-only entries in mappings', () => {
      const { mappings } = parseKsl(MOCK_COMPLIANCE_KSL, 'compliance');
      const hasDeprecated = mappings.some(
        (m) => m.v2Relation === 'compliance_policy_update' || m.v2Relation === 'compliance_report_delete'
      );
      expect(hasDeprecated).toBe(false);
    });
  });
});
