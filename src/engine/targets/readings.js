/**
 * src/engine/targets/readings.js - Tier 2 Target Checker (Level 7)
 * Pure function: check(level, context, answer) -> { ok, detail }
 * Validates target readings against state and lens.
 */

import { probabilities, probabilitiesSideways } from '../../quantum/sim.js'

export function check(level, context, answer) {
  const targetReadings =
    level?.target?.readings || level?.extra?.targetReadings || []

  // Case 1: answer provides readings array
  if (answer && Array.isArray(answer.readings)) {
    if (answer.readings.length !== targetReadings.length) {
      return {
        ok: false,
        detail: `Readings count mismatch: expected ${targetReadings.length}, got ${answer.readings.length}`,
      }
    }

    for (let i = 0; i < targetReadings.length; i++) {
      const exp = targetReadings[i]
      const act = answer.readings[i]
      if (!act || act.lens !== exp.lens || act.outcome !== exp.outcome) {
        return {
          ok: false,
          detail: `Reading ${i + 1} mismatch: expected { lens: "${exp.lens}", outcome: ${exp.outcome} }, got { lens: "${act?.lens}", outcome: ${act?.outcome} }`,
        }
      }
    }

    return {
      ok: true,
      detail: `All ${targetReadings.length} target readings matched successfully`,
    }
  }

  // Case 2: Live evaluation against context state and lens
  if (!context || !context.state) {
    return { ok: false, detail: 'missing context.state' }
  }

  const lens = context.lens || 'ud'
  const probs =
    lens === 'side'
      ? probabilitiesSideways(context.state, 'A')
      : probabilities(context.state, 'A')

  // Check if current reading satisfies the target reading at current index or any target reading
  const expectedOutcome = level?.target?.outcome ?? 0
  if (probs[expectedOutcome] > 0.99) {
    return {
      ok: true,
      detail: `Target reading in lens "${lens}" matched with certainty`,
    }
  }

  return {
    ok: false,
    detail: `State in lens "${lens}" does not guarantee target outcome ${expectedOutcome} (P = ${probs[expectedOutcome].toFixed(2)})`,
  }
}
