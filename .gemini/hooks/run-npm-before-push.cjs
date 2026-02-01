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
      console.error('\n🤖 Gemini Hook: Detected git push. Running npm build and test to verify changes...\n');

      try {
        // Run build
        console.error('Building project...');
        execSync('npm run build', { stdio: 'inherit' });
        
        // Run tests
        console.error('\nRunning tests...');
        execSync('npm test', { stdio: 'inherit' });

        console.error('\n✅ Gemini Hook: Build and tests passed. Allowing git push.\n');
        process.exit(0);
      } catch (error) {
        console.error('\n❌ Gemini Hook: Verification failed. Blocking git push.\n');
        process.exit(1);
      }
    }
  } catch (err) {
    // If it's not a JSON, or other error, just ignore and let the command run
    process.exit(0);
  }
}

main();
