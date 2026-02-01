#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  try {
    // Read from stdin
    const inputData = fs.readFileSync(0, 'utf-8');
    if (!inputData) return;

    const input = JSON.parse(inputData);
    const toolName = input.tool_name;
    const command = input.tool_input?.command;

    // Check if the command is 'git push' executed via 'run_shell_command'
    if (toolName === 'run_shell_command' && command && command.includes('git push')) {
      console.error('\n🤖 Gemini Hook: Detected git push. Running strict verification (Type Check, Build, and Tests)...\n');

      try {
        // 1. Strict Type Check
        console.error('🔍 Step 1: Running TypeScript type check...');
        execSync('npm run build', { stdio: 'inherit' }); // Note: build includes tsc -b
        
        // 2. Unit Tests
        console.error('\n🔍 Step 2: Running unit tests...');
        execSync('npm test', { stdio: 'inherit' });

        console.error('\n✅ Gemini Hook: All checks passed. Allowing git push.\n');
        process.exit(0);
      } catch (error) {
        console.error('\n❌ Gemini Hook: Verification failed. Please fix the errors above before pushing.\n');
        process.exit(1);
      }
    }
  } catch (err) {
    // If it's not a JSON, or other error, just ignore and let the command run
    process.exit(0);
  }
}

main();