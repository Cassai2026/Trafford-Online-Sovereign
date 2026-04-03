/**
 * Trafford Online Sovereign OS — AppSheet Connector
 * Logs Re-Works site data: Biffa inventory, container build progress, transport pollution
 *
 * Usage:
 *   1. In AppSheet: Settings → Integrations → Google Apps Script
 *   2. Or run as a standalone time-trigger to push AppSheet data to the API
 *
 * Script Properties required: API_BASE_URL, API_TOKEN
 */

const REWORKS_SHEET_NAME   = 'Re-Works Inventory';
const POLLUTION_SHEET_NAME = 'Transport Pollution';

function getReworksConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    apiBaseUrl: props.getProperty('API_BASE_URL') || 'https://trafford.online/api',
    apiToken:   props.getProperty('API_TOKEN')    || '',
  };
}

function reworksApiPost(path, payload) {
  const { apiBaseUrl, apiToken } = getReworksConfig();
  const res = UrlFetchApp.fetch(`${apiBaseUrl}${path}`, {
    method: 'post',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() >= 400) {
    throw new Error(`AppSheet API POST ${path} failed: ${res.getContentText()}`);
  }
  return JSON.parse(res.getContentText());
}

// ── Sync Re-Works Inventory sheet → API ──────────────────────
function syncReworksInventory() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(REWORKS_SHEET_NAME);
  if (!sheet) {
    Logger.log(`[syncReworksInventory] Sheet "${REWORKS_SHEET_NAME}" not found`);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const rows = sheet.getRange(2, 1, lastRow - 1, 9).getValues();

  let synced = 0;
  rows.forEach((row) => {
    const [itemName, source, category, quantity, unit, containerId, buildStage, co2, notes] = row;
    if (!itemName) return;
    try {
      reworksApiPost('/reworks', {
        item_name:         String(itemName).trim(),
        source:            String(source  || 'biffa').trim(),
        category:          String(category || '').trim(),
        quantity:          parseInt(quantity) || 0,
        unit:              String(unit || 'units').trim(),
        container_id:      String(containerId || '').trim(),
        build_stage:       String(buildStage  || '').trim(),
        transport_co2_kg:  parseFloat(co2) || null,
        notes:             String(notes  || '').trim(),
      });
      synced++;
    } catch (e) {
      Logger.log(`[syncReworksInventory] Error: ${e.message}`);
    }
  });
  Logger.log(`[syncReworksInventory] Synced ${synced} items`);
}

// ── Sync Transport Pollution sheet → API ─────────────────────
function syncTransportPollution() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(POLLUTION_SHEET_NAME);
  if (!sheet) {
    Logger.log(`[syncTransportPollution] Sheet "${POLLUTION_SHEET_NAME}" not found`);
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

  let synced = 0;
  rows.forEach((row) => {
    const [location, pm25, pm10, no2, co2ppm, ecoProgress, source] = row;
    if (!location) return;
    try {
      reworksApiPost('/reworks/pollution', {
        location:          String(location).trim(),
        pm25_ug_m3:        parseFloat(pm25)        || null,
        pm10_ug_m3:        parseFloat(pm10)        || null,
        no2_ug_m3:         parseFloat(no2)         || null,
        co2_ppm:           parseFloat(co2ppm)      || null,
        eco_progress_pct:  parseFloat(ecoProgress) || null,
        source:            String(source || 'manual').trim(),
      });
      synced++;
    } catch (e) {
      Logger.log(`[syncTransportPollution] Error: ${e.message}`);
    }
  });
  Logger.log(`[syncTransportPollution] Synced ${synced} pollution records`);
}

// ── Combined sync (use as AppSheet webhook target or timed trigger) ──
function syncReworksAll() {
  syncReworksInventory();
  syncTransportPollution();
  Logger.log('[syncReworksAll] Complete');
}

// ── Add to spreadsheet menu ───────────────────────────────────
function onOpenReworks() {
  SpreadsheetApp.getUi()
    .createMenu('♻️ Re-Works Sync')
    .addItem('Sync Inventory', 'syncReworksInventory')
    .addItem('Sync Pollution', 'syncTransportPollution')
    .addItem('Sync All',       'syncReworksAll')
    .addToUi();
}
