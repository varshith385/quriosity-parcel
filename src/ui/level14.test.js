import { describe, it, expect, beforeEach } from 'vitest'
import { mountUI } from './index.js'
import { createFakeEngine } from './fakeEngine.js'

describe('FakeEngine for Level 14', () => {
  let engine

  beforeEach(() => {
    engine = createFakeEngine()
  })

  it('provides getRenderState and subscribe methods', () => {
    expect(typeof engine.getRenderState).toBe('function')
    expect(typeof engine.subscribe).toBe('function')
    expect(typeof engine.applyTool).toBe('function')
    expect(typeof engine.reset).toBe('function')
  })

  it('initial state has zz="agree", xx="agree", Bob locked, and target="10"', () => {
    const state = engine.getRenderState()
    expect(state.levelId).toBe(14)
    expect(state.title).toBe('One-hand writing')
    expect(state.target.bits).toBe('10')
    expect(state.lights.zz).toBe('agree')
    expect(state.lights.xx).toBe('agree')
    expect(state.lockedQubits).toContain('B')
    expect(state.thread).toBe(true)
    expect(state.status).toBe('playing')
  })

  it('Flip button changes ONLY zz to "differ" and leaves xx unchanged', () => {
    let notifiedState = null
    engine.subscribe((st) => {
      notifiedState = st
    })

    engine.applyTool('flip', 'A')

    const state = engine.getRenderState()
    expect(state.lights.zz).toBe('differ')
    expect(state.lights.xx).toBe('agree')
    expect(state.moveCount).toBe(1)
    expect(state.moveLog).toEqual(['flip'])
    expect(state.feedback.text).toContain('Flip')

    // subscriber should have received updated state
    expect(notifiedState.lights.zz).toBe('differ')
    expect(notifiedState.lights.xx).toBe('agree')
  })

  it('Twist button changes ONLY xx to "differ" and leaves zz unchanged', () => {
    engine.applyTool('twist', 'A')

    const state = engine.getRenderState()
    expect(state.lights.xx).toBe('differ')
    expect(state.lights.zz).toBe('agree')
    expect(state.moveCount).toBe(1)
    expect(state.moveLog).toEqual(['twist'])

    // Target 10 is reached because Shape(xx) = differ ("1") and Colour(zz) = agree ("0")
    // In the updated logic, we must submit to win.
    expect(state.status).toBe('playing')
    engine.submit({})
    const winState = engine.getRenderState()
    expect(winState.status).toBe('won')
    expect(winState.stars).toBeGreaterThan(0)
    expect(winState.feedback.text).toContain('Target 10 reached')
  })

  it('Action on locked Bob twin is blocked and does not change lights', () => {
    engine.applyTool('flip', 'B')

    const state = engine.getRenderState()
    expect(state.feedback.kind).toBe('blocked')
    expect(state.feedback.text).toContain("Bob's twin is locked")
    expect(state.lights.zz).toBe('agree')
    expect(state.lights.xx).toBe('agree')
  })

  it('Reset restores state to initial values', () => {
    engine.applyTool('flip', 'A')
    expect(engine.getRenderState().lights.zz).toBe('differ')

    engine.reset()
    const state = engine.getRenderState()
    expect(state.lights.zz).toBe('agree')
    expect(state.lights.xx).toBe('agree')
    expect(state.moveCount).toBe(0)
    expect(state.status).toBe('playing')
  })

  it('mountUI function contract is exported correctly', () => {
    expect(typeof mountUI).toBe('function')
    expect(mountUI.length).toBe(2) // root, engine
  })
})
