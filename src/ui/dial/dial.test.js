import { describe, it, expect } from 'vitest'
import { mountDial } from './index.js'

describe('mountDial contract (src/ui/dial/index.js)', () => {
  it('exports mountDial as a function taking 2 arguments', () => {
    expect(typeof mountDial).toBe('function')
    expect(mountDial.length).toBe(2)
  })

  it('throws an error if root container is not found', () => {
    expect(() => mountDial(null, {})).toThrow('mountDial: root container element not found.')
  })
})
