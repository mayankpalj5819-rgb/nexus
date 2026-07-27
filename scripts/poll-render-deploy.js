#!/usr/bin/env node
// Poll Render deploy status until it finishes (or fails).

const RENDER_API_KEY = 'process.env.RENDER_API_KEY';
const SERVICE_ID = 'srv-d9jbq9rtqb8s73a3jo8g';
const DEPLOY_ID = 'dep-d9jbqa3tqb8s73a3jorg';

const TERMINAL = new Set(['live', 'build_failed', 'update_failed', 'canceled', 'deactivated']);

(async () => {
  let last = '';
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys/${DEPLOY_ID}`, {
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Accept': 'application/json' },
    });
    const j = await res.json();
    const status = j.status;
    const ts = new Date().toISOString();
    if (status !== last) {
      console.log(`[${ts}] deploy status: ${status}`);
      last = status;
    } else {
      process.stdout.write('.');
    }
    if (TERMINAL.has(status)) {
      console.log('\nFinal status:', status);
      console.log('Finished at:', j.finishedAt);
      break;
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
})();
