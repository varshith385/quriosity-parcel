/**
 * Fake Engine for Level 14: One-hand writing
 * Provides a mock implementation of the Engine contract for testing Level 14 UI.
 * Does not implement actual quantum mathematics.
 */

export function createFakeEngine(initialOverrides = {}) {
  const levelId = initialOverrides.levelId || 14
  
  const ANSWERS = ["10","01","00","11"]
  let unmade = false
  let l16Tools = []

  let state = {
    levelId: levelId,
    title: levelId === 12 ? "Make twins" : (levelId === 13 ? "Twins' facts" : (levelId === 15 ? "Your own codebook" : (levelId === 16 ? "Unmake" : (levelId === 20 ? "Network Plan" : "One-hand writing")))),
    goalLine: levelId === 12 ? "Produce two linked parcels." : (levelId === 13 ? "Read the twins and complete the fact table." : (levelId === 15 ? "Map each move to its light pattern." : (levelId === 16 ? "Turn each delivery into its two bits." : (levelId === 20 ? "Plan a sequence to deliver the messages within budget." : "Make the lights match the target message.")))),
    mode: (levelId === 16 || levelId === 20) ? "post" : "pair",
    tier: 1,
    newWords: levelId === 12 ? ["lens-changer", "linker"] : (levelId === 16 ? ["unmake"] : ["flip", "twist"]),
    target: (levelId === 12 || levelId === 13 || levelId === 15) ? null : (levelId === 16 ? { type: "stream" } : (levelId === 20 ? { type: "budget" } : { type: "message", bits: "10" })),
    phase: levelId === 16 ? "bob" : "alice",
    state: levelId === 12 ? [1, 0, 0, 0] : [1 / Math.SQRT2, 0, 0, 1 / Math.SQRT2],
    dial: null,
    toolsAvailable: levelId === 12 ? ["lens", "linker"] : (levelId === 13 ? [] : (levelId === 16 ? ["lens", "linker", "unmake"] : ["flip", "twist"])),
    lenses: levelId === 13 ? ["ud", "side"] : ["ud"],
    lockedQubits: (levelId === 12 || levelId === 13 || levelId === 16) ? [] : ["B"],
    thread: levelId === 12 ? false : true,
    lights: (levelId === 12 || levelId === 13 || levelId === 16) ? null : { zz: "agree", xx: "agree" },
    meters: null,
    tally: levelId === 13 ? { ud: [0, 0], side: [0, 0] } : null,
    moveLog: [],
    moveCount: 0,
    failureCount: 0,
    par: levelId === 16 ? 4 : 2,
    stars: 0,
    extra: {},
    status: "playing",
    feedback: {
      kind: "info",
      text: levelId === 12 ? "Apply the lens-changer and the linker." : (levelId === 13 ? "Choose a lens and read both twins." : (levelId === 15 ? "Try moves to fill the codebook." : (levelId === 16 ? "Ready to start the first delivery." : (levelId === 20 ? "Create a plan." : "Alice acts on her twin only. Bob's twin is locked."))))
    },
    score: null,
    progress: {
      completedIds: [],
      starsById: {}
    },
    ...initialOverrides
  }

  if (levelId === 13) {
    state.extra.factTable = [
      { id: "ud", label: "When both are read up-down..." },
      { id: "side", label: "When both are read sideways..." }
    ]
    state.extra.control = false
    state.lenses = ["ud", "side"]
  } else if (levelId === 15) {
    state.extra.codebook = [
      { id: "I", label: "Nothing" },
      { id: "X", label: "Flip" },
      { id: "Z", label: "Twist" },
      { id: "XZ", label: "Twist then Flip" }
    ]
    state.lenses = ["ud"]
  } else if (levelId === 14) {
    state.lenses = ["ud", "side"]
  } else if (levelId === 16) {
    state.extra.delivery = { index: 0, total: 4 }
    state.extra.decoded = []
    state.extra.readings = { A: null, B: null }
    state.extra.lastAttempt = null
  } else if (levelId === 20) {
    state.extra.messages = [
      { id: "m1", bits: "1" },
      { id: "m2", bits: "10" },
      { id: "m3", bits: "101" },
      { id: "m4", bits: "1011" }
    ]
    state.extra.budget = { parcels: 7, twins: 3 }
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
            state.feedback = { kind: "info", text: "Linker applied! The thread appears. Twins created!" }
          } else {
            state.feedback = { kind: "hint", text: "Linker applied, but nothing happened. State stayed |00>." }
          }
        }
      } else if (state.levelId === 16) {
        state.moveCount = (state.moveCount || 0) + 1
        l16Tools.push(name)
        if (name === "unmake") {
          unmade = true
        } else if (l16Tools.length >= 2 && l16Tools[l16Tools.length - 2] === "linker" && l16Tools[l16Tools.length - 1] === "lens") {
          unmade = true
        } else {
          unmade = false
          state.feedback = { kind: "info", text: "Nothing new came out of that step." }
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
              text: "Flip applied to Alice's twin: Colour light changed to DIFFER (Bit 2 = 1)."
            }
          } else {
            state.feedback = {
              kind: "info",
              text: "Flip applied again: Colour light returned to AGREE (Bit 2 = 0)."
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
              text: "Twist applied to Alice's twin: Shape light changed to DIFFER (Bit 1 = 1)."
            }
          } else {
            state.feedback = {
              kind: "info",
              text: "Twist applied again: Shape light returned to AGREE (Bit 1 = 0)."
            }
          }
        }

        // Check against target message:
        const bit1 = state.lights.xx === "differ" ? "1" : "0"
        const bit2 = state.lights.zz === "differ" ? "1" : "0"
        const currentBits = `${bit1}${bit2}`

        if (state.target && state.target.bits) {
          if (currentBits === state.target.bits) {
            state.feedback = {
              kind: "info",
              text: `Target ${state.target.bits} reached! Shape differs (1), Colour agrees (0). Message encoded!`
            }
          } else {
            state.status = "playing"
            state.stars = 0
          }
        }
      }
      notify()
    }
  }

  function look(qubit, lens) {
    if (state.levelId === 13) {
      if (!state.tally) state.tally = { ud: [0, 0], side: [0, 0] }
      // Mock logic: Twins always agree, so we always increment bin 0 for 'ud' and bin 1 for 'side'
      const bin = lens === "ud" ? 0 : 1
      state.tally[lens][bin]++
      
      state.feedback = { kind: "info", text: `Looked at twin ${qubit} ${lens === "ud" ? "up-down" : "sideways"}.` }
      notify()
    } else if (state.levelId === 16) {
      if (state.extra.readings[qubit] !== null) {
        state.feedback = { kind: "info", text: "You already read that twin in this delivery." }
        notify()
        return
      }
      state.moveCount = (state.moveCount || 0) + 1
      const currentAnswer = ANSWERS[state.extra.delivery.index]
      let bit
      if (unmade) {
        bit = qubit === "A" ? currentAnswer[0] : currentAnswer[1]
      } else {
        bit = Math.random() < 0.5 ? "0" : "1"
      }
      state.extra.readings[qubit] = bit

      if (state.extra.readings.A !== null && state.extra.readings.B !== null) {
        const decodedStr = state.extra.readings.A + state.extra.readings.B
        state.extra.decoded.push(decodedStr)

        if (state.extra.delivery.index < 3) {
          state.extra.delivery.index += 1
          state.extra.readings = { A: null, B: null }
          unmade = false
          l16Tools = []
        } else {
          let allMatch = true
          for (let i = 0; i < 4; i++) {
            if (state.extra.decoded[i] !== ANSWERS[i]) allMatch = false
          }
          if (allMatch) {
            state.status = "won"
            state.stars = state.moveCount <= state.par ? 3 : (state.moveCount <= state.par * 2 ? 2 : 1)
          } else {
            state.failureCount = (state.failureCount || 0) + 1
            state.extra.lastAttempt = [...state.extra.decoded]

            state.extra.delivery.index = 0
            state.extra.decoded = []
            state.extra.readings = { A: null, B: null }
            unmade = false
            l16Tools = []

            let hintText = "Not quite. Try again."
            if (state.failureCount >= 6) {
              hintText = "Run the linker, then the lens-changer, then look at each twin once."
            } else if (state.failureCount >= 4) {
              hintText = "Undo means the same steps in reverse order."
            } else if (state.failureCount >= 2) {
              hintText = "Looking at each twin on its own gives nothing steady. Undo Alice's machine first."
            }
            state.feedback = { kind: "hint", text: hintText }
          }
        }
      }
      notify()
    }
  }

  function submit(answer) {
    if (state.levelId === 13) {
      if (answer && answer.cells && answer.cells.ud === "agree" && answer.cells.side === "agree") {
        state.status = "won"
        state.stars = 3
        state.feedback = { kind: "info", text: "Correct! Twins always agree when read in the same lens." }
      } else {
        state.failureCount = (state.failureCount || 0) + 1
        state.feedback = { kind: "blocked", text: "Not quite right. Look at the tally again." }
      }
    } else if (state.levelId === 15) {
      if (answer && answer.cells && answer.cells.I === "00" && answer.cells.X === "01" && answer.cells.Z === "10" && answer.cells.XZ === "11") {
        state.status = "won"
        state.stars = 3
        state.feedback = { kind: "info", text: "Codebook complete!" }
      } else {
        state.failureCount = (state.failureCount || 0) + 1
        state.feedback = { kind: "blocked", text: "Some patterns are wrong." }
      }
    } else if (state.levelId === 20) {
      if (answer && answer.plan) {
        state.status = "won"
        state.stars = 3
        state.score = {
          bitsPerParcel: 1.43,
          parcelsUsed: answer.plan.length,
          twinsLeft: 3 - answer.plan.filter(r => r.useTwin).length
        }
        state.feedback = { kind: "info", text: "Plan executed successfully!" }
      }
    } else if (state.levelId === 12) {
      if (state.state && state.state[0] === 1 / Math.SQRT2 && state.state[3] === 1 / Math.SQRT2) {
        state.status = "won"
        state.stars = state.moveCount <= state.par ? 3 : 2
      } else {
        state.failureCount = (state.failureCount || 0) + 1
        state.feedback = { kind: "hint", text: "Not yet. Try again." }
      }
    } else if (state.levelId === 14) {
      const bit1 = state.lights.xx === "differ" ? "1" : "0"
      const bit2 = state.lights.zz === "differ" ? "1" : "0"
      const currentBits = `${bit1}${bit2}`
      if (state.target && currentBits === state.target.bits) {
        state.status = "won"
        state.stars = state.moveCount <= state.par ? 3 : (state.moveCount <= state.par * 2 ? 2 : 1)
      } else {
        state.failureCount = (state.failureCount || 0) + 1
        state.feedback = { kind: "hint", text: "Not yet. Try again." }
      }
    }
    notify()
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
    } else if (state.levelId === 16) {
      state.moveCount = 0
      state.failureCount = 0
      state.extra.delivery.index = 0
      state.extra.decoded = []
      state.extra.readings = { A: null, B: null }
      state.extra.lastAttempt = null
      unmade = false
      l16Tools = []
      state.status = "playing"
      state.stars = 0
      state.feedback = { kind: "info", text: "Ready to start the first delivery." }
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
        text: state.levelId === 13 ? "Reset: Choose a lens and read both twins." : (state.levelId === 15 ? "Reset: Try moves to fill the codebook." : (state.levelId === 20 ? "Reset: Create a plan." : "Reset: Alice acts on her twin only. Bob's twin is locked."))
      }
    }
    notify()
  }

  return {
    applyTool,
    look,
    submit,
    getRenderState,
    subscribe,
    reset
  }
}
