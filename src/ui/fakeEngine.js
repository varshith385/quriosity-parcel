/**
 * Fake Engine for Level 14: One-hand writing
 * Provides a mock implementation of the Engine contract for testing Level 14 UI.
 * Does not implement actual quantum mathematics.
 */

export function createFakeEngine(initialOverrides = {}) {
  let state = {
    levelId: 14,
    title: "One-hand writing",
    goalLine: "Make the lights match the target message.",
    mode: "pair",
    tier: 1,
    newWords: ["flip", "twist"],
    target: { type: "message", bits: "10" },
    phase: "alice",
    state: [1 / Math.SQRT2, 0, 0, 1 / Math.SQRT2],
    dial: null,
    toolsAvailable: ["flip", "twist"],
    lenses: ["ud", "side"],
    lockedQubits: ["B"],
    thread: true,
    lights: {
      zz: "agree",
      xx: "agree"
    },
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
      text: "Alice acts on her twin only. Bob's twin is locked."
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
        text: "Bob's twin is locked. Alice acts on her twin only."
      }
      notify()
      return
    }

    if (qubit === "A") {
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
      // Bit 1 = Twist / Shape light (xx === "differ" -> "1", "agree" -> "0")
      // Bit 2 = Flip / Colour light (zz === "differ" -> "1", "agree" -> "0")
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

      notify()
    }
  }

  function reset() {
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
    notify()
  }

  return {
    applyTool,
    getRenderState,
    subscribe,
    reset
  }
}
