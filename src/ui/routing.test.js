import { describe, it, expect, beforeEach } from 'vitest'
import { createFakeEngine } from './fakeEngine.js'
import { mountUI } from './index.js'

describe('UI Routing', () => {
  it('routes to dial UI and hides Tier 1 sections when mode is dial or levelId is 2', () => {
    if (typeof document === 'undefined') return

    document.body.innerHTML = '<div id="root"></div>'
    
    // Mount a regular Tier 1 level first to establish the baseline DOM
    const engine = createFakeEngine({ levelId: 14 })
    mountUI(document.getElementById('root'), engine)

    const dialContainer = document.getElementById('dial-container')
    const title = document.getElementById('header-title')
    const goal = document.getElementById('header-goal')
    
    // Check initial state (Level 14)
    expect(dialContainer.hidden).toBe(true)
    expect(title.hidden).toBe(false)
    expect(goal.hidden).toBe(false)

    // Route to mode="dial"
    const originalGetRenderState = engine.getRenderState
    engine.getRenderState = () => {
      const state = originalGetRenderState.call(engine)
      state.mode = 'dial'
      state.levelId = 5
      return state
    }
    // trigger a re-render
    engine.applyTool('flip', 'A') 
    
    expect(dialContainer.hidden).toBe(false)
    expect(title.hidden).toBe(true)
    expect(goal.hidden).toBe(true)
    
    // Check levelId 2 ("post")
    engine.getRenderState = () => {
      const state = originalGetRenderState.call(engine)
      state.mode = 'post'
      state.levelId = 2
      return state
    }
    engine.applyTool('flip', 'A') 
    
    expect(dialContainer.hidden).toBe(false)
    expect(title.hidden).toBe(true)
    expect(goal.hidden).toBe(true)

    // Route to Level 16 (post, tier 1)
    engine.getRenderState = () => {
      const state = originalGetRenderState.call(engine)
      state.mode = 'post'
      state.levelId = 16
      return state
    }
    engine.applyTool('flip', 'A') 

    expect(dialContainer.hidden).toBe(true)
    expect(title.hidden).toBe(false)
    
    // Route to Level 20
    engine.getRenderState = () => {
      const state = originalGetRenderState.call(engine)
      state.mode = 'post'
      state.levelId = 20
      return state
    }
    engine.applyTool('flip', 'A') 

    expect(dialContainer.hidden).toBe(true)
    expect(title.hidden).toBe(false)
  })
})
