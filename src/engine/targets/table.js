/**
 * src/engine/targets/table.js - Role 1 Core Target Checker
 * Target type: "table" (Levels 13, 15)
 * Pure function: check(level, context, answer) -> { ok, detail }
 * Truth for Level 13 and 15 is computed dynamically from sim.js physics.
 */

import {
  makePair,
  applyX,
  applyZ,
  applyH,
  reducedProbabilities,
  pairFacts,
} from '../../quantum/sim.js'

function computeLevel13Truth(isControl) {
  if (isControl) {
    // Control: independent unentangled parcels (both prepared sideways, read up-down per ROLES.md line 146)
    // Alone each is random in the lens read; together they agree only ~50% of the time => random
    return {
      'ud.alone': 'random',
      'ud.together': 'random',
      'side.alone': 'random',
      'side.together': 'random',
    }
  }

  // Real entangled pair: Phi+
  const pair = makePair()

  // 1. Up-down lens
  const probUD = reducedProbabilities(pair, 'A', 'ud')
  const udAlone = Math.abs(probUD[0] - 0.5) < 1e-6 ? 'random' : 'sure'
  const pUDAgree = pair[0] * pair[0] + pair[3] * pair[3]
  const pUDDiffer = pair[1] * pair[1] + pair[2] * pair[2]
  const udTogether =
    pUDAgree > 0.999 ? 'agree' : pUDDiffer > 0.999 ? 'differ' : 'random'

  // 2. Sideways lens (apply H to both A and B to measure in X basis)
  const probSide = reducedProbabilities(pair, 'A', 'side')
  const sideAlone = Math.abs(probSide[0] - 0.5) < 1e-6 ? 'random' : 'sure'
  const hPair = applyH(applyH(pair, 'A'), 'B')
  const pSideAgree = hPair[0] * hPair[0] + hPair[3] * hPair[3]
  const pSideDiffer = hPair[1] * hPair[1] + hPair[2] * hPair[2]
  const sideTogether =
    pSideAgree > 0.999 ? 'agree' : pSideDiffer > 0.999 ? 'differ' : 'random'

  return {
    'ud.alone': udAlone,
    'ud.together': udTogether,
    'side.alone': sideAlone,
    'side.together': sideTogether,
  }
}

function computeLevel15Truth(rows) {
  const result = {}
  for (const row of rows) {
    let st = makePair()
    if (Array.isArray(row.moves)) {
      for (const m of row.moves) {
        if (m === 'flip') st = applyX(st, 'A')
        else if (m === 'twist') st = applyZ(st, 'A')
      }
    }
    const facts = pairFacts(st)
    result[row.id] = { zz: facts.zz, xx: facts.xx }
  }
  return result
}

export function check(level, context, answer) {
  if (!answer || typeof answer.cells !== 'object' || answer.cells === null) {
    return { ok: false, detail: 'missing answer.cells' }
  }

  const { cells } = answer
  const levelId = level?.id

  // Explicit expected cells defined in level definition
  const explicitExpected = level?.target?.cells || level?.extra?.expectedCells
  if (explicitExpected) {
    for (const k of Object.keys(explicitExpected)) {
      const expVal = explicitExpected[k]
      const actualVal = cells[k]
      if (typeof expVal === 'object' && expVal !== null) {
        if (!actualVal || typeof actualVal !== 'object') {
          return { ok: false, detail: `Cell "${k}" is missing or not an object` }
        }
        for (const subKey of Object.keys(expVal)) {
          if (actualVal[subKey] !== expVal[subKey]) {
            return {
              ok: false,
              detail: `Cell "${k}.${subKey}" mismatch: expected "${expVal[subKey]}", got "${actualVal[subKey]}"`,
            }
          }
        }
      } else if (actualVal !== expVal) {
        return {
          ok: false,
          detail: `Cell "${k}" mismatch: expected "${expVal}", got "${actualVal}"`,
        }
      }
    }
    return { ok: true, detail: 'Table matches expected cells' }
  }

  // Level 13: Fact Table (computed from sim.js)
  const isLevel13 =
    levelId === 13 ||
    level?.target?.tableKind === 'facts' ||
    'ud.alone' in cells ||
    ('ud' in cells && 'side' in cells)

  if (isLevel13) {
    const isControl = Boolean(level?.extra?.control)
    const truth = computeLevel13Truth(isControl)

    // Dotted key format: "ud.alone", "ud.together", etc.
    if ('ud.alone' in cells || 'ud.together' in cells) {
      for (const k of Object.keys(truth)) {
        if (cells[k] !== truth[k]) {
          return {
            ok: false,
            detail: `Fact table cell "${k}" incorrect: expected "${truth[k]}", got "${cells[k]}"`,
          }
        }
      }
      return { ok: true, detail: 'Fact table complete and accurate' }
    }

    // Legacy / simple format: { ud: 'agree', side: 'agree' }
    if ('ud' in cells && 'side' in cells) {
      if (cells.ud === truth['ud.together'] && cells.side === truth['side.together']) {
        return { ok: true, detail: 'Fact table complete: twins agree in both lenses' }
      }
      return {
        ok: false,
        detail: `Fact table incorrect: expected { ud: "${truth['ud.together']}", side: "${truth['side.together']}" }, got { ud: "${cells.ud}", side: "${cells.side}" }`,
      }
    }
  }

  // Level 15: Codebook (computed from sim.js)
  const isLevel15 =
    levelId === 15 ||
    level?.target?.tableKind === 'codebook' ||
    level?.extra?.codebook ||
    'nothing' in cells ||
    'flip' in cells ||
    'twist' in cells ||
    'both' in cells

  if (isLevel15) {
    const rows = level?.extra?.codebook?.rows || [
      { id: 'nothing', moves: [] },
      { id: 'flip', moves: ['flip'] },
      { id: 'twist', moves: ['twist'] },
      { id: 'both', moves: ['twist', 'flip'] },
    ]

    const truth = computeLevel15Truth(rows)

    for (const row of rows) {
      const entry = cells[row.id]
      if (!entry) {
        return { ok: false, detail: `Codebook missing entry for move "${row.id}"` }
      }
      const exp = truth[row.id]
      if (entry.zz !== exp.zz || entry.xx !== exp.xx) {
        return {
          ok: false,
          detail: `Codebook entry for "${row.id}" incorrect: expected { zz: "${exp.zz}", xx: "${exp.xx}" }, got { zz: "${entry.zz}", xx: "${entry.xx}" }`,
        }
      }
    }

    return { ok: true, detail: 'Codebook complete and accurate for all four moves' }
  }

  return { ok: false, detail: 'Unknown table structure' }
}
