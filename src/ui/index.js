/**
 * UI Renderer for Level 14: One-hand writing
 * Export exactly: mountUI(root, engine)
 * 
 * Rules:
 * - Reads engine.getRenderState()
 * - Calls only allowed engine actions: engine.applyTool(name, qubit), engine.reset()
 * - Subscribes using engine.subscribe()
 * - The UI NEVER calculates or modifies quantum state itself.
 * - Never relies on colour alone.
 */

export function mountUI(root, engine) {
  const container = typeof root === "string" ? document.querySelector(root) : root
  if (!container) {
    throw new Error("mountUI: Target root container element not found.")
  }

  // Build the static shell once
  container.innerHTML = `
    <div class="parcel-game-app" id="level14-app">
      <!-- HEADER / GOAL SECTION -->
      <header class="game-header">
        <div class="header-top-row">
          <div class="level-badge-group">
            <span class="badge badge-act">ACT 4 · TWINS</span>
            <span class="badge badge-level" id="header-level-badge">LEVEL 14</span>
            <span class="badge badge-phase" id="header-phase-badge">PHASE: ALICE</span>
          </div>
          <div class="header-actions">
            <span class="move-tracker" id="header-moves">Moves: 0 / Par: 2</span>
            <button type="button" class="btn-reset" id="btn-reset" title="Reset this level">
              <span class="btn-icon" aria-hidden="true">↺</span>
              <span>Reset</span>
            </button>
          </div>
        </div>

        <h1 class="level-title" id="header-title">One-hand writing</h1>
        <p class="goal-line" id="header-goal">Make the lights match the target message.</p>

        <!-- TARGET BANNER (Hidden in Level 12) -->
        <div class="target-card" id="target-card">
          <div class="target-main">
            <span class="target-tag">MISSION GOAL</span>
            <div class="target-value-box">
              <span class="target-label">Target:</span>
              <span class="target-code" id="target-display">10</span>
            </div>
            <div class="target-rule-hint">
              <span class="rule-chip"><span class="chip-shape">⬡</span> Bit 1 (Shape) = <strong>1 (Differ)</strong></span>
              <span class="rule-chip"><span class="chip-shape">◆</span> Bit 2 (Colour) = <strong>0 (Agree)</strong></span>
            </div>
          </div>
          <div class="target-status-box" id="target-status-box">
            <span class="current-label">Current Pair Message:</span>
            <span class="current-value" id="current-bits-display">00</span>
            <span class="status-pill" id="target-match-pill">In Progress</span>
          </div>
        </div>
      </header>

      <!-- VICTORY NOTIFICATION BANNER (Hidden during play) -->
      <div class="win-banner" id="win-banner" hidden>
        <div class="win-content">
          <div class="win-stars" id="win-stars">★★★</div>
          <div class="win-text-group">
            <h2 class="win-title" id="win-title-text">Success!</h2>
            <p class="win-desc" id="win-desc-text">You completed the level.</p>
          </div>
        </div>
      </div>

      <!-- FEEDBACK LINE -->
      <section class="feedback-section" aria-live="polite">
        <div class="feedback-card feedback-info" id="feedback-card">
          <span class="feedback-badge" id="feedback-badge">
            <span class="badge-icon" id="feedback-icon" aria-hidden="true">ℹ️</span>
            <span class="badge-text" id="feedback-kind-text">INFO</span>
          </span>
          <p class="feedback-message" id="feedback-text">Alice acts on her twin only. Bob's twin is locked.</p>
        </div>
      </section>

      <!-- BLUEPRINT VIEW (PAIR FACTS) -->
      <!-- BLUEPRINT VIEW (PAIR FACTS) - Hidden if no lights -->
      <section class="blueprint-section" id="blueprint-section" aria-labelledby="blueprint-heading">
        <div class="blueprint-header">
          <div class="blueprint-title-row">
            <span class="blueprint-tag">📐 BLUEPRINT VIEW</span>
            <h2 id="blueprint-heading" class="blueprint-title">Pair Facts (Global Measurement)</h2>
          </div>
          <p class="blueprint-caption">
            These lights show the relationship between both twins together. Neither twin alone reveals either fact.
          </p>
        </div>

        <div class="lights-grid">
          <!-- LIGHT 1: COLOUR LIGHT (ZZ) -->
          <div class="blueprint-light-panel" id="light-panel-zz" data-state="agree">
            <div class="light-top">
              <div class="light-glyph-wrapper glyph-colour">
                <span class="light-geometric-shape shape-diamond" aria-hidden="true">◆</span>
                <span class="pattern-indicator pattern-stripes" title="Striped pattern"></span>
              </div>
              <div class="light-meta">
                <h3 class="light-name">Colour Light</h3>
                <span class="light-subtext">ZZ Parity · Bit 2 (Flip)</span>
              </div>
              <div class="light-state-badge" id="light-zz-badge">
                <span class="state-icon" id="light-zz-icon">=</span>
                <span class="state-text" id="light-zz-text">AGREE</span>
              </div>
            </div>
            <div class="light-explanation" id="light-zz-desc">
              Colours agree when both read up-down (=)
            </div>
            <div class="light-control-tag">
              Controlled by: <strong>Flip (X)</strong>
            </div>
          </div>

          <!-- LIGHT 2: SHAPE LIGHT (XX) -->
          <div class="blueprint-light-panel" id="light-panel-xx" data-state="agree">
            <div class="light-top">
              <div class="light-glyph-wrapper glyph-shape">
                <span class="light-geometric-shape shape-hexagon" aria-hidden="true">⬡</span>
                <span class="pattern-indicator pattern-dots" title="Dotted pattern"></span>
              </div>
              <div class="light-meta">
                <h3 class="light-name">Shape Light</h3>
                <span class="light-subtext">XX Parity · Bit 1 (Twist)</span>
              </div>
              <div class="light-state-badge" id="light-xx-badge">
                <span class="state-icon" id="light-xx-icon">=</span>
                <span class="state-text" id="light-xx-text">AGREE</span>
              </div>
            </div>
            <div class="light-explanation" id="light-xx-desc">
              Shapes agree when both read sideways (=)
            </div>
            <div class="light-control-tag">
              Controlled by: <strong>Twist (Z)</strong>
            </div>
          </div>
        </div>
      </section>

      <!-- TWIN CARDS & ENTANGLEMENT THREAD -->
      <section class="twins-section" aria-label="Quantum Twin Parcels">
        <!-- ALICE'S TWIN -->
        <article class="twin-card twin-alice" id="card-alice">
          <div class="twin-card-header">
            <div class="twin-header-text">
              <span class="twin-role-tag">QUBIT A</span>
              <h2 class="twin-title">Alice's Twin</h2>
            </div>
            <span class="twin-status-pill status-active" id="alice-status-pill">
              <span class="active-dot" aria-hidden="true">●</span>
              <span id="alice-status-text">ACTIVE · YOU ACT HERE</span>
            </span>
          </div>

          <div class="card-body">
            <div class="parcel-visual-wrapper">
              <div class="parcel-card-graphic" id="alice-parcel-graphic">
                <div class="parcel-body" id="alice-parcel-body">
                  <div class="parcel-stamp stamp-stripes">
                    <span class="stamp-symbol">◆</span>
                    <span class="stamp-label">COLOUR</span>
                  </div>
                  <div class="parcel-divider"></div>
                  <div class="parcel-stamp stamp-dots">
                    <span class="stamp-symbol">⬡</span>
                    <span class="stamp-label">SHAPE</span>
                  </div>
                </div>
                <div class="parcel-caption" id="alice-parcel-caption">Alice's Parcel in Hand</div>
              </div>
            </div>

            <!-- ALICE'S CONTROLS -->
            <div class="twin-controls-area">
              <span class="controls-label">Alice's Available Actions:</span>
              <div class="buttons-grid">
                <!-- FLIP BUTTON -->
                <button type="button" class="tool-btn btn-flip" id="btn-flip" aria-label="Apply Flip (X) move to Alice's twin">
                  <div class="btn-top">
                    <span class="tool-icon flip-icon" aria-hidden="true">⥯</span>
                    <span class="tool-name">FLIP (X)</span>
                  </div>
                  <span class="tool-desc">Toggles Colour Light (ZZ)</span>
                </button>

                <!-- TWIST BUTTON -->
                <button type="button" class="tool-btn btn-twist" id="btn-twist" aria-label="Apply Twist (Z) move to Alice's twin">
                  <div class="btn-top">
                    <span class="tool-icon twist-icon" aria-hidden="true">⟲</span>
                    <span class="tool-name">TWIST (Z)</span>
                  </div>
                  <span class="tool-desc">Toggles Shape Light (XX)</span>
                </button>

                <!-- LENS-CHANGER BUTTON -->
                <button type="button" class="tool-btn btn-lens" id="btn-lens" aria-label="Apply Lens-changer (H) move" hidden>
                  <div class="btn-top">
                    <span class="tool-icon lens-icon" aria-hidden="true">H</span>
                    <span class="tool-name">LENS-CHANGER</span>
                  </div>
                  <span class="tool-desc">Changes perspective</span>
                </button>

                <!-- LINKER BUTTON -->
                <button type="button" class="tool-btn btn-linker" id="btn-linker" aria-label="Apply Linker (CNOT) move" hidden>
                  <div class="btn-top">
                    <span class="tool-icon linker-icon" aria-hidden="true">🔗</span>
                    <span class="tool-name">LINKER (CNOT)</span>
                  </div>
                  <span class="tool-desc">Entangles twins</span>
                </button>
              </div>
            </div>
          </div>
        </article>

        <!-- QUANTUM ENTANGLEMENT THREAD -->
        <div class="thread-connector" id="quantum-thread-container" aria-label="Quantum Entanglement Link">
          <div class="thread-beam">
            <div class="thread-node node-left"></div>
            <div class="thread-line" id="thread-line">
              <span class="thread-pulse"></span>
            </div>
            <div class="thread-node node-right"></div>
          </div>
          <div class="thread-badge">
            <span class="thread-icon" aria-hidden="true">☍</span>
            <span class="thread-text">Entangled Pair (Thread active)</span>
          </div>
        </div>

        <!-- BOB'S TWIN (LOCKED) -->
        <article class="twin-card twin-bob locked-card" id="card-bob" tabindex="0" role="region" aria-label="Bob's Twin Parcel (Locked)">
          <div class="twin-card-header">
            <div class="twin-header-text">
              <span class="twin-role-tag">QUBIT B</span>
              <h2 class="twin-title">Bob's Twin</h2>
            </div>
            <span class="twin-status-pill status-locked" id="bob-status-pill">
              <span class="lock-glyph" id="bob-lock-icon" aria-hidden="true">🔒</span>
              <span id="bob-status-text">LOCKED · CANNOT ACT</span>
            </span>
          </div>

          <div class="card-body">
            <div class="parcel-visual-wrapper">
              <div class="parcel-card-graphic graphic-locked" id="bob-parcel-graphic">
                <div class="lock-scrim-overlay" id="bob-lock-scrim">
                  <div class="lock-big-badge">
                    <span class="lock-giant-icon" aria-hidden="true">🔒</span>
                    <span class="lock-banner-text" id="bob-lock-banner">LOCKED IN TRANSIT</span>
                  </div>
                  <p class="lock-reason-text" id="bob-lock-reason">
                    Bob cannot act during encoding.<br>
                    Bob will receive this twin intact.
                  </p>
                </div>
                <div class="parcel-body muted-body" id="bob-parcel-body">
                  <div class="parcel-stamp stamp-stripes muted">
                    <span class="stamp-symbol">◆</span>
                    <span class="stamp-label">COLOUR</span>
                  </div>
                  <div class="parcel-divider"></div>
                  <div class="parcel-stamp stamp-dots muted">
                    <span class="stamp-symbol">⬡</span>
                    <span class="stamp-label">SHAPE</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- BOB'S DISABLED CONTROLS (Clicking triggers blocked feedback) -->
            <div class="twin-controls-area">
              <span class="controls-label">Bob's Controls (Disabled):</span>
              <div class="buttons-grid">
                <button type="button" class="tool-btn btn-disabled" id="btn-bob-tool1" disabled aria-disabled="true">
                  <div class="btn-top">
                    <span class="tool-icon" aria-hidden="true">🔒</span>
                    <span class="tool-name">NO ACCESS</span>
                  </div>
                  <span class="tool-desc">Twin B is locked</span>
                </button>
                <button type="button" class="tool-btn btn-disabled" id="btn-bob-tool2" disabled aria-disabled="true">
                  <div class="btn-top">
                    <span class="tool-icon" aria-hidden="true">🔒</span>
                    <span class="tool-name">NO ACCESS</span>
                  </div>
                  <span class="tool-desc">Twin B is locked</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  `

  // Element Cache
  const els = {
    levelBadge: container.querySelector("#header-level-badge"),
    phaseBadge: container.querySelector("#header-phase-badge"),
    moves: container.querySelector("#header-moves"),
    btnReset: container.querySelector("#btn-reset"),
    title: container.querySelector("#header-title"),
    goal: container.querySelector("#header-goal"),
    targetDisplay: container.querySelector("#target-display"),
    currentBits: container.querySelector("#current-bits-display"),
    targetMatchPill: container.querySelector("#target-match-pill"),
    targetCard: container.querySelector("#target-card"),
    winBanner: container.querySelector("#win-banner"),
    winStars: container.querySelector("#win-stars"),
    winTitle: container.querySelector("#win-title-text"),
    winDesc: container.querySelector("#win-desc-text"),
    blueprintSection: container.querySelector("#blueprint-section"),

    feedbackCard: container.querySelector("#feedback-card"),
    feedbackIcon: container.querySelector("#feedback-icon"),
    feedbackKindText: container.querySelector("#feedback-kind-text"),
    feedbackText: container.querySelector("#feedback-text"),

    lightPanelZz: container.querySelector("#light-panel-zz"),
    lightZzIcon: container.querySelector("#light-zz-icon"),
    lightZzText: container.querySelector("#light-zz-text"),
    lightZzDesc: container.querySelector("#light-zz-desc"),

    lightPanelXx: container.querySelector("#light-panel-xx"),
    lightXxIcon: container.querySelector("#light-xx-icon"),
    lightXxText: container.querySelector("#light-xx-text"),
    lightXxDesc: container.querySelector("#light-xx-desc"),

    cardAlice: container.querySelector("#card-alice"),
    aliceStatusText: container.querySelector("#alice-status-text"),
    aliceGraphic: container.querySelector("#alice-parcel-graphic"),
    aliceBody: container.querySelector("#alice-parcel-body"),
    btnFlip: container.querySelector("#btn-flip"),
    btnTwist: container.querySelector("#btn-twist"),
    btnLens: container.querySelector("#btn-lens"),
    btnLinker: container.querySelector("#btn-linker"),

    threadContainer: container.querySelector("#quantum-thread-container"),
    cardBob: container.querySelector("#card-bob"),
    bobStatusText: container.querySelector("#bob-status-text"),
    bobLockIcon: container.querySelector("#bob-lock-icon"),
    bobStatusPill: container.querySelector("#bob-status-pill"),
    bobGraphic: container.querySelector("#bob-parcel-graphic"),
    bobLockScrim: container.querySelector("#bob-lock-scrim"),
    bobLockBanner: container.querySelector("#bob-lock-banner"),
    bobLockReason: container.querySelector("#bob-lock-reason"),
    bobBody: container.querySelector("#bob-parcel-body")
  }

  // Animation triggers
  function triggerAliceAnimation(animationClass) {
    if (!els.aliceGraphic) return
    els.aliceGraphic.classList.remove("anim-flip", "anim-twist", "anim-lens", "anim-linker")
    // Force DOM reflow so animation restarts cleanly
    void els.aliceGraphic.offsetWidth
    els.aliceGraphic.classList.add(animationClass)
  }

  function triggerBobShake() {
    if (!els.cardBob) return
    els.cardBob.classList.remove("anim-shake")
    void els.cardBob.offsetWidth
    els.cardBob.classList.add("anim-shake")
  }

  // Bind Event Listeners
  els.btnFlip.addEventListener("click", () => {
    triggerAliceAnimation("anim-flip")
    if (engine && typeof engine.applyTool === "function") {
      engine.applyTool("flip", "A")
    }
  })

  els.btnTwist.addEventListener("click", () => {
    triggerAliceAnimation("anim-twist")
    if (engine && typeof engine.applyTool === "function") {
      engine.applyTool("twist", "A")
    }
  })

  els.btnLens.addEventListener("click", () => {
    triggerAliceAnimation("anim-lens")
    if (engine && typeof engine.applyTool === "function") {
      engine.applyTool("lens", "A")
    }
  })

  els.btnLinker.addEventListener("click", () => {
    triggerAliceAnimation("anim-linker")
    if (engine && typeof engine.applyTool === "function") {
      engine.applyTool("linker", "A")
    }
  })

  els.btnReset.addEventListener("click", () => {
    if (engine && typeof engine.reset === "function") {
      engine.reset()
    }
  })

  // Clicking anywhere on Bob's card triggers the locked feedback from engine
  els.cardBob.addEventListener("click", () => {
    triggerBobShake()
    if (engine && typeof engine.applyTool === "function") {
      engine.applyTool("flip", "B")
    }
  })

  // Render state update function
  function render(state) {
    if (!state) return

    // Header info
    if (els.levelBadge) {
      els.levelBadge.textContent = state.levelId ? `LEVEL ${state.levelId}` : "LEVEL 14"
    }
    if (els.phaseBadge) {
      els.phaseBadge.textContent = `PHASE: ${(state.phase || "alice").toUpperCase()}`
    }
    if (els.moves) {
      const parText = state.par !== undefined ? ` / Par: ${state.par}` : ""
      els.moves.textContent = `Moves: ${state.moveCount || 0}${parText}`
    }
    if (els.title && state.title) {
      els.title.textContent = state.title
    }
    if (els.goal && state.goalLine) {
      els.goal.textContent = state.goalLine
    }

    // Tools visibility
    const tools = state.toolsAvailable || []
    if (els.btnFlip) els.btnFlip.hidden = !tools.includes("flip")
    if (els.btnTwist) els.btnTwist.hidden = !tools.includes("twist")
    if (els.btnLens) els.btnLens.hidden = !tools.includes("lens")
    if (els.btnLinker) els.btnLinker.hidden = !tools.includes("linker")

    // Bob state modifications for Level 12 (fresh pair) vs 14 (locked)
    const isLocked = state.lockedQubits && state.lockedQubits.includes("B")
    if (els.bobStatusText) els.bobStatusText.textContent = isLocked ? "LOCKED · CANNOT ACT" : "INACTIVE · FRESH PARCEL"
    if (els.bobLockIcon) els.bobLockIcon.textContent = isLocked ? "🔒" : "⏱"
    if (els.bobStatusPill) els.bobStatusPill.className = isLocked ? "twin-status-pill status-locked" : "twin-status-pill status-inactive"
    if (els.bobLockScrim) els.bobLockScrim.hidden = !isLocked
    
    if (els.cardBob) {
      if (isLocked) {
        els.cardBob.classList.add("locked-card")
        els.cardBob.setAttribute("aria-label", "Bob's Twin Parcel (Locked)")
      } else {
        els.cardBob.classList.remove("locked-card")
        els.cardBob.setAttribute("aria-label", "Bob's Twin Parcel (Fresh)")
      }
    }

    if (els.bobGraphic) {
      if (isLocked) {
        els.bobGraphic.classList.add("graphic-locked")
      } else {
        els.bobGraphic.classList.remove("graphic-locked")
      }
    }

    if (els.bobBody) {
      if (isLocked) {
        els.bobBody.classList.add("muted-body")
      } else {
        els.bobBody.classList.remove("muted-body")
      }
    }

    // Target display and Win text
    if (state.target) {
      if (els.targetCard) els.targetCard.hidden = false
      const targetBits = state.target.bits || "10"
      if (els.targetDisplay) els.targetDisplay.textContent = targetBits
      if (els.winTitle) els.winTitle.textContent = `Message "${targetBits}" Encoded!`
      if (els.winDesc) els.winDesc.textContent = "Alice encoded two facts into the pair using only her twin. Bob's twin stayed locked."
      
      const zzState = state.lights?.zz || "agree"
      const xxState = state.lights?.xx || "agree"
      const bit1 = xxState === "differ" ? "1" : (xxState === "agree" ? "0" : "?")
      const bit2 = zzState === "differ" ? "1" : (zzState === "agree" ? "0" : "?")
      const currentCode = `${bit1}${bit2}`

      if (els.currentBits) els.currentBits.textContent = currentCode

      const isMatch = currentCode === targetBits
      if (els.targetMatchPill) {
        if (isMatch) {
          els.targetMatchPill.textContent = "Target Matched! ✓"
          els.targetMatchPill.className = "status-pill pill-matched"
        } else {
          els.targetMatchPill.textContent = "In Progress"
          els.targetMatchPill.className = "status-pill pill-progress"
        }
      }
    } else {
      // Level 12
      if (els.targetCard) els.targetCard.hidden = true
      if (els.winTitle) els.winTitle.textContent = "Twins Created!"
      if (els.winDesc) els.winDesc.textContent = "You successfully produced two linked parcels."
    }

    // Blueprint View
    if (els.blueprintSection) {
      els.blueprintSection.hidden = !state.lights
    }

    // Win banner
    if (els.winBanner) {
      if (state.status === "won") {
        els.winBanner.hidden = false
        const starsCount = state.stars || (state.moveCount <= state.par ? 3 : 2)
        els.winStars.textContent = "★".repeat(starsCount) + "☆".repeat(Math.max(0, 3 - starsCount))
      } else {
        els.winBanner.hidden = true
      }
    }

    // Feedback Line
    const feedback = state.feedback || { kind: "info", text: "" }
    const kind = feedback.kind || "info"
    if (els.feedbackCard) {
      els.feedbackCard.className = `feedback-card feedback-${kind}`
    }
    if (els.feedbackKindText) {
      els.feedbackKindText.textContent = kind.toUpperCase()
    }
    if (els.feedbackIcon) {
      if (kind === "blocked") els.feedbackIcon.textContent = "⛔"
      else if (kind === "hint") els.feedbackIcon.textContent = "💡"
      else els.feedbackIcon.textContent = "ℹ️"
    }
    if (els.feedbackText) {
      els.feedbackText.textContent = feedback.text || "Alice can act on her twin. Bob's twin is locked."
    }

    // Light 1: Colour Light (ZZ)
    if (els.lightPanelZz) {
      els.lightPanelZz.setAttribute("data-state", zzState)
    }
    if (els.lightZzText) {
      els.lightZzText.textContent = zzState.toUpperCase()
    }
    if (els.lightZzIcon) {
      els.lightZzIcon.textContent = zzState === "agree" ? "=" : (zzState === "differ" ? "≠" : "?")
    }
    if (els.lightZzDesc) {
      if (zzState === "agree") {
        els.lightZzDesc.textContent = "Colours agree when both read up-down (=) · Bit 2 = 0"
      } else if (zzState === "differ") {
        els.lightZzDesc.textContent = "Colours differ when both read up-down (≠) · Bit 2 = 1"
      } else {
        els.lightZzDesc.textContent = "Colours unsure (?)"
      }
    }

    // Light 2: Shape Light (XX)
    if (els.lightPanelXx) {
      els.lightPanelXx.setAttribute("data-state", xxState)
    }
    if (els.lightXxText) {
      els.lightXxText.textContent = xxState.toUpperCase()
    }
    if (els.lightXxIcon) {
      els.lightXxIcon.textContent = xxState === "agree" ? "=" : (xxState === "differ" ? "≠" : "?")
    }
    if (els.lightXxDesc) {
      if (xxState === "agree") {
        els.lightXxDesc.textContent = "Shapes agree when both read sideways (=) · Bit 1 = 0"
      } else if (xxState === "differ") {
        els.lightXxDesc.textContent = "Shapes differ when both read sideways (≠) · Bit 1 = 1"
      } else {
        els.lightXxDesc.textContent = "Shapes unsure (?)"
      }
    }

    // Quantum Thread indicator
    if (els.threadContainer) {
      if (state.thread) {
        els.threadContainer.classList.add("thread-active")
        els.threadContainer.classList.remove("thread-disabled")
      } else {
        els.threadContainer.classList.remove("thread-active")
        els.threadContainer.classList.add("thread-disabled")
      }
    }
  }

  // Subscribe to engine updates
  let unsubscribe = null
  if (engine && typeof engine.subscribe === "function") {
    unsubscribe = engine.subscribe((newState) => {
      render(newState)
    })
  }

  // Initial render from current engine state
  if (engine && typeof engine.getRenderState === "function") {
    render(engine.getRenderState())
  }

  // Return unsubscribe / cleanup function
  return () => {
    if (typeof unsubscribe === "function") {
      unsubscribe()
    }
  }
}
