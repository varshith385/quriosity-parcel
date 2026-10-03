/**
 * src/engine/targets/prediction.js - Tier 2 Target Checker (Levels 6, 9)
 * Pure function: check(level, context, answer) -> { ok, detail }
 * Accepts answer.p within 0.1 of true probability computed from sim.js.
 */

import { zeroState, applyH, probabilities } from '../../quantum/sim.js'

export function check(level, context, answer) {
  if (
    !answer ||
    typeof answer.p !== 'number' ||
    Number.isNaN(answer.p)
  ) {
    return { ok: false, detail: 'missing answer.p' }
  }

  let trueP = 0.5

  if (typeof level?.target?.expectedP === 'number') {
    trueP = level.target.expectedP
  } else if (level?.id === 6) {
    // Level 6: Looking erases. After looking sideways, collapsed state is |+> or |->.
    // Up-down lens look on |+> gives P(0) = 0.5.
    const hState = applyH(zeroState(), 'A')
    trueP = probabilities(hState, 'A')[0] // 0.5
  } else if (level?.id === 9) {
    // Level 9: Lens-changer. Predict tally for 1 or 2 presses of H on |0>.
    const presses = level?.target?.presses ?? level?.extra?.presses ?? 1
    let st = zeroState()
    for (let i = 0; i < presses; i++) {
      st = applyH(st, 'A')
    }
    trueP = probabilities(st, 'A')[0]
  }

  const diff = Math.abs(answer.p - trueP)
  if (diff <= 0.1 + 1e-9) {
    return {
      ok: true,
      detail: `Prediction ${answer.p} is within 0.1 of true probability ${trueP.toFixed(2)}`,
    }
  }

  return {
    ok: false,
    detail: `Prediction ${answer.p} is too far from true probability ${trueP.toFixed(2)} (difference is ${diff.toFixed(2)}, allowed <= 0.1)`,
  }
}
