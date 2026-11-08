#!/usr/bin/env node

/**
 * Script Pengukur Latency & Cold Start
 * Posyandu Terpadu - Vercel Container Services Spike
 *
 * Penggunaan:
 *   node scripts/measure.mjs [BASE_URL]
 * Contoh:
 *   node scripts/measure.mjs http://localhost:8080
 *   node scripts/measure.mjs https://posyandu-terpadu-preview.vercel.app
 */

const baseUrl = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');

const endpoints = [
  { name: 'Backend Health Check', path: '/up', method: 'GET' },
  { name: 'Backend Auth (Throttle / Login Ping)', path: '/api/login', method: 'POST', body: JSON.stringify({ email: 'ping@test.local', password: 'test' }) },
  { name: 'Frontend SPA Root', path: '/', method: 'GET' },
  { name: 'Frontend SPA Route (Catch-all check)', path: '/children', method: 'GET' },
];

async function measureRequest(endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  const start = performance.now();
  try {
    const res = await fetch(url, {
      method: endpoint.method,
      headers: {
        'Accept': 'application/json, text/html, */*',
        ...(endpoint.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: endpoint.body,
    });
    const duration = performance.now() - start;
    return {
      name: endpoint.name,
      path: endpoint.path,
      status: res.status,
      durationMs: duration.toFixed(2),
      ok: res.status < 500,
    };
  } catch (err) {
    const duration = performance.now() - start;
    return {
      name: endpoint.name,
      path: endpoint.path,
      status: 'CONN_ERR',
      durationMs: duration.toFixed(2),
      error: err.message,
      ok: false,
    };
  }
}

async function run() {
  console.log(`========================================================`);
  console.log(` POSYANDU TERPADU - BENCHMARK & LATENCY MEASUREMENT`);
  console.log(` Target Base URL: ${baseUrl}`);
  console.log(` Waktu          : ${new Date().toISOString()}`);
  console.log(`========================================================\n`);

  // Run 1: Cold start check
  console.log(`--- [RUN 1] Cold Start Measurement ---`);
  for (const ep of endpoints) {
    const result = await measureRequest(ep);
    console.log(`[${result.status}] ${ep.name.padEnd(35)} ${ep.path.padEnd(15)} : ${result.durationMs} ms ${result.error ? `(${result.error})` : ''}`);
  }

  // Run 2: Warm measurement
  console.log(`\n--- [RUN 2] Warm Latency Measurement ---`);
  for (const ep of endpoints) {
    const result = await measureRequest(ep);
    console.log(`[${result.status}] ${ep.name.padEnd(35)} ${ep.path.padEnd(15)} : ${result.durationMs} ms ${result.error ? `(${result.error})` : ''}`);
  }

  console.log(`\n========================================================`);
}

run();
