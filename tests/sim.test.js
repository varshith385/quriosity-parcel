import { describe, it, expect } from 'vitest'
import {
  makeRng,
  zeroState,
  dialState,
  angleOf,
  applyX,
  applyZ,
  applyH,
  applyCNOT,
  probabilities,
  probabilitiesSideways,
  measure,
  measureSideways,
  entanglement,
  pairFacts,
  makePair,
  encode,
  decode,
  reducedProbabilities,
  sureness,
  maxDistinguishable,
} from '../src/quantum/sim.js'

const S = 1 / Math.SQRT2
const EPS = 1e-9

function normSquared(state) {
  return state.reduce((sum, a) => sum + a * a, 0)
}

describe('Role 1 Core: Six Core Tests', () => {
  // 1. Pair-maker output equals (|00>+|11>)/sqrt2 (tolerance about 1e-9)
  it('1. Pair-maker: output equals (|00>+|11>)/sqrt2', () => {
    const pair = makePair()
    expect(pair).toHaveLength(4)
    expect(pair[0]).toBeCloseTo(S, 9)
    expect(pair[1]).toBeCloseTo(0, 9)
    expect(pair[2]).toBeCloseTo(0, 9)
    expect(pair[3]).toBeCloseTo(S, 9)
  })

  // 2. All four messages decode deterministically (probability 1) per the table in 1.5
  it('2. Deterministic decoding: all four messages decode with probability 1 per Table 1.5', () => {
    const pair = makePair()
    const rng = makeRng(42)

    // Message 00: pair state [s, 0, 0, s] (Phi+)
    const s00 = encode(pair, '00')
    expect(s00[0]).toBeCloseTo(S, 9)
    expect(s00[1]).toBeCloseTo(0, 9)
    expect(s00[2]).toBeCloseTo(0, 9)
    expect(s00[3]).toBeCloseTo(S, 9)
    const dec00 = decode(s00, rng)
    expect(dec00.bits).toBe('00')
    const prob00A = probabilities(dec00.state, 'A')
    const prob00B = probabilities(dec00.state, 'B')
    expect(prob00A[0]).toBeCloseTo(1, 9)
    expect(prob00B[0]).toBeCloseTo(1, 9)

    // Message 01: flip (X), pair state [0, s, s, 0] (Psi+)
    const s01 = encode(pair, '01')
    expect(s01[0]).toBeCloseTo(0, 9)
    expect(s01[1]).toBeCloseTo(S, 9)
    expect(s01[2]).toBeCloseTo(S, 9)
    expect(s01[3]).toBeCloseTo(0, 9)
    const dec01 = decode(s01, rng)
    expect(dec01.bits).toBe('01')
    const prob01A = probabilities(dec01.state, 'A')
    const prob01B = probabilities(dec01.state, 'B')
    expect(prob01A[0]).toBeCloseTo(1, 9)
    expect(prob01B[1]).toBeCloseTo(1, 9)

    // Message 10: twist (Z), pair state [s, 0, 0, -s] (Phi-)
    const s10 = encode(pair, '10')
    expect(s10[0]).toBeCloseTo(S, 9)
    expect(s10[1]).toBeCloseTo(0, 9)
    expect(s10[2]).toBeCloseTo(0, 9)
    expect(s10[3]).toBeCloseTo(-S, 9)
    const dec10 = decode(s10, rng)
    expect(dec10.bits).toBe('10')
    const prob10A = probabilities(dec10.state, 'A')
    const prob10B = probabilities(dec10.state, 'B')
    expect(prob10A[1]).toBeCloseTo(1, 9)
    expect(prob10B[0]).toBeCloseTo(1, 9)

    // Message 11: twist then flip. Compare probabilities, not raw amplitudes (global sign irrelevant)
    const s11 = encode(pair, '11')
    // Check pair facts and concurrence for 11
    expect(entanglement(s11)).toBeCloseTo(1, 9)
    expect(pairFacts(s11)).toEqual({ zz: 'differ', xx: 'differ' })
    const dec11 = decode(s11, rng)
    expect(dec11.bits).toBe('11')
    const prob11A = probabilities(dec11.state, 'A')
    const prob11B = probabilities(dec11.state, 'B')
    expect(prob11A[1]).toBeCloseTo(1, 9) // bit 1 is 1
    expect(prob11B[1]).toBeCloseTo(1, 9) // bit 2 is 1
  })

  // 3. Alice's qubit alone is 50/50 in BOTH lenses for ALL four messages
  it("3. Blank parcel: Alice's qubit alone is 50/50 in BOTH lenses for all four messages", () => {
    const pair = makePair()
    const messages = ['00', '01', '10', '11']

    for (const msg of messages) {
      const state = encode(pair, msg)
      const probUD = reducedProbabilities(state, 'A', 'ud')
      const probSide = reducedProbabilities(state, 'A', 'side')

      expect(probUD[0]).toBeCloseTo(0.5, 9)
      expect(probUD[1]).toBeCloseTo(0.5, 9)
      expect(probSide[0]).toBeCloseTo(0.5, 9)
      expect(probSide[1]).toBeCloseTo(0.5, 9)
    }
  })

  // 4. The peek test: after Bob looks up-down early, bit 2 equals Alice's flip bit with prob 1 and bit 1 is 50/50 for all four messages
  it('4. Peek: after Bob looks up-down early, bit 2 survives with prob 1 and bit 1 is 50/50 for all four messages', () => {
    // When Bob looks up-down early on makePair(), the state collapses to |00> or |11>
    const branches = [
      { outcome: 0, state: [1, 0, 0, 0] },
      { outcome: 1, state: [0, 0, 0, 1] },
    ]
    const messages = ['00', '01', '10', '11']

    for (const branch of branches) {
      for (const msg of messages) {
        const flipBit = msg[1] // Bit 2 is the flip bit

        // Alice encodes on the collapsed state
        const encoded = encode(branch.state, msg)

        // Bob applies the decoder gates: CNOT(A->B) then H on A
        const decoded = applyH(applyCNOT(encoded), 'A')

        // Test with computed probabilities (not sampling)
        const probA = probabilities(decoded, 'A')
        const probB = probabilities(decoded, 'B')

        // Bit 1 (qubit A) is exactly 50/50
        expect(probA[0]).toBeCloseTo(0.5, 9)
        expect(probA[1]).toBeCloseTo(0.5, 9)

        // Bit 2 (qubit B) equals Alice's flip bit with probability exactly 1
        if (flipBit === '0') {
          expect(probB[0]).toBeCloseTo(1.0, 9)
          expect(probB[1]).toBeCloseTo(0.0, 9)
        } else {
          expect(probB[0]).toBeCloseTo(0.0, 9)
          expect(probB[1]).toBeCloseTo(1.0, 9)
        }
      }
    }
  })

  // 5. At most 2 perfectly distinguishable single-qubit states
  it('5. Two-state limit: maxDistinguishable returns integer count at most 2', () => {
    // Pairs 180 degrees apart are orthogonal on the dial
    expect(maxDistinguishable([0, 180])).toBe(2)
    expect(maxDistinguishable([90, 270])).toBe(2)

    // Four equally spaced arrows (0, 90, 180, 270): largest mutually orthogonal subset has size 2
    expect(maxDistinguishable([0, 90, 180, 270])).toBe(2)

    // Eight arrows on circle: at most 2 pairwise orthogonal
    expect(maxDistinguishable([0, 45, 90, 135, 180, 225, 270, 315])).toBe(2)

    // Non-orthogonal arrows: largest orthogonal set has size 1
    expect(maxDistinguishable([0, 30, 60])).toBe(1)
    expect(maxDistinguishable([45])).toBe(1)
    expect(maxDistinguishable([])).toBe(0)
  })

  // 6. H H = identity and H Z H = X
  it('6. Reversibility and interference: H H = identity and H Z H = X', () => {
    const states = [
      zeroState(),
      dialState(37),
      dialState(90),
      makePair(),
      [0.5, 0.5, 0.5, 0.5],
    ]

    for (const st of states) {
      // H H = I on qubit A
      const hhA = applyH(applyH(st, 'A'), 'A')
      for (let i = 0; i < 4; i++) {
        expect(hhA[i]).toBeCloseTo(st[i], 9)
      }

      // H H = I on qubit B
      const hhB = applyH(applyH(st, 'B'), 'B')
      for (let i = 0; i < 4; i++) {
        expect(hhB[i]).toBeCloseTo(st[i], 9)
      }

      // H Z H = X on qubit A
      const hzhA = applyH(applyZ(applyH(st, 'A'), 'A'), 'A')
      const xA = applyX(st, 'A')
      for (let i = 0; i < 4; i++) {
        expect(hzhA[i]).toBeCloseTo(xA[i], 9)
      }

      // H Z H = X on qubit B
      const hzhB = applyH(applyZ(applyH(st, 'B'), 'B'), 'B')
      const xB = applyX(st, 'B')
      for (let i = 0; i < 4; i++) {
        expect(hzhB[i]).toBeCloseTo(xB[i], 9)
      }
    }
  })
})

