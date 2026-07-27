#!/usr/bin/env node
// Create a Render web service for Nexus via the Render API.

const RENDER_API_KEY = 'process.env.RENDER_API_KEY';
const GITHUB_REPO = 'https://github.com/mayankpalj5819-rgb/nexus';

const body = {
  ownerId: 'tea-d8rq9augvqtc73fd3a00',
  type: 'web_service',
  autoDeploy: 'yes',
  name: 'nexus',
  repo: GITHUB_REPO,
  branch: 'main',
  serviceDetails: {
    envSpecificDetails: {
      buildCommand: 'npm install && npm run build',
      startCommand: 'npm run start',
    },
    runtime: 'node',
    plan: 'free',
    region: 'oregon',
    healthCheckPath: '/',
    numInstances: 1,
  },
  envVars: [
    { key: 'NODE_VERSION', value: '20.11.1' },
    { key: 'NEXT_PUBLIC_SUPABASE_URL', value: 'https://mxfbotvszuegnzuefznw.supabase.co' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    { key: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY },
    { key: 'GOOGLE_CLIENT_ID', value: process.env.GOOGLE_CLIENT_ID },
    { key: 'GOOGLE_CLIENT_SECRET', value: 'process.env.GOOGLE_CLIENT_SECRET' },
    { key: 'NEXT_PUBLIC_APP_URL', value: 'https://nexus.onrender.com' },
  ],
};

(async () => {
  console.log('Creating Render service...');
  const res = await fetch('https://api.render.com/v1/services', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RENDER_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`Status: ${res.status}`);
  try {
    const j = JSON.parse(text);
    console.log(JSON.stringify(j, null, 2));
  } catch {
    console.log('Raw body:', text);
  }
})();
