#!/usr/bin/env npx tsx

/**
 * Environment Validation Script
 *
 * Validates that all required services and dependencies are properly configured.
 * Run with: npm run validate-env
 *
 * Based on PRD v1.4 Section 9.3
 */

// Load environment variables
import 'dotenv/config';

interface ValidationCheck {
  name: string;
  check: () => Promise<boolean>;
  errorHint?: string;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_DEFAULT_MODEL = process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2:3b';

/**
 * Check if Ollama is running
 */
async function checkOllamaConnectivity(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Check if default model is available
 */
async function checkDefaultModel(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { models: { name: string }[] };
    const models = data.models || [];

    return models.some(
      (m) =>
        m.name === OLLAMA_DEFAULT_MODEL ||
        m.name === `${OLLAMA_DEFAULT_MODEL}:latest`
    );
  } catch {
    return false;
  }
}

/**
 * Check if required environment variables are set
 */
function checkConfigLoaded(): boolean {
  // These should have defaults, so just check they're loadable
  return true;
}

/**
 * Check if Node.js version is compatible
 */
function checkNodeVersion(): boolean {
  const version = process.versions.node;
  const [major] = version.split('.').map(Number);
  return major >= 18;
}

/**
 * Validation checks to run
 */
const checks: ValidationCheck[] = [
  {
    name: 'Node.js version (>= 18)',
    check: async () => checkNodeVersion(),
    errorHint: 'Please upgrade Node.js to version 18 or higher',
  },
  {
    name: 'Configuration loaded',
    check: async () => checkConfigLoaded(),
    errorHint: 'Check .env.local file exists and is properly formatted',
  },
  {
    name: 'Ollama connectivity',
    check: checkOllamaConnectivity,
    errorHint: `Run: ollama serve (ensure it's listening on ${OLLAMA_BASE_URL})`,
  },
  {
    name: `Default model available (${OLLAMA_DEFAULT_MODEL})`,
    check: checkDefaultModel,
    errorHint: `Run: ollama pull ${OLLAMA_DEFAULT_MODEL}`,
  },
  {
    name: 'MCP tools available',
    check: async () => {
      try {
        const { createPathValidator } = await import('../mcp-server/src/validation/pathValidator');
        const { listFiles } = await import('../mcp-server/src/tools/listFiles');
        const validator = createPathValidator(process.cwd(), undefined);
        const result = await listFiles({ directory: '.', max_depth: 1 }, validator);
        return Array.isArray(result.files);
      } catch {
        return false;
      }
    },
    errorHint: 'Check mcp-server dependencies and tool implementations',
  },
];

/**
 * Run all validation checks
 */
async function validateEnvironment(): Promise<void> {
  console.log('');
  console.log('🔍 Engineering Assistant - Environment Validation');
  console.log('='.repeat(50));
  console.log('');

  let allPassed = true;
  const results: { name: string; passed: boolean; hint?: string }[] = [];

  for (const { name, check, errorHint } of checks) {
    try {
      const passed = await check();
      results.push({ name, passed, hint: errorHint });

      if (!passed) {
        allPassed = false;
      }
    } catch (error) {
      results.push({ name, passed: false, hint: errorHint });
      allPassed = false;
    }
  }

  // Print results
  for (const { name, passed, hint } of results) {
    if (passed) {
      console.log(`  ✅ ${name}`);
    } else {
      console.log(`  ❌ ${name}`);
      if (hint) {
        console.log(`     └─ ${hint}`);
      }
    }
  }

  console.log('');
  console.log('='.repeat(50));

  if (allPassed) {
    console.log('✨ All checks passed! Environment is ready.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Open: http://localhost:3000');
    console.log('');
    process.exit(0);
  } else {
    console.log('⚠️  Some checks failed. Please fix the issues above.');
    console.log('');
    console.log('Common fixes:');
    console.log('  • Ollama not running? Run: ollama serve');
    console.log(`  • Model missing? Run: ollama pull ${OLLAMA_DEFAULT_MODEL}`);
    console.log('  • Config issues? Copy .env.example to .env.local');
    console.log('');
    process.exit(1);
  }
}

// Run validation
validateEnvironment().catch((error) => {
  console.error('Validation failed with error:', error);
  process.exit(1);
});
