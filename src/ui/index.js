/**
 * UI Renderer for Level 14 (and Levels 12, 13, 15)
 * Export exactly: mountUI(root, engine)
 *
 * Rules:
 * - Reads engine.getRenderState()
 * - Calls only allowed engine actions: engine.applyTool(name, qubit), engine.reset()
 * - Subscribes using engine.subscribe()
 * - The UI NEVER calculates or modifies quantum state itself.
 * - Never relies on colour alone.
 */

import { createFakeEngine } from "./fakeEngine.js"

export function mountUI(root, initialEngine) {
  const container = typeof root === "string" ? document.querySelector(root) : root
  if (!container) {
    throw new Error("mountUI: Target root container element not found.")
  }

  // State to track the current engine
  let currentEngine = initialEngine
  let unsubscribe = null
  let currentTableLevelId = null

  function init() {
    let currentPlan = []
    let currentMessages = []
    let currentBudget = { parcels: 7, twins: 3 }
    currentTableLevelId = null

    // Build the static shell once
    container.innerHTML = `
      <div class="parcel-game-app" id="level14-app">
        <!-- LEVEL SELECT SCREEN -->
        <div id="level-select-screen" hidden style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: var(--color-bg-body); z-index: 100; padding: 1.5rem; overflow-y: auto;">
          <h2 style="margin-top: 0;">Select Level</h2>
          <div id="level-list" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem;"></div>
          <button type="button" id="btn-close-levels" style="margin-top: 1.5rem; padding: 1rem; min-height: 44px; width: 100%; max-width: 300px; display: block;">Close</button>
        </div>

        <!-- HEADER / GOAL SECTION -->
        <header class="game-header">
          <div class="header-top-row">
            <div class="level-badge-group">
              <span class="badge badge-act" id="header-act-badge">ACT 4 · TWINS</span>
              <span class="badge badge-level" id="header-level-badge">LEVEL 14</span>
              <span class="badge badge-phase" id="header-phase-badge">PHASE: ALICE</span>
            </div>
            <div class="header-actions">
              <span class="move-tracker" id="header-moves">Moves: 0 / Par: 2</span>
              <button type="button" class="btn-levels" id="btn-levels" hidden style="padding: 0.5rem 1rem; margin-right: 0.5rem;">Levels</button>
              <button type="button" class="btn-reset" id="btn-reset" title="Reset this level">
                <span class="btn-icon" aria-hidden="true">↺</span>
                <span>Reset</span>
              </button>
            </div>
          </div>

          <h1 class="level-title" id="header-title">One-hand writing</h1>
          <p class="goal-line" id="header-goal">Make the lights match the target message.</p>

          <!-- TARGET BANNER -->
          <div class="target-card" id="target-card" hidden>
            <div class="target-main">
              <span class="target-tag">MISSION GOAL</span>
              <div class="target-value-box">
                <span class="target-label">Target:</span>
                <span class="target-code" id="target-display"></span>
              </div>
              <div class="target-rule-hint" id="target-rule-hint"></div>
            </div>
            <div class="target-status-box" id="target-status-box" hidden>
            </div>
          </div>
        </header>

        <!-- VICTORY NOTIFICATION BANNER -->
        <div class="win-banner" id="win-banner" hidden>
          <div class="win-content">
            <div class="win-stars" id="win-stars"></div>
            <div class="win-text-group" style="flex-grow: 1;">
              <h2 class="win-title" id="win-title-text"></h2>
              <p class="win-desc" id="win-desc-text"></p>
            </div>
            <button type="button" class="btn-submit" id="btn-next-level">Next level</button>
          </div>
        </div>

        <!-- CHECK ACTION (Levels 12 & 14) -->
        <section class="check-section" id="check-section" hidden style="display: flex; justify-content: center; margin-bottom: 1rem;">
          <button type="button" class="btn-submit" id="check-btn" style="width: 100%; max-width: 400px; padding: 1rem; font-size: 1.25rem;">Check</button>
        </section>

        <!-- FEEDBACK LINE -->
        <section class="feedback-section" aria-live="polite">
          <div class="feedback-card feedback-info" id="feedback-card">
            <span class="feedback-badge" id="feedback-badge">
              <span class="badge-icon" id="feedback-icon" aria-hidden="true">ℹ️</span>
              <span class="badge-text" id="feedback-kind-text">INFO</span>
            </span>
            <p class="feedback-message" id="feedback-text"></p>
          </div>
        </section>

        <!-- BLUEPRINT VIEW (PAIR FACTS) -->
        <section class="blueprint-section" id="blueprint-section" aria-labelledby="blueprint-heading" hidden>
          <div class="blueprint-header">
            <div class="blueprint-title-row">
              <span class="blueprint-tag">📐 BLUEPRINT VIEW</span>
              <h2 id="blueprint-heading" class="blueprint-title"></h2>
            </div>
            <p class="blueprint-caption" id="blueprint-caption"></p>
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
                  <span class="light-subtext">Bit 2 (Flip)</span>
                </div>
                <div class="light-state-badge" id="light-zz-badge">
                  <span class="state-icon" id="light-zz-icon"></span>
                  <span class="state-text" id="light-zz-text"></span>
                </div>
              </div>
              <div class="light-explanation" id="light-zz-desc"></div>
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
                  <span class="light-subtext">Bit 1 (Twist)</span>
                </div>
                <div class="light-state-badge" id="light-xx-badge">
                  <span class="state-icon" id="light-xx-icon"></span>
                  <span class="state-text" id="light-xx-text"></span>
                </div>
              </div>
              <div class="light-explanation" id="light-xx-desc"></div>
            </div>
          </div>
        </section>

        <!-- TWIN CARDS & ENTANGLEMENT THREAD -->
        <section class="twins-section" id="twins-section" aria-label="Quantum Twin Parcels">
          <!-- ALICE'S TWIN -->
          <article class="twin-card twin-alice" id="card-alice">
            <div class="twin-card-header">
              <div class="twin-header-text">
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
              <div class="twin-controls-area" id="alice-controls-area">
                <span class="controls-label">Alice's Available Actions:</span>
                <div class="buttons-grid">
                  <button type="button" class="tool-btn btn-flip" id="btn-flip" aria-label="Apply Flip move to Alice's twin" hidden>
                    <div class="btn-top">
                      <span class="tool-icon flip-icon" aria-hidden="true">⥯</span>
                      <span class="tool-name">FLIP</span>
                    </div>
                    <span class="tool-desc">Changes the Colour Light</span>
                  </button>
                  <button type="button" class="tool-btn btn-twist" id="btn-twist" aria-label="Apply Twist move to Alice's twin" hidden>
                    <div class="btn-top">
                      <span class="tool-icon twist-icon" aria-hidden="true">⟲</span>
                      <span class="tool-name">TWIST</span>
                    </div>
                    <span class="tool-desc">Changes the Shape Light</span>
                  </button>
                  <button type="button" class="tool-btn btn-lens" id="btn-lens" aria-label="Apply Lens-changer move" hidden>
                    <div class="btn-top">
                      <span class="tool-icon lens-icon" aria-hidden="true"></span>
                      <span class="tool-name">LENS-CHANGER</span>
                    </div>
                    <span class="tool-desc">Acts on one twin</span>
                  </button>
                  <button type="button" class="tool-btn btn-linker" id="btn-linker" aria-label="Apply Linker move" hidden>
                    <div class="btn-top">
                      <span class="tool-icon linker-icon" aria-hidden="true">🔗</span>
                      <span class="tool-name">LINKER</span>
                    </div>
                    <span class="tool-desc">Acts on both twins</span>
                  </button>
                </div>
              </div>
            </div>
          </article>

          <!-- QUANTUM ENTANGLEMENT THREAD -->
          <div class="thread-connector thread-disabled" id="quantum-thread-container" aria-label="Link between the twins">
            <div class="thread-beam">
              <div class="thread-node node-left"></div>
              <div class="thread-line" id="thread-line">
                <span class="thread-pulse"></span>
              </div>
              <div class="thread-node node-right"></div>
            </div>
            <div class="thread-badge">
              <span class="thread-icon" aria-hidden="true">☍</span>
              <span class="thread-text" id="thread-text">Not Linked</span>
            </div>
          </div>

          <!-- BOB'S TWIN -->
          <article class="twin-card twin-bob" id="card-bob" tabindex="0" role="region" aria-label="Bob's Twin Parcel">
            <div class="twin-card-header">
              <div class="twin-header-text">
                <h2 class="twin-title">Bob's Twin</h2>
              </div>
              <span class="twin-status-pill" id="bob-status-pill">
                <span class="lock-glyph" id="bob-lock-icon" aria-hidden="true">⏱</span>
                <span id="bob-status-text">INACTIVE</span>
              </span>
            </div>

            <div class="card-body">
              <div class="parcel-visual-wrapper">
                <div class="parcel-card-graphic" id="bob-parcel-graphic">
                  <div class="lock-scrim-overlay" id="bob-lock-scrim" hidden>
                    <div class="lock-big-badge">
                      <span class="lock-giant-icon" aria-hidden="true">🔒</span>
                      <span class="lock-banner-text" id="bob-lock-banner">LOCKED</span>
                    </div>
                    <p class="lock-reason-text" id="bob-lock-reason">
                      Bob's twin is locked.<br>
                      You can only act on Alice's twin.
                    </p>
                  </div>
                  <div class="parcel-body" id="bob-parcel-body">
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
                </div>
              </div>

              <!-- BOB'S DISABLED CONTROLS -->
              <div class="twin-controls-area" id="bob-controls-area" hidden>
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

        <!-- LEVEL 13 MEASUREMENT CONTROLS -->
        <section class="measurement-section" id="measurement-section" hidden>
          <div class="measurement-card">
            <div class="lens-chooser">
              <span class="lens-label">Select Lens:</span>
              <label class="lens-radio-label"><input type="radio" name="lens-select" value="ud" checked> Up-down</label>
              <label class="lens-radio-label"><input type="radio" name="lens-select" value="side"> Sideways</label>
            </div>
            <button type="button" class="btn-read-twins" id="btn-read-twins">Read Both Twins</button>

            <div class="tally-display" id="tally-display" aria-live="polite"></div>

            <div class="rounds-display" id="rounds-display" hidden style="margin-top: 1.5rem; border-top: 1px solid var(--color-border-subtle); padding-top: 1rem;">
              <h4 style="margin: 0 0 0.75rem 0; font-size: 0.95rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted);">Recent Rounds</h4>
              <ul id="rounds-list" style="list-style: none; padding: 0; margin: 0; font-family: var(--font-mono); font-size: 0.95rem;"></ul>
            </div>
          </div>
        </section>

        <!-- TABLE UI SECTION (Levels 13 & 15) -->
        <section class="table-section" id="table-section" hidden>
          <div class="table-container">
            <h3 class="table-title" id="table-title">Record Book</h3>
            <div class="table-body" id="table-body">
              <!-- Rows injected here -->
            </div>
            <div class="table-actions">
              <button type="button" class="btn-submit" id="btn-submit-table">Submit</button>
            </div>
          </div>
        </section>

        <!-- LEVEL 20 PLANNER SECTION -->
        <section class="planner-section" id="planner-section" hidden>
          <div class="planner-header">
            <h2>Network Plan</h2>
            <div class="budget-display">
              <span class="budget-item" id="budget-parcels">Parcels: 0/7</span>
              <span class="budget-item" id="budget-twins">Twins: 0/3</span>
            </div>
            <div id="budget-warning" class="budget-warning" hidden>
              <span aria-hidden="true">⚠️</span> <span id="budget-warning-text"></span>
            </div>
          </div>

          <p class="planner-rules" style="margin-bottom: 12px; font-size: 0.9em; opacity: 0.9;">A plain parcel delivers 1 bit. A parcel sent with a twin can deliver 2 bits. Each twin is used up once. A parcel carries bits of one message only.</p>

          <div class="planner-messages" id="planner-messages">
          </div>

          <div class="planner-rows" id="planner-rows">
          </div>

          <div class="planner-actions">
            <button type="button" class="btn-add-row" id="btn-add-row">+ Add Parcel</button>
            <button type="button" class="btn-submit-plan" id="btn-submit-plan">Submit Plan</button>
          </div>

          <div id="planner-score-card" class="score-card" hidden>
            <h3>Final Score</h3>
            <div id="score-details"></div>
          </div>
        </section>

        <!-- LEVEL 16 UNMAKE SECTION -->
        <section class="level16-section" id="level16-section" hidden>
          <div class="level16-header" style="margin-bottom: 1.5rem; text-align: center;">
            <h2 id="l16-delivery-counter" style="font-size: 1.75rem; margin-bottom: 0.5rem;">Delivery 1 of 4</h2>
            <div id="l16-delivery-chips" style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 1rem; flex-wrap: wrap;">
            </div>
            <p style="font-size: 1.1rem; font-weight: 500;">Alice's parcel has arrived. Bob now holds both twins.</p>
          </div>

          <div class="twins-section" style="margin-bottom: 1.5rem;">
            <!-- ALICE TWIN -->
            <article class="twin-card twin-alice" style="border: 2px solid var(--color-border-strong);">
              <div class="twin-card-header">
                <div class="twin-header-text">
                  <h2 class="twin-title">Alice's Twin</h2>
                </div>
                <span class="twin-status-pill status-active">
                  <span class="active-dot" aria-hidden="true">●</span>
                  <span>BOB HOLDS THIS</span>
                </span>
              </div>
              <div class="card-body">
                <div class="parcel-visual-wrapper">
                  <div class="parcel-card-graphic" style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 120px; background: var(--color-bg-elevated); border-radius: var(--radius-md);">
                    <div style="font-size: 0.9rem; font-weight: bold; color: var(--color-text-dim); margin-bottom: 0.5rem;">READING</div>
                    <div id="l16-reading-a" style="font-size: 3rem; font-weight: 800; line-height: 1;">?</div>
                  </div>
                </div>
                <div class="twin-controls-area">
                  <button type="button" class="btn-submit" id="btn-l16-look-a" style="width: 100%; margin-top: 1rem; padding: 0.75rem;">Look at Alice's twin</button>
                </div>
              </div>
            </article>

            <!-- THREAD -->
            <div class="thread-connector" style="width: 2rem;"></div>

            <!-- BOB TWIN -->
            <article class="twin-card twin-bob" style="border: 2px solid var(--color-border-strong);">
              <div class="twin-card-header">
                <div class="twin-header-text">
                  <h2 class="twin-title">Bob's Twin</h2>
                </div>
                <span class="twin-status-pill status-active">
                  <span class="active-dot" aria-hidden="true">●</span>
                  <span>BOB HOLDS THIS</span>
                </span>
              </div>
              <div class="card-body">
                <div class="parcel-visual-wrapper">
                  <div class="parcel-card-graphic" style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 120px; background: var(--color-bg-elevated); border-radius: var(--radius-md);">
                    <div style="font-size: 0.9rem; font-weight: bold; color: var(--color-text-dim); margin-bottom: 0.5rem;">READING</div>
                    <div id="l16-reading-b" style="font-size: 3rem; font-weight: 800; line-height: 1;">?</div>
                  </div>
                </div>
                <div class="twin-controls-area">
                  <button type="button" class="btn-submit" id="btn-l16-look-b" style="width: 100%; margin-top: 1rem; padding: 0.75rem;">Look at Bob's twin</button>
                </div>
              </div>
            </article>
          </div>

          <div class="l16-tools" style="background: var(--color-bg-surface); padding: 1.5rem; border-radius: var(--radius-lg); border: 1px solid var(--color-border-subtle); margin-bottom: 1.5rem;">
            <span class="controls-label" style="display: block; margin-bottom: 1rem; font-weight: bold;">Bob's Tools:</span>
            <div class="buttons-grid" id="l16-buttons-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
            </div>
          </div>

          <div id="l16-last-attempt" style="text-align: center; color: var(--color-text-dim); font-weight: 500;"></div>
        </section>
      </div>
    `

    // Element Cache
    const els = {
      levelBadge: container.querySelector("#header-level-badge"),
      actBadge: container.querySelector("#header-act-badge"),
      phaseBadge: container.querySelector("#header-phase-badge"),
      moves: container.querySelector("#header-moves"),
      btnLevels: container.querySelector("#btn-levels"),
      levelSelectScreen: container.querySelector("#level-select-screen"),
      levelList: container.querySelector("#level-list"),
      btnCloseLevels: container.querySelector("#btn-close-levels"),
      checkSection: container.querySelector("#check-section"),
      checkBtn: container.querySelector("#check-btn"),
      btnNextLevel: container.querySelector("#btn-next-level"),

      level16Section: container.querySelector("#level16-section"),
      l16Counter: container.querySelector("#l16-delivery-counter"),
      l16Chips: container.querySelector("#l16-delivery-chips"),
      l16ReadingA: container.querySelector("#l16-reading-a"),
      l16ReadingB: container.querySelector("#l16-reading-b"),
      btnL16LookA: container.querySelector("#btn-l16-look-a"),
      btnL16LookB: container.querySelector("#btn-l16-look-b"),
      l16LastAttempt: container.querySelector("#l16-last-attempt"),
      l16ButtonsGrid: container.querySelector("#l16-buttons-grid"),

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
      aliceControlsArea: container.querySelector("#alice-controls-area"),
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
      bobBody: container.querySelector("#bob-parcel-body"),

      measurementSection: container.querySelector("#measurement-section"),
      btnReadTwins: container.querySelector("#btn-read-twins"),
      tallyDisplay: container.querySelector("#tally-display"),
      roundsDisplay: container.querySelector("#rounds-display"),
      roundsList: container.querySelector("#rounds-list"),
      lensRadios: container.querySelectorAll("input[name='lens-select']"),

      tableSection: container.querySelector("#table-section"),
      tableTitle: container.querySelector("#table-title"),
      tableBody: container.querySelector("#table-body"),
      btnSubmitTable: container.querySelector("#btn-submit-table"),
      twinsSection: container.querySelector("#twins-section"),
      plannerSection: container.querySelector("#planner-section"),
      budgetParcels: container.querySelector("#budget-parcels"),
      budgetTwins: container.querySelector("#budget-twins"),
      budgetWarning: container.querySelector("#budget-warning"),
      budgetWarningText: container.querySelector("#budget-warning-text"),
      plannerMessages: container.querySelector("#planner-messages"),
      plannerRows: container.querySelector("#planner-rows"),
      btnAddRow: container.querySelector("#btn-add-row"),
      btnSubmitPlan: container.querySelector("#btn-submit-plan"),
      plannerScoreCard: container.querySelector("#planner-score-card"),
      scoreDetails: container.querySelector("#score-details"),
      bobControlsArea: container.querySelector("#bob-controls-area"),
      threadText: container.querySelector("#thread-text"),
      blueprintHeading: container.querySelector("#blueprint-heading"),
      blueprintCaption: container.querySelector("#blueprint-caption")
    }

    function renderPlanner() {
      if (!els.plannerSection) return
      const parcelsUsed = currentPlan.length
      const twinsUsed = currentPlan.filter(r => r.useTwin).length

      els.budgetParcels.textContent = `Parcels: ${parcelsUsed}/${currentBudget.parcels}`
      els.budgetTwins.textContent = `Twins: ${twinsUsed}/${currentBudget.twins}`

      if (parcelsUsed > currentBudget.parcels || twinsUsed > currentBudget.twins) {
        els.budgetWarning.hidden = false
        if (parcelsUsed > currentBudget.parcels) els.budgetWarningText.textContent = "Over parcel budget"
        else if (twinsUsed > currentBudget.twins) els.budgetWarningText.textContent = "Over twin budget"
      } else {
        els.budgetWarning.hidden = true
      }

      let msgHtml = ""
      currentMessages.forEach(msg => {
        const bitsCovered = currentPlan.filter(r => r.messageId === msg.id).reduce((sum, r) => sum + r.chunk.length, 0)
        msgHtml += `<div class="msg-progress"><strong>${msg.id}:</strong> ${bitsCovered}/${msg.bits.length} bits (${msg.bits})</div>`
      })
      els.plannerMessages.innerHTML = msgHtml

      let rowsHtml = ""
      currentPlan.forEach((row, idx) => {
        let msgOptions = currentMessages.map(m => `<option value="${m.id}" ${row.messageId === m.id ? "selected" : ""}>${m.id}</option>`).join("")
        rowsHtml += `
          <div class="planner-row" data-index="${idx}">
            <span class="row-num">${idx + 1}.</span>
            <label>Message: <select class="sel-msg">${msgOptions}</select></label>
            <label>Chunk: <input type="text" class="inp-chunk" value="${row.chunk}" placeholder="e.g. 10"></label>
            <label><input type="checkbox" class="chk-twin" ${row.useTwin ? "checked" : ""}> Use Twin (2 bits)</label>
            <button type="button" class="btn-remove">Remove</button>
          </div>
        `
      })
      els.plannerRows.innerHTML = rowsHtml
    }

    if (els.btnAddRow) {
      els.btnAddRow.addEventListener("click", () => {
        currentPlan.push({ messageId: currentMessages[0]?.id || "m1", chunk: "", useTwin: false })
        renderPlanner()
      })
    }

    if (els.plannerRows) {
      els.plannerRows.addEventListener("change", (e) => {
        const rowDiv = e.target.closest(".planner-row")
        if (!rowDiv) return
        const idx = parseInt(rowDiv.dataset.index, 10)
        if (e.target.classList.contains("sel-msg")) currentPlan[idx].messageId = e.target.value
        if (e.target.classList.contains("chk-twin")) currentPlan[idx].useTwin = e.target.checked
        renderPlanner()
      })
      els.plannerRows.addEventListener("input", (e) => {
        if (e.target.classList.contains("inp-chunk")) {
          const rowDiv = e.target.closest(".planner-row")
          if (!rowDiv) return
          const idx = parseInt(rowDiv.dataset.index, 10)
          currentPlan[idx].chunk = e.target.value
          renderPlanner()
        }
      })
      els.plannerRows.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-remove")) {
          const rowDiv = e.target.closest(".planner-row")
          if (!rowDiv) return
          const idx = parseInt(rowDiv.dataset.index, 10)
          currentPlan.splice(idx, 1)
          renderPlanner()
        }
      })
    }

    if (els.btnSubmitPlan) {
      els.btnSubmitPlan.addEventListener("click", () => {
        if (currentEngine && typeof currentEngine.submit === "function") {
          currentEngine.submit({ plan: currentPlan })
        }
      })
    }

    if (els.checkBtn) {
      els.checkBtn.addEventListener("click", () => {
        if (currentEngine && typeof currentEngine.submit === "function") {
          currentEngine.submit({})
        }
      })
    }

    if (els.btnNextLevel) {
      els.btnNextLevel.addEventListener("click", () => {
        if (currentEngine && typeof currentEngine.nextLevel === "function") {
          currentEngine.nextLevel()
        }
      })
    }

    const LEVEL16_TOOL_QUBIT = "A"
    if (els.l16ButtonsGrid) {
      els.l16ButtonsGrid.addEventListener("click", (e) => {
        const btn = e.target.closest(".tool-btn")
        if (!btn) return
        const tool = btn.dataset.tool
        if (currentEngine && typeof currentEngine.applyTool === "function") {
          currentEngine.applyTool(tool, LEVEL16_TOOL_QUBIT)
        }
      })
    }
    if (els.btnL16LookA) {
      els.btnL16LookA.addEventListener("click", () => {
        if (currentEngine && typeof currentEngine.look === "function") currentEngine.look("A", "ud")
      })
    }
    if (els.btnL16LookB) {
      els.btnL16LookB.addEventListener("click", () => {
        if (currentEngine && typeof currentEngine.look === "function") currentEngine.look("B", "ud")
      })
    }

    if (els.btnLevels && els.levelSelectScreen && els.btnCloseLevels && els.levelList) {
      els.btnLevels.addEventListener("click", () => {
        if (currentEngine && typeof currentEngine.getRenderState === "function") {
          const state = currentEngine.getRenderState()
          if (!state.levels) return

          const prog = state.progress || {}
          const starsById = prog.starsById || {}
          const completedIds = prog.completedIds || []

          let html = ""
          state.levels.forEach(lvl => {
            const isCurrent = lvl.id === state.levelId
            const isDone = completedIds.includes(lvl.id)
            const stars = starsById[lvl.id] || 0

            html += `<button type="button" class="level-select-btn" data-id="${lvl.id}" style="text-align: left; padding: 1rem; min-height: 44px; display: flex; justify-content: space-between; align-items: center; border: 1px solid var(--color-border-subtle); background: ${isCurrent ? 'var(--color-bg-elevated)' : 'var(--color-bg-surface)'}; border-radius: var(--radius-md);">
              <span style="font-weight: ${isCurrent ? 'bold' : 'normal'};">Level ${lvl.id}: ${lvl.title}</span>
              <span style="font-size: 0.9em; color: var(--color-text-dim);">
                ${isCurrent ? '<strong style="color: var(--color-brand);">Now</strong> ' : ''}
                ${stars > 0 ? stars + ' stars ' : ''}
                ${isDone ? 'Done' : ''}
              </span>
            </button>`
          })

          els.levelList.innerHTML = html
          els.levelList.querySelectorAll(".level-select-btn").forEach(btn => {
            btn.addEventListener("click", () => {
              const id = parseInt(btn.dataset.id, 10)
              if (currentEngine && typeof currentEngine.selectLevel === "function") {
                currentEngine.selectLevel(id)
              }
              els.levelSelectScreen.hidden = true
            })
          })
          els.levelSelectScreen.hidden = false
        }
      })

      els.btnCloseLevels.addEventListener("click", () => {
        els.levelSelectScreen.hidden = true
      })
    }

    // Animation triggers
    function triggerAliceAnimation(animationClass) {
      if (!els.aliceGraphic) return
      els.aliceGraphic.classList.remove("anim-flip", "anim-twist", "anim-lens", "anim-linker")
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
      if (currentEngine && typeof currentEngine.applyTool === "function") {
        currentEngine.applyTool("flip", "A")
      }
    })

    els.btnTwist.addEventListener("click", () => {
      triggerAliceAnimation("anim-twist")
      if (currentEngine && typeof currentEngine.applyTool === "function") {
        currentEngine.applyTool("twist", "A")
      }
    })

    els.btnLens.addEventListener("click", () => {
      triggerAliceAnimation("anim-lens")
      if (currentEngine && typeof currentEngine.applyTool === "function") {
        currentEngine.applyTool("lens", "A")
      }
    })

    els.btnLinker.addEventListener("click", () => {
      triggerAliceAnimation("anim-linker")
      if (currentEngine && typeof currentEngine.applyTool === "function") {
        currentEngine.applyTool("linker", "A")
      }
    })

    els.btnReset.addEventListener("click", () => {
      currentPlan = []
      if (els.tableBody) {
        els.tableBody.querySelectorAll("select").forEach(sel => sel.value = "")
        if (els.btnSubmitTable) els.btnSubmitTable.disabled = true
      }
      if (currentEngine && typeof currentEngine.reset === "function") {
        currentEngine.reset()
      }
    })

    if (els.btnReadTwins) {
      els.btnReadTwins.addEventListener("click", () => {
        let selectedLens = "ud"
        els.lensRadios.forEach(radio => {
          if (radio.checked) selectedLens = radio.value
        })

        if (currentEngine && typeof currentEngine.look === "function") {
          triggerAliceAnimation("anim-lens")
          currentEngine.look("A", selectedLens)
          currentEngine.look("B", selectedLens)
        }
      })

      els.lensRadios.forEach(radio => {
        radio.addEventListener("change", () => {
          if (currentEngine && typeof currentEngine.getRenderState === "function") {
            render(currentEngine.getRenderState())
          }
        })
      })
    }
    if (els.tableBody) {
      els.tableBody.addEventListener("change", (e) => {
        if (e.target.tagName.toLowerCase() === "select") {
          const selects = Array.from(els.tableBody.querySelectorAll("select"))
          const allChosen = selects.every(s => s.value !== "")
          if (els.btnSubmitTable) els.btnSubmitTable.disabled = !allChosen
        }
      })
    }

    if (els.btnSubmitTable) {
      els.btnSubmitTable.addEventListener("click", () => {
        if (!currentEngine || typeof currentEngine.submit !== "function") return

        const selects = els.tableBody.querySelectorAll("select")
        const cells = {}

        if (currentTableLevelId === 15) {
          selects.forEach(select => {
            const [rowId, colId] = select.dataset.id.split('.')
            if (!cells[rowId]) cells[rowId] = {}
            cells[rowId][colId] = select.value
          })
        } else {
          selects.forEach(select => {
            cells[select.dataset.id] = select.value
          })
        }

        currentEngine.submit({ cells })
      })
    }

    els.cardBob.addEventListener("click", () => {
      triggerBobShake()
      if (currentEngine && typeof currentEngine.applyTool === "function") {
        currentEngine.applyTool("flip", "B")
      }
    })

    // Render state update function
    function render(state) {
      if (!state) return

      // --- SHARED SHELL ---
      if (els.levelBadge) els.levelBadge.textContent = state.levelId ? `LEVEL ${state.levelId}` : "LEVEL 14"

      const actNum = state.levelId >= 16 ? 5 : 4;
      const actTitle = state.levelId >= 16 ? "DELIVERY" : "TWINS";
      if (els.actBadge) els.actBadge.textContent = `ACT ${actNum} · ${actTitle}`;

      if (els.phaseBadge) {
        if (state.levelId === 20) els.phaseBadge.hidden = true;
        else {
          els.phaseBadge.hidden = false;
          els.phaseBadge.textContent = `PHASE: ${(state.phase || "alice").toUpperCase()}`
        }
      }

      if (els.btnLevels) {
        if (state.levels && state.levels.length > 0) {
          els.btnLevels.hidden = false
        } else {
          els.btnLevels.hidden = true
        }
      }
      if (els.moves) {
        if (state.levelId === 20) els.moves.hidden = true;
        else {
          els.moves.hidden = false;
          let parText = ""
          if (state.par !== undefined) {
             if (state.levelId === 16) {
                parText = ` · Par: ${state.par}`
             } else {
                parText = ` / Par: ${state.par}`
             }
          }
          els.moves.textContent = `Moves: ${state.moveCount || 0}${parText}`
        }
      }
      if (els.title && state.title) els.title.textContent = state.title
      if (els.goal && state.goalLine) els.goal.textContent = state.goalLine

      const feedback = state.feedback || { kind: "info", text: "" }
      const kind = feedback.kind || "info"
      const isBobLocked = state.lockedQubits && state.lockedQubits.includes("B")

      if (els.feedbackKindText) els.feedbackKindText.textContent = kind.toUpperCase()
      if (els.feedbackIcon) {
        if (kind === "blocked") els.feedbackIcon.textContent = "⛔"
        else if (kind === "hint") els.feedbackIcon.textContent = "💡"
        else els.feedbackIcon.textContent = "ℹ️"
      }
      if (els.feedbackText) {
        if (feedback.text) {
          els.feedbackText.textContent = feedback.text
        } else if (isBobLocked) {
          els.feedbackText.textContent = "Alice can act on her twin. Bob's twin is locked."
        } else {
          els.feedbackText.textContent = ""
        }
      }

      if (els.feedbackCard) {
        if (!feedback.text && !isBobLocked) {
          els.feedbackCard.hidden = true
        } else {
          els.feedbackCard.hidden = false
          els.feedbackCard.className = `feedback-card feedback-${kind}`
        }
      }

      // --- RESET VISIBILITY TO NEUTRAL ---
      if (els.targetCard) els.targetCard.hidden = true
      if (els.winBanner) els.winBanner.hidden = true
      if (els.blueprintSection) els.blueprintSection.hidden = true
      if (els.twinsSection) els.twinsSection.hidden = true
      if (els.measurementSection) els.measurementSection.hidden = true
      if (els.tableSection) els.tableSection.hidden = true
      if (els.plannerSection) els.plannerSection.hidden = true
      if (els.level16Section) els.level16Section.hidden = true
      if (els.aliceBody) els.aliceBody.style.display = ""
      if (els.bobBody) els.bobBody.style.display = ""

      if (els.checkSection) {
        if ((state.levelId === 12 || state.levelId === 14) && state.status !== "won") {
          els.checkSection.hidden = false
        } else {
          els.checkSection.hidden = true
        }
      }

      // --- ROUTER ---
      if (state.levelId === 12) {
        renderLevel12(state)
      } else if (state.levelId === 13) {
        renderLevel13(state)
      } else if (state.levelId === 14) {
        renderLevel14(state)
      } else if (state.levelId === 15) {
        renderLevel15(state)
      } else if (state.levelId === 16) {
        renderLevel16(state)
      } else if (state.levelId === 20) {
        renderLevel20(state)
      } else {
        renderLevel14(state) // Fallback
      }
    }

    function renderWinBanner(state) {
      if (state.status === "won") {
        if (els.winBanner) els.winBanner.hidden = false
        const starsCount = state.stars || (state.moveCount <= state.par ? 3 : 2)
        if (els.winStars) els.winStars.textContent = "★".repeat(starsCount) + "☆".repeat(Math.max(0, 3 - starsCount))
      }
    }

    function renderTargetCard(state) {
      if (state.target && els.targetCard) {
        els.targetCard.hidden = false
        const targetBits = state.target.bits || "10"
        if (els.targetDisplay) els.targetDisplay.textContent = targetBits

        // Dynamically inject the rule hint
        const hintEl = container.querySelector("#target-rule-hint")
        if (hintEl) {
          const bit1Val = targetBits[0] === "1" ? "1 (Differ)" : "0 (Agree)"
          const bit2Val = targetBits[1] === "1" ? "1 (Differ)" : "0 (Agree)"
          hintEl.innerHTML = `
            <span class="rule-chip"><span class="chip-shape">⬡</span> Bit 1 (Shape) = <strong>${bit1Val}</strong></span>
            <span class="rule-chip"><span class="chip-shape">◆</span> Bit 2 (Colour) = <strong>${bit2Val}</strong></span>
          `
        }

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

        if (state.status === "won") {
          if (els.winTitle) els.winTitle.textContent = `Message "${targetBits}" Encoded!`
          if (els.winDesc) els.winDesc.textContent = "Alice encoded two facts into the pair using only her twin. Bob's twin stayed locked."
        }
      }
    }

    function renderBlueprint(state, mode) {
      if (!state.lights || !els.blueprintSection) return
      els.blueprintSection.hidden = false

      if (mode === "codebook") {
        if (els.blueprintHeading) els.blueprintHeading.textContent = "Codebook Light Pattern"
        if (els.blueprintCaption) els.blueprintCaption.hidden = true
      } else {
        if (els.blueprintHeading) els.blueprintHeading.textContent = "Pair Facts"
        if (els.blueprintCaption) {
          els.blueprintCaption.hidden = false
          els.blueprintCaption.textContent = "These lights show the relationship between both twins together. Neither twin alone reveals either fact."
        }
      }

      const zzState = state.lights.zz || "agree"
      if (els.lightPanelZz) els.lightPanelZz.setAttribute("data-state", zzState)
      if (els.lightZzText) els.lightZzText.textContent = zzState.toUpperCase()
      if (els.lightZzIcon) els.lightZzIcon.textContent = zzState === "agree" ? "=" : (zzState === "differ" ? "≠" : "?")
      if (els.lightZzDesc) {
        if (zzState === "agree") els.lightZzDesc.textContent = "Colours agree when both read up-down (=) · Bit 2 = 0"
        else if (zzState === "differ") els.lightZzDesc.textContent = "Colours differ when both read up-down (≠) · Bit 2 = 1"
        else els.lightZzDesc.textContent = "Colours unsure (?)"
      }

      const xxState = state.lights.xx || "agree"
      if (els.lightPanelXx) els.lightPanelXx.setAttribute("data-state", xxState)
      if (els.lightXxText) els.lightXxText.textContent = xxState.toUpperCase()
      if (els.lightXxIcon) els.lightXxIcon.textContent = xxState === "agree" ? "=" : (xxState === "differ" ? "≠" : "?")
      if (els.lightXxDesc) {
        if (xxState === "agree") els.lightXxDesc.textContent = "Shapes agree when both read sideways (=) · Bit 1 = 0"
        else if (xxState === "differ") els.lightXxDesc.textContent = "Shapes differ when both read sideways (≠) · Bit 1 = 1"
        else els.lightXxDesc.textContent = "Shapes unsure (?)"
      }
    }

    function renderPairCards(state) {
      if (!els.twinsSection) return
      els.twinsSection.hidden = false

      // Tools
      const tools = state.toolsAvailable || []
      if (els.aliceControlsArea) {
        els.aliceControlsArea.hidden = tools.length === 0
      }
      if (els.aliceStatusText) {
        els.aliceStatusText.textContent = state.levelId === 13 ? "READABLE" : "ACTIVE · YOU ACT HERE"
      }
      if (els.btnFlip) els.btnFlip.hidden = !tools.includes("flip")
      if (els.btnTwist) els.btnTwist.hidden = !tools.includes("twist")
      if (els.btnLens) els.btnLens.hidden = !tools.includes("lens")
      if (els.btnLinker) els.btnLinker.hidden = !tools.includes("linker")

      // Bob lock status
      const isLocked = state.lockedQubits && state.lockedQubits.includes("B")
      if (els.bobStatusText) els.bobStatusText.textContent = state.levelId === 13 ? "READABLE" : (isLocked ? "LOCKED · CANNOT ACT" : "INACTIVE · FRESH PARCEL")
      if (els.bobLockIcon) els.bobLockIcon.textContent = isLocked ? "🔒" : "⏱"
      if (els.bobStatusPill) els.bobStatusPill.className = isLocked ? "twin-status-pill status-locked" : "twin-status-pill status-inactive"
      if (els.bobLockScrim) els.bobLockScrim.hidden = !isLocked
      if (els.bobControlsArea) els.bobControlsArea.hidden = !isLocked

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
        if (isLocked) els.bobGraphic.classList.add("graphic-locked")
        else els.bobGraphic.classList.remove("graphic-locked")
      }

      if (els.bobBody) {
        if (isLocked) els.bobBody.classList.add("muted-body")
        else els.bobBody.classList.remove("muted-body")
        if (state.levelId === 13) els.bobBody.style.display = "none"
      }

      if (els.aliceBody) {
        if (state.levelId === 13) els.aliceBody.style.display = "none"
      }

      // Thread
      if (els.threadContainer) {
        if (state.thread) {
          els.threadContainer.classList.add("thread-active")
          els.threadContainer.classList.remove("thread-disabled")
          if (els.threadText) els.threadText.textContent = "Linked"
        } else {
          els.threadContainer.classList.remove("thread-active")
          els.threadContainer.classList.add("thread-disabled")
          if (els.threadText) els.threadText.textContent = "Not Linked"
        }
      }
    }

    function renderTable(state) {
      const extra = state.extra || {}

      const isLevel13 = state.levelId === 13
      const isLevel15 = state.levelId === 15

      let hasData = false
      if (isLevel13 && extra.rows && extra.columns && extra.options) hasData = true

      let codebookRows = []
      if (isLevel15) {
        if (Array.isArray(extra.codebook)) codebookRows = extra.codebook
        else if (extra.codebook && Array.isArray(extra.codebook.rows)) codebookRows = extra.codebook.rows
        if (codebookRows.length > 0) hasData = true
      }

      if (!hasData) {
        if (isLevel13 && extra.factTable) hasData = true
        else return
      }

      if (els.tableSection) els.tableSection.hidden = false
      if (els.tableTitle) els.tableTitle.textContent = isLevel13 ? "Fact Table" : "Codebook"

      if (currentTableLevelId !== state.levelId) {
        currentTableLevelId = state.levelId
        if (els.tableBody) {
          let html = ""

          if (isLevel13) {
            if (extra.rows && extra.columns && extra.options) {
              const optionsHtml = `<option value="">Choose...</option>` + extra.options.map(opt => `<option value="${opt}">${opt.charAt(0).toUpperCase() + opt.slice(1)}</option>`).join("")

              extra.rows.forEach(row => {
                html += `<div class="table-row table-row-l13">
                  <label class="row-label">${row.label}</label>
                  <div class="row-selects">`
                extra.columns.forEach(col => {
                  html += `<div class="cell-block">
                    <span class="cell-label">${col.label}</span>
                    <select class="row-select" data-id="${row.id}.${col.id}">${optionsHtml}</select>
                  </div>`
                })
                html += `</div></div>`
              })
            } else if (extra.factTable) {
              extra.factTable.forEach(row => {
                let optionsHtml = `<option value="">Choose...</option><option value="agree">Agree</option><option value="differ">Differ</option><option value="random">Random</option>`
                html += `
                  <div class="table-row">
                    <label class="row-label" for="select-${row.id}">${row.label}</label>
                    <select class="row-select" id="select-${row.id}" data-id="${row.id}">
                      ${optionsHtml}
                    </select>
                  </div>
                `
              })
            }
          } else if (isLevel15) {
            codebookRows.forEach(row => {
              let label = ""
              if (row.moves !== undefined) {
                if (row.moves.length === 0) label = "Nothing"
                else label = row.moves.map(m => m.charAt(0).toUpperCase() + m.slice(1)).join(" then ")
              } else {
                label = row.label
              }

              const optionsHtml = `<option value="">Choose...</option><option value="agree">Agree</option><option value="differ">Differ</option>`
              html += `<div class="table-row table-row-l15">
                <label class="row-label">${label}</label>
                <div class="row-selects">
                  <div class="cell-block">
                    <span class="cell-label">Colour light</span>
                    <select class="row-select" data-id="${row.id}.zz">${optionsHtml}</select>
                  </div>
                  <div class="cell-block">
                    <span class="cell-label">Shape light</span>
                    <select class="row-select" data-id="${row.id}.xx">${optionsHtml}</select>
                  </div>
                </div>
              </div>`
            })
          }
          els.tableBody.innerHTML = html
          if (els.btnSubmitTable) els.btnSubmitTable.disabled = true
        }
      }
    }

    function renderMeasurementSection(state) {
      if (els.measurementSection) els.measurementSection.hidden = false
      if (els.tallyDisplay) {
        if (state.tally) {
          let tallyHtml = "<strong>Observations:</strong><br/>"
          if (state.tally.ud && (state.tally.ud[0] > 0 || state.tally.ud[1] > 0)) {
            tallyHtml += `Up-Down Lens => Agree: ${state.tally.ud[0]}, Differ: ${state.tally.ud[1]}<br/>`
          }
          if (state.tally.side && (state.tally.side[0] > 0 || state.tally.side[1] > 0)) {
            tallyHtml += `Sideways Lens => Agree: ${state.tally.side[0]}, Differ: ${state.tally.side[1]}<br/>`
          }
          els.tallyDisplay.innerHTML = tallyHtml
        } else {
          els.tallyDisplay.innerHTML = ""
        }
      }

      if (els.roundsDisplay && els.roundsList) {
        let selectedLens = "ud"
        if (els.lensRadios) {
          els.lensRadios.forEach(radio => {
            if (radio.checked) selectedLens = radio.value
          })
        }

        const extra = state.extra || {}
        const readings = (extra.pairReadings && extra.pairReadings[selectedLens]) || []

        if (readings.length > 0) {
          els.roundsDisplay.hidden = false
          els.roundsList.innerHTML = readings.map((r, i) => {
             return `<li style="margin-bottom: 0.35rem; padding-bottom: 0.35rem; border-bottom: 1px solid var(--color-border-subtle);">Round ${i + 1}: Alice's twin ${r.a} · Bob's twin ${r.b}</li>`
          }).join("")
        } else {
          els.roundsDisplay.hidden = true
          els.roundsList.innerHTML = ""
        }
      }
    }

    // --- LEVEL SPECIFIC ROUTERS ---

    function renderLevel12(state) {
      renderPairCards(state)
      renderWinBanner(state)
      if (state.status === "won") {
        if (els.winTitle) els.winTitle.textContent = "Success!"
        if (els.winDesc) els.winDesc.textContent = "You successfully completed the level."
      }
    }

    function renderLevel13(state) {
      renderPairCards(state)
      renderMeasurementSection(state)
      renderTable(state)
      renderWinBanner(state)
      if (state.status === "won") {
        if (els.winTitle) els.winTitle.textContent = "Success!"
        if (els.winDesc) els.winDesc.textContent = "You successfully completed the level."
      }
    }

    function renderLevel14(state) {
      renderTargetCard(state)
      renderBlueprint(state, "facts")
      renderPairCards(state)
      renderWinBanner(state)
    }

    function renderLevel15(state) {
      renderBlueprint(state, "codebook")
      renderPairCards(state)
      renderTable(state)
      renderWinBanner(state)
      if (state.status === "won") {
        if (els.winTitle) els.winTitle.textContent = "Success!"
        if (els.winDesc) els.winDesc.textContent = "You successfully completed the level."
      }
    }

    function renderLevel20(state) {
      if (els.plannerSection) els.plannerSection.hidden = false
      const extra = state.extra || {}
      if (extra.messages) {
        currentMessages = extra.messages
        if (extra.budget) currentBudget = extra.budget

        if (state.status === "won" && state.score) {
          if (els.plannerScoreCard) els.plannerScoreCard.hidden = false
          if (els.scoreDetails) els.scoreDetails.innerHTML = `
            Bits Per Parcel: ${state.score.bitsPerParcel}<br/>
            Parcels Used: ${state.score.parcelsUsed}<br/>
            Twins Left: ${state.score.twinsLeft}
          `
          if (els.winBanner) els.winBanner.hidden = false
          if (els.winTitle) els.winTitle.textContent = "Network Plan Submitted!"
          if (els.winDesc) els.winDesc.textContent = "You successfully passed the budget."
          if (els.winStars) els.winStars.textContent = "★★★"
        } else {
          if (els.plannerScoreCard) els.plannerScoreCard.hidden = true
        }
        renderPlanner()
      }
    }

    function renderLevel16(state) {
      if (els.level16Section) els.level16Section.hidden = false
      renderWinBanner(state)

      const extra = state.extra || {}
      const d = extra.delivery
      if (d && els.l16Counter) {
        els.l16Counter.textContent = `Delivery ${d.index + 1} of ${d.total}`
      }

      if (d && els.l16Chips) {
        els.l16Chips.innerHTML = ""
        for (let i = 0; i < d.total; i++) {
          const chip = document.createElement("span")
          chip.style.padding = "0.5rem 1rem"
          chip.style.borderRadius = "var(--radius-sm)"
          chip.style.fontWeight = "bold"
          chip.style.border = "1px solid var(--color-border-strong)"

          if (i < d.index) {
            chip.style.background = "var(--color-bg-elevated)"
            const decoded = extra.decoded || []
            chip.textContent = `${i + 1}: ${decoded[i] !== undefined ? decoded[i] : "-"}`
          } else if (i === d.index) {
            chip.style.background = "#3b82f6"
            chip.style.color = "#fff"
            chip.textContent = "NOW"
          } else {
            chip.style.background = "var(--color-bg-surface)"
            chip.style.color = "var(--color-text-dim)"
            chip.textContent = `${i + 1}: -`
          }
          els.l16Chips.appendChild(chip)
        }
      }

      const r = extra.readings
      if (r) {
        if (els.l16ReadingA) els.l16ReadingA.textContent = r.A !== null ? r.A : "?"
        if (els.l16ReadingB) els.l16ReadingB.textContent = r.B !== null ? r.B : "?"

        if (els.btnL16LookA) {
          if (r.A !== null) {
            els.btnL16LookA.textContent = "Already read"
            els.btnL16LookA.disabled = true
            els.btnL16LookA.classList.add("btn-disabled")
          } else {
            els.btnL16LookA.textContent = "Look at Alice's twin"
            els.btnL16LookA.disabled = false
            els.btnL16LookA.classList.remove("btn-disabled")
          }
        }
        if (els.btnL16LookB) {
          if (r.B !== null) {
            els.btnL16LookB.textContent = "Already read"
            els.btnL16LookB.disabled = true
            els.btnL16LookB.classList.add("btn-disabled")
          } else {
            els.btnL16LookB.textContent = "Look at Bob's twin"
            els.btnL16LookB.disabled = false
            els.btnL16LookB.classList.remove("btn-disabled")
          }
        }
      }

      if (els.l16ButtonsGrid) {
        let toolsHtml = ""
        const tools = state.toolsAvailable || []
        tools.forEach(tool => {
          let name = tool.toUpperCase()
          let desc = ""
          let icon = ""
          if (tool === "linker") {
            desc = "Acts on both twins"
            icon = "🔗"
          } else if (tool === "lens") {
            name = "LENS-CHANGER"
            desc = "Acts on one twin"
            icon = ""
          }
          toolsHtml += `
            <button type="button" class="tool-btn btn-${tool}" data-tool="${tool}">
              <div class="btn-top">
                <span class="tool-icon" aria-hidden="true">${icon}</span>
                <span class="tool-name">${name}</span>
              </div>
              <span class="tool-desc">${desc}</span>
            </button>
          `
        })
        els.l16ButtonsGrid.innerHTML = toolsHtml
      }

      if (els.l16LastAttempt) {
        if (extra.lastAttempt && Array.isArray(extra.lastAttempt)) {
          els.l16LastAttempt.textContent = `Last try: ${extra.lastAttempt.join(" · ")}`
        } else {
          els.l16LastAttempt.textContent = ""
        }
      }
    }

    if (currentEngine && typeof currentEngine.subscribe === "function") {
      unsubscribe = currentEngine.subscribe((newState) => {
        render(newState)
      })
    }

    if (currentEngine && typeof currentEngine.getRenderState === "function") {
      render(currentEngine.getRenderState())
    }
  }

  // Start the UI
  init()

  return () => {
    if (typeof unsubscribe === "function") {
      unsubscribe()
    }
  }
}
