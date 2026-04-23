#!/usr/bin/env node

import { run } from './lib/index.js';

export { run };

// CLI entry point
if (require.main === module) {
  run().catch((error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
