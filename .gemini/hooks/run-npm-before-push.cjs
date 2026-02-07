#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// デバッグ用
const debugLog = (msg) => {
  fs.appendFileSync(path.join(__dirname, 'hook.log'), `${new Date().toISOString()} - ${msg}\n`);
};

debugLog('Hook script started');

async function main() {
  try {
    const inputData = fs.readFileSync(0, 'utf-8');
    if (!inputData) {
      debugLog('No input data on stdin');
      return;
    }

    const input = JSON.parse(inputData);
    const toolName = input.tool_name || input.name;
    const toolInput = input.tool_input || input.arguments || {};
    const command = toolInput.command;

    debugLog(`Tool: ${toolName}, Command: ${command}`);

    if (command && command.includes('git push')) {
      process.stderr.write('\n🛡️ Gemini Pre-push Shield: Running checks...\n');
      
      try {
        debugLog('Running tsc...');
        execSync('npx tsc --noEmit', { stdio: 'inherit' });
        
        debugLog('Running build...');
        execSync('npm run build', { stdio: 'inherit' });

        process.stderr.write('\n✅ All checks passed!\n');
        process.exit(0);
      } catch (error) {
        process.stderr.write('\n❌ Checks failed!\n');
        process.exit(1);
      }
    }
    process.exit(0);
  } catch (error) {
    debugLog(`Error: ${error.stack}`);
    process.exit(0);
  }
}

main();
