import { describe, it, expect, beforeEach } from 'vitest'
import { createFakeEngine } from './fakeEngine.js'
import { mountUI } from './index.js'

describe('FakeEngine for Level 16', () => {
  let engine

  beforeEach(() => {
    engine = createFakeEngine({ levelId: 16 })
  })

  it('solved path ends in won status with all decoded matching', () => {
    // 4 deliveries
    for (let i = 0; i < 4; i++) {
      engine.applyTool('linker', 'A')
      engine.applyTool('lens', 'A')
      engine.look('A', 'ud')
      engine.look('B', 'ud')
    }

    const state = engine.getRenderState()
    expect(state.status).toBe('won')
    expect(state.extra.decoded).toEqual(['10', '01', '00', '11'])
    expect(state.moveCount).toBe(8)
    expect(state.stars).toBe(3)
  })

  it('looking twice at the same twin does not change the reading', () => {
    engine.applyTool('linker', 'A')
    engine.applyTool('lens', 'A')
    
    engine.look('A', 'ud')
    const state1 = engine.getRenderState()
    const readingA1 = state1.extra.readings.A
    
    // look again at A
    engine.look('A', 'ud')
    const state2 = engine.getRenderState()
    expect(state2.extra.readings.A).toBe(readingA1)
    expect(state2.feedback.text).toContain('already read')
  })

  it('renderState does not leak answers or have messages', () => {
    const state = engine.getRenderState()
    const str = JSON.stringify(state)
    
    expect(str).not.toContain('"messages":')
    expect(state.extra.messages).toBeUndefined()
  })

  it('renders level 16 UI correctly', () => {
    if (typeof document === 'undefined') {
      const state = engine.getRenderState()
      expect(state.toolsAvailable).toEqual(['lens', 'linker'])
      expect(state.toolsAvailable).not.toContain('unmake')
    } else {
      document.body.innerHTML = '<div id="root"></div>'
      // 1. Mount with level 14 (default) like the real app might start
      const engine14 = createFakeEngine({ levelId: 14 })
      mountUI(document.getElementById('root'), engine14)

      // 2. Switch to Level 16 using selectLevel
      engine14.selectLevel(16)

      // 3. Assert on the new state
      const section = document.getElementById('level16-section')

      // The instructions say: "asserts #level16-section is not hidden, getComputedStyle display is not none..."
      expect(section).not.toBeNull()
      expect(section.hidden).toBe(false)
      expect(window.getComputedStyle(section).display).not.toBe('none')

      const lookA = document.getElementById('btn-l16-look-a')
      const lookB = document.getElementById('btn-l16-look-b')
      expect(lookA).not.toBeNull()
      expect(lookB).not.toBeNull()

      const toolBtns = document.querySelectorAll('#l16-buttons-grid .tool-btn')
      expect(toolBtns.length).toBe(2)

      const tools = Array.from(toolBtns).map(b => b.dataset.tool)
      expect(tools).toContain('lens')
      expect(tools).toContain('linker')
      expect(tools).not.toContain('unmake')
    }
  })

  it('renders level select screen and allows switching levels', () => {
    if (typeof document === 'undefined') return

    document.body.innerHTML = '<div id="root"></div>'
    // Create engine with a mock selectLevel to see if it gets called
    const engine = createFakeEngine({ levelId: 14 })
    let selectedLevel = null
    engine.selectLevel = (id) => { selectedLevel = id }

    // Inject a specific levels array
    const originalGetRenderState = engine.getRenderState
    engine.getRenderState = () => {
      const state = originalGetRenderState.call(engine)
      state.levels = [
        { id: 12, title: "Make twins", tier: 1 },
        { id: 13, title: "Twins' facts", tier: 1 }
      ]
      return state
    }

    mountUI(document.getElementById('root'), engine)

    // Initially the level select screen is hidden
    const screen = document.getElementById('level-select-screen')
    expect(screen.hidden).toBe(true)

    // Click the Levels button
    const btnLevels = document.getElementById('btn-levels')
    expect(btnLevels.hidden).toBe(false)
    btnLevels.dispatchEvent(new Event('click'))

    // Screen should now be visible and populated
    expect(screen.hidden).toBe(false)
    const list = document.getElementById('level-list')
    const buttons = list.querySelectorAll('.level-select-btn')
    expect(buttons.length).toBe(2)
    expect(buttons[0].textContent).toContain('Level 12')
    expect(buttons[1].textContent).toContain('Level 13')

    // Click on Level 13
    buttons[1].dispatchEvent(new Event('click'))

    // Should call engine.selectLevel and hide screen
    expect(selectedLevel).toBe(13)
    expect(screen.hidden).toBe(true)
  })
})
