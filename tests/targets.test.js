import { describe, it, expect } from 'vitest'
import {
  makePair,
  zeroState,
  encode,
  dialState,
  applyX,
  applyZ,
} from '../src/quantum/sim.js'
import { check as checkState } from '../src/engine/targets/state.js'
import { check as checkMessage } from '../src/engine/targets/message.js'
import { check as checkTable } from '../src/engine/targets/table.js'
import { check as checkStream } from '../src/engine/targets/stream.js'
import { check as checkBudget } from '../src/engine/targets/budget.js'

describe('Tier 1 Checker: state.js', () => {
  it('safely handles missing context.state', () => {
    const res = checkState({ target: { thread: true } }, null, {})
    expect(res).toEqual({ ok: false, detail: 'missing context.state' })
  })

  it('checks thread presence for Level 12 (E > 0.99)', () => {
    const level = { id: 12, target: { type: 'state', thread: true } }
    const pair = makePair()
    expect(checkState(level, { state: pair }, {})).toMatchObject({ ok: true })

    const separable = zeroState()
    expect(checkState(level, { state: separable }, {})).toMatchObject({ ok: false })
  })

  it('checks target state match for Levels 10/11', () => {
    const level = { id: 10, target: { type: 'state', state: [0, 0, 1, 0] } }
    expect(checkState(level, { state: [0, 0, 1, 0] }, {})).toMatchObject({ ok: true })
    // Global sign match
    expect(checkState(level, { state: [0, 0, -1, 0] }, {})).toMatchObject({ ok: true })
    // Mismatch
    expect(checkState(level, { state: [1, 0, 0, 0] }, {})).toMatchObject({ ok: false })
  })
})

describe('Tier 1 Checker: message.js', () => {
  it('safely handles missing context.state', () => {
    const res = checkMessage({ target: { type: 'message', bits: '10' } }, {}, {})
    expect(res).toEqual({ ok: false, detail: 'missing context.state' })
  })

  it('for each message in 00, 01, 10, 11, encode(makePair(), bits) passes its own target and fails the other three', () => {
    const messages = ['00', '01', '10', '11']
    const pair = makePair()

    for (const bits of messages) {
      const state = encode(pair, bits)
      for (const targetBits of messages) {
        const level = { id: 14, target: { type: 'message', bits: targetBits } }
        const res = checkMessage(level, { state }, {})
        if (targetBits === bits) {
          expect(res.ok).toBe(true)
        } else {
          expect(res.ok).toBe(false)
        }
      }
    }
  })

  it('for target "10", the state after only a flip (message 01) FAILS and after only a twist (message 10) PASSES', () => {
    const pair = makePair()
    const target10 = { id: 14, target: { type: 'message', bits: '10' } }

    // After only a flip (applyX on Alice => message "01", XX agree, ZZ differ)
    const flipOnlyState = applyX(pair, 'A')
    const flipRes = checkMessage(target10, { state: flipOnlyState }, {})
    expect(flipRes.ok).toBe(false)

    // After only a twist (applyZ on Alice => message "10", XX differ, ZZ agree)
    const twistOnlyState = applyZ(pair, 'A')
    const twistRes = checkMessage(target10, { state: twistOnlyState }, {})
    expect(twistRes.ok).toBe(true)
  })

  it('|00> and a dial state fail with unsure', () => {
    const target = { id: 14, target: { type: 'message', bits: '10' } }

    const zero = zeroState() // |00>
    const zeroRes = checkMessage(target, { state: zero }, {})
    expect(zeroRes.ok).toBe(false)
    expect(zeroRes.detail).toContain('unsure')

    const dial = dialState(45)
    const dialRes = checkMessage(target, { state: dial }, {})
    expect(dialRes.ok).toBe(false)
    expect(dialRes.detail).toContain('unsure')
  })

  it('a checker call with moveCount > 0 and a non-winning state still fails', () => {
    const target = { id: 14, target: { type: 'message', bits: '10' } }
    const pair = makePair()
    const wrongState = encode(pair, '01') // flip instead of twist

    const res = checkMessage(target, { state: wrongState, moveCount: 5 }, {})
    expect(res.ok).toBe(false)

    // Even on zero state with moveCount > 0
    const zeroRes = checkMessage(target, { state: zeroState(), moveCount: 2 }, {})
    expect(zeroRes.ok).toBe(false)
    expect(zeroRes.detail).toContain('unsure')
  })
})

