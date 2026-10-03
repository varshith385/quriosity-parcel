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

  it('dropdowns start blank and Submit disabled until all chosen', () => {
    if (typeof document === 'undefined') return

    document.body.innerHTML = '<div id="root"></div>'
    mountUI(document.getElementById('root'), engine)

    const btnSubmit = document.getElementById('btn-submit-table')
    const selects = Array.from(document.querySelectorAll('.row-select'))

    expect(btnSubmit.disabled).toBe(true)
    selects.forEach(sel => {
      expect(sel.value).toBe("")
    })

    // Fill all but one
    for(let i=0; i<selects.length - 1; i++) {
      selects[i].value = "random"
      selects[i].dispatchEvent(new Event('change', { bubbles: true }))
    }
    expect(btnSubmit.disabled).toBe(true)

    // Fill last one
    selects[selects.length - 1].value = "agree"
    selects[selects.length - 1].dispatchEvent(new Event('change', { bubbles: true }))
    expect(btnSubmit.disabled).toBe(false)
  })

  it('resets twin card bodies display and removes locked text when switching from 13 to other levels', () => {
    if (typeof document === 'undefined') return

    document.body.innerHTML = '<div id="root"></div>'
    mountUI(document.getElementById('root'), engine)

    const aliceBody = document.getElementById('alice-parcel-body')
    const bobBody = document.getElementById('bob-parcel-body')
    const feedbackText = document.getElementById('feedback-text')
    const feedbackCard = document.getElementById('feedback-card')

    expect(aliceBody.style.display).toBe('none')
    expect(bobBody.style.display).toBe('none')
    expect(feedbackCard.hidden).toBe(true)

    engine.selectLevel(14)
    expect(aliceBody.style.display).toBe('')
    expect(bobBody.style.display).toBe('')

    engine.selectLevel(12)
    expect(aliceBody.style.display).toBe('')
    expect(bobBody.style.display).toBe('')
    expect(feedbackText.textContent).not.toContain('locked')
  })
})