describe('Role 1 Core: Extra Tests and Decision Specifications', () => {
  it('Normalisation: state stays normalised after every gate and operation', () => {
    const s0 = zeroState()
    expect(normSquared(s0)).toBeCloseTo(1, 9)

    const sH = applyH(s0, 'A')
    expect(normSquared(sH)).toBeCloseTo(1, 9)

    const sCNOT = applyCNOT(sH)
    expect(normSquared(sCNOT)).toBeCloseTo(1, 9)

    const sX = applyX(sCNOT, 'A')
    expect(normSquared(sX)).toBeCloseTo(1, 9)

    const sZ = applyZ(sCNOT, 'B')
    expect(normSquared(sZ)).toBeCloseTo(1, 9)

    const pair = makePair()
    expect(normSquared(pair)).toBeCloseTo(1, 9)

    for (const msg of ['00', '01', '10', '11']) {
      expect(normSquared(encode(pair, msg))).toBeCloseTo(1, 9)
    }

    const rng = makeRng(123)
    const mUD = measure(pair, 'A', rng)
    expect(normSquared(mUD.state)).toBeCloseTo(1, 9)

    const mSide = measureSideways(pair, 'A', rng)
    expect(normSquared(mSide.state)).toBeCloseTo(1, 9)
  })

  it('Immutability: pure functions never mutate their inputs', () => {
    const s = Object.freeze([S, 0, 0, S])
    const rng = makeRng(99)

    expect(() => applyX(s, 'A')).not.toThrow()
    expect(() => applyZ(s, 'A')).not.toThrow()
    expect(() => applyH(s, 'A')).not.toThrow()
    expect(() => applyCNOT(s)).not.toThrow()
    expect(() => probabilities(s, 'A')).not.toThrow()
    expect(() => probabilitiesSideways(s, 'A')).not.toThrow()
    expect(() => measure(s, 'A', rng)).not.toThrow()
    expect(() => measureSideways(s, 'A', rng)).not.toThrow()
    expect(() => entanglement(s)).not.toThrow()
    expect(() => pairFacts(s)).not.toThrow()
    expect(() => encode(s, '01')).not.toThrow()
    expect(() => decode(s, rng)).not.toThrow()
  })

  it('measureSideways: outcome is 0 or 1, and repeats answer with probability 1', () => {
    const rng0 = () => 0.1 // Forces outcome 0 (p0)
    const s = zeroState()

    const m1 = measureSideways(s, 'A', rng0)
    expect([0, 1]).toContain(m1.outcome)
    expect(m1.outcome).toBe(0) // 0 represents "+"

    // A second sideways look on the collapsed state must repeat with probability 1
    const pAfter = probabilitiesSideways(m1.state, 'A')
    expect(pAfter[0]).toBeCloseTo(1, 9)
    expect(pAfter[1]).toBeCloseTo(0, 9)

    const rng1 = () => 0.9 // Forces outcome 1 (p1)
    const m2 = measureSideways(s, 'A', rng1)
    expect(m2.outcome).toBe(1) // 1 represents "-"
    const pAfter2 = probabilitiesSideways(m2.state, 'A')
    expect(pAfter2[0]).toBeCloseTo(0, 9)
    expect(pAfter2[1]).toBeCloseTo(1, 9)
  })

  it('entanglement: correctly identifies Bell states and separable states', () => {
    expect(entanglement(zeroState())).toBeCloseTo(0, 9)
    expect(entanglement(applyH(zeroState(), 'A'))).toBeCloseTo(0, 9)
    expect(entanglement(makePair())).toBeCloseTo(1, 9)

    // All four Bell states have concurrence E = 1
    const pair = makePair()
    for (const msg of ['00', '01', '10', '11']) {
      expect(entanglement(encode(pair, msg))).toBeCloseTo(1, 9)
    }
  })

  it('dialState(60): gives P(up) = 0.75 and P(down) = 0.25', () => {
    const s60 = dialState(60)
    // cos(30 deg) = sqrt(3)/2, sin(30 deg) = 0.5
    expect(s60[0]).toBeCloseTo(Math.sqrt(3) / 2, 9)
    expect(s60[1]).toBeCloseTo(0, 9)
    expect(s60[2]).toBeCloseTo(0.5, 9)
    expect(s60[3]).toBeCloseTo(0, 9)

    const p = probabilities(s60, 'A')
    expect(p[0]).toBeCloseTo(0.75, 9)
    expect(p[1]).toBeCloseTo(0.25, 9)
  })

  it('pairFacts: matches Table 1.5 for Bell states and returns both "unsure" otherwise', () => {
    const pair = makePair()
    expect(pairFacts(encode(pair, '00'))).toEqual({ zz: 'agree', xx: 'agree' })
    expect(pairFacts(encode(pair, '01'))).toEqual({ zz: 'differ', xx: 'agree' })
    expect(pairFacts(encode(pair, '10'))).toEqual({ zz: 'agree', xx: 'differ' })
    expect(pairFacts(encode(pair, '11'))).toEqual({ zz: 'differ', xx: 'differ' })

    // Non-Bell state: |00> has ZZ = +1, but XX = 0. Either not +-1 => both "unsure"
    expect(pairFacts(zeroState())).toEqual({ zz: 'unsure', xx: 'unsure' })

    // Tilted dial state
    expect(pairFacts(dialState(45))).toEqual({ zz: 'unsure', xx: 'unsure' })
  })

  it('angleOf: returns t in [0, 360) when B=|0>, returns null when B is not |0>', () => {
    expect(angleOf(dialState(0))).toBeCloseTo(0, 7)
    expect(angleOf(dialState(45))).toBeCloseTo(45, 7)
    expect(angleOf(dialState(90))).toBeCloseTo(90, 7)
    expect(angleOf(dialState(180))).toBeCloseTo(180, 7)
    expect(angleOf(dialState(270))).toBeCloseTo(270, 7)

    // B is not |0>: should return null
    expect(angleOf(makePair())).toBeNull()
    expect(angleOf([0, 1, 0, 0])).toBeNull() // B is |1>
    expect(angleOf([0, 0, 0, 1])).toBeNull() // |11>
  })

  it('sureness: at t = 45 degrees, both lenses give approx 0.854', () => {
    const s45 = dialState(45)
    const suredUD = sureness(s45, 'A', 'ud')
    const suredSide = sureness(s45, 'A', 'side')

    // Exact theoretical value is cos^2(22.5 deg) = (1 + 1/sqrt(2))/2 ~= 0.85355339
    expect(suredUD).toBeCloseTo(0.85355, 4)
    expect(suredSide).toBeCloseTo(0.85355, 4)
  })

  it('makeRng: deterministic and values in [0, 1)', () => {
    const rng1 = makeRng(12345)
    const rng2 = makeRng(12345)

    const vals1 = [rng1(), rng1(), rng1()]
    const vals2 = [rng2(), rng2(), rng2()]

    expect(vals1).toEqual(vals2)
    for (const v of vals1) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})
