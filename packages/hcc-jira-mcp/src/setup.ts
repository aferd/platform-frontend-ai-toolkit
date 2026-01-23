#!/usr/bin/env node

import prompts from 'prompts';
import { runSetup } from './lib/utils/setupPrompts.js';
import logger from './lib/utils/logger.js';

// Handle prompts cancellation
prompts.override({ onCancel: () => { process.exit(1); } });

// Run setup
runSetup(false).then((success) => {
  process.exit(success ? 0 : 1);
}).catch((error) => {
  logger.error('Setup failed:', error);
  process.exit(1);
});
