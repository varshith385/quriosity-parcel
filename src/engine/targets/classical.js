/**
 * src/engine/targets/classical.js - Tier 2 Target Checker (Levels 1, 2)
 * Pure function: check(level, context, answer) -> { ok, detail }
 * Verifies sent classical bits match target and stay within parcel budget.
 */

export function check(level, context, answer) {
  if (!answer || typeof answer.bits !== 'string') {
    return { ok: false, detail: 'missing answer.bits' }
  }

  const expected = level?.target?.bits
  if (typeof expected !== 'string') {
    return { ok: false, detail: 'missing level.target.bits' }
  }

  if (answer.bits !== expected) {
    return {
      ok: false,
      detail: `Sent bits "${answer.bits}" do not match target "${expected}"`,
    }
  }

  const parcelBudget =
    level?.target?.parcelBudget ??
    level?.extra?.parcelBudget ??
    level?.target?.parcels

  if (typeof parcelBudget === 'number' && answer.bits.length > parcelBudget) {
    return {
      ok: false,
      detail: `Parcel budget exceeded: sent ${answer.bits.length} bits in parcels, allowed ${parcelBudget}`,
    }
  }

  return {
    ok: true,
    detail: `Classical message "${answer.bits}" delivered successfully`,
  }
}
