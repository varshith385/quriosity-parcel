/**
 * src/engine/index.js - STUB (Role 2 engine)
 * Exact contract from section 3.3 and shape from section 3.4 of ROLES.md
 */

function createInitialRenderState() {
  return {
    levelId: 1,
    title: 'One slot',
    goalLine: 'Send a 1-bit message.',
    mode: 'post',
    tier: 3,
    newWords: [],
    target: { type: 'message', bits: '1' },
    phase: 'alice',
    state: [1, 0, 0, 0],
    dial: null,
    toolsAvailable: [],
    lenses: ['ud'],
    lockedQubits: [],
    thread: false,
    lights: null,
    meters: null,
    tally: { ud: [0, 0], side: [0, 0] },
    moveLog: [],
    moveCount: 0,
    failureCount: 0,
    par: 1,
    stars: 0,
    extra: {},
    status: 'playing',
    feedback: { kind: null, text: '' },
    score: null,
    progress: { completedIds: [], starsById: {} },
  }
}

export function createEngine() {
  const listeners = new Set()
  let renderState = createInitialRenderState()

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

  function applyTool(name, qubit) {
    renderState.moveCount++
    renderState.moveLog.push(name)
    notify()
  }

  function look(qubit, lens) {
    if (!renderState.tally) {
      renderState.tally = { ud: [0, 0], side: [0, 0] }
    }
    const bucket = lens === 'side' ? 'side' : 'ud'
    renderState.tally[bucket][0]++
    notify()
  }

  function setDial(tDegrees) {
    renderState.dial = { tDegrees }
    notify()
  }

  function send() {
    renderState.phase = 'transit'
    notify()
  }

  function deliver() {
    renderState.phase = 'bob'
    notify()
  }

  function submit(answer) {
    notify()
    return { ok: true, detail: '' }
  }

  function reset() {
    renderState = createInitialRenderState()
    notify()
  }

  function nextLevel() {
    renderState.levelId++
    notify()
  }

  function selectLevel(id) {
    renderState.levelId = id
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
