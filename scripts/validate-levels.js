#!/usr/bin/env node
/**
 * scripts/validate-levels.js
 * Role 4: Level Validator (Plain Node ESM, no dependencies)
 * Validates level JSONs against ROLES.md 1.7, 3.2, 3.3, 7.1 and src/fixtures/extra-shapes.json.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// --- 1. CONFIG & RULES (derived from extra-shapes.json & ROLES.md) ---

export const VALID_TARGET_TYPES = [
  'state', 'message', 'table', 'stream', 'budget', 'classical',
  'sort', 'chance', 'optimise', 'prediction', 'readings', 'distinguish', 'compare'
];

export const FORBIDDEN_WORDS = [
  'holds 2 bits', 'faster than light', 'faster-than-light', 'secure channel',
  'spy detected', 'CHSH', 'error correction', 'check bits', 'lives', 'hearts'
];

export const JARGON_WORDS = ['entanglement', 'Bell', 'Hadamard', 'CNOT', 'basis'];

export const TARGET_RULES = {
  message: (target, addErr) => {
    if (typeof target.bits !== 'string' || !/^[01]+$/.test(target.bits)) {
      addErr('target.bits must be a string of 0 and 1');
    }
  },
  compare: (target, addErr) => {
    if (!['same', 'different'].includes(target.expected)) {
      addErr('target.expected must be "same" or "different"');
    }
  }
};

export const EXTRA_RULES = {
  13: {
    targetType: 'table',
    allowedExtraKeys: ['control', 'rows', 'columns', 'options'],
    validate: (extra, level, addErr) => {
      if (typeof extra.control !== 'boolean') addErr('extra.control must be a boolean');
      if (!Array.isArray(extra.rows) || extra.rows.some(r => !r?.id || typeof r?.label !== 'string')) {
        addErr('extra.rows must be an array of {id, label}');
      }
      if (!Array.isArray(extra.columns) || extra.columns.some(c => !c?.id || typeof c?.label !== 'string')) {
        addErr('extra.columns must be an array of {id, label}');
      }
      if (!Array.isArray(extra.options) || extra.options.some(o => typeof o !== 'string')) {
        addErr('extra.options must be an array of strings');
      }
    }
  },
  15: {
    targetType: 'table',
    allowedExtraKeys: ['codebook'],
    validate: (extra, level, addErr) => {
      const rows = extra.codebook?.rows;
      if (!Array.isArray(rows) || rows.length === 0) {
        addErr('extra.codebook.rows must be a non-empty array');
      } else {
        for (const row of rows) {
          if (!row?.id || !Array.isArray(row.moves)) {
            addErr('extra.codebook row must have id and moves array');
          } else if (row.moves.some(m => !['flip', 'twist'].includes(m))) {
            addErr(`extra.codebook row ${row.id} moves must only be "flip" or "twist"`);
          }
        }
      }
    }
  },
  16: {
    targetType: 'stream',
    allowedExtraKeys: ['messages'],
    validate: (extra, level, addErr) => {
      if (!Array.isArray(extra.messages) || extra.messages.length === 0 || extra.messages.some(m => typeof m !== 'string' || !/^[01]+$/.test(m))) {
        addErr('extra.messages must be a non-empty array of bit-strings');
      }
    }
  },
  17: {
    targetType: 'stream',
    allowedExtraKeys: ['messages'],
    validate: (extra, level, addErr) => {
      if (!Array.isArray(extra.messages) || extra.messages.length === 0 || extra.messages.some(m => typeof m !== 'string' || !/^[01]+$/.test(m))) {
        addErr('extra.messages must be a non-empty array of bit-strings');
      }
    }
  },
  18: {
    targetType: 'compare',
    allowedExtraKeys: ['spyMessages'],
    validate: (extra, level, addErr) => {
      if (!Array.isArray(extra.spyMessages) || extra.spyMessages.length === 0 || extra.spyMessages.some(m => typeof m !== 'string' || !/^[01]+$/.test(m))) {
        addErr('extra.spyMessages must be a non-empty array of bit-strings');
      }
    }
  },
  19: {
    targetType: 'stream',
    allowedExtraKeys: ['messages'],
    validate: (extra, level, addErr) => {
      if (!Array.isArray(extra.messages) || extra.messages.length === 0 || extra.messages.some(m => typeof m !== 'string' || !/^[01]+$/.test(m))) {
        addErr('extra.messages must be a non-empty array of bit-strings');
      }
      if (!level.transit || !['X', 'Z', 'XZ'].includes(level.transit.road)) {
        addErr('level 19 requires transit.road to be exactly "X", "Z", or "XZ"');
      }
    }
  },
  20: {
    targetType: 'budget',
    allowedExtraKeys: ['messages', 'budget'],
    validate: (extra, level, addErr, addWarn) => {
      if (!Array.isArray(extra.messages) || extra.messages.length === 0) {
        addErr('extra.messages must be a non-empty array of {id, bits}');
        return;
      }
      const ids = new Set();
      for (const m of extra.messages) {
        if (!m || typeof m.id !== 'string' || typeof m.bits !== 'string' || !/^[01]+$/.test(m.bits)) {
          addErr(`invalid message format in level 20: ${JSON.stringify(m)}`);
        }
        if (ids.has(m?.id)) addErr(`duplicate message id "${m.id}" in level 20`);
        ids.add(m?.id);
      }
      const b = extra.budget;
      if (!b || typeof b.parcels !== 'number' || b.parcels < 0 || typeof b.twins !== 'number' || b.twins < 0) {
        addErr('extra.budget must specify non-negative numbers for parcels and twins');
        return;
      }
      // Winnability check: verify budget suffices with optimal twin assignment
      const totalBits = extra.messages.reduce((s, m) => s + (m?.bits?.length || 0), 0);
      const pairsAvailable = extra.messages.reduce((s, m) => s + Math.floor((m?.bits?.length || 0) / 2), 0);
      const twinsUsable = Math.min(b.twins, pairsAvailable);
      const minParcels = totalBits - twinsUsable;

      if (b.parcels < minParcels) {
        addErr(`level 20 unwinnable: parcels (${b.parcels}) < minimum required (${minParcels})`);
      } else if (b.parcels > minParcels) {
        addWarn(`level 20 budget too loose: parcels (${b.parcels}) > minimum required (${minParcels}), twins no longer matter`);
      }
    }
  }
};

// --- 2. VALIDATION HELPERS ---

function containsWord(text, word) {
  if (!text || typeof text !== 'string') return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

function validateSchema(level, addErr) {
  // Required fields per ROLES.md 3.2
  if (!Number.isInteger(level.id)) addErr('id must be an integer');
  if (!Number.isInteger(level.act) || level.act < 1 || level.act > 5) addErr('act must be an integer 1-5');
  if (!Number.isInteger(level.tier) || level.tier < 1 || level.tier > 4) addErr('tier must be an integer 1-4');
  if (typeof level.title !== 'string' || !level.title.trim()) addErr('title must be a non-empty string');
  if (!['dial', 'pair', 'post'].includes(level.mode)) addErr('mode must be "dial", "pair", or "post"');
  if (typeof level.goalLine !== 'string' || !level.goalLine.trim()) addErr('goalLine must be a non-empty string');
  if (!level.target || typeof level.target !== 'object' || typeof level.target.type !== 'string') {
    addErr('target must be an object with a "type" property');
  } else if (!VALID_TARGET_TYPES.includes(level.target.type)) {
    addErr(`invalid target.type "${level.target.type}"`);
  }
  if (typeof level.par !== 'number' || isNaN(level.par)) addErr('par must be a valid number');
  if (typeof level.removePhysicsNote !== 'string' || !level.removePhysicsNote.trim()) {
    addErr('removePhysicsNote must be a non-empty string');
  }

  // Optional fields: validate shape when present
  if (level.newWords !== undefined && (!Array.isArray(level.newWords) || level.newWords.some(w => typeof w !== 'string'))) {
    addErr('newWords must be an array of strings');
  }
  if (level.tools !== undefined && (!Array.isArray(level.tools) || level.tools.some(t => !['flip', 'twist', 'lens', 'linker', 'unmake'].includes(t)))) {
    addErr('tools must be an array of valid tools');
  }
  if (level.lenses !== undefined && (!Array.isArray(level.lenses) || level.lenses.some(l => !['ud', 'side'].includes(l)))) {
    addErr('lenses must be an array of "ud" or "side"');
  }
  if (level.lockedQubits !== undefined && (!Array.isArray(level.lockedQubits) || level.lockedQubits.some(q => !['A', 'B'].includes(q)))) {
    addErr('lockedQubits must be an array of "A" or "B"');
  }
  if (level.phases !== undefined && (!Array.isArray(level.phases) || level.phases.some(p => !['alice', 'transit', 'bob'].includes(p)))) {
    addErr('phases must be an array of "alice", "transit", "bob"');
  }
  if (level.start !== undefined && (typeof level.start !== 'object' || !['zero', 'dial', 'pair'].includes(level.start.kind))) {
    addErr('start must be an object with kind in "zero", "dial", "pair"');
  }
  if (level.transit !== undefined && (typeof level.transit !== 'object' || typeof level.transit.spy !== 'boolean' || (level.transit.road !== null && !['X', 'Z', 'XZ'].includes(level.transit.road)))) {
    addErr('transit must have boolean spy and road in null, "X", "Z", "XZ"');
  }
  if (level.hints !== undefined && (!Array.isArray(level.hints) || level.hints.some(h => typeof h?.afterFailures !== 'number' || typeof h?.text !== 'string'))) {
    addErr('hints must be an array of {afterFailures, text}');
  }
  if (level.events !== undefined && (typeof level.events !== 'object' || Array.isArray(level.events) || Object.values(level.events).some(v => typeof v !== 'string'))) {
    addErr('events must be an object of string values');
  }
  if (level.extra !== undefined && (typeof level.extra !== 'object' || Array.isArray(level.extra) || level.extra === null)) {
    addErr('extra must be an object');
  }
  if (level.physicsCheck !== undefined && typeof level.physicsCheck !== 'string') {
    addErr('physicsCheck must be a string');
  }
}

function validateTextRules(level, addErr, addWarn) {
  // Prohibited misconceptions per ROLES.md 1.7
  const textFields = [
    { name: 'title', val: level.title },
    { name: 'goalLine', val: level.goalLine },
    { name: 'removePhysicsNote', val: level.removePhysicsNote },
    ...(level.hints || []).map((h, i) => ({ name: `hints[${i}].text`, val: h.text })),
    ...Object.entries(level.events || {}).map(([k, v]) => ({ name: `events.${k}`, val: v }))
  ];

  for (const { name, val } of textFields) {
    for (const bad of FORBIDDEN_WORDS) {
      if (containsWord(val, bad)) addErr(`forbidden phrase "${bad}" found in ${name}`);
    }
  }

  // Wording warnings per ROLES.md 7.1
  if (level.goalLine && level.goalLine.length > 90) {
    addWarn(`goalLine is longer than 90 characters (${level.goalLine.length})`);
  }
  for (const jargon of JARGON_WORDS) {
    if (containsWord(level.goalLine, jargon)) addWarn(`goalLine contains jargon word "${jargon}"`);
    if (containsWord(level.title, jargon)) addWarn(`title contains jargon word "${jargon}"`);
  }
  if (!level.hints || !Array.isArray(level.hints) || level.hints.length === 0) {
    addWarn('hints is missing or empty');
  }
}

function validateLevelFile(file, content, orderList, addErr, addWarn) {
  let level;
  try {
    level = JSON.parse(content);
  } catch (e) {
    addErr(`invalid JSON: ${e.message}`);
    return;
  }

  // Filename vs ID consistency
  const filenameNum = parseInt(path.basename(file, '.json'), 10);
  if (isNaN(filenameNum) || filenameNum !== level.id) {
    addErr(`filename number (${filenameNum}) != id field (${level.id})`);
  }
  if (!orderList.includes(level.id)) {
    addErr(`level id ${level.id} is not listed in index.json`);
  }

  validateSchema(level, addErr);
  validateTextRules(level, addErr, addWarn);

  if (level.target?.type && TARGET_RULES[level.target.type]) {
    TARGET_RULES[level.target.type](level.target, addErr);
  }

  const extraRule = EXTRA_RULES[level.id];
  if (extraRule) {
    if (extraRule.targetType && level.target?.type !== extraRule.targetType) {
      addErr(`level ${level.id} requires target.type "${extraRule.targetType}", got "${level.target?.type}"`);
    }
    if (!level.extra) {
      addErr(`extra object is required for level ${level.id}`);
    } else {
      extraRule.validate(level.extra, level, addErr, addWarn);
      for (const k of Object.keys(level.extra)) {
        if (!extraRule.allowedExtraKeys.includes(k)) addWarn(`unknown extra field "${k}"`);
      }
    }
  }
}

// --- 3. MAIN RUNNER ---

export function main() {
  const customTarget = process.argv[2];
  const levelsDir = customTarget && fs.existsSync(customTarget) && fs.statSync(customTarget).isDirectory()
    ? path.resolve(customTarget)
    : path.join(rootDir, 'src', 'levels');

  let errorCount = 0;
  let warnCount = 0;
  let checkedCount = 0;

  const logErr = (fn, msg) => { console.log(`ERROR ${fn}: ${msg}`); errorCount++; };
  const logWarn = (fn, msg) => { console.log(`WARNING ${fn}: ${msg}`); warnCount++; };

  // Single file direct validation support
  if (customTarget && fs.existsSync(customTarget) && fs.statSync(customTarget).isFile()) {
    const content = fs.readFileSync(customTarget, 'utf-8');
    const fn = path.basename(customTarget);
    checkedCount = 1;
    validateLevelFile(fn, content, [parseInt(fn, 10) || 14], (m) => logErr(fn, m), (m) => logWarn(fn, m));
    console.log(`\n${checkedCount} files checked, ${errorCount} errors, ${warnCount} warnings`);
    process.exit(errorCount > 0 ? 1 : 0);
  }

  // 1. Read index.json
  const indexPath = path.join(levelsDir, 'index.json');
  if (!fs.existsSync(indexPath)) {
    logErr('index.json', 'missing src/levels/index.json');
    console.log(`\n0 files checked, ${errorCount} errors, ${warnCount} warnings`);
    process.exit(1);
  }

  let indexData;
  try {
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch (e) {
    logErr('index.json', `invalid JSON: ${e.message}`);
    console.log(`\n0 files checked, ${errorCount} errors, ${warnCount} warnings`);
    process.exit(1);
  }

  const order = indexData.order;
  const isUnique1to20 = Array.isArray(order) &&
    order.length === 20 &&
    new Set(order).size === 20 &&
    order.every(id => Number.isInteger(id) && id >= 1 && id <= 20);

  if (!isUnique1to20) {
    logErr('index.json', '"order" must be an array of unique integers 1..20');
  }

  // 2. Check for missing level files per order
  if (Array.isArray(order)) {
    for (const id of order) {
      const p1 = path.join(levelsDir, `${id}.json`);
      const p2 = path.join(levelsDir, `${String(id).padStart(2, '0')}.json`);
      if (!fs.existsSync(p1) && !fs.existsSync(p2)) {
        logWarn(`${id}.json`, 'not written yet');
      }
    }
  }

  // 3. Validate every existing *.json except index.json
  const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  for (const file of files) {
    checkedCount++;
    const content = fs.readFileSync(path.join(levelsDir, file), 'utf-8');
    validateLevelFile(file, content, order || [], (m) => logErr(file, m), (m) => logWarn(file, m));
  }

  console.log(`\n${checkedCount} files checked, ${errorCount} errors, ${warnCount} warnings`);
  process.exit(errorCount > 0 ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
