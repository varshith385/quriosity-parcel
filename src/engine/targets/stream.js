/**
 * src/engine/targets/stream.js - Role 1 Core Target Checker
 * Target type: "stream" (Levels 16, 17, 19)
 * Pure function: check(level, context, answer) -> { ok, detail }
 */

export function check(level, context, answer) {
  if (!context || !context.sent) {
    return { ok: false, detail: 'missing context.sent' }
  }

  if (!Array.isArray(context.sent)) {
    return { ok: false, detail: 'context.sent must be an array' }
  }

  if (!answer || !Array.isArray(answer.bits)) {
    return { ok: false, detail: 'missing answer.bits array' }
  }

  const expected = context.sent
  const actual = answer.bits

  if (actual.length !== expected.length) {
    return {
      ok: false,
      detail: `Stream length mismatch: expected ${expected.length} messages, decoded ${actual.length}`,
    }
  }

  for (let i = 0; i < expected.length; i++) {
    if (actual[i] !== expected[i]) {
      return {
        ok: false,
        detail: `Stream mismatch at item ${i + 1}: expected "${expected[i]}", Bob decoded "${actual[i]}"`,
      }
    }
  }

  return {
    ok: true,
    detail: `All ${expected.length} messages decoded accurately`,
  }
}
