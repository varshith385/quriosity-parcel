/**
 * src/engine/targets/message.js - Role 1 Core Target Checker
 * Target type: "message" (Level 14)
 * Pure function: check(level, context, answer) -> { ok, detail }
 * Validates quantum state pair facts against target message bits:
 *   Bit 1 = 1 when pairFacts.xx is "differ" (and 0 when "agree")
 *   Bit 2 = 1 when pairFacts.zz is "differ" (and 0 when "agree")
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

  const facts = pairFacts(context.state)
  if (facts.xx === 'unsure' || facts.zz === 'unsure') {
    return {
      ok: false,
      detail: `Pair facts are unsure: XX=${facts.xx}, ZZ=${facts.zz}`,
    }
  }

  // ROLES.md Standard:
  // Bit 1 = 1 when XX is "differ" (0 when "agree")
  // Bit 2 = 1 when ZZ is "differ" (0 when "agree")
  const expectedXX = expectedBits[0] === '1' ? 'differ' : 'agree'
  const expectedZZ = expectedBits[1] === '1' ? 'differ' : 'agree'

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
