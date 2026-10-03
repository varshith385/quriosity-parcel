/**
 * src/engine/index.js - Game Engine for Quriosity Parcel
 * Implements engine contract from section 3.3 and render state from section 3.4.
 * Uses loadLevels to load levels from src/levels/*.json.
 * Contains NO physics formulas - delegates quantum operations to src/quantum/sim.js.
 */

import { loadLevels, normalizeLevel } from './loader.js'
import * as sim from '../quantum/sim.js'

export { loadLevels, normalizeLevel }

function safeLoadProgress() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('quriosity_progress') : null
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
        starsById: parsed.starsById && typeof parsed.starsById === 'object' ? parsed.starsById : {},
      }
    }
  } catch (err) {
    // localStorage may be disabled or blocked
  }
  return { completedIds: [], starsById: {} }
}

function safeSaveProgress(progress) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('quriosity_progress', JSON.stringify(progress))
    }
  } catch (err) {
    // localStorage may be disabled or blocked
  }
}

function createFallbackLevel() {
  return normalizeLevel({
    id: 1,
    title: 'One slot',
    goalLine: 'Send a 1-bit message.',
    mode: 'post',
    tier: 3,
    newWords: [],
    tools: [],
    lenses: ['ud'],
    lockedQubits: [],
    start: { kind: 'zero', t: 0 },
    phases: ['alice'],
    transit: { spy: false, road: null },
    target: { type: 'message', bits: '1' },
    par: 1,
  })
}

function createInitialStateForLevel(level) {
  if (level.start?.kind === 'pair') {
    return sim.makePair()
  }
  if (level.start?.kind === 'dial') {
    return sim.dialState(level.start.t || 0)
  }
  return sim.zeroState()
}

export function createEngine(options = {}) {
  const loadedLevels = options.levels || loadLevels()
  const fallbackLevel = createFallbackLevel()
  const levels = loadedLevels.length > 0 ? loadedLevels : [fallbackLevel]

  let currentLevel = levels[0]
  let currentPhase = currentLevel.phases[0] || 'alice'
  let quantumState = createInitialStateForLevel(currentLevel)
  let dial = currentLevel.mode === 'dial' ? { tDegrees: currentLevel.start?.t || 0 } : null
  let tally = { ud: [0, 0], side: [0, 0] }
  let moveLog = []
  let moveCount = 0
  let failureCount = 0
  let stars = 0
  let status = 'playing'
  let feedback = { kind: null, text: '' }
  let score = null
  let progress = safeLoadProgress()

  const listeners = new Set()

  function getRenderState() {
    const thread = sim.entanglement(quantumState) > 0.99
    const lights = currentLevel.mode === 'pair' ? sim.pairFacts(quantumState) : null
    const meters =
      currentLevel.mode === 'dial' && currentLevel.target?.type === 'optimise'
        ? {
            ud: sim.sureness(quantumState, 'A', 'ud'),
            side: sim.sureness(quantumState, 'A', 'side'),
          }
        : null

    return {
      levelId: currentLevel.id,
      title: currentLevel.title,
      goalLine: currentLevel.goalLine,
      mode: currentLevel.mode,
      tier: currentLevel.tier,
      newWords: [...currentLevel.newWords],
      target: { ...currentLevel.target },
      phase: currentPhase,
      state: [...quantumState],
      dial: dial ? { ...dial } : null,
      toolsAvailable: [...currentLevel.tools],
      lenses: [...currentLevel.lenses],
      lockedQubits: [...currentLevel.lockedQubits],
      thread,
      lights: lights ? { ...lights } : null,
      meters: meters ? { ...meters } : null,
      tally: tally ? { ud: [...tally.ud], side: [...tally.side] } : null,
      moveLog: [...moveLog],
      moveCount,
      failureCount,
      par: currentLevel.par,
      stars,
      extra: { ...currentLevel.extra },
      status,
      feedback: { ...feedback },
      score: score ? { ...score } : null,
      progress: {
        completedIds: [...progress.completedIds],
        starsById: { ...progress.starsById },
      },
    }
  }

  function notify() {
    const currentState = getRenderState()
    for (const listener of listeners) {
      try {
        listener(currentState)
      } catch (err) {
        console.error('Engine subscriber error:', err)
      }
    }
  }

  function subscribe(fn) {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  }

  function resetLevelState(level) {
    currentLevel = level
    currentPhase = level.phases[0] || 'alice'
    quantumState = createInitialStateForLevel(level)
    dial = level.mode === 'dial' ? { tDegrees: level.start?.t || 0 } : null
    tally = { ud: [0, 0], side: [0, 0] }
    moveLog = []
    moveCount = 0
    failureCount = 0
    stars = 0
    status = 'playing'
    feedback = { kind: null, text: '' }
    score = null
  }

  function applyTool(name, qubit) {
    // Check if qubit is locked
    if (qubit && currentLevel.lockedQubits.includes(qubit)) {
      failureCount++
      const blockedText =
        currentLevel.events?.['tool-blocked'] || `Qubit ${qubit} is locked.`
      feedback = { kind: 'blocked', text: blockedText }
      notify()
      return
    }

    moveCount++
    moveLog.push(name)

    const targetQubit = qubit || 'A'
    if (name === 'flip') {
      quantumState = sim.applyX(quantumState, targetQubit)
    } else if (name === 'twist') {
      quantumState = sim.applyZ(quantumState, targetQubit)
    } else if (name === 'lens') {
      quantumState = sim.applyH(quantumState, targetQubit)
    } else if (name === 'linker') {
      quantumState = sim.applyCNOT(quantumState)
    } else if (name === 'unmake') {
      quantumState = sim.applyCNOT(quantumState)
      quantumState = sim.applyH(quantumState, 'A')
    }

    notify()
  }

  function look(qubit, lens) {
    const targetQubit = qubit || 'A'
    const targetLens = lens || 'ud'
    const rng = sim.makeRng(Date.now())

    let result
    if (targetLens === 'side') {
      result = sim.measureSideways(quantumState, targetQubit, rng)
    } else {
      result = sim.measure(quantumState, targetQubit, rng)
    }

    quantumState = result.state
    const outcomeIndex = result.outcome === 1 || result.outcome === '-' ? 1 : 0
    const lensKey = targetLens === 'side' ? 'side' : 'ud'
    tally[lensKey][outcomeIndex]++

    notify()
  }

  function setDial(tDegrees) {
    dial = { tDegrees }
    quantumState = sim.dialState(tDegrees)
    notify()
  }

  function send() {
    currentPhase = 'transit'
    notify()
  }

  function deliver() {
    currentPhase = 'bob'
    notify()
  }

  function submit(answer) {
    notify()
    return { ok: true, detail: '' }
  }

  function reset() {
    resetLevelState(currentLevel)
    notify()
  }

  function nextLevel() {
    const currentIndex = levels.findIndex((l) => l.id === currentLevel.id)
    if (currentIndex !== -1 && currentIndex + 1 < levels.length) {
      resetLevelState(levels[currentIndex + 1])
    } else {
      resetLevelState(currentLevel)
    }
    notify()
  }

  function selectLevel(id) {
    const found = levels.find((l) => l.id === Number(id))
    if (found) {
      resetLevelState(found)
    } else {
      console.warn(`Level ${id} not found in available levels.`)
    }
    notify()
  }

  return {
    getRenderState,
    subscribe,
    applyTool,
    look,
    setDial,
    send,
    deliver,
    submit,
    reset,
    nextLevel,
    selectLevel,
  }
}
