#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';
const ML_HEALTH_URL = process.env.ML_HEALTH_URL || 'http://localhost:5000/health';
const POLL_ATTEMPTS = 20;
const POLL_DELAY_MS = 750;

const terminalStatuses = new Set(['SCORED', 'FLAGGED', 'FAILED', 'CLEARED']);

function log(message) {
  process.stdout.write(`${message}\n`);
}

function fail(message) {
  throw new Error(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function renderTemplate(template, values) {
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`__${key}__`, value),
    template,
  );
}

async function readTemplate(relativePath) {
  return readFile(path.join(repoRoot, relativePath), 'utf8');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { response, body, text };
}

async function expectStatus(url, expectedStatus, options = {}) {
  const { response, body, text } = await requestJson(url, options);
  if (response.status !== expectedStatus) {
    fail(`Expected ${expectedStatus} from ${url}, got ${response.status}: ${text}`);
  }
  return body;
}

async function pollTransaction(txnId) {
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt++) {
    const body = await expectStatus(`${API_BASE_URL}/transactions/${txnId}`, 200);
    const status = body?.data?.status;

    if (terminalStatuses.has(status)) {
      return body;
    }

    await sleep(POLL_DELAY_MS);
  }

  fail(`Transaction ${txnId} did not reach a terminal state within the timeout window`);
}

async function main() {
  const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const txnId = `E2E${runId}`;
  const csvTxnId = `CSV${runId}`;

  log(`Smoke test starting against ${API_BASE_URL}`);

  log('1. Checking API health');
  const health = await expectStatus(`${API_BASE_URL}/health`, 200);
  if (health?.status !== 'ok') {
    fail(`Unexpected API health response: ${JSON.stringify(health)}`);
  }

  log('2. Checking simulator stats endpoint');
  const simulator = await expectStatus(`${API_BASE_URL}/health/simulator`, 200);
  if (typeof simulator?.simulatorTxnCount !== 'number') {
    fail(`Unexpected simulator response: ${JSON.stringify(simulator)}`);
  }

  log('3. Checking ML service health');
  const mlHealth = await expectStatus(ML_HEALTH_URL, 200);
  if (mlHealth?.status !== 'ok') {
    fail(`Unexpected ML health response: ${JSON.stringify(mlHealth)}`);
  }

  log('4. Creating high-risk transaction');
  const transactionTemplate = await readTemplate('test-data/transactions/high-risk.template.json');
  const transactionPayload = JSON.parse(
    renderTemplate(transactionTemplate, {
      TXN_ID: txnId,
    }),
  );

  const created = await expectStatus(`${API_BASE_URL}/transactions`, 202, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transactionPayload),
  });

  if (created?.data?.txnId !== txnId) {
    fail(`Unexpected transaction create response: ${JSON.stringify(created)}`);
  }

  log('5. Waiting for async scoring to complete');
  const scoredTxn = await pollTransaction(txnId);
  const scoredStatus = scoredTxn?.data?.status;
  if (scoredStatus !== 'FLAGGED') {
    fail(`Expected transaction ${txnId} to be FLAGGED, got ${scoredStatus}`);
  }

  log('6. Verifying duplicate protection');
  const duplicate = await requestJson(`${API_BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transactionPayload),
  });
  if (duplicate.response.status !== 409) {
    fail(`Expected duplicate create to return 409, got ${duplicate.response.status}`);
  }

  log('7. Verifying filtered list endpoint');
  const riskLevel = scoredTxn.data.riskLevel;
  const list = await expectStatus(
    `${API_BASE_URL}/transactions?riskLevel=${encodeURIComponent(riskLevel)}&page=1&limit=10&sortBy=riskScore&sortOrder=desc`,
    200,
  );
  const foundInList = Array.isArray(list?.data) && list.data.some((item) => item.txnId === txnId);
  if (!foundInList) {
    fail(`Transaction ${txnId} not found in filtered list response`);
  }

  log('8. Verifying dashboard stats endpoint');
  const stats = await expectStatus(`${API_BASE_URL}/transactions/stats`, 200);
  const countForLevel = stats?.data?.riskDistribution?.[riskLevel];
  if (typeof countForLevel !== 'number' || countForLevel < 1) {
    fail(`Stats response did not include the expected ${riskLevel} count`);
  }

  log('9. Clearing the flagged transaction');
  const cleared = await expectStatus(`${API_BASE_URL}/transactions/${txnId}/clear`, 200, {
    method: 'PATCH',
  });
  if (cleared?.data?.status !== 'CLEARED') {
    fail(`Expected CLEARED status after patch, got ${JSON.stringify(cleared)}`);
  }

  log('10. Uploading mixed CSV fixture');
  const csvTemplate = await readTemplate('test-data/uploads/mixed-transactions.template.csv');
  const csvPayload = renderTemplate(csvTemplate, {
    CSV_TXN_ID: csvTxnId,
    RUN_ID: runId,
  });

  const formData = new FormData();
  formData.set('file', new Blob([csvPayload], { type: 'text/csv' }), 'mixed-transactions.csv');

  const upload = await expectStatus(`${API_BASE_URL}/upload/csv`, 202, {
    method: 'POST',
    body: formData,
  });

  if (upload?.accepted !== 1 || upload?.rejected !== 1) {
    fail(`Unexpected upload summary: ${JSON.stringify(upload)}`);
  }

  log('11. Waiting for uploaded valid row to be scored');
  const uploadedTxn = await pollTransaction(csvTxnId);
  if (!['SCORED', 'FLAGGED', 'CLEARED'].includes(uploadedTxn?.data?.status)) {
    fail(`Unexpected uploaded transaction status: ${JSON.stringify(uploadedTxn)}`);
  }

  log('Smoke test passed');
  log(`Created transaction: ${txnId}`);
  log(`Uploaded transaction: ${csvTxnId}`);
}

main().catch((error) => {
  process.stderr.write(`Smoke test failed: ${error.message}\n`);
  process.exitCode = 1;
});
