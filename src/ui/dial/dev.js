import { createEngine } from '../../engine/index.js'
import { mountDial } from './index.js'

const engine = createEngine()
engine.selectLevel(5)
mountDial(document.getElementById('app'), engine)
