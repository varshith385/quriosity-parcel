/**
 * src/quantum/sim.js - STUB (Role 1 will implement full physics)
 * Exact signatures from section 3.1 of ROLES.md
 * Pure functions, never mutate input, dummy but valid return values.
 */

export function makeRng(seed) {
  return () => 0.5
}

export function zeroState() {
  return [1, 0, 0, 0]
}

export function dialState(tDegrees) {
  return [1, 0, 0, 0]
}

export function angleOf(state) {
  return 0
}

export function applyX(state, qubit) {
  return state ? [...state] : [1, 0, 0, 0]
}

export function applyZ(state, qubit) {
  return state ? [...state] : [1, 0, 0, 0]
}

export function applyH(state, qubit) {
  return state ? [...state] : [1, 0, 0, 0]
}

export function applyCNOT(state) {
  return state ? [...state] : [1, 0, 0, 0]
}

export function probabilities(state, qubit) {
  return [1, 0]
}

export function probabilitiesSideways(state, qubit) {
  return [1, 0]
}

export function measure(state, qubit, rng) {
  return {
    outcome: 0,
    state: state ? [...state] : [1, 0, 0, 0],
  }
}

export function measureSideways(state, qubit, rng) {
  return {
    outcome: 0,
    state: state ? [...state] : [1, 0, 0, 0],
  }
}

export function entanglement(state) {
  return 0
}

export function pairFacts(state) {
  return {
    zz: 'agree',
    xx: 'agree',
  }
}

export function makePair() {
  return [1 / Math.SQRT2, 0, 0, 1 / Math.SQRT2]
}

export function encode(state, bits) {
  return state ? [...state] : [1, 0, 0, 0]
}

export function decode(state, rng) {
  return {
    bits: '00',
    state: state ? [...state] : [1, 0, 0, 0],
  }
}

export function reducedProbabilities(state, qubit, lens) {
  return [1, 0]
}

export function sureness(state, qubit, lens) {
  return 1
}

export function maxDistinguishable(tDegreesList) {
  return Array.isArray(tDegreesList) ? tDegreesList.slice(0, 2) : []
}
