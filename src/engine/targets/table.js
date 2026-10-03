/**
 * src/engine/targets/table.js - Role 1 Core Target Checker
 * Target type: "table" (Levels 13, 15)
 * Pure function: check(level, context, answer) -> { ok, detail }
 */

export function check(level, context, answer) {
  if (!answer || typeof answer.cells !== 'object' || answer.cells === null) {
    return { ok: false, detail: 'missing answer.cells' }
  }

  const { cells } = answer
  const levelId = level?.id

  // Check for explicit expected cells in level definition first
  const expectedCells = level?.target?.cells || level?.extra?.expectedCells
  if (expectedCells) {
    const keys = Object.keys(expectedCells)
    for (const k of keys) {
      const expVal = expectedCells[k]
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

  // Level 13: Twins' facts (both lenses agree)
  if (levelId === 13 || level?.target?.tableKind === 'facts' || ('ud' in cells && 'side' in cells)) {
    if (cells.ud === 'agree' && cells.side === 'agree') {
      return { ok: true, detail: 'Fact table complete: twins agree in both lenses' }
    }
    return {
      ok: false,
      detail: `Fact table incorrect: expected { ud: "agree", side: "agree" }, got { ud: "${cells.ud}", side: "${cells.side}" }`,
    }
  }

  // Level 15: Codebook (mapping four moves to ZZ and XX lights)
  if (levelId === 15 || level?.target?.tableKind === 'codebook' || ('nothing' in cells || 'flip' in cells || 'twist' in cells || 'both' in cells)) {
    const expectedMoves = {
      nothing: { zz: 'agree', xx: 'agree' },
      flip: { zz: 'differ', xx: 'agree' },
      twist: { zz: 'agree', xx: 'differ' },
      both: { zz: 'differ', xx: 'differ' },
    }

    for (const move of Object.keys(expectedMoves)) {
      const entry = cells[move]
      if (!entry) {
        return { ok: false, detail: `Codebook missing entry for move "${move}"` }
      }
      const exp = expectedMoves[move]
      if (entry.zz !== exp.zz || entry.xx !== exp.xx) {
        return {
          ok: false,
          detail: `Codebook entry for "${move}" incorrect: expected { zz: "${exp.zz}", xx: "${exp.xx}" }, got { zz: "${entry.zz}", xx: "${entry.xx}" }`,
        }
      }
    }

    return { ok: true, detail: 'Codebook complete and accurate for all four moves' }
  }

  return { ok: false, detail: 'Unknown table structure' }
}
