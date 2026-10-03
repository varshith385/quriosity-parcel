import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dialState, sureness } from '../src/quantum/sim.js'
import { targetCheckers, checkTarget } from '../src/engine/targets/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadLevel(id) {
  const filePath = path.resolve(__dirname, `../src/levels/${id}.json`)
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

describe('Level Solvability (Role 1 Levels)', () => {
  describe('Level 2: Two bits, two parcels (src/levels/2.json)', () => {
    const level2 = loadLevel(2)
    const checker = targetCheckers[level2.target.type]

    it('has a registered checker for target.type ("classical")', () => {
      expect(level2.target.type).toBe('classical')
      expect(typeof checker).toBe('function')
    })

    it('asserts known winning solution gives ok: true (source of truth from level JSON)', () => {
      // Level JSON source of truth:
      // target.bits = "10", target.parcelBudget = 2
      const targetBits = level2.target.bits
      expect(targetBits).toBe('10')
      expect(level2.target.parcelBudget).toBe(2)

      const winningAnswer = { bits: targetBits }
      const res = checker(level2, {}, winningAnswer)

      expect(res.ok).toBe(true)
      expect(res.detail).toContain('delivered successfully')

      // Also verify through checkTarget dispatcher
      const dispatchRes = checkTarget(level2.target.type, level2, {}, winningAnswer)
      expect(dispatchRes.ok).toBe(true)
    })

    it('asserts plausible wrong attempt gives ok: false (both bits on one parcel)', () => {
      const targetBits = level2.target.bits

      // Attempt A: player tries to send both bits through a single parcel (budget = 1)
      const singleParcelLevel = {
        ...level2,
        target: {
          ...level2.target,
          parcelBudget: 1,
        },
      }
      const resBudget = checker(singleParcelLevel, {}, { bits: targetBits })
      expect(resBudget.ok).toBe(false)
      expect(resBudget.detail).toContain('Parcel budget exceeded')

      // Attempt B: player sends only one bit to fit on one parcel
      const singleBitAnswer = { bits: targetBits.slice(0, 1) }
      const resBit = checker(level2, {}, singleBitAnswer)
      expect(resBit.ok).toBe(false)
      expect(resBit.detail).toContain('do not match target')
    })
  })

  describe('Level 5: Two lenses (src/levels/5.json)', () => {
    const level5 = loadLevel(5)
    const checker = targetCheckers[level5.target.type]
    const threshold = level5.target.threshold

    it('has a registered checker for target.type ("optimise")', () => {
      expect(level5.target.type).toBe('optimise')
      expect(typeof checker).toBe('function')
      expect(threshold).toBe(0.84)
    })

    it('asserts known winning solution gives ok: true (t = 45 degrees, evaluated via sim.js)', () => {
      // Run candidate through sim.js
      const winState = dialState(45)

      const sureUD = sureness(winState, 'A', 'ud')
      const sureSide = sureness(winState, 'A', 'side')
      const weaker = Math.min(sureUD, sureSide)

      // Verified mathematically: cos^2(22.5 deg) ~ 0.8536 >= 0.84
      expect(weaker).toBeGreaterThanOrEqual(threshold)

      // Run through the level's registered checker
      const res = checker(level5, { state: winState }, {})
      expect(res.ok).toBe(true)
      expect(res.detail).toContain('Both lenses sufficiently sure')

      // Also verify through checkTarget dispatcher
      const dispatchRes = checkTarget(level5.target.type, level5, { state: winState }, {})
      expect(dispatchRes.ok).toBe(true)
    })

    it('asserts plausible wrong attempt gives ok: false for t = 0 degrees', () => {
      // At t = 0: up-down is certain (1.0), but sideways is a coin flip (0.5 < 0.84)
      const state0 = dialState(0)

      const sureUD = sureness(state0, 'A', 'ud')
      const sureSide = sureness(state0, 'A', 'side')
      expect(sureUD).toBeCloseTo(1.0, 5)
      expect(sureSide).toBeCloseTo(0.5, 5)
      expect(Math.min(sureUD, sureSide)).toBeLessThan(threshold)

      const res0 = checker(level5, { state: state0 }, {})
      expect(res0.ok).toBe(false)
      expect(res0.detail).toContain('is below target threshold')
    })

    it('asserts plausible wrong attempt gives ok: false for t = 90 degrees', () => {
      // At t = 90: sideways is certain (1.0), but up-down is a coin flip (0.5 < 0.84)
      const state90 = dialState(90)

      const sureUD = sureness(state90, 'A', 'ud')
      const sureSide = sureness(state90, 'A', 'side')
      expect(sureUD).toBeCloseTo(0.5, 5)
      expect(sureSide).toBeCloseTo(1.0, 5)
      expect(Math.min(sureUD, sureSide)).toBeLessThan(threshold)

      const res90 = checker(level5, { state: state90 }, {})
      expect(res90.ok).toBe(false)
      expect(res90.detail).toContain('is below target threshold')
    })
  })
})
