#!/usr/bin/env node
const { spawn } = require('child_process');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => out += d);
    p.stderr.on('data', d => out += d);
    p.on('close', code => {
      resolve({ code, out });
    });
  });
}

(async function main(){
  try {
    const { code, out } = await run('pnpm', ['audit','--json']);
    // pnpm audit returns 0 even when vulnerabilities exist; parse json output
    let data = null;
    try { data = JSON.parse(out); } catch (e) {
      console.error('Failed to parse pnpm audit output');
      console.error(out);
      process.exit(2);
    }
    const vul = (data && data.metadata && data.metadata.vulnerabilities) || {};
    const high = vul.high || 0;
    const critical = vul.critical || 0;
    console.log(`Vulnerabilities: low=${vul.low||0} moderate=${vul.moderate||0} high=${high} critical=${critical}`);
    if (high > 0 || critical > 0) {
      console.error('High or critical vulnerabilities detected — failing CI.');
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
})();
