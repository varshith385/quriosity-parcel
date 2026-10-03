import { describe, it, expect, beforeEach } from 'vitest'
import { createFakeEngine } from './fakeEngine.js'
import { mountUI } from './index.js'

describe('FakeEngine for Level 13', () => {
  let engine

  beforeEach(() => {
    engine = createFakeEngine({ levelId: 13 })
  })

  it('submit accepts the exact shape for Level 13 and wins', () => {
    engine.submit({
      cells: {
        "ud.alone": "random",
        "ud.together": "agree",
        "side.alone": "random",
        "side.together": "agree"
      }
    })
    
    const state = engine.getRenderState()
    expect(state.status).toBe('won')
    expect(state.feedback.text).toContain('Correct!')
  })

  it('submit rejects wrong shapes and increments failureCount', () => {
    engine.submit({
      cells: {
        "ud.alone": "random",
        "ud.together": "differ",
        "side.alone": "agree",
        "side.together": "differ"
      }
    })
    
    const state = engine.getRenderState()
    expect(state.status).toBe('playing')
    expect(state.failureCount).toBe(1)
    expect(state.feedback.kind).toBe('hint')
  })

  it('renders pairReadings lists without throwing', () => {
    if (typeof document === 'undefined') return // Skip if no jsdom

    document.body.innerHTML = '<div id="root"></div>'
    mountUI(document.getElementById('root'), engine)

    // With pairReadings missing, should not throw and display should be hidden
    const display = document.getElementById('rounds-display')
    expect(display.hidden).toBe(true)

    // Trigger look A and B to generate pairReadings
    engine.look('A', 'ud')
    engine.look('B', 'ud')

    // UI responds to engine via subscription
    expect(display.hidden).toBe(false)
    const list = document.getElementById('rounds-list')
    expect(list.children.length).toBe(1)
    expect(list.children[0].textContent).toMatch(/Round 1: Alice's twin [01] · Bob's twin [01]/)
  })
})
