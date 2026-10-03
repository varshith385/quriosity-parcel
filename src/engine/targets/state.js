/**
 * src/engine/targets/state.js - Role 1 Core Target Checker
 * Target type: "state" (Levels 10, 11, 12)
 * Pure function: check(level, context, answer) -> { ok, detail }
 */

import { entanglement } from '../../quantum/sim.js'

export function check(level, context, answer) {
  if (!context || !context.state) {
    return { ok: false, detail: 'missing context.state' }
  }

  const { state } = context
  const target = level?.target || {}

  // Level 12: thread present check (E > 0.99)
  if (target.thread === true || target.entanglement !== undefined) {
    const e = entanglement(state)
    const threshold = target.entanglement ?? 0.99
    if (e > threshold) {
      return {
        ok: true,
        detail: `Thread present: entanglement ${e.toFixed(4)} > ${threshold}`,
      }
    }
    return {
      ok: false,
      detail: `Thread not present: entanglement ${e.toFixed(4)} <= ${threshold}`,
    }
  }

  // Levels 10, 11: target state match (with tolerance, up to global sign)
  if (Array.isArray(target.state)) {
    const expected = target.state
    if (state.length !== expected.length) {
      return { ok: false, detail: 'State dimension mismatch' }
    }

    const diffPlus = state.every(
      (a, i) => Math.abs(a - expected[i]) < 1e-6
    )
    const diffMinus = state.every(
      (a, i) => Math.abs(a + expected[i]) < 1e-6
    )

    if (diffPlus || diffMinus) {
      return { ok: true, detail: 'State matches target' }
    }
    return { ok: false, detail: 'State does not match target' }
  }

  return { ok: false, detail: 'Unknown state target specification' }
}
