import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  dialState,
  sureness,
  applyX,
  applyZ,
  probabilities,
  probabilitiesSideways,
  maxDistinguishable,
} from '../src/quantum/sim.js'
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

  describe('Level 7: Two moves (src/levels/7.json)', () => {
    const level7 = loadLevel(7)
    const checker = targetCheckers[level7.target.type]

    it('has a registered checker for target.type ("readings")', () => {
      expect(level7.target.type).toBe('readings')
      expect(typeof checker).toBe('function')
    })

    it('asserts known winning solution gives ok: true computed purely from simulation (and wrong move leaves outcome unchanged)', () => {
      const readings = level7.extra?.targetReadings || level7.target?.readings
      expect(Array.isArray(readings)).toBe(true)
      expect(readings.length).toBeGreaterThanOrEqual(2)

      const simulatedAnswerReadings = []

      for (const r of readings) {
        // 1. Start from dialState(startT)
        const startState = dialState(r.startT)

        // Compute initial probabilities before moves:
        const initProbs =
          r.lens === 'side'
            ? probabilitiesSideways(startState, 'A')
            : probabilities(startState, 'A')
        const unwantedOutcome = initProbs[0] > 0.99 ? 0 : 1
        expect(unwantedOutcome).not.toBe(r.outcome)

        // 2. Assert the WRONG move leaves the unwanted outcome unchanged:
        // "twist in the ud lens, flip in the side lens"
        if (r.lens === 'ud') {
          const wrongState = applyZ(startState, 'A') // twist in ud lens
          const wrongProbs = probabilities(wrongState, 'A')
          expect(wrongProbs[unwantedOutcome]).toBeGreaterThanOrEqual(0.99)
        } else if (r.lens === 'side') {
          const wrongState = applyX(startState, 'A') // flip in side lens
          const wrongProbs = probabilitiesSideways(wrongState, 'A')
          expect(wrongProbs[unwantedOutcome]).toBeGreaterThanOrEqual(0.99)
        }

        // 3. Apply the listed moves with applyX/applyZ from sim.js
        let finalState = startState
        for (const move of r.moves) {
          if (move === 'flip') finalState = applyX(finalState, 'A')
          if (move === 'twist') finalState = applyZ(finalState, 'A')
        }

        // 4. Compute the outcome probability in the reading's lens (probabilities / probabilitiesSideways)
        const finalProbs =
          r.lens === 'side'
            ? probabilitiesSideways(finalState, 'A')
            : probabilities(finalState, 'A')

        // 5. Assert it is at least 0.99 for the target outcome
        expect(finalProbs[r.outcome]).toBeGreaterThanOrEqual(0.99)

        // 6. Build the answer from the simulated outcomes (do not reuse target outcome)
        const simulatedOutcome = finalProbs[1] >= 0.99 ? 1 : 0
        simulatedAnswerReadings.push({
          lens: r.lens,
          outcome: simulatedOutcome,
        })
      }

      // 7. Run simulated answer through the readings checker
      const winAnswer = { readings: simulatedAnswerReadings }
      const res = checker(level7, {}, winAnswer)
      expect(res.ok).toBe(true)
      expect(res.detail).toContain('matched successfully')

      // Also verify through checkTarget dispatcher
      const dispatchRes = checkTarget(level7.target.type, level7, {}, winAnswer)
      expect(dispatchRes.ok).toBe(true)
    })

    it('asserts failure-first: applying wrong move (twist in ud, flip in side) leaves outcome unchanged and gives ok: false', () => {
      const readings = level7.extra?.targetReadings || level7.target?.readings

      // Construct an attempt where the wrong move was applied for reading 1 (twist instead of flip in ud lens)
      const wrongReadings = readings.map((r, idx) => {
        if (idx === 0) {
          // Twist in ud leaves outcome 0 unchanged
          const twistedState = applyZ(dialState(r.startT), 'A')
          const probs = probabilities(twistedState, 'A')
          const outcome = probs[0] > 0.99 ? 0 : 1
          return { lens: r.lens, outcome }
        }
        // Other readings use simulated correct moves
        let s = dialState(r.startT)
        for (const m of r.moves) {
          if (m === 'flip') s = applyX(s, 'A')
          if (m === 'twist') s = applyZ(s, 'A')
        }
        const p = r.lens === 'side' ? probabilitiesSideways(s, 'A') : probabilities(s, 'A')
        return { lens: r.lens, outcome: p[1] >= 0.99 ? 1 : 0 }
      })

      const failRes = checker(level7, {}, { readings: wrongReadings })
      expect(failRes.ok).toBe(false)
      expect(failRes.detail).toContain('Reading 1 mismatch')
    })
  })

  describe('Level 8: Four won\'t fit (src/levels/8.json)', () => {
    const level8 = loadLevel(8)
    const checker = targetCheckers[level8.target.type]

    it('has a registered checker for target.type ("distinguish")', () => {
      expect(level8.target.type).toBe('distinguish')
      expect(typeof checker).toBe('function')
      expect(level8.extra.arrowCount).toBe(4)
      expect(level8.extra.minArrows).toBe(2)
      expect(level8.extra.maxArrows).toBe(4)
      expect(level8.physicsCheck).toBe('check-08')
      expect(level8.removePhysicsNote).toBe(
        'If arrows other than opposite ones could be told apart, four messages would fit on one parcel. The angle rule allows only two.'
      )
    })

    it('asserts known winning solution gives ok: true (exactly 2 mutually distinguishable arrows)', () => {
      // 2 mutually distinguishable arrows 180 degrees apart
      const winningArrows = [0, 180]
      const count = maxDistinguishable(winningArrows)
      expect(count).toBe(2)

      const winAnswer = { arrows: winningArrows }
      const res = checker(level8, {}, winAnswer)
      expect(res.ok).toBe(true)
      expect(res.detail).toContain('Successfully distinguished 2 pairwise orthogonal states')

      const dispatchRes = checkTarget(level8.target.type, level8, {}, winAnswer)
      expect(dispatchRes.ok).toBe(true)

      // Another valid pair: [90, 270]
      expect(checker(level8, {}, { arrows: [90, 270] }).ok).toBe(true)
    })

    it('asserts failure-first: spreading four arrows evenly (0, 90, 180, 270) gives ok: false', () => {
      const fourArrows = [0, 90, 180, 270]
      const count = maxDistinguishable(fourArrows)
      expect(count).toBe(2)

      const failAnswer = { arrows: fourArrows }
      const res = checker(level8, {}, failAnswer)
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('Reader confused')
      expect(res.detail).toContain('submitted 4 arrows, but only 2 can be reliably distinguished')
    })

    it('asserts submitting 2 non-orthogonal arrows gives ok: false', () => {
      const nonOrthoArrows = [0, 90]
      const count = maxDistinguishable(nonOrthoArrows)
      expect(count).toBe(1)

      const res = checker(level8, {}, { arrows: nonOrthoArrows })
      expect(res.ok).toBe(false)
      expect(res.detail).toContain('Reader confused')
    })

    it('asserts submitting 3 arrows gives ok: false', () => {
      const threeArrows = [0, 120, 240]
      const res = checker(level8, {}, { arrows: threeArrows })
      expect(res.ok).toBe(false)
    })
  })
})