describe('Tier 1 Checker: table.js', () => {
  it('safely handles missing answer.cells', () => {
    const res = checkTable({ id: 13 }, {}, {})
    expect(res).toEqual({ ok: false, detail: 'missing answer.cells' })
  })

  it('validates fact table for Level 13', () => {
    const level = { id: 13, target: { type: 'table' } }
    const correct = { cells: { ud: 'agree', side: 'agree' } }
    expect(checkTable(level, {}, correct)).toMatchObject({ ok: true })

    const wrong = { cells: { ud: 'differ', side: 'agree' } }
    expect(checkTable(level, {}, wrong)).toMatchObject({ ok: false })
  })

  it('validates codebook for Level 15', () => {
    const level = { id: 15, target: { type: 'table' } }
    const correct = {
      cells: {
        nothing: { zz: 'agree', xx: 'agree' },
        flip: { zz: 'differ', xx: 'agree' },
        twist: { zz: 'agree', xx: 'differ' },
        both: { zz: 'differ', xx: 'differ' },
      },
    }
    expect(checkTable(level, {}, correct)).toMatchObject({ ok: true })

    // Incorrect move pattern
    const wrong = {
      cells: {
        nothing: { zz: 'agree', xx: 'agree' },
        flip: { zz: 'differ', xx: 'differ' }, // should be xx: 'agree'
        twist: { zz: 'agree', xx: 'differ' },
        both: { zz: 'differ', xx: 'differ' },
      },
    }
    expect(checkTable(level, {}, wrong)).toMatchObject({ ok: false })
  })
})

describe('Tier 1 Checker: stream.js', () => {
  it('safely handles missing context.sent', () => {
    const res = checkStream({ id: 16 }, {}, { bits: ['10'] })
    expect(res).toEqual({ ok: false, detail: 'missing context.sent' })
  })

  it('safely handles missing answer.bits', () => {
    const res = checkStream({ id: 16 }, { sent: ['10'] }, {})
    expect(res).toEqual({ ok: false, detail: 'missing answer.bits array' })
  })

  it('validates decoded stream against sent stream for Levels 16, 17, 19', () => {
    const level = { id: 16, target: { type: 'stream' } }
    const context = { sent: ['00', '11', '01', '10'] }

    // Correct stream
    expect(checkStream(level, context, { bits: ['00', '11', '01', '10'] })).toMatchObject({
      ok: true,
    })

    // Content mismatch
    expect(checkStream(level, context, { bits: ['00', '11', '00', '10'] })).toMatchObject({
      ok: false,
    })

    // Length mismatch
    expect(checkStream(level, context, { bits: ['00', '11'] })).toMatchObject({
      ok: false,
    })
  })
})

