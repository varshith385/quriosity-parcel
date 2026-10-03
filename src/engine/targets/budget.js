/**
 * src/engine/targets/budget.js - Role 1 Core Target Checker
 * Target type: "budget" (Level 20)
 * Pure function: check(level, context, answer) -> { ok, detail }
 */

export function check(level, context, answer) {
  if (!answer || !Array.isArray(answer.plan)) {
    return { ok: false, detail: 'missing answer.plan array' }
  }

  const messages = level?.target?.messages || level?.extra?.messages || []
  if (!Array.isArray(messages) || messages.length === 0) {
    return { ok: false, detail: 'missing level messages' }
  }

  const parcelBudget = level?.target?.parcelBudget ?? level?.extra?.parcelBudget ?? Infinity
  const twinBudget = level?.target?.twinBudget ?? level?.extra?.twinBudget ?? Infinity

  const plan = answer.plan
  const parcelsUsed = plan.length
  if (parcelsUsed > parcelBudget) {
    return {
      ok: false,
      detail: `Parcel budget exceeded: used ${parcelsUsed}, max allowed is ${parcelBudget}`,
    }
  }

  const twinsUsed = plan.filter((p) => Boolean(p.useTwin)).length
  if (twinsUsed > twinBudget) {
    return {
      ok: false,
      detail: `Twin budget exceeded: used ${twinsUsed}, max allowed is ${twinBudget}`,
    }
  }

  const messageMap = new Map(messages.map((m) => [m.id, m]))
  const chunksByMessage = new Map()
  for (const m of messages) {
    chunksByMessage.set(m.id, [])
  }

  for (let i = 0; i < plan.length; i++) {
    const step = plan[i]
    if (!step || typeof step !== 'object') {
      return { ok: false, detail: `Plan entry ${i + 1} is invalid` }
    }

    const { messageId, chunk, useTwin } = step
    if (!messageMap.has(messageId)) {
      return {
        ok: false,
        detail: `Unknown messageId "${messageId}" in plan entry ${i + 1}`,
      }
    }

    if (typeof chunk !== 'string' || chunk.length === 0) {
      return {
        ok: false,
        detail: `Empty or non-string chunk in plan entry ${i + 1}`,
      }
    }

    if (!useTwin && chunk.length > 1) {
      return {
        ok: false,
        detail: `Parcel without twin in plan entry ${i + 1} exceeds 1 bit capacity (chunk "${chunk}")`,
      }
    }

    if (useTwin && chunk.length > 2) {
      return {
        ok: false,
        detail: `Parcel with twin in plan entry ${i + 1} exceeds 2 bits capacity (chunk "${chunk}")`,
      }
    }

    chunksByMessage.get(messageId).push(chunk)
  }

  for (const m of messages) {
    const delivered = chunksByMessage.get(m.id).join('')
    if (delivered !== m.bits) {
      return {
        ok: false,
        detail: `Message "${m.id}" incomplete or mismatched: expected "${m.bits}", delivered "${delivered}"`,
      }
    }
  }

  const totalBits = messages.reduce((sum, m) => sum + m.bits.length, 0)
  const bitsPerParcel = parcelsUsed > 0 ? (totalBits / parcelsUsed).toFixed(2) : '0'

  return {
    ok: true,
    detail: `Delivered all messages: ${totalBits} bits in ${parcelsUsed} parcels with ${twinsUsed} twins (${bitsPerParcel} bits/parcel)`,
  }
}
