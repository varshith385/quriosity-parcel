/**
 * src/engine/targets/message.js - Role 1 Core Target Checker
 * Target type: "message" (Level 14)
 * Pure function: check(level, context, answer) -> { ok, detail }
 */

import { pairFacts } from '../../quantum/sim.js'

export function check(level, context, answer) {
  if (!context || !context.state) {
    return { ok: false, detail: 'missing context.state' }
  }

  const expectedBits = level?.target?.bits
  if (!expectedBits || expectedBits.length < 2) {
    return { ok: false, detail: 'missing level.target.bits' }
  }

  // Bit 1 = twist = shape = XX light
  // Bit 2 = flip = colour = ZZ light
  const expectedXX = expectedBits[0] === '1' ? 'differ' : 'agree'
  const expectedZZ = expectedBits[1] === '1' ? 'differ' : 'agree'

  const facts = pairFacts(context.state)

  if (facts.xx === expectedXX && facts.zz === expectedZZ) {
    return {
      ok: true,
      detail: `Lights match target message "${expectedBits}" (XX: ${facts.xx}, ZZ: ${facts.zz})`,
    }
  }

  return {
    ok: false,
    detail: `Lights do not match target message "${expectedBits}": expected XX=${expectedXX}, ZZ=${expectedZZ} but got XX=${facts.xx}, ZZ=${facts.zz}`,
  }
}
