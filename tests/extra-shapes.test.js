import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { check as checkTable } from '../src/engine/targets/table.js'
import { check as checkStream } from '../src/engine/targets/stream.js'
import { check as checkBudget } from '../src/engine/targets/budget.js'
import { check as checkCompare } from '../src/engine/targets/compare.js'

const shapesPath = resolve(__dirname, '../src/fixtures/extra-shapes.json')
const shapes = JSON.parse(readFileSync(shapesPath, 'utf-8'))

describe('Fixtures Validation: extra-shapes.json', () => {
  describe('level13_fact_table', () => {
    const fixture = shapes.level13_fact_table

    it('accepts fixture correct answer', () => {
      const res = checkTable(fixture, {}, fixture.answer)
      expect(res.ok).toBe(true)
      expect(res.detail).toContain('complete and accurate')
    })

    it('rejects a wrong answer', () => {
      const wrongAnswer = {
        cells: {
          ...fixture.answer.cells,
          'ud.together': 'differ', // Twins agree in both lenses
        },
      }
      const res = checkTable(fixture, {}, wrongAnswer)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('incorrect')
    })
  })

  describe('level13_control_variant', () => {
    const fixture = shapes.level13_control_variant

    it('accepts fixture correct answer', () => {
      const res = checkTable(fixture, {}, fixture.answer)
      expect(res.ok).toBe(true)
      expect(res.detail).toContain('complete and accurate')
    })

    it('rejects a wrong answer', () => {
      const wrongAnswer = {
        cells: {
          ...fixture.answer.cells,
          'ud.together': 'agree', // Control parcels are random
        },
      }
      const res = checkTable(fixture, {}, wrongAnswer)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('incorrect')
    })
  })

  describe('level15_codebook', () => {
    const fixture = shapes.level15_codebook

    it('accepts fixture correct answer', () => {
      const res = checkTable(fixture, {}, fixture.answer)
      expect(res.ok).toBe(true)
      expect(res.detail).toContain('complete and accurate')
    })

    it('rejects a wrong answer', () => {
      const wrongAnswer = {
        cells: {
          ...fixture.answer.cells,
          flip: { zz: 'agree', xx: 'agree' }, // flip has zz: 'differ'
        },
      }
      const res = checkTable(fixture, {}, wrongAnswer)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('incorrect')
    })
  })

  describe('stream_levels_16_17_19', () => {
    const fixture = shapes.stream_levels_16_17_19

    it('accepts fixture correct answer', () => {
      const res = checkStream(fixture, {}, fixture.answer)
      expect(res.ok).toBe(true)
      expect(res.detail).toContain('accurately')
    })

    it('rejects a wrong answer', () => {
      const wrongAnswer = {
        bits: ['10', '01', '00', '00'], // last item differs from '11'
      }
      const res = checkStream(fixture, {}, wrongAnswer)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('mismatch')
    })
  })

  describe('budget_level20: Final Level 20 Budget (parcels 7, twins 3)', () => {
    const levelFinal = {
      ...shapes.budget_level20,
      extra: {
        ...shapes.budget_level20.extra,
        budget: {
          parcels: 7,
          twins: 3,
        },
      },
    }

    it('accepts valid sample plan: 3 twins of 2 bits + 4 single-bit parcels (7 parcels)', () => {
      // m1: "1", m2: "10", m3: "101", m4: "1011"
      // m4 = "10" with a twin, then "1" and "1" as singles
      const validPlan = {
        plan: [
          { messageId: 'm1', chunk: '1', useTwin: false },
          { messageId: 'm2', chunk: '10', useTwin: true },
          { messageId: 'm3', chunk: '10', useTwin: true },
          { messageId: 'm3', chunk: '1', useTwin: false },
          { messageId: 'm4', chunk: '10', useTwin: true },
          { messageId: 'm4', chunk: '1', useTwin: false },
          { messageId: 'm4', chunk: '1', useTwin: false },
        ],
      }
      const res = checkBudget(levelFinal, {}, validPlan)
      expect(res.ok).toBe(true)
      expect(res.detail).toContain('7 parcels')
      expect(res.detail).toContain('3 twins')
    })

    it('rejects a 2-bit chunk without a twin', () => {
      const invalidPlan = {
        plan: [
          { messageId: 'm1', chunk: '1', useTwin: false },
          { messageId: 'm2', chunk: '10', useTwin: true },
          { messageId: 'm3', chunk: '10', useTwin: true },
          { messageId: 'm3', chunk: '1', useTwin: false },
          { messageId: 'm4', chunk: '10', useTwin: true },
          { messageId: 'm4', chunk: '11', useTwin: false }, // 2 bits without twin!
        ],
      }
      const res = checkBudget(levelFinal, {}, invalidPlan)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('exceeds 1 bit capacity')
    })

    it('rejects plan exceeding parcel budget (> 7 parcels)', () => {
      const overParcelPlan = {
        plan: [
          { messageId: 'm1', chunk: '1', useTwin: false },
          { messageId: 'm2', chunk: '1', useTwin: false },
          { messageId: 'm2', chunk: '0', useTwin: false },
          { messageId: 'm3', chunk: '1', useTwin: false },
          { messageId: 'm3', chunk: '0', useTwin: false },
          { messageId: 'm3', chunk: '1', useTwin: false },
          { messageId: 'm4', chunk: '10', useTwin: true },
          { messageId: 'm4', chunk: '1', useTwin: false }, // 8th parcel
        ],
      }
      const res = checkBudget(levelFinal, {}, overParcelPlan)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('Parcel budget exceeded')
    })

    it('rejects plan exceeding twin budget (> 3 twins)', () => {
      const overTwinPlan = {
        plan: [
          { messageId: 'm1', chunk: '1', useTwin: true }, // 1st twin
          { messageId: 'm2', chunk: '10', useTwin: true }, // 2nd twin
          { messageId: 'm3', chunk: '10', useTwin: true }, // 3rd twin
          { messageId: 'm3', chunk: '1', useTwin: false },
          { messageId: 'm4', chunk: '10', useTwin: true }, // 4th twin > 3
          { messageId: 'm4', chunk: '1', useTwin: false },
          { messageId: 'm4', chunk: '1', useTwin: false },
        ],
      }
      const res = checkBudget(levelFinal, {}, overTwinPlan)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('Twin budget exceeded')
    })

    it("rejects message whose chunks don't concatenate in order to its bits", () => {
      const outOfOrderPlan = {
        plan: [
          { messageId: 'm1', chunk: '1', useTwin: false },
          { messageId: 'm2', chunk: '10', useTwin: true },
          { messageId: 'm3', chunk: '1', useTwin: false }, // chunk order swapped: "1" then "10" = "110" != "101"
          { messageId: 'm3', chunk: '10', useTwin: true },
          { messageId: 'm4', chunk: '10', useTwin: true },
          { messageId: 'm4', chunk: '1', useTwin: false },
          { messageId: 'm4', chunk: '1', useTwin: false },
        ],
      }
      const res = checkBudget(levelFinal, {}, outOfOrderPlan)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('incomplete or mismatched')
    })

    it('rejects missing or extra bits', () => {
      const incompletePlan = {
        plan: [
          { messageId: 'm1', chunk: '1', useTwin: false },
          { messageId: 'm2', chunk: '10', useTwin: true },
          { messageId: 'm3', chunk: '10', useTwin: true },
          { messageId: 'm4', chunk: '10', useTwin: true },
          // m3 missing last bit "1", m4 missing last bits "11"
        ],
      }
      const res = checkBudget(levelFinal, {}, incompletePlan)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('incomplete or mismatched')
    })
  })

  describe('compare_level18', () => {
    const fixture = shapes.compare_level18

    it('accepts fixture correct answer', () => {
      const res = checkCompare(fixture, {}, fixture.answer)
      expect(res.ok).toBe(true)
      expect(res.detail).toContain('correct')
    })

    it('rejects a wrong answer', () => {
      const wrongAnswer = {
        answer: 'different',
      }
      const res = checkCompare(fixture, {}, wrongAnswer)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('incorrect')
    })
  })
})
