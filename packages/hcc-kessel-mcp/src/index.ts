#!/usr/bin/env node

import { run } from './lib/kessel-mcp.js';
export { run };
// CLI entry point
if (require.main === module) {
  run();
}
