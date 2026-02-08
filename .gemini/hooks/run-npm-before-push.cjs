#!/usr/bin/env node
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// メイン処理
async function main() {
  try {
    const inputData = fs.readFileSync(0, 'utf-8');
    if (!inputData) return;

    const input = JSON.parse(inputData);
    const toolName = input.tool_name || input.name;
    const toolInput = input.tool_input || input.arguments || {};
    const command = toolInput.command;

    if (command && command.includes('git push')) {
      process.stderr.write('\n🛡️ Gemini Pre-push Shield: Running checks...\n');
      
      try {
        execSync('npx tsc -b', { stdio: 'pipe' });
        execSync('npm test', { stdio: 'pipe' });
        execSync('npm run build', { stdio: 'pipe' });

        process.stderr.write('\n✅ All checks passed!\n');
        process.stdout.write(JSON.stringify({ decision: "allow" }));
        process.exit(0);
      } catch (error) {
        process.stderr.write(`\n❌ Checks failed!\n${error.stdout}\n${error.stderr}\n`);
        
        process.stdout.write(JSON.stringify({ 
          decision: "deny", 
          reason: `[npm-strict-check] failed. Please fix errors before pushing.` 
        }));
        process.exit(2);
      }
    }
    process.exit(0);
  } catch (error) {
    process.exit(0);
  }
}

main();
