/**
 * src/engine/targets/compare.js - Target Checker for Level 18
 * Target type: "compare"
 * Pure function: check(level, context, answer) -> { ok, detail }
 */

export function check(level, context, answer) {
  if (!answer || typeof answer.answer !== 'string') {
    return { ok: false, detail: 'missing answer.answer' }
  }

  const expected = level?.target?.expected || 'same'
  if (answer.answer === expected) {
    return { ok: true, detail: `Comparison correct: "${answer.answer}"` }
  }

  return {
    ok: false,
    detail: `Comparison incorrect: expected "${expected}", got "${answer.answer}"`,
  }
}
