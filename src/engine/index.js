/**
 * src/engine/index.js - Game Engine for Quriosity Parcel
 * Full implementation conforming to sections 3.3 and 3.4 of ROLES.md.
 * State is plain JSON and rebuilt after every action.
 * Physics operations are delegated strictly to src/quantum/sim.js (no formulas here).
 */

import { loadLevels, normalizeLevel } from './loader.js'
import testLevelFixture from '../fixtures/test-level.json'
import * as sim from '../quantum/sim.js'

export { loadLevels, normalizeLevel }

// Target checkers map
const targetModules = import.meta.glob('./targets/*.js', { eager: true })

function getChecker(type) {
  if (type) {
    for (const [path, mod] of Object.entries(targetModules)) {
      if (path.endsWith(`/${type}.js`) || path.endsWith(`\\${type}.js`)) {
        const checker = mod && (mod.check ? mod : mod.default)
        if (checker && typeof checker.check === 'function') {
          return checker
        }
      }
    }
  }

  // TODO: Replace with real checker from src/engine/targets/<type>.js once implemented by Role 1
  return {
    check: (_level, _context, _answer) => ({ ok: true, detail: 'stub' }),
  }
}

export const PROGRESS_STORAGE_KEY = 'quriosity_progress'

export function safeLoadProgress() {
  try {
    const raw =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(PROGRESS_STORAGE_KEY)
        : null
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        completedIds: Array.isArray(parsed.completedIds) ? parsed.completedIds : [],
        starsById:
          parsed.starsById && typeof parsed.starsById === 'object'
            ? parsed.starsById
            : {},
      }
    }
  } catch (err) {
    // localStorage may be disabled or blocked in certain environments
  }
  return { completedIds: [], starsById: {} }
}

