import { describe, it, expect, beforeEach } from 'vitest'
import { createFakeEngine } from './fakeEngine.js'

describe('FakeEngine for Level 15', () => {
  let engine

  beforeEach(() => {
    engine = createFakeEngine({ levelId: 15 })
  })

  it('submit accepts the exact shape for Level 15 and wins', () => {
    engine.submit({
      cells: {
        nothing: { zz: "agree", xx: "agree" },
        flip: { zz: "differ", xx: "agree" },
        twist: { zz: "agree", xx: "differ" },
        both: { zz: "differ", xx: "differ" }
      }
    })
    
    const state = engine.getRenderState()
    expect(state.status).toBe('won')
    expect(state.feedback.text).toContain('Codebook complete!')
  })

  it('submit rejects wrong shapes and increments failureCount', () => {
    engine.submit({
      cells: {
        nothing: { zz: "differ", xx: "agree" },
        flip: { zz: "agree", xx: "agree" },
        twist: { zz: "differ", xx: "differ" },
        both: { zz: "agree", xx: "differ" }
      }
    })
    
    const state = engine.getRenderState()
    expect(state.status).toBe('playing')
    expect(state.failureCount).toBe(1)
    expect(state.feedback.kind).toBe('hint')
  })
})
