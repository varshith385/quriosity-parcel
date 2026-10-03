/**
 * src/engine/targets/distinguish.js - Tier 2 Target Checker (Level 8)
 * Pure function: check(level, context, answer) -> { ok, detail }
 * Win when player chooses arrows that are all mutually distinguishable, maximising the count at 2.
 */

import { maxDistinguishable } from '../../quantum/sim.js'

export function check(level, context, answer) {
  if (!answer || !Array.isArray(answer.arrows)) {
    return { ok: false, detail: 'missing answer.arrows' }
  }

  const { arrows } = answer
  const count = maxDistinguishable(arrows)

  // Goal: maximise how many the reader can tell apart (win at 2).
  // If player spreads 4 arrows (0, 90, 180, 270), arrows.length > count, so reader confuses them.
  // The player wins when all submitted arrows are mutually distinguishable and equal 2.
  if (count === 2 && arrows.length === 2) {
    return {
      ok: true,
      detail: 'Successfully distinguished 2 pairwise orthogonal states',
    }
  }

  if (arrows.length > count) {
    return {
      ok: false,
      detail: `Reader confused: submitted ${arrows.length} arrows, but only ${count} can be reliably distinguished`,
    }
  }

  return {
    ok: false,
    detail: `Only ${count} arrow(s) can be distinguished; target is 2`,
  }
}
