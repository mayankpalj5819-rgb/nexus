#!/usr/bin/env node
// Poll Render deploy until it finishes
const RENDER_API_KEY = 'rnd_J0cQLwplMdTvfgaWktXLL0lTPtPE';
const SERVICE_ID = 'srv-d9jbq9rtqb8s73a3jo8g';

(async () => {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys?limit=1`, {
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}` },
    });
    const j = await res.json();
    const dep = j[0].deploy;
    const status = dep.status;
    const ts = new Date().toISOString();
    process.stdout.write(`[${ts}] ${status}\n`);
    if (['live', 'build_failed', 'update_failed', 'canceled', 'deactivated'].includes(status)) {
      console.log('Final:', status);
      break;
    }
    await new Promise((r) => setTimeout(r, 20000));
  }
})();
