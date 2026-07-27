#!/usr/bin/env node
// Poll Render deploys for a service — wait for the latest one to finish.

const RENDER_API_KEY = 'process.env.RENDER_API_KEY';
const SERVICE_ID = 'srv-d9jbq9rtqb8s73a3jo8g';

const TERMINAL = new Set(['live', 'build_failed', 'update_failed', 'canceled', 'deactivated']);

(async () => {
  // First, get the latest deploy id
  let deployId = null;
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys?limit=1`, {
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Accept': 'application/json' },
    });
    const j = await res.json();
    if (j && j[0] && j[0].deploy) {
      const d = j[0].deploy;
      // The new deploy should have a different commit id
      if (d.commit && d.commit.id && d.commit.id.startsWith('8f1e5e1')) {
        deployId = d.id;
        console.log(`[${new Date().toISOString()}] Found new deploy: ${deployId}`);
        console.log(`  commit: ${d.commit.id}`);
        console.log(`  status: ${d.status}`);
        break;
      }
    }
    await new Promise((r) => setTimeout(r, 5000));
  }

  if (!deployId) {
    console.log('Could not find new deploy. Listing recent deploys:');
    const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys?limit=3`, {
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Accept': 'application/json' },
    });
    const j = await res.json();
    j.forEach((item, i) => {
      console.log(`  ${i+1}. id=${item.deploy.id}, commit=${item.deploy.commit?.id?.slice(0,7)}, status=${item.deploy.status}`);
    });
    return;
  }

  // Poll the deploy
  let last = '';
  for (let i = 0; i < 80; i++) {
    const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/deploys/${deployId}`, {
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
      break;
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
})();
