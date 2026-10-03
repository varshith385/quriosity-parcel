import './style.css'
import { mountUI } from './ui/index.js'
import { createEngine } from './engine/index.js'

const engine = createEngine()

const wanted = new URLSearchParams(window.location.search).get('level')
if (wanted) engine.selectLevel(Number(wanted))

mountUI(document.getElementById('app'), engine)
