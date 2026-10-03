/**
 * src/engine/targets/index.js - Target Checkers Registry
 */

import { check as checkState } from './state.js'
import { check as checkMessage } from './message.js'
import { check as checkTable } from './table.js'
import { check as checkStream } from './stream.js'
import { check as checkBudget } from './budget.js'
import { check as checkCompare } from './compare.js'
import { check as checkOptimise } from './optimise.js'
import { check as checkDistinguish } from './distinguish.js'
import { check as checkPrediction } from './prediction.js'
import { check as checkClassical } from './classical.js'
import { check as checkReadings } from './readings.js'

export const targetCheckers = {
  state: checkState,
  message: checkMessage,
  table: checkTable,
  stream: checkStream,
  budget: checkBudget,
  compare: checkCompare,
  optimise: checkOptimise,
  distinguish: checkDistinguish,
  prediction: checkPrediction,
  classical: checkClassical,
  readings: checkReadings,
}

export function checkTarget(type, level, context, answer) {
  const checker = targetCheckers[type]
  if (!checker) {
    return { ok: false, detail: `Unknown target type "${type}"` }
  }
  return checker(level, context, answer)
}
