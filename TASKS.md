# Roles and tasks (todo / doing / done)
1. Quantum core (branch core): src/quantum/, tests/
   - [ ] JS simulator: flip, twist, H, CNOT, measure, pair-maker, unmake
   - [ ] rule checks for levels 12-16 and 20, then the rest
2. Engine and integration (branch engine): src/engine/, src/main.js, index.html
   - [ ] remove Vite starter files, level loader, state, controls, scoring
   - [ ] merge PRs, keep main and the live link working
3. Visuals and feel (branch visuals): src/ui/, src/style.css
   - [ ] dial, parcel and twin visuals, lamps, buttons
   - [ ] animations, mobile layout, colour plus shape (colour-blind safe)
4. Levels, physics check and delivery (branch levels): src/levels/, python/, docs/, README.md
   - [ ] Qiskit referee (6 checks), 20 level data files and messages
   - [ ] playtests, video, README, submission
Everyone: add confusion moments to docs/wait-what-<yourname>.md
