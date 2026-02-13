## 0.0.2 (2026-02-13)

### 🩹 Fixes

- **feo-mcp:** fix feo mcp by adding zod and providing the metadata ([#21](https://github.com/RedHatInsights/platform-frontend-ai-toolkit/pull/21))

### ❤️ Thank You

- Karel Hala

## 0.1.0 (2026-02-06)

### 🚀 Features

- **feo-mcp:** Initial release of HCC Frontend Operator MCP server
- **schema:** Dynamic schema-driven template generation from live FEO repository
- **templates:** Intelligent migration and setup templates with bundle-specific recommendations
- **validation:** Real-time YAML validation against FEO schema
- **tools:** 9 comprehensive MCP tools for FEO configuration management

### 🎯 Tools Included

- `getFEOSchema` - Fetch and cache latest FEO schema
- `getFEOMigrationTemplate` - Generate migration templates (module, navigation, service-tiles, search, full)
- `getFEOYamlSetupTemplate` - Complete frontend.yaml templates for new applications
- `getFEOFieldRecommendations` - Schema-based field recommendations with bundle context
- `validateFEOConfig` - YAML validation against current schema
- `getFEOExamples` - Configuration examples and patterns
- `getFEOBestPractices` - Best practices by category
- `getFEONavigationPositioning` - Navigation positioning guidance
- `getFEOServiceTilesSections` - Available service tiles sections and groups

### ✨ Key Features

- **Zero Maintenance**: Templates automatically stay current with schema evolution
- **Bundle Intelligence**: Smart recommendations based on bundle type (insights, openshift, ansible, etc.)
- **Schema Validation**: Live validation against official FEO specification
- **Dynamic Generation**: No hardcoded templates - everything generated from schema

### ❤️ Thank You

- HCC Frontend Team
- Frontend Operator contributors