export function safeSaveProgress(progress) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(
        PROGRESS_STORAGE_KEY,
        JSON.stringify({
          completedIds: progress.completedIds || [],
          starsById: progress.starsById || {},
        })
      )
    }
  } catch (err) {
    // localStorage may be disabled or blocked
  }
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
  let loadedLevels = options.levels
  if (!loadedLevels || loadedLevels.length === 0) {
    const fromLoader = loadLevels()
    if (fromLoader && fromLoader.length > 0) {
      loadedLevels = fromLoader
    } else {
      console.info('No levels returned by loader; falling back to src/fixtures/test-level.json as the only level.')
      loadedLevels = [normalizeLevel(testLevelFixture)]
    }
  }

  const levels = loadedLevels
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
  let progress = options.progress || safeLoadProgress()

  const listeners = new Set()

  function checkHints() {
    if (status === 'playing' && currentLevel.hints && Array.isArray(currentLevel.hints)) {
      const matchingHints = currentLevel.hints
        .filter((h) => failureCount >= h.afterFailures)
        .sort((a, b) => b.afterFailures - a.afterFailures)
      if (matchingHints.length > 0) {
        feedback = { kind: 'hint', text: matchingHints[0].text }
        return true
      }
    }
    return false
  }

  function buildRenderState() {
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

  let renderState = buildRenderState()

  function getRenderState() {
    return JSON.parse(JSON.stringify(renderState))
  }

  function notify() {
    const current = getRenderState()
    for (const listener of listeners) {
      try {
        listener(current)
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
    if (qubit && currentLevel.lockedQubits.includes(qubit)) {
      failureCount++
      const blockedText =
        currentLevel.events?.['tool-blocked'] || `Bob's twin is locked.`
      feedback = { kind: 'blocked', text: blockedText }
      checkHints()
      renderState = buildRenderState()
      notify()
      return
    }

    const prevLights = currentLevel.mode === 'pair' ? sim.pairFacts(quantumState) : null
    const prevState = [...quantumState]

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

    const newLights = currentLevel.mode === 'pair' ? sim.pairFacts(quantumState) : null
    const newState = [...quantumState]

    const lightsUnchanged =
      currentLevel.mode === 'pair' &&
      prevLights &&
      newLights &&
      prevLights.zz === newLights.zz &&
      prevLights.xx === newLights.xx

    const stateUnchanged = prevState.every(
      (val, i) => Math.abs(val - newState[i]) < 1e-9
    )

    if (lightsUnchanged || stateUnchanged) {
      const noChangeText =
        currentLevel.events?.['no-visible-change'] || 'This move causes no visible change.'
      feedback = { kind: 'info', text: noChangeText }
    } else {
      feedback = { kind: null, text: '' }
    }

    checkHints()
    renderState = buildRenderState()
    notify()
  }

  function look(qubit, lens) {
    const actor =
      currentPhase === 'transit'
        ? 'spy'
        : currentPhase === 'bob'
          ? 'bob'
          : 'alice'

    const targetQubit = qubit || (currentPhase === 'bob' ? 'B' : 'A')
    const targetLens = lens || 'ud'
    const rng = sim.makeRng(Date.now())

    let res
    if (targetLens === 'side') {
      res = sim.measureSideways(quantumState, targetQubit, rng)
    } else {
      res = sim.measure(quantumState, targetQubit, rng)
    }

    quantumState = res.state
    const outcomeIndex = res.outcome === 1 || res.outcome === '-' ? 1 : 0
    const lensKey = targetLens === 'side' ? 'side' : 'ud'
    tally[lensKey][outcomeIndex]++

    renderState = buildRenderState()
    notify()

    return {
      actor,
      outcome: res.outcome,
      qubit: targetQubit,
      lens: targetLens,
      state: [...quantumState],
    }
  }

  function setDial(tDegrees) {
    dial = { tDegrees }
    quantumState = sim.dialState(tDegrees)
    renderState = buildRenderState()
    notify()
  }

  function send() {
    currentPhase = 'transit'
    renderState = buildRenderState()
    notify()
  }

  function deliver() {
    currentPhase = 'bob'
    if (currentLevel.transit?.road) {
      const road = String(currentLevel.transit.road).toUpperCase()
      if (road === 'X' || road === 'FLIP') {
        quantumState = sim.applyX(quantumState, 'A')
      } else if (road === 'Z' || road === 'TWIST') {
        quantumState = sim.applyZ(quantumState, 'A')
      } else if (road === 'XZ') {
        quantumState = sim.applyZ(quantumState, 'A')
        quantumState = sim.applyX(quantumState, 'A')
      }
    }
    renderState = buildRenderState()
    notify()
  }

  function submit(answer = {}) {
    const targetType = currentLevel.target?.type || 'message'
    const checker = getChecker(targetType)

    const context = {
      state: [...quantumState],
      phase: currentPhase,
      lights: sim.pairFacts(quantumState),
      entanglement: sim.entanglement(quantumState),
      dial: dial ? { ...dial } : null,
      moveCount,
      failureCount,
    }

    const result = checker.check(currentLevel, context, answer)

    if (result.ok) {
      status = 'won'
      stars =
        moveCount <= currentLevel.par
          ? 3
          : moveCount <= currentLevel.par * 2
            ? 2
            : 1
      if (!progress.completedIds.includes(currentLevel.id)) {
        progress.completedIds.push(currentLevel.id)
      }
      progress.starsById[currentLevel.id] = Math.max(
        progress.starsById[currentLevel.id] || 0,
        stars
      )
      safeSaveProgress(progress)
      feedback = {
        kind: 'info',
        text: currentLevel.events?.win || result.detail || 'Goal reached!',
      }
    } else {
      failureCount++
      feedback = {
        kind: 'info',
        text:
          currentLevel.events?.['wrong-result'] ||
          result.detail ||
          'Not quite right. Try again!',
      }
      checkHints()
    }

    renderState = buildRenderState()
    notify()
    return result
  }

  function reset() {
    resetLevelState(currentLevel)
    renderState = buildRenderState()
    notify()
  }

  function nextLevel() {
    const currentIndex = levels.findIndex((l) => l.id === currentLevel.id)
    if (currentIndex !== -1 && currentIndex + 1 < levels.length) {
      resetLevelState(levels[currentIndex + 1])
    } else {
      resetLevelState(currentLevel)
    }
    renderState = buildRenderState()
    notify()
  }

  function selectLevel(id) {
    const found = levels.find((l) => l.id === Number(id))
    if (found) {
      resetLevelState(found)
    } else {
      console.warn(`Level ${id} not found in available levels.`)
    }
    renderState = buildRenderState()
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
