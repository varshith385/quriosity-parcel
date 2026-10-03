/**
 * src/quantum/sim.js - Role 1 Core Simulator
 * Exact physics per ROLES.md sections 1.3 to 1.6 and 3.1.
 * Pure functions, never mutate input, no complex numbers, no libraries,
 * randomness only through the rng argument.
 */

const S = 1 / Math.SQRT2

export function makeRng(seed = 0) {
  let s = (seed === undefined || seed === null ? 0 : seed) >>> 0
  return function () {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function zeroState() {
  return [1, 0, 0, 0]
}

export function dialState(tDegrees) {
  const rad = (tDegrees * Math.PI) / 180
  const half = rad / 2
  return [Math.cos(half), 0, Math.sin(half), 0]
}

export function angleOf(state) {
  // If qubit B is not |0>, return null
  const probB1 = state[1] * state[1] + state[3] * state[3]
  if (probB1 > 1e-9) {
    return null
  }
  // To draw the arrow from a state with B = |0>:
  // t = 2 * atan2(a10, a00) in degrees, normalised to [0, 360)
  const a00 = state[0]
  const a10 = state[2]
  let deg = (2 * Math.atan2(a10, a00) * 180) / Math.PI
  deg = ((deg % 360) + 360) % 360
  if (Math.abs(deg - 360) < 1e-9) {
    deg = 0
  }
  return deg
}

export function applyX(state, qubit) {
  const [a00, a01, a10, a11] = state
  if (qubit === 'A') {
    return [a10, a11, a00, a01]
  }
  if (qubit === 'B') {
    return [a01, a00, a11, a10]
  }
  return [...state]
}

export function applyZ(state, qubit) {
  const [a00, a01, a10, a11] = state
  if (qubit === 'A') {
    return [a00, a01, -a10, -a11]
  }
  if (qubit === 'B') {
    return [a00, -a01, a10, -a11]
  }
  return [...state]
}

export function applyH(state, qubit) {
  const [a00, a01, a10, a11] = state
  if (qubit === 'A') {
    return [
      (a00 + a10) * S,
      (a01 + a11) * S,
      (a00 - a10) * S,
      (a01 - a11) * S,
    ]
  }
  if (qubit === 'B') {
    return [
      (a00 + a01) * S,
      (a00 - a01) * S,
      (a10 + a11) * S,
      (a10 - a11) * S,
    ]
  }
  return [...state]
}

export function applyCNOT(state) {
  // control A, target B: swap a10 and a11
  const [a00, a01, a10, a11] = state
  return [a00, a01, a11, a10]
}

export function probabilities(state, qubit) {
  const [a00, a01, a10, a11] = state
  if (qubit === 'A') {
    const p0 = a00 * a00 + a01 * a01
    const p1 = a10 * a10 + a11 * a11
    return [p0, p1]
  }
  if (qubit === 'B') {
    const p0 = a00 * a00 + a10 * a10
    const p1 = a01 * a01 + a11 * a11
    return [p0, p1]
  }
  return [0, 0]
}

export function probabilitiesSideways(state, qubit) {
  const hState = applyH(state, qubit)
  return probabilities(hState, qubit)
}

export function measure(state, qubit, rng) {
  const [p0, p1] = probabilities(state, qubit)
  const [a00, a01, a10, a11] = state
  const r = typeof rng === 'function' ? rng() : Math.random()

  let outcome = 0
  if (p0 <= 1e-15) {
    outcome = 1
  } else if (p1 <= 1e-15) {
    outcome = 0
  } else {
    outcome = r < p0 ? 0 : 1
  }

  if (outcome === 0) {
    const norm = Math.sqrt(p0)
    if (qubit === 'A') {
      return {
        outcome: 0,
        state: [a00 / norm, a01 / norm, 0, 0],
      }
    }
    return {
      outcome: 0,
      state: [a00 / norm, 0, a10 / norm, 0],
    }
  } else {
    const norm = Math.sqrt(p1)
    if (qubit === 'A') {
      return {
        outcome: 1,
        state: [0, 0, a10 / norm, a11 / norm],
      }
    }
    return {
      outcome: 1,
      state: [0, a01 / norm, 0, a11 / norm],
    }
  }
}

export function measureSideways(state, qubit, rng) {
  // apply H, measure up-down, THEN APPLY H AGAIN
  const hState = applyH(state, qubit)
  const { outcome, state: collapsedZ } = measure(hState, qubit, rng)
  const finalState = applyH(collapsedZ, qubit)
  return { outcome, state: finalState }
}

export function entanglement(state) {
  const [a00, a01, a10, a11] = state
  return 2 * Math.abs(a00 * a11 - a01 * a10)
}

export function pairFacts(state) {
  const [a00, a01, a10, a11] = state
  const zz = a00 * a00 - a01 * a01 - a10 * a10 + a11 * a11
  const xx = 2 * (a00 * a11 + a01 * a10)

  const zzAgree = Math.abs(zz - 1) < 1e-9
  const zzDiffer = Math.abs(zz + 1) < 1e-9
  const xxAgree = Math.abs(xx - 1) < 1e-9
  const xxDiffer = Math.abs(xx + 1) < 1e-9

  if ((!zzAgree && !zzDiffer) || (!xxAgree && !xxDiffer)) {
    return { zz: 'unsure', xx: 'unsure' }
  }

  return {
    zz: zzAgree ? 'agree' : 'differ',
    xx: xxAgree ? 'agree' : 'differ',
  }
}

export function makePair() {
  // H on A, then CNOT(A control, B target) from |00>
  return applyCNOT(applyH(zeroState(), 'A'))
}

export function encode(state, bits) {
  // 00 = nothing; 01 = X (flip); 10 = Z (twist); 11 = Z first, then X. Acts on A only.
  if (bits === '00') {
    return [...state]
  }
  if (bits === '01') {
    return applyX(state, 'A')
  }
  if (bits === '10') {
    return applyZ(state, 'A')
  }
  if (bits === '11') {
    return applyX(applyZ(state, 'A'), 'A')
  }
  return [...state]
}

export function decode(state, rng) {
  // CNOT(A->B), then H on A, then measure A, then B
  const s1 = applyCNOT(state)
  const s2 = applyH(s1, 'A')
  const mA = measure(s2, 'A', rng)
  const mB = measure(mA.state, 'B', rng)
  return {
    bits: `${mA.outcome}${mB.outcome}`,
    state: mB.state,
  }
}

export function reducedProbabilities(state, qubit, lens) {
  if (lens === 'side') {
    return probabilitiesSideways(state, qubit)
  }
  return probabilities(state, qubit)
}

export function sureness(state, qubit, lens) {
  const [p0] = reducedProbabilities(state, qubit, lens)
  return Math.max(p0, 1 - p0)
}

export function maxDistinguishable(tDegreesList) {
  if (!Array.isArray(tDegreesList) || tDegreesList.length === 0) {
    return 0
  }
  for (let i = 0; i < tDegreesList.length; i++) {
    for (let j = i + 1; j < tDegreesList.length; j++) {
      const diffDeg = Math.abs(tDegreesList[i] - tDegreesList[j])
      const overlap = Math.abs(Math.cos(((diffDeg / 2) * Math.PI) / 180))
      if (overlap <= 0.05) {
        return 2
      }
    }
  }
  return 1
}
