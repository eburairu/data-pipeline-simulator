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
      console.error('\n🛡️  Gemini Pre-push Shield: Running strict checks...\n');

      try {
        // 1. Type Check (Strict)
        console.error('🚀 Step 1/2: TypeScript Type Checking (tsc)...');
        execSync('npx tsc --noEmit', { stdio: 'inherit' });
        
        // 2. Full Build Test
        console.error('\n🚀 Step 2/2: Full Production Build (vite build)...');
        execSync('npm run build', { stdio: 'inherit' });

        console.error('\n✅ All checks passed! The codebase is healthy. Proceeding with push.\n');
        process.exit(0);
      } catch (error) {
        console.error('\n❌ CRITICAL: Pre-push check failed!');
        console.error('Please fix the TypeScript or Build errors above.');
        console.error('Push has been blocked to maintain CI stability.\n');
        process.exit(1);
      }
    }
  } catch (err) {
    process.exit(0);
  }
}

main();
