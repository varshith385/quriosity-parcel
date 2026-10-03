/**
 * src/ui/dial/index.js - Dial Screen Component (Level 5)
 * Conforms strictly to Role 3 specifications:
 * - Reads state strictly from engine.getRenderState()
 * - Calls engine actions: setDial, look, submit, reset
 * - No physics or probability formulas computed in UI
 * - No answer hints or 45-degree markings
 * - Tap targets at least 44px
 * - Re-renders on engine.subscribe, returns unmount cleanup function
 */

import './dial.css'

export function mountDial(root, engine) {
  const container = typeof root === 'string' ? document.querySelector(root) : root
  if (!container) {
    throw new Error('mountDial: root container element not found.')
  }

  const initialState = typeof engine?.getRenderState === 'function' ? engine.getRenderState() : null
  const initialGoal = initialState?.goalLine || ''

  // Build the initial DOM structure
  container.innerHTML = `
    <div class="dial-screen-container">
      <div class="dial-card" id="dial-card">
        <!-- Header -->
        <header class="dial-header">
          <div class="dial-badge-row">
            <span class="dial-badge" id="dial-badge-tier">Tier 2 · Dial</span>
            <span class="dial-move-info" id="dial-move-info">Moves: 0 / Par: 1</span>
          </div>
          <h1 class="dial-title" id="dial-title">Two lenses</h1>
          <p class="dial-goal" id="dial-goal">${initialGoal}</p>
        </header>

        <!-- Win Box -->
        <div class="dial-win-box" id="dial-win-box" style="display: none;" role="status">
          <span aria-hidden="true" style="font-size: 1.4rem;">★</span>
          <div>
            <div style="font-weight: 700;">Goal Reached!</div>
            <div id="dial-win-text" style="font-size: 0.9rem; font-weight: normal; opacity: 0.9;">Target reached.</div>
          </div>
          <span class="dial-stars" id="dial-stars" aria-label="Stars earned"></span>
        </div>

        <!-- Feedback Box -->
        <div class="dial-feedback-box" id="dial-feedback-box" style="display: none;"></div>

        <!-- Dial Visual & Slider -->
        <section class="dial-visual-section" aria-label="Dial Angle Control">
          <div class="dial-svg-wrapper">
            <svg class="dial-svg" viewBox="0 0 200 200" role="img" aria-label="Dial with rotating arrow">
              <!-- Outer Dial Circle -->
              <circle cx="100" cy="100" r="82" fill="#0b1120" stroke="#334155" stroke-width="2" />
              <circle cx="100" cy="100" r="80" fill="none" stroke="#1e293b" stroke-width="1.5" />

              <!-- Neutral Axis Crosshairs (No answer markings) -->
              <line x1="100" y1="22" x2="100" y2="30" stroke="#64748b" stroke-width="2" />
              <line x1="178" y1="100" x2="170" y2="100" stroke="#64748b" stroke-width="2" />
              <line x1="100" y1="178" x2="100" y2="170" stroke="#64748b" stroke-width="2" />
              <line x1="22" y1="100" x2="30" y2="100" stroke="#64748b" stroke-width="2" />

              <!-- Axis Text Labels -->
              <text x="100" y="18" text-anchor="middle" font-size="9" fill="#94a3b8" font-weight="600">0° Up</text>
              <text x="186" y="103" text-anchor="start" font-size="9" fill="#94a3b8" font-weight="600">90° +</text>
              <text x="100" y="194" text-anchor="middle" font-size="9" fill="#94a3b8" font-weight="600">180° Down</text>
              <text x="14" y="103" text-anchor="end" font-size="9" fill="#94a3b8" font-weight="600">270° -</text>

              <!-- Arrow Pointer Group (Rotated dynamically via geometry) -->
              <g id="dial-arrow-group">
                <line id="dial-arrow-stem" x1="100" y1="100" x2="100" y2="36" stroke="#38bdf8" stroke-width="3.5" stroke-linecap="round" />
                <polygon id="dial-arrow-head" points="100,28 93,42 107,42" fill="#38bdf8" />
                <!-- Center Pivot -->
                <circle cx="100" cy="100" r="5" fill="#f8fafc" stroke="#0284c7" stroke-width="2" />
              </g>
            </svg>
          </div>

          <!-- Slider Group -->
          <div class="dial-slider-group">
            <div class="dial-slider-label-row">
              <label for="dial-slider" style="display: flex; align-items: center; gap: 0.4rem;">
                <span aria-hidden="true">↻</span>
                <span>Dial Angle</span>
              </label>
              <span class="dial-angle-display" id="dial-angle-display">0°</span>
            </div>
            <input
              type="range"
              id="dial-slider"
              class="dial-range-input"
              min="0"
              max="355"
              step="5"
              value="0"
              aria-label="Dial angle in degrees (5-degree steps)"
            />
          </div>
        </section>

        <!-- Sureness Meters Section -->
        <section class="dial-meters-section" id="dial-meters-section" aria-label="Sureness Meters">
          <div class="dial-meters-header">Meters</div>

          <!-- Up-Down Meter -->
          <div class="dial-meter-row" id="meter-row-ud">
            <div class="dial-meter-label-row">
              <span style="display: flex; align-items: center; gap: 0.35rem;">
                <span aria-hidden="true" style="color: var(--dial-accent-ud);">↕</span>
                <span id="meter-label-ud">Up-down: 0% sure</span>
              </span>
            </div>
            <div class="dial-meter-bar-track">
              <div class="dial-meter-bar-fill dial-fill-ud" id="meter-fill-ud" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Sideways Meter -->
          <div class="dial-meter-row" id="meter-row-side">
            <div class="dial-meter-label-row">
              <span style="display: flex; align-items: center; gap: 0.35rem;">
                <span aria-hidden="true" style="color: var(--dial-accent-side);">↔</span>
                <span id="meter-label-side">Sideways: 0% sure</span>
              </span>
            </div>
            <div class="dial-meter-bar-track">
              <div class="dial-meter-bar-fill dial-fill-side" id="meter-fill-side" style="width: 0%;"></div>
            </div>
          </div>
        </section>

        <!-- Looks & Tally Section -->
        <section class="dial-looks-section" aria-label="Observation Actions">
          <div class="dial-btn-row">
            <button type="button" class="dial-btn" id="btn-look-ud" aria-label="Look through up-down lens">
              <span aria-hidden="true">↕</span>
              <span>Look up-down</span>
            </button>
            <button type="button" class="dial-btn" id="btn-look-side" aria-label="Look through sideways lens">
              <span aria-hidden="true">↔</span>
              <span>Look sideways</span>
            </button>
          </div>

          <!-- Tally Display -->
          <div class="dial-tally-container" id="dial-tally-container">
            <div class="dial-tally-box" id="tally-box-ud">
              <div class="dial-tally-title">↕ Up-down Tally</div>
              <div class="dial-tally-counts">
                <div>↑ Up: <span id="tally-ud-0">0</span></div>
                <div>↓ Down: <span id="tally-ud-1">0</span></div>
              </div>
            </div>
            <div class="dial-tally-box" id="tally-box-side">
              <div class="dial-tally-title">↔ Sideways Tally</div>
              <div class="dial-tally-counts">
                <div>→ (+): <span id="tally-side-0">0</span></div>
                <div>← (-): <span id="tally-side-1">0</span></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Classical Bits Input (Level 2) -->
        <div class="dial-bits-input-container" id="dial-bits-container" style="display: none; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
          <label for="dial-bits-input" style="font-size: 0.9rem; font-weight: 600;">Message to send:</label>
          <input type="text" id="dial-bits-input" class="dial-bits-input" placeholder="e.g. 10" aria-label="Bits to send" />
        </div>

        <!-- Check Submission & Reset Section -->
        <footer style="display: flex; gap: 0.75rem;">
          <button type="button" class="dial-btn dial-btn-primary" id="btn-submit" aria-label="Check solution">
            <span aria-hidden="true">✓</span>
            <span>Check</span>
          </button>
          <button type="button" class="dial-btn" id="btn-reset" style="flex: 0 0 auto;" aria-label="Reset level">
            <span aria-hidden="true">↺</span>
            <span>Reset</span>
          </button>
        </footer>
      </div>
    </div>
  `

  // Element handles
  const titleEl = container.querySelector('#dial-title')
  const goalEl = container.querySelector('#dial-goal')
  const moveInfoEl = container.querySelector('#dial-move-info')
  const winBox = container.querySelector('#dial-win-box')
  const winText = container.querySelector('#dial-win-text')
  const starsEl = container.querySelector('#dial-stars')
  const feedbackBox = container.querySelector('#dial-feedback-box')
  const slider = container.querySelector('#dial-slider')
  const angleDisplay = container.querySelector('#dial-angle-display')
  const arrowGroup = container.querySelector('#dial-arrow-group')

  // Meters elements
  const metersSection = container.querySelector('#dial-meters-section')
  const meterRowUD = container.querySelector('#meter-row-ud')
  const meterRowSide = container.querySelector('#meter-row-side')
  const meterLabelUD = container.querySelector('#meter-label-ud')
  const meterLabelSide = container.querySelector('#meter-label-side')
  const meterFillUD = container.querySelector('#meter-fill-ud')
  const meterFillSide = container.querySelector('#meter-fill-side')

  // Tally elements
  const tallyContainer = container.querySelector('#dial-tally-container')
  const tallyUD0 = container.querySelector('#tally-ud-0')
  const tallyUD1 = container.querySelector('#tally-ud-1')
  const tallySide0 = container.querySelector('#tally-side-0')
  const tallySide1 = container.querySelector('#tally-side-1')

  // Buttons
  const btnLookUD = container.querySelector('#btn-look-ud')
  const btnLookSide = container.querySelector('#btn-look-side')
  const btnSubmit = container.querySelector('#btn-submit')
  const btnReset = container.querySelector('#btn-reset')
  const bitsContainer = container.querySelector('#dial-bits-container')
  const bitsInput = container.querySelector('#dial-bits-input')

  let isDraggingSlider = false

  // Event Listeners
  slider.addEventListener('mousedown', () => { isDraggingSlider = true })
  slider.addEventListener('mouseup', () => { isDraggingSlider = false })
  slider.addEventListener('touchstart', () => { isDraggingSlider = true }, { passive: true })
  slider.addEventListener('touchend', () => { isDraggingSlider = false })

  slider.addEventListener('input', (e) => {
    const angle = Number(e.target.value)
    if (angleDisplay) angleDisplay.textContent = `${angle}°`
    // Direct visual rotation for instant feedback while dragging
    if (arrowGroup) {
      arrowGroup.setAttribute('transform', `rotate(${angle} 100 100)`)
    }
    if (typeof engine.setDial === 'function') {
      engine.setDial(angle)
    }
  })

  btnLookUD.addEventListener('click', () => {
    if (typeof engine.look === 'function') {
      engine.look('A', 'ud')
    }
  })

  btnLookSide.addEventListener('click', () => {
    if (typeof engine.look === 'function') {
      engine.look('A', 'side')
    }
  })

  btnSubmit.addEventListener('click', () => {
    if (typeof engine.submit === 'function') {
      const payload = {}
      if (bitsContainer && bitsContainer.style.display !== 'none' && bitsInput) {
        payload.bits = bitsInput.value.trim()
      }
      engine.submit(payload)
    }
  })

  btnReset.addEventListener('click', () => {
    if (typeof engine.reset === 'function') {
      engine.reset()
    }
  })

  // Render function: Pure projection from engine.getRenderState()
  function render(state) {
    if (!state) return

    // 1. Title, goal, par & moves
    if (titleEl && state.title) titleEl.textContent = state.title
    if (goalEl && state.goalLine) goalEl.textContent = state.goalLine
    if (moveInfoEl) {
      const par = state.par !== undefined ? state.par : 1
      const count = state.moveCount !== undefined ? state.moveCount : 0
      moveInfoEl.textContent = `Moves: ${count} / Par: ${par}`
    }

    // 2. Dial Angle & Arrow (geometry from dial.tDegrees)
    const t = state.dial?.tDegrees !== undefined ? state.dial.tDegrees : 0
    if (angleDisplay) {
      angleDisplay.textContent = `${t}°`
    }
    if (slider && !isDraggingSlider) {
      slider.value = String(t)
    }
    if (arrowGroup) {
      arrowGroup.setAttribute('transform', `rotate(${t} 100 100)`)
    }

    // 3. Sureness Meters (from state.meters)
    if (state.meters && typeof state.meters === 'object') {
      metersSection.style.display = 'flex'

      if (typeof state.meters.ud === 'number') {
        meterRowUD.style.display = 'flex'
        const pctUD = Math.round(state.meters.ud * 100)
        meterLabelUD.textContent = `Up-down: ${pctUD}% sure`
        meterFillUD.style.width = `${pctUD}%`
      } else {
        meterRowUD.style.display = 'none'
      }

      if (typeof state.meters.side === 'number') {
        meterRowSide.style.display = 'flex'
        const pctSide = Math.round(state.meters.side * 100)
        meterLabelSide.textContent = `Sideways: ${pctSide}% sure`
        meterFillSide.style.width = `${pctSide}%`
      } else {
        meterRowSide.style.display = 'none'
      }
    } else {
      // If meters is missing from render state, show nothing
      metersSection.style.display = 'none'
    }

    // 4. Looks Tally (from state.tally)
    if (state.tally && typeof state.tally === 'object') {
      tallyContainer.style.display = 'grid'
      if (Array.isArray(state.tally.ud)) {
        tallyUD0.textContent = String(state.tally.ud[0] || 0)
        tallyUD1.textContent = String(state.tally.ud[1] || 0)
      }
      if (Array.isArray(state.tally.side)) {
        tallySide0.textContent = String(state.tally.side[0] || 0)
        tallySide1.textContent = String(state.tally.side[1] || 0)
      }
    } else {
      // If tally is missing from render state, show nothing
      tallyContainer.style.display = 'none'
    }

    // 5. Win State & Feedback
    const isWon = state.status === 'won'
    if (winBox) {
      if (isWon) {
        winBox.style.display = 'flex'
        if (state.feedback?.text) {
          winText.textContent = state.feedback.text
        }
        if (starsEl) {
          const starsCount = state.stars || 0
          starsEl.textContent = '★'.repeat(starsCount)
        }
      } else {
        winBox.style.display = 'none'
      }
    }

    // 6. Generic Feedback (when not won)
    if (feedbackBox) {
      if (!isWon && state.feedback?.text) {
        feedbackBox.textContent = state.feedback.text
        feedbackBox.style.display = 'block'
      } else {
        feedbackBox.style.display = 'none'
      }
    }

    // 7. Classical Bits Input
    if (bitsContainer) {
      if (state.target && state.target.type === 'classical') {
        bitsContainer.style.display = 'flex'
      } else {
        bitsContainer.style.display = 'none'
      }
    }
  }

  // Subscribe to engine state changes
  const unsubscribe = typeof engine.subscribe === 'function'
    ? engine.subscribe((newState) => {
        render(newState)
      })
    : null

  // Initial render
  if (typeof engine.getRenderState === 'function') {
    render(engine.getRenderState())
  }

  // Unmount cleanup function
  function unmount() {
    if (typeof unsubscribe === 'function') {
      unsubscribe()
    }
    container.innerHTML = ''
  }

  unmount.unmount = unmount
  return unmount
}
