import { describe, it, expect, beforeEach } from 'vitest'
import { createFakeEngine } from './fakeEngine.js'

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
})
