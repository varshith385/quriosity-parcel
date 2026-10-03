/**
 * Fake Engine for Level 14: One-hand writing
 * Provides a mock implementation of the Engine contract for testing Level 14 UI.
 * Does not implement actual quantum mathematics.
 */

export function createFakeEngine(initialOverrides = {}) {
  const levelId = initialOverrides.levelId || 14
  
  let state = {
    levelId: levelId,
    title: levelId === 12 ? "Make twins" : "One-hand writing",
    goalLine: levelId === 12 ? "Produce two linked parcels." : "Make the lights match the target message.",
    mode: "pair",
    tier: 1,
    newWords: levelId === 12 ? ["lens-changer", "linker", "entanglement"] : ["flip", "twist"],
    target: levelId === 12 ? null : { type: "message", bits: "10" },
    phase: "alice",
    state: levelId === 12 ? [1, 0, 0, 0] : [1 / Math.SQRT2, 0, 0, 1 / Math.SQRT2],
    dial: null,
    toolsAvailable: levelId === 12 ? ["lens", "linker"] : ["flip", "twist"],
    lenses: ["ud", "side"],
    lockedQubits: levelId === 12 ? [] : ["B"],
    thread: levelId === 12 ? false : true,
    lights: levelId === 12 ? null : { zz: "agree", xx: "agree" },
    meters: null,
    tally: null,
    moveLog: [],
    moveCount: 0,
    failureCount: 0,
    par: 2,
    stars: 0,
    extra: {},
    status: "playing",
    feedback: {
      kind: "info",
      text: levelId === 12 ? "Apply the lens-changer and the linker." : "Alice acts on her twin only. Bob's twin is locked."
    },
    score: null,
    progress: {
      completedIds: [],
      starsById: {}
    },
    ...initialOverrides
  }

  const subscribers = new Set()

  function notify() {
    const currentState = getRenderState()
    for (const sub of subscribers) {
      try {
        sub(currentState)
      } catch (err) {
        console.error("Subscriber callback failed:", err)
      }
    }
  }

  function getRenderState() {
    return JSON.parse(JSON.stringify(state))
  }

  function subscribe(fn) {
    subscribers.add(fn)
    return () => {
      subscribers.delete(fn)
    }
  }

  function applyTool(name, qubit) {
    // Bob's twin is locked: blocked action
    if (qubit === "B" || (state.lockedQubits && state.lockedQubits.includes(qubit))) {
      state.failureCount = (state.failureCount || 0) + 1
      state.feedback = {
        kind: "blocked",
        text: state.levelId === 12 ? "Apply tools to slot A (the left parcel)." : "Bob's twin is locked. Alice acts on her twin only."
      }
      notify()
      return
    }

    if (qubit === "A" || qubit === undefined) {
      if (state.levelId === 12) {
        state.moveCount = (state.moveCount || 0) + 1
        state.moveLog.push(name)
        
        if (name === "lens") {
          // Lens-changer (H) on A
          const hasLens = state.moveLog.filter(m => m === "lens").length % 2 === 1;
          if (hasLens) {
            state.state = [1 / Math.SQRT2, 0, 1 / Math.SQRT2, 0]
            state.feedback = { kind: "info", text: "Lens-changer applied. Qubit A is now a mix." }
          } else {
            state.state = [1, 0, 0, 0]
            state.feedback = { kind: "info", text: "Lens-changer applied again. Qubit A is returned to zero." }
          }
        } else if (name === "linker") {
          // Linker (CNOT A->B)
          const lastMove = state.moveLog[state.moveLog.length - 2]
          if (state.state[0] === 1 / Math.SQRT2 && state.state[2] === 1 / Math.SQRT2) {
            // Apply CNOT: swaps state[2] and state[3]
            state.state = [1 / Math.SQRT2, 0, 0, 1 / Math.SQRT2]
            state.thread = true
            state.status = "won"
            state.stars = state.moveCount <= state.par ? 3 : 2
            state.feedback = { kind: "info", text: "Linker applied! The thread appears. Twins created!" }
          } else {
            state.feedback = { kind: "hint", text: "Linker applied, but nothing happened. State stayed |00>." }
          }
        }
      } else {
        // Level 14 logic
        if (name === "flip") {
          // Flip changes ONLY zz (Colour light)
          const nextZz = state.lights.zz === "agree" ? "differ" : "agree"
          state.lights.zz = nextZz
          state.moveCount = (state.moveCount || 0) + 1
          state.moveLog.push("flip")

          if (nextZz === "differ") {
            state.feedback = {
              kind: "info",
              text: "Flip (X) applied to Alice's twin: Colour light changed to DIFFER (Bit 2 = 1)."
            }
          } else {
            state.feedback = {
              kind: "info",
              text: "Flip (X) applied again: Colour light returned to AGREE (Bit 2 = 0)."
            }
          }
        } else if (name === "twist") {
          // Twist changes ONLY xx (Shape light)
          const nextXx = state.lights.xx === "agree" ? "differ" : "agree"
          state.lights.xx = nextXx
          state.moveCount = (state.moveCount || 0) + 1
          state.moveLog.push("twist")

          if (nextXx === "differ") {
            state.feedback = {
              kind: "info",
              text: "Twist (Z) applied to Alice's twin: Shape light changed to DIFFER (Bit 1 = 1)."
            }
          } else {
            state.feedback = {
              kind: "info",
              text: "Twist (Z) applied again: Shape light returned to AGREE (Bit 1 = 0)."
            }
          }
        }

        // Check against target message:
        const bit1 = state.lights.xx === "differ" ? "1" : "0"
        const bit2 = state.lights.zz === "differ" ? "1" : "0"
        const currentBits = `${bit1}${bit2}`

        if (state.target && state.target.bits && currentBits === state.target.bits) {
          state.status = "won"
          state.stars = state.moveCount <= state.par ? 3 : (state.moveCount <= state.par * 2 ? 2 : 1)
          state.feedback = {
            kind: "info",
            text: `Target ${state.target.bits} reached! Shape differs (1), Colour agrees (0). Message encoded!`
          }
        } else {
          state.status = "playing"
          state.stars = 0
        }
      }
      notify()
    }
  }

  function reset() {
    if (state.levelId === 12) {
      state.state = [1, 0, 0, 0]
      state.thread = false
      state.moveCount = 0
      state.moveLog = []
      state.status = "playing"
      state.stars = 0
      state.feedback = { kind: "info", text: "Reset: Try to make twins." }
    } else {
      state.lights = {
        zz: "agree",
        xx: "agree"
      }
      state.moveCount = 0
      state.moveLog = []
      state.status = "playing"
      state.stars = 0
      state.feedback = {
        kind: "info",
        text: "Reset: Alice acts on her twin only. Bob's twin is locked."
      }
    }
    notify()
  }

  return {
    applyTool,
    getRenderState,
    subscribe,
    reset
  }
}
