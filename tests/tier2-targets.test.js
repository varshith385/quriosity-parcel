import { describe, it, expect } from 'vitest'
import { dialState } from '../src/quantum/sim.js'
import { check as checkOptimise } from '../src/engine/targets/optimise.js'
import { check as checkDistinguish } from '../src/engine/targets/distinguish.js'
import { check as checkPrediction } from '../src/engine/targets/prediction.js'
import { check as checkClassical } from '../src/engine/targets/classical.js'
import { check as checkReadings } from '../src/engine/targets/readings.js'

describe('Tier 2 Checker: optimise.js (Level 5)', () => {
  it('safely handles missing context.state', () => {
    const res = checkOptimise({ id: 5, target: { type: 'optimise' } }, {}, {})
    expect(res).toEqual({ ok: false, detail: 'missing context.state' })
  })

  it('passes when t = 45 degrees (weaker sureness ~0.854 >= 0.84)', () => {
    const level = { id: 5, target: { type: 'optimise', threshold: 0.84 } }
    const state45 = dialState(45)
    const res = checkOptimise(level, { state: state45 }, {})
    expect(res.ok).toBe(true)
    expect(res.detail).toContain('Both lenses sufficiently sure')
  })

  it('fails when t = 0 degrees (side lens sureness 0.5 < 0.84)', () => {
    const level = { id: 5, target: { type: 'optimise', threshold: 0.84 } }
    const state0 = dialState(0)
    const res = checkOptimise(level, { state: state0 }, {})
    expect(res.ok).toBe(false)
    expect(res.detail).toContain('is below target threshold')
  })

  it('respects level data custom threshold override', () => {
    const levelStrict = { id: 5, target: { type: 'optimise', threshold: 0.9 } }
    const state45 = dialState(45) // ~0.854 < 0.90
    const res = checkOptimise(levelStrict, { state: state45 }, {})
    expect(res.ok).toBe(false)
  })
})

describe('Tier 2 Checker: distinguish.js (Level 8)', () => {
  const level8 = { id: 8, target: { type: 'distinguish' } }

  it('safely handles missing answer.arrows', () => {
    const res = checkDistinguish(level8, {}, {})
    expect(res).toEqual({ ok: false, detail: 'missing answer.arrows' })
  })

  it('passes for pairwise orthogonal arrows [0, 180]', () => {
    const res = checkDistinguish(level8, {}, { arrows: [0, 180] })
    expect(res.ok).toBe(true)
    expect(res.detail).toContain('Successfully distinguished 2 pairwise orthogonal states')
  })

  it('fails for four evenly spaced arrows [0, 90, 180, 270] (reader confused)', () => {
    const res = checkDistinguish(level8, {}, { arrows: [0, 90, 180, 270] })
    expect(res.ok).toBe(false)
    expect(res.detail).toContain('Reader confused')
  })

  it('fails for non-orthogonal arrows [0, 45]', () => {
    const res = checkDistinguish(level8, {}, { arrows: [0, 45] })
    expect(res.ok).toBe(false)
  })
})

describe('Tier 2 Checker: prediction.js (Levels 6, 9)', () => {
  it('safely handles missing answer.p', () => {
    const res = checkPrediction({ id: 6 }, {}, {})
    expect(res).toEqual({ ok: false, detail: 'missing answer.p' })
  })

  it('computes truth for Level 6 (looking erases: true probability is 0.5)', () => {
    const level6 = { id: 6, target: { type: 'prediction' } }
    // Accept within 0.1
    expect(checkPrediction(level6, {}, { p: 0.55 }).ok).toBe(true)
    expect(checkPrediction(level6, {}, { p: 0.42 }).ok).toBe(true)
    // Reject outside 0.1
    expect(checkPrediction(level6, {}, { p: 0.8 }).ok).toBe(false)
  })

  it('computes truth for Level 9 with 1 press of H (true probability is 0.5)', () => {
    const level9_1 = { id: 9, target: { type: 'prediction', presses: 1 } }
    expect(checkPrediction(level9_1, {}, { p: 0.5 }).ok).toBe(true)
    expect(checkPrediction(level9_1, {}, { p: 0.8 }).ok).toBe(false)
  })

  it('computes truth for Level 9 with 2 presses of H (true probability is 1.0)', () => {
    const level9_2 = { id: 9, target: { type: 'prediction', presses: 2 } }
    expect(checkPrediction(level9_2, {}, { p: 0.95 }).ok).toBe(true)
    expect(checkPrediction(level9_2, {}, { p: 0.5 }).ok).toBe(false)
  })
})

describe('Tier 2 Checker: classical.js (Levels 1, 2)', () => {
  it('safely handles missing answer.bits', () => {
    const res = checkClassical({ id: 1, target: { bits: '1' } }, {}, {})
    expect(res).toEqual({ ok: false, detail: 'missing answer.bits' })
  })

  it('validates 1-bit message for Level 1', () => {
    const level1 = { id: 1, target: { type: 'classical', bits: '1' } }
    expect(checkClassical(level1, {}, { bits: '1' }).ok).toBe(true)
    expect(checkClassical(level1, {}, { bits: '0' }).ok).toBe(false)
  })

  it('validates 2-bit message and parcel budget for Level 2', () => {
    const level2 = {
      id: 2,
      target: { type: 'classical', bits: '10', parcelBudget: 2 },
    }
    expect(checkClassical(level2, {}, { bits: '10' }).ok).toBe(true)
    expect(checkClassical(level2, {}, { bits: '01' }).ok).toBe(false)

    // Over parcel budget
    const level2Strict = {
      id: 2,
      target: { type: 'classical', bits: '10', parcelBudget: 1 },
    }
    const res = checkClassical(level2Strict, {}, { bits: '10' })
    expect(res.ok).toBe(false)
    expect(res.detail).toContain('Parcel budget exceeded')
  })
})

describe('Tier 2 Checker: readings.js (Level 7)', () => {
  const level7 = {
    id: 7,
    target: {
      type: 'readings',
      readings: [
        { lens: 'ud', outcome: 0 },
        { lens: 'side', outcome: 1 },
      ],
    },
  }

  it('validates target readings array in answer', () => {
    const correct = {
      readings: [
        { lens: 'ud', outcome: 0 },
        { lens: 'side', outcome: 1 },
      ],
    }
    expect(checkReadings(level7, {}, correct).ok).toBe(true)

    const wrong = {
      readings: [
        { lens: 'ud', outcome: 0 },
        { lens: 'side', outcome: 0 }, // wrong outcome
      ],
    }
    expect(checkReadings(level7, {}, wrong).ok).toBe(false)
  })

  it('validates live state and lens from context', () => {
    const level7Single = {
      id: 7,
      target: { type: 'readings', outcome: 0 },
    }
    // dialState(0) is certain 0 in up-down lens
    const state0 = dialState(0)
    expect(checkReadings(level7Single, { state: state0, lens: 'ud' }, {}).ok).toBe(true)
    // dialState(0) is 50/50 in sideways lens, not certain
    expect(checkReadings(level7Single, { state: state0, lens: 'side' }, {}).ok).toBe(false)
  })
})
