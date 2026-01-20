/**
 * Knexfile for CLI usage (migrations)
 * Re-exports the config from src/database/config.ts
 */

// For CLI usage with ts-node
import { knexConfig } from './src/database/config';

export default knexConfig;
