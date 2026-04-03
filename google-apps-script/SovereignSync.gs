/**
 * Trafford Online Sovereign OS — Google Apps Script Library
 * Bi-directional sync: "High-Value Node Tracker" Google Sheet ↔ GitHub DB (via API)
 *
 * Usage:
 *   1. Open your Google Sheet → Extensions → Apps Script
 *   2. Paste this file as the main script
 *   3. Set Script Properties: API_BASE_URL, API_TOKEN
 *   4. Create a time-driven trigger for `syncAll` (e.g. every hour)
 */

// ── Configuration ────────────────────────────────────────────
const SHEET_NAME = 'High-Value Node Tracker';
const HEADERS    = ['UUID', 'Name', 'Bio-ROI', 'Skills (I Can)', 'Constraints (I Don\'t)', 'Reputation Score', 'Last Synced'];

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    apiBaseUrl: props.getProperty('API_BASE_URL') || 'https://trafford.online/api',
    apiToken:   props.getProperty('API_TOKEN')    || '',
  };
}

// ── Helpers ──────────────────────────────────────────────────
function apiGet(path) {
  const { apiBaseUrl, apiToken } = getConfig();
  const res = UrlFetchApp.fetch(`${apiBaseUrl}${path}`, {
    method: 'get',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error(`API GET ${path} failed: ${res.getContentText()}`);
  }
  return JSON.parse(res.getContentText());
}

function apiPost(path, payload) {
  const { apiBaseUrl, apiToken } = getConfig();
  const res = UrlFetchApp.fetch(`${apiBaseUrl}${path}`, {
    method: 'post',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 400) {
    throw new Error(`API POST ${path} failed: ${res.getContentText()}`);
  }
  return JSON.parse(res.getContentText());
}

function getOrCreateSheet() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  let   sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// ── Pull from DB → Sheet ─────────────────────────────────────
function pullNodesToSheet() {
  const sheet = getOrCreateSheet();
  const { data: nodes } = apiGet('/nodes');

  // Build a lookup of existing UUIDs in the sheet
  const lastRow = sheet.getLastRow();
  const existingUUIDs = lastRow > 1
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat()
    : [];

  const now = new Date().toISOString();
  nodes.forEach((node) => {
    const row = [
      node.uuid,
      node.name,
      node.bio_roi || '',
      Array.isArray(node.skills) ? node.skills.join(', ') : '',
      Array.isArray(node.constraints) ? node.constraints.join(', ') : '',
      node.reputation_score,
      now,
    ];
    const idx = existingUUIDs.indexOf(node.uuid);
    if (idx === -1) {
      sheet.appendRow(row);
      existingUUIDs.push(node.uuid);
    } else {
      sheet.getRange(idx + 2, 1, 1, HEADERS.length).setValues([row]);
    }
  });
  Logger.log(`[pullNodesToSheet] Synced ${nodes.length} nodes`);
}

// ── Push Sheet changes → DB ──────────────────────────────────
function pushSheetChangesToDB() {
  const sheet   = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const rows = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  let pushed = 0;
  rows.forEach((row) => {
    const [uuid, name, bioRoi, skillsRaw, constraintsRaw] = row;
    if (!name) return; // skip empty rows
    const payload = {
      name,
      bio_roi: bioRoi,
      skills: skillsRaw ? String(skillsRaw).split(',').map((s) => s.trim()).filter(Boolean) : [],
      constraints: constraintsRaw ? String(constraintsRaw).split(',').map((s) => s.trim()).filter(Boolean) : [],
    };
    if (uuid) {
      // Existing node — PATCH
      try {
        apiPost(`/nodes/${uuid}`, { ...payload, _method: 'PATCH' });
        pushed++;
      } catch (e) {
        Logger.log(`[pushSheetChangesToDB] PATCH failed for ${uuid}: ${e.message}`);
      }
    } else {
      // New row — POST
      try {
        const { data } = apiPost('/nodes', payload);
        // Write the assigned UUID back to the sheet
        const rowIdx = rows.indexOf(row) + 2;
        sheet.getRange(rowIdx, 1).setValue(data.uuid);
        pushed++;
      } catch (e) {
        Logger.log(`[pushSheetChangesToDB] POST failed: ${e.message}`);
      }
    }
  });
  Logger.log(`[pushSheetChangesToDB] Pushed ${pushed} rows`);
}

// ── Full bi-directional sync ──────────────────────────────────
function syncAll() {
  pullNodesToSheet();
  pushSheetChangesToDB();
  SpreadsheetApp.getActiveSpreadsheet().toast('Sovereign Node sync complete ✓', 'Sync', 5);
}

// ── Spreadsheet menu ─────────────────────────────────────────
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🌍 Sovereign Sync')
    .addItem('Pull from DB',   'pullNodesToSheet')
    .addItem('Push to DB',     'pushSheetChangesToDB')
    .addItem('Sync All (↕)',   'syncAll')
    .addToUi();
}
