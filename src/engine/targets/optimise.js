/**
 * src/engine/targets/optimise.js - Tier 2 Target Checker (Level 5)
 * Pure function: check(level, context, answer) -> { ok, detail }
 * Evaluates the weaker of sureness(state, "A", "ud") and sureness(state, "A", "side").
 */

import { sureness } from '../../quantum/sim.js'

export function check(level, context, answer) {
  if (!context || !context.state) {
    return { ok: false, detail: 'missing context.state' }
  }

  const { state } = context
  const threshold = level?.target?.threshold ?? 0.84

  const sureUD = sureness(state, 'A', 'ud')
  const sureSide = sureness(state, 'A', 'side')
  const weaker = Math.min(sureUD, sureSide)

  if (weaker >= threshold - 1e-6) {
    return {
      ok: true,
      detail: `Both lenses sufficiently sure: weaker is ${weaker.toFixed(4)} >= ${threshold}`,
    }
  }

  return {
    ok: false,
    detail: `Weaker lens sureness ${weaker.toFixed(4)} is below target threshold ${threshold} (ud: ${sureUD.toFixed(4)}, side: ${sureSide.toFixed(4)})`,
  }
}
