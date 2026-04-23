import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export type McpTool = [string, { description: string; inputSchema: any }, (args: any) => Promise<CallToolResult>];

/**
 * Structured test logic extracted from Cypress AST
 */
export interface TestLogicMap {
  testName: string;
  filePath: string;
  setup: SetupAction[];
  triggers: TriggerAction[];
  assertions: AssertionAction[];
  category: TestCategory;
  cypressNodes: CypressNode[];
}

/**
 * Setup actions (mocks, intercepts, fixtures)
 */
export interface SetupAction {
  type: 'intercept' | 'request' | 'fixture' | 'mock' | 'visit';
  code: string;
  lineNumber: number;
  details: {
    url?: string;
    method?: string;
    response?: any;
    alias?: string;
  };
}

/**
 * User interaction triggers
 */
export interface TriggerAction {
  type: 'click' | 'type' | 'select' | 'check' | 'navigate' | 'wait';
  selector?: string;
  code: string;
  lineNumber: number;
  details: {
    value?: string;
    options?: any;
  };
}

/**
 * Assertion actions
 */
export interface AssertionAction {
  type: 'exist' | 'visible' | 'contain' | 'equal' | 'match' | 'custom';
  selector?: string;
  code: string;
  lineNumber: number;
  expected?: any;
  details: {
    chainer?: string;
    value?: any;
  };
}

/**
 * Test categorization for routing
 */
export type TestCategory = 'storybook' | 'unit' | 'e2e' | 'obsolete';

/**
 * Raw Cypress AST node information
 */
export interface CypressNode {
  type: string;
  name: string;
  code: string;
  lineNumber: number;
  children: CypressNode[];
}

/**
 * Test coverage analysis result
 */
export interface CoverageAnalysis {
  component: {
    path: string;
    exists: boolean;
    lastModified: string;
  };
  test: {
    path: string;
    exists: boolean;
    lastModified: string;
    type: 'cypress' | 'playwright' | 'jest' | 'storybook';
  };
  isRelevant: boolean;
  reason: string;
  recommendation: 'migrate' | 'delete' | 'update' | 'keep';
}

/**
 * Repository structure analysis
 */
export interface RepoStructure {
  components: ComponentInfo[];
  tests: TestInfo[];
  gaps: CoverageGap[];
}

export interface ComponentInfo {
  path: string;
  name: string;
  hasTests: {
    jest: boolean;
    storybook: boolean;
    playwright: boolean;
    cypress: boolean;
  };
}

export interface TestInfo {
  path: string;
  type: 'cypress' | 'playwright' | 'jest' | 'storybook';
  component?: string;
}

export interface CoverageGap {
  component: string;
  missingTests: ('jest' | 'storybook' | 'playwright')[];
  priority: 'high' | 'medium' | 'low';
}

/**
 * MSW readiness check result
 */
export interface MSWReadiness {
  componentPath: string;
  hasApiCalls: boolean;
  apiCalls: ApiCallInfo[];
  hasMSWSetup: boolean;
  recommendation: string;
  requiredHandlers: MSWHandler[];
}

export interface ApiCallInfo {
  type: 'fetch' | 'axios' | 'cy.intercept' | 'cy.request';
  url: string;
  method: string;
  lineNumber: number;
  code: string;
}

export interface MSWHandler {
  method: string;
  url: string;
  suggestedResponse: any;
}

/**
 * Path security validation result
 */
export interface PathValidation {
  isValid: boolean;
  sanitized: string;
  error?: string;
  isWriteAllowed: boolean;
}
