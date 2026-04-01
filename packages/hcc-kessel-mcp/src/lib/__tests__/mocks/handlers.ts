import { http, HttpResponse } from 'msw';

const KSL_BASE =
  'https://raw.githubusercontent.com/RedHatInsights/rbac-config/master/configs/prod/schemas/src';

export const MOCK_NOTIFICATIONS_KSL = `
version 0.2
namespace notifications

import rbac

// App: Integrations - Resource: Endpoints
@rbac.add_v1_based_permission(app:'integrations', resource:'endpoints', verb:'write', v2_perm:'integrations_endpoints_edit');
@rbac.add_v1_based_permission(app:'integrations', resource:'endpoints', verb:'read', v2_perm:'integrations_endpoints_view');

// App: Notifications - Resource: Events
@rbac.add_v1_based_permission(app:'notifications', resource:'events', verb:'read', v2_perm:'notifications_events_view');

// App: Notifications - Resource: Notifications
@rbac.add_v1_based_permission(app:'notifications', resource:'notifications', verb:'write', v2_perm:'notifications_notifications_edit');
@rbac.add_v1_based_permission(app:'notifications', resource:'notifications', verb:'read', v2_perm:'notifications_notifications_view');
`;

export const MOCK_ADVISOR_KSL = `
version 0.1
namespace advisor

import rbac
import hbi

@rbac.add_v1_based_permission(app:'advisor', resource:'disable_recommendations', verb:'read', v2_perm:'advisor_disable_recommendations_view');
@rbac.add_v1_based_permission(app:'advisor', resource:'disable_recommendations', verb:'write', v2_perm:'advisor_disable_recommendations_edit');

@rbac.add_v1_based_permission(app:'advisor', resource:'recommendation_results', verb:'read', v2_perm:'advisor_recommendation_results_view_assigned');
@rbac.add_contingent_permission(first: 'inventory_host_view', second: 'advisor_recommendation_results_view_assigned', contingent: 'advisor_recommendation_results_view');

@rbac.add_v1_based_permission(app:'advisor', resource:'exports', verb:'read', v2_perm:'advisor_exports_view');
`;

export const MOCK_COMPLIANCE_KSL = `
version 0.1
namespace compliance

import rbac

@rbac.add_v1_based_permission(app:'compliance', resource:'policy', verb:'read', v2_perm:'compliance_policy_view');
@rbac.add_v1_based_permission(app:'compliance', resource:'policy', verb:'write', v2_perm:'compliance_policy_edit');

@rbac.add_v1only_permission(perm:'compliance_policy_update');
@rbac.add_v1only_permission(perm:'compliance_report_delete');
`;

export const MOCK_RBAC_KSL = `
version 0.1
namespace rbac

@add_unified_permission(app:'rbac', resource:'principal', verb:'read')
@add_unified_permission(app:'rbac', resource:'principal', verb:'write')
@add_unified_permission(app:'rbac', resource:'groups', verb:'read')
@add_unified_permission(app:'rbac', resource:'groups', verb:'write')
`;

export const handlers = [
  http.get(`${KSL_BASE}/notifications.ksl`, () => HttpResponse.text(MOCK_NOTIFICATIONS_KSL)),
  http.get(`${KSL_BASE}/advisor.ksl`, () => HttpResponse.text(MOCK_ADVISOR_KSL)),
  http.get(`${KSL_BASE}/compliance.ksl`, () => HttpResponse.text(MOCK_COMPLIANCE_KSL)),
  http.get(`${KSL_BASE}/rbac.ksl`, () => HttpResponse.text(MOCK_RBAC_KSL)),
];
