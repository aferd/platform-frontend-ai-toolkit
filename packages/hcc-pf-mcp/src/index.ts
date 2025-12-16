#!/usr/bin/env node

import { run } from './lib/react-data-view-mcp.js';
export { run };
// CLI entry point
if (require.main === module) {
  run();
}