describe('Tier 1 Checker: budget.js', () => {
  const level20 = {
    id: 20,
    target: {
      type: 'budget',
      messages: [
        { id: 'm1', bits: '0' },
        { id: 'm2', bits: '10' },
        { id: 'm3', bits: '110' },
        { id: 'm4', bits: '0101' },
      ],
      parcelBudget: 7,
      twinBudget: 3,
    },
  }

  it('safely handles missing answer.plan', () => {
    const res = checkBudget(level20, {}, {})
    expect(res).toEqual({ ok: false, detail: 'missing answer.plan array' })
  })

  it('returns missing budget limits when parcel or twin limits are not provided', () => {
    const levelNoBudget = {
      id: 20,
      target: {
        type: 'budget',
        messages: [{ id: 'm1', bits: '0' }],
      },
    }
    const res = checkBudget(levelNoBudget, {}, {
      plan: [{ messageId: 'm1', chunk: '0', useTwin: false }],
    })
    expect(res).toEqual({ ok: false, detail: 'missing budget limits' })
  })

  it('accepts optimal 7-parcel, 3-twin plan for Level 20', () => {
    const optimalPlan = {
      plan: [
        { messageId: 'm1', chunk: '0', useTwin: false },
        { messageId: 'm2', chunk: '10', useTwin: true },
        { messageId: 'm3', chunk: '11', useTwin: true },
        { messageId: 'm3', chunk: '0', useTwin: false },
        { messageId: 'm4', chunk: '01', useTwin: true },
        { messageId: 'm4', chunk: '0', useTwin: false },
        { messageId: 'm4', chunk: '1', useTwin: false },
      ],
    }

    const res = checkBudget(level20, {}, optimalPlan)
    expect(res.ok).toBe(true)
    expect(res.detail).toContain('7 parcels')
    expect(res.detail).toContain('3 twins')
  })

  it('rejects plan exceeding parcel budget', () => {
    const overParcelPlan = {
      plan: [
        { messageId: 'm1', chunk: '0', useTwin: false },
        { messageId: 'm2', chunk: '1', useTwin: false },
        { messageId: 'm2', chunk: '0', useTwin: false },
        { messageId: 'm3', chunk: '1', useTwin: false },
        { messageId: 'm3', chunk: '1', useTwin: false },
        { messageId: 'm3', chunk: '0', useTwin: false },
        { messageId: 'm4', chunk: '0', useTwin: false },
        { messageId: 'm4', chunk: '1', useTwin: false }, // 8th parcel > 7
      ],
    }
    const res = checkBudget(level20, {}, overParcelPlan)
    expect(res.ok).toBe(false)
    expect(res.detail).toContain('Parcel budget exceeded')
  })

  it('rejects plan exceeding twin budget', () => {
    const levelWith2Twins = {
      ...level20,
      target: { ...level20.target, twinBudget: 2 },
    }
    const planWith3Twins = {
      plan: [
        { messageId: 'm1', chunk: '0', useTwin: false },
        { messageId: 'm2', chunk: '10', useTwin: true },
        { messageId: 'm3', chunk: '11', useTwin: true },
        { messageId: 'm3', chunk: '0', useTwin: false },
        { messageId: 'm4', chunk: '01', useTwin: true },
        { messageId: 'm4', chunk: '0', useTwin: false },
        { messageId: 'm4', chunk: '1', useTwin: false },
      ],
    }
    const res = checkBudget(levelWith2Twins, {}, planWith3Twins)
    expect(res.ok).toBe(false)
    expect(res.detail).toContain('Twin budget exceeded')
  })

  it('rejects plan carrying 2 bits without a twin', () => {
    const invalidPlan = {
      plan: [
        { messageId: 'm1', chunk: '0', useTwin: false },
        { messageId: 'm2', chunk: '10', useTwin: false }, // 2 bits without twin!
        { messageId: 'm3', chunk: '11', useTwin: true },
        { messageId: 'm3', chunk: '0', useTwin: false },
        { messageId: 'm4', chunk: '01', useTwin: true },
        { messageId: 'm4', chunk: '0', useTwin: false },
        { messageId: 'm4', chunk: '1', useTwin: false },
      ],
    }
    const res = checkBudget(level20, {}, invalidPlan)
    expect(res.ok).toBe(false)
    expect(res.detail).toContain('exceeds 1 bit capacity')
  })

  it('rejects plan with incomplete or mismatched message delivery', () => {
    const wrongBitsPlan = {
      plan: [
        { messageId: 'm1', chunk: '1', useTwin: false }, // m1 is '0', delivered '1'
        { messageId: 'm2', chunk: '10', useTwin: true },
        { messageId: 'm3', chunk: '11', useTwin: true },
        { messageId: 'm3', chunk: '0', useTwin: false },
        { messageId: 'm4', chunk: '01', useTwin: true },
        { messageId: 'm4', chunk: '0', useTwin: false },
        { messageId: 'm4', chunk: '1', useTwin: false },
      ],
    }
    const res = checkBudget(level20, {}, wrongBitsPlan)
    expect(res.ok).toBe(false)
    expect(res.detail).toContain('incomplete or mismatched')
  })
})
