# ROLES.md (v4): "Parcel for Two" (quriosity hackathon, superdense coding)

Paste this WHOLE file into your AI tool (Cursor, Antigravity, ChatGPT, Claude) before asking it for anything. Then say which role you are (1, 2, 3 or 4).

Note to the AI model reading this: follow the specs and constraints below exactly. Do not invent physics. Do not "improve" the quantum rules. If something is not specified, ask the human instead of guessing. Unit tests and the Qiskit referee decide what is true, never your opinion. Sections marked [FIX] are deliberate corrections; keep them.

v4 changes from v3: Role 1 now pushes the simulator, then the Tier 1 answer checkers, before anything else; Role 2 pushes a scaffold (stubs plus sample render states) at 18:15; added the `mountUI(root, engine)` contract; the loader skips level files that do not exist yet; level 5 redesigned (its old goal was unwinnable); target types cleaned up; added a validate-levels script, a backup rule for Role 1, ownership exceptions and working rules; timeline updated.

---

## 0. EVENT, GOAL, AND WHO DOES WHAT

- Event: quriosity (ISAQC, Infinium 2026, IIIT Hyderabad, H204). 3 Oct 10:30 to 4 Oct 06:00 IST. The brief says 16 hour build: hours 0-3 learn, 3-16 build, hour 16 submit, finals before 06:00. If the clock started at 10:30, hour 16 is about 02:30 on 4 Oct. THIS IS DERIVED, NOT CONFIRMED. Check the real submission deadline on the site and plan to submit early.
- Teams of 1 to 4. We are 4. Goal: WIN. Prizes 14k/7k/4k INR.
- Brief: a game that teaches ONE real quantum idea with no lecture and no quiz. Physics must be the mechanic. A beginner with high-school maths must follow it.
- Our option: option 5, superdense coding. ONE option only, no combining.
- The 7 rules: (1) learn by playing, no lectures or quizzes; (2) topic first, a plain square that is accurate beats a pretty one that is wrong; (3) build around the idea, remove the physics and the game falls apart; (4) welcome beginners; (5) learn, struggle, build, README records the "wait, what?" moments; (6) original only, no clones; (7) easy to run, hosted link preferred.
- Judges reward: accurate and easy-to-follow physics; mechanic straight from the idea; beginner-friendly; original; easy to run. Two stages: review of submissions, then finalists pitch to domain experts.
- Submission (quriosity.devs.surf/submit): option; playable link; public repo; short gameplay video showing the core mechanic; README (what we learned in hours 0-3 and how it became the game). Fields: team name, option, 3 links, optional note, permission clause (ISAQC may use/share the work).
- Repo: https://github.com/varshith385/quriosity-parcel (public). Live: https://quriosity-parcel.vercel.app (Vercel Hobby, Vite preset). Stack: plain web, Vite vanilla JS, no game engine, our own JS simulator, Vitest, Qiskit (Python) as independent referee.

### Role assignment (fill in names)

| Role | Name | Owns | One-line job |
|---|---|---|---|
| 1 Core | ________ | src/quantum/, tests/, src/engine/targets/, level files 1-11 | Exact physics, then answer checkers (the thing others wait on), then Acts 1-3 data |
| 2 Engine and lead | ________ | src/engine/ (except targets/), src/main.js, index.html, src/fixtures/, package.json | Scaffold at 18:15, game loop, phases, render state, level select, merges, deploy |
| 3 Visuals and video | ________ | src/ui/, src/style.css | Everything the player sees; records the gameplay video |
| 4 Levels and referee | ________ | level files 12-20, src/levels/index.json, python/, scripts/, docs/, README | Independent Qiskit referee, core level data, validator, playtests, submission |

Principle: the person who writes the simulator (Role 1) is NOT the person who writes the referee (Role 4), so the two checks stay independent.

Biggest bottleneck: Role 1. Roles 2 and 3 can work against stubs, Role 4 needs nobody for most of its work, but win detection for levels 12 to 16 and 20 needs Role 1's checkers. That is why Role 1's order of work is fixed in section 4.

---

## 1. THE PHYSICS (every role must read this fully)

### 1.1 The idea in one paragraph
Alice and Bob share an entangled pair of qubits BEFORE any message exists. Later Alice wants to send Bob two classical bits. She touches ONLY her own qubit of the pair (applies one of four moves) and sends that single qubit to Bob. Bob now holds both qubits. He runs a decoder on the two together and measures. He reads two bits, with certainty. One qubit travelled, two bits arrived, because the pre-shared pair did half the work.

### 1.2 Plain-language framing (the only story we tell players)
- A pair has two firm facts about it, even though neither qubit alone has a fixed answer. In maths: ZZ parity ("do the two agree when both are read up-down?") and XX parity ("do the two agree when both are read sideways?"). A fresh pair has both = "agree".
- Alice's flip changes the first fact. Alice's twist changes the second fact. She never touches Bob's qubit, but the relationship changes, because a relationship has two sides.
- The decoder moves those two facts onto two separate qubits, so each qubit then gets one ordinary question. That is how Bob reads two bits.
- Where is the message while the parcel is in the mail? Only in the relationship between Alice's qubit and Bob's qubit. Alice's parcel alone looks completely random. Only Bob has both.

### 1.3 Representation (EXACT)
- Two qubits: first = Alice (A), second = Bob (B).
- State = 4 real numbers in the order |00>, |01>, |10>, |11>. Index = 2*a + b (a is A's bit, b is B's bit).
- All gates real: X, Z, H, CNOT. No complex numbers. (The game lives in the "flat" real plane; there is no third lens.)
- Levels 1 to 11 use ONE parcel, represented as qubit A with B fixed at |0>. The DIAL state with angle t is the 4-vector [cos(t/2), 0, sin(t/2), 0]. Dial angle t: 0 degrees = up, 180 = down, 90 = sideways "+", 270 = sideways "-".
  - P(up) = cos^2(t/2). t = 60 degrees gives 75% up, 25% down.
  - P(sideways "+") = cos^2((t - 90 degrees)/2).
  - Equal steps of t do NOT give equal steps of chance (the level 4 discovery).
  - To draw the arrow from a state with B = |0>: t = 2*atan2(a10, a00) in degrees, normalised to [0, 360).

### 1.4 Gates on [a00, a01, a10, a11] (EXACT)
- X on A: swap a00<->a10 and a01<->a11. X on B: swap a00<->a01 and a10<->a11.
- Z on A: negate a10 and a11. Z on B: negate a01 and a11.
- H on A: for pairs (a00,a10) and (a01,a11): new first = (x+y)/sqrt2, new second = (x-y)/sqrt2. H on B: same on pairs (a00,a01) and (a10,a11).
- CNOT (control A, target B): swap a10 and a11.
- Up-down lens (Z basis) look at a qubit: P(0) = sum of squares of amplitudes where that qubit is 0. Collapse to the matching amplitudes and renormalise.
- Sideways lens (X basis) look: apply H to that qubit, measure up-down, THEN APPLY H AGAIN so the collapsed state is left as "+" or "-". [GOTCHA: without the second H, level 6 (look sideways, then up-down) is wrong.]
- Entanglement indicator for the thread between twins: E = 2*|a00*a11 - a01*a10| (0 independent, 1 maximally linked).
- Sureness of a qubit in a lens = max(p, 1-p), where p is the chance of outcome 0 in that lens. Used by level 5.
- The two pair facts (for the lights in levels 14 and 15): ZZ = a00^2 - a01^2 - a10^2 + a11^2; XX = 2*(a00*a11 + a01*a10). A value of +1 means "agree", -1 means "differ". Checked on all four Bell states. If either value is not within 1e-9 of +1 or -1, the pair is not in a Bell state: return "unsure".

### 1.5 The protocol (EXACT)
- Pair-maker from |00>: H on A, then CNOT(A control, B target). Result Phi+ = (|00>+|11>)/sqrt2.
- Encode (Alice acts on A only): 00 = nothing; 01 = X (flip); 10 = Z (twist); 11 = Z first, then X.
- Decode ("unmake", the exact inverse of the pair-maker): CNOT(A->B), then H on A, then measure A, then B. All gates are self-inverse, so "run backwards" means the same gates in reverse order.

(s = 1/sqrt2; states are [a00,a01,a10,a11])

| Message | Alice's move | Pair state | ZZ | XX | Decode |
|---|---|---|---|---|---|
| 00 | nothing | [s,0,0,s] (Phi+) | +1 agree | +1 agree | 00 |
| 01 | flip (X) | [0,s,s,0] (Psi+) | -1 differ | +1 agree | 01 |
| 10 | twist (Z) | [s,0,0,-s] (Phi-) | +1 agree | -1 differ | 10 |
| 11 | twist then flip | [0,-s,s,0] (-Psi-; global sign irrelevant) | -1 differ | -1 differ | 11 |

- Bit 1 (A's outcome) = a twist was applied = XX "differ". Bit 2 (B's outcome) = a flip was applied = ZZ "differ".
- Worked check for "10": [s,0,0,-s] -> CNOT swaps a10,a11 -> [s,0,-s,0] -> H on A -> [0,0,1,0] = |10>. A reads 1, B reads 0.

### 1.6 Facts the levels teach
- A flip (X) is invisible in the sideways lens. A twist (Z) is invisible in the up-down lens.
- H H = identity. H Z H = X. Z|+> = |->.
- Every gate is reversible. To undo a chain, apply the same moves in REVERSE order (all our gates are self-inverse).
- One look at one qubit gives at most one bit. A qubit has at most 2 perfectly distinguishable states (arrows 180 degrees apart on the dial; two arrows are perfectly distinguishable iff |cos((t1-t2)/2)| = 0).
- Two lenses cannot both be sure: the best compromise is about 85% sure in each (t = 45 degrees gives 0.854 in both). Certain in one lens means 50/50 in the other.
- Blank parcel: for ALL four messages, Alice's qubit alone is 50/50 in BOTH lenses.
- The peek: if Bob looks at his qubit up-down BEFORE decoding, the pair collapses to |00> or |11>. A flip is still detectable, a twist is invisible, so only 1 bit (bit 2) survives.
- Noise: a KNOWN Pauli P applied by the road acts like an accidental message. Alice wants net result Q, so she applies P*Q first (up to a global sign).
- Score: bits delivered per parcel. With twins 2.0, without 1.0. Each twin is consumed after one use. Entanglement is NOT free.

### 1.7 MISCONCEPTIONS WE MUST NEVER STATE (one wrong claim costs more than an ugly game)
- NEVER say a qubit "holds 2 bits". One look at one qubit gives one bit.
- NEVER imply faster-than-light communication. A physical qubit must still travel.
- NEVER say entanglement is free. The pair is prepared in advance and consumed.
- NEVER call this a secure channel or spy detection. We only say: the stolen parcel alone looks blank.
- NEVER say a real qubit secretly holds a colour and a shape. The card picture is only a picture.
- The pair is prepared BEFORE the message. Alice touches only her own qubit. Bob needs BOTH qubits.
- Do NOT add CHSH or Bell-inequality tests (we mean Bell-basis measurement). Do NOT add error correction or check bits (option 6). Do NOT add goals from other options.
- No lectures, no info screens, no quizzes, no multiple choice. No lives or hearts (they punish experimenting, which fights failure-first design).
- Names (entanglement, Bell state, basis, Hadamard, CNOT) appear only AFTER the player has seen the behaviour.
- Never rely on colour alone to show information (always add pattern, shape or label).

### 1.8 Game vocabulary
parcel = qubit; twin = pair member; thread = visible link between twins; lens = measurement basis (up-down = Z, sideways = X); flip = X; twist = Z; lens-changer = H; linker = CNOT; pair-maker = lens-changer then linker; unmake = decoder (pair-maker run backwards).

---

## 2. GAME DESIGN: 20 LEVELS, ONE MODE, working title "Parcel for Two"

Principles for every level:
- Failure first: the player tries the obvious wrong move and the physics pushes back. That push-back teaches.
- Pull-the-physics-out test: if the quantum rule is removed, the level must stop working.
- Every level must be WINNABLE. A level whose goal is impossible has no way to end (this was the bug in the old levels 5 and 6).
- Winnable by a beginner without lectures (short goal line and event-triggered hints only).
- Depth over breadth: only superdense-coding prerequisites.
- No lives. Progress is saved; each level earns 1 to 3 stars by attempts (par defined in the level JSON).
- Single-player first. All state plain JSON so two-player can be added later as a transport layer.

Why the pair appears at level 12: the protocol needs the pair from the start, but a beginner can only appreciate it after the one-bit limit (Acts 1 and 2) and the tools (Act 3). Level 8 creates the problem; Acts 3 and 4 build the tools; Act 5 uses them. Level 8 is paid off by level 20, level 11 by level 16.

### Act 1: Post office (the one-bit baseline)
1. **One slot.** One parcel slot, one stamp (yes/no). Send a row of 1-bit messages. Failure first: stamping two answers on one parcel; the second overwrites the first. Discovery: one parcel carries one answer. (Classical baseline.)
2. **Two bits, two parcels.** Message "10" with a postage meter. Failure first: squeezing both bits onto one parcel; the slot refuses. Discovery: 2 bits cost 2 parcels. A greyed-out "one-parcel machine" with "?" teases the goal.
3. **First look.** A crate of identical quantum parcels; look through the up-down lens and tally. Goal: sort crates into "sure" (prepared up or down) and "unsure" (prepared sideways). Failure first: assuming every parcel is unsure because the first was. Discovery: some always give the same answer, others vary. Physics test: plain stamps make every crate "sure".
4. **Tilt.** A dial tilts the arrow; many looks build a tally. Goal: hit a target chance such as 75/25 (t = 60 degrees). Failure first: equal dial steps do not give equal chance steps. Discovery: chance comes from the angle. Physics test: without angle only 0% and 100% exist.

### Act 2: Looking changes things
5. **Two lenses.** [FIX] A parcel certain in the up-down lens; now a sideways lens too. Two "sureness" meters show how sure each lens is. Goal: get BOTH lenses as sure as you can (win when the weaker meter is at least 84%; the best possible is 85.4% at t = 45 degrees). Failure first: tilting toward one lens loses the other. Discovery: certain in one lens means 50/50 in the other; you can never reach 100% in both. (The old goal "find a parcel certain in both" was impossible, so the level could not end.)
6. **Looking erases.** [FIX] Look sideways, then up-down. The goal is a PREDICTION: the player sets a slider for the expected up-down tally after a sideways look, runs many parcels, and compares. Failure first: predicting "still sure". Discovery: looking changes the parcel; looking cannot undo itself. Needs the second H after a sideways look (1.4).
7. **Two moves.** Flip and twist buttons plus a lens switch. Goal: hit a list of target readings, some up-down, some sideways (start states must make the move visible in the lens used). Failure first: twist on an up-down reading shows no change. Discovery: flip is invisible sideways; twist is invisible up-down.
8. **Four won't fit.** Four message markers (00, 01, 10, 11) are placed as arrows on one parcel; the reader gets a lens and one look each. Goal: maximise how many the reader can tell apart (win at 2). Failure first: spreading four arrows evenly (0, 90, 180, 270 degrees); the reader confuses them. Discovery: best possible is two (arrows 180 degrees apart). Say "one look gives one bit", never "a qubit holds 2 bits".

### Act 3: Undo and mix
9. **Lens-changer.** An H button. Goal: predict the tally before pressing, for one press and two. Failure first: expecting two presses to give a coin flip again. Discovery: twice returns to the start.
10. **Paths.** H, twist, H with two glowing paths drawn through. Goal: turn a certain-0 parcel into certain-1 using only lens-changers and twist (no flip). Failure first: twist alone (invisible) or H twice (back to start). Discovery: H Z H = X; a hidden sign makes the paths cancel (interference).
11. **Rewind.** A sealed machine applied a chain of moves. The moves are SHOWN as a visible list; only their effect on the parcel is hidden. Goal: restore the parcel. Failure first: repeating the same moves in the same order. Discovery: undo means the same moves in reverse order. Prepares level 16.

### Act 4: Twins (CORE)
12. **Make twins.** Machine with two slots, a lens-changer, a linker, and two fresh parcels in |00>. Goal: produce two linked parcels, shown by a thread (drawn only when E > 0.99). Failure first: lens-changer alone gives two separate parcels; linker first gives nothing new (state stays |00>). Discovery: both steps, in that order. Physics test: remove the linker and the parcels stay independent.
13. **Twins' facts.** Read twins in both lenses over many trials (fresh pair each trial; both twins read in the same lens each round) and fill a fact table. Goal: complete the table. Failure first: predicting one twin's answer from that twin alone; always a coin flip. Discovery: alone each is random; together they agree in both lenses. Only now the word "entanglement" appears. Control: independent parcels must each be random in the lens being read (both prepared sideways, read up-down), so they agree only about 50% of the time.
14. **One-hand writing.** Alice acts on her twin only; Bob's twin is locked. Flip and twist. Two lights show the pair's two facts. Goal: make the lights match a target message. Discovery: two moves write two facts, and Bob's twin never changes. See section 7.2.
15. **Your own codebook.** The player tries four moves on Alice's twin: nothing, flip, twist, both. Goal: fill a codebook mapping each move to a distinct pair pattern (the two lights). Failure first: assuming "both" repeats one of the single moves. Discovery: four moves give four patterns (I, X, Z, XZ). Physics test: one lone parcel would only give two patterns.

### Act 5: Delivery (CORE)
16. **Unmake.** Bob holds both twins but may only look at single twins and use gates. Goal: decode a stream of patterns into bits. Failure first: reading each twin separately gives random results; running the pair-maker forward gives nonsense. Discovery: running it backwards (linker, then lens-changer), then looking at each twin once, gives two readable bits, deterministically.
17. **The peek.** Bob may look at his twin early, before Alice's parcel arrives (a tempting free-look button). Goal: receive the full 2-bit message (winnable by not peeking). Failure first: peeking, then decoding; only bit 2 arrives. Discovery: looking early breaks the link.
18. **The spy.** A spy steals the parcel and looks through any lens; Alice sends several different messages. Goal: compare the spy's tally across messages. Failure first: hunting for a pattern; none. Discovery: the stolen parcel alone looks the same (50/50 in both lenses) for every message. Wording: this shows what a single stolen parcel reveals, NOT a security claim, never "spy detected".
19. **Rough road.** The road adds a KNOWN flip or twist to every parcel in transit. Goal: get the intended message to arrive. Failure first: sending normally; Bob decodes the wrong message. Discovery: the road's error is just another move; pre-correct. The "random error + check bits" variant is REMOVED (option 6).
20. **Full delivery.** Several messages of different lengths (for example 1, 2, 3, 4 bits), a parcel budget, and a limited supply of twins. A parcel carries up to 1 bit, or up to 2 bits if it uses a twin; each parcel carries bits of one message only; each twin is used once. Goal: deliver everything within the budget. Failure first: spending twins on 1-bit leftovers (saves nothing). Discovery: twins are a resource; spend them on 2-bit chunks. Score = bits per parcel (2.0 with twins, 1.0 without).

### Tiers, build order and cut order
- Tier 1 (must ship): 12, 13, 14, 15, 16, 20, plus the six physics checks, README, video, live link.
- Tier 2 (the beginner on-ramp, build next): 2, 5, 7, 8, 9, 11.
- Tier 3: 1, 3, 4, 6, 17, 18.
- Tier 4 (first to cut): 10, 19. Also first to cut with them: polish and two-player.
- Cut order if short: two-player, polish, 19, 10, 18, merge 3 and 4 into one level, then 6, 9, 1. NEVER cut Tier 1 or the six physics checks.
- Play order is the teaching order (1 to 20), NOT tier order. Tiers are only a build and cut priority, stored in each level's `tier` field.
- `src/levels/index.json` lists all 20 ids in play order from the start. The loader uses `import.meta.glob('./levels/*.json', { eager: true })` (or equivalent) so a level file that does not exist yet is simply skipped (with a console warning) and the game still runs. Cutting a level means deleting its id from index.json.

---

## 3. SHARED INTERFACES (DRAFT by Claude; Role 2 confirms ONCE at the 18:15 scaffold, then frozen except by agreement)

### 3.1 Simulator API (src/quantum/sim.js, Role 1). Pure functions, never mutate input, randomness only via rng.
```js
// state: [a00, a01, a10, a11]; qubit: "A" | "B"; rng(): number in [0,1)
makeRng(seed)                         // seeded generator (e.g. mulberry32) -> rng
zeroState()                           // [1,0,0,0]
dialState(tDegrees)                   // [cos(t/2), 0, sin(t/2), 0]   (one parcel = qubit A, B = |0>)
angleOf(state)                        // t in [0,360) for states with B = |0>; used to draw the arrow
applyX(state, qubit)
applyZ(state, qubit)
applyH(state, qubit)
applyCNOT(state)                      // control A, target B
probabilities(state, qubit)           // [p0,p1], up-down lens
probabilitiesSideways(state, qubit)   // [p0,p1], sideways lens ("+", "-")
measure(state, qubit, rng)            // up-down look -> { outcome, state }
measureSideways(state, qubit, rng)    // H, measure, H again -> { outcome, state }
entanglement(state)                   // 2*|a00*a11 - a01*a10|
pairFacts(state)                      // { zz: "agree"|"differ"|"unsure", xx: "agree"|"differ"|"unsure" }
makePair()                            // H on A then CNOT from |00>
encode(state, bits)                   // "00"|"01"|"10"|"11", acts on A only
decode(state, rng)                    // CNOT, H on A, measure A then B -> { bits, state }
reducedProbabilities(state, qubit, lens) // lens "ud"|"side": what ONE qubit shows alone
sureness(state, qubit, lens)          // max(p, 1-p) for that lens (level 5 meters)
maxDistinguishable(tDegreesList)      // largest set of pairwise (near-)orthogonal dial arrows; tolerance 0.05 on overlap
```

### 3.2 Level data format (src/levels/NN.json; Role 1 writes 1-11, Role 4 writes 12-20)
```json
{
  "id": 14,
  "act": 4,
  "tier": 1,
  "title": "One-hand writing",
  "mode": "dial" | "pair" | "post",
  "newWords": ["flip", "twist"],
  "tools": ["flip", "twist"],
  "lenses": ["ud"],
  "lockedQubits": ["B"],
  "start": { "kind": "zero" | "dial" | "pair", "t": 0 },
  "phases": ["alice"],
  "transit": { "spy": false, "road": null },
  "target": { "type": "message", "bits": "10" },
  "par": 2,
  "goalLine": "Make the lights match the message.",
  "hints": [ { "afterFailures": 3, "text": "Each button changes exactly one light." } ],
  "events": { "tool-blocked": "Bob's twin is locked.", "no-visible-change": "..." },
  "extra": { },
  "physicsCheck": "check-03",
  "removePhysicsNote": "Without the pair, one card has one answer, so the second light has nothing to attach to."
}
```
`src/levels/index.json`: `{ "order": [1,2,3, ... 20] }` (play order, Role 4 owns this file). Optional fields may be missing; the engine must tolerate this. Existing fields never change meaning.

`extra` holds level-specific data: codebook rows (15), fact table rows and control flag (13), message list with lengths and the twin and parcel budget (20), spy messages (18), road Pauli (19), arrow count (8), target readings list (7), crate list (3), win threshold 0.84 (5).

### 3.3 Engine contract, phases, and answer shapes

Phases: "alice" (Alice composes, may use tools on her qubit), "transit" (parcel in the mail; the road acts and a spy may look), "bob" (Bob holds both twins and decodes). Levels list which phases they use.

```js
// src/engine/index.js (Role 2)
createEngine()                   // loads levels (skips missing files), returns the engine below
engine.getRenderState()          // the object in 3.4
engine.subscribe(fn)             // fn(renderState) after every change; returns an unsubscribe function
engine.applyTool(name, qubit)    // "flip"|"twist"|"lens"|"linker"|"unmake"; blocked if qubit is locked
engine.look(qubit, lens)         // adds to tally; actor implied by phase (alice, spy in transit on L18, bob; Bob's early look on L17)
engine.setDial(tDegrees)         // levels 3, 4, 5, 8
engine.send()                    // alice -> transit (Alice's moves locked in)
engine.deliver()                 // transit -> bob (applies road noise if the level defines one)
engine.submit(answer)            // checks the answer against the level target (shapes below)
engine.reset()
engine.nextLevel()
engine.selectLevel(id)

// src/ui/index.js (Role 3)
export function mountUI(root, engine) { /* draws engine.getRenderState(); calls only the actions above; re-renders on subscribe */ }

// src/main.js (Role 2)
//   const engine = createEngine();
//   mountUI(document.getElementById("app"), engine);
```

Answer shape per target type. Role 1 writes `src/engine/targets/<type>.js` as pure functions `check(level, context, answer) -> { ok, detail }`, with tests. TIER 1 CHECKERS (write these first): state, message, table, stream, budget.
- "state" (10, 11, 12): `{}` checked from the live state (target state, or thread present E > 0.99).
- "message" (14): `{}` checked from `pairFacts` against the target bits.
- "table" (13, 15): `{ cells: {...} }` compared with the truth computed by the simulator.
- "stream" (16, 17, 19): `{ bits: ["10","01",...] }` read by Bob; compared with what was actually sent (level 17 and 19 use a list of length 1 or more).
- "budget" (20): `{ plan: [ { messageId, chunk, useTwin }, ... ] }`; checker verifies bits delivered, parcels used within budget, and each twin used at most once.
- Tier 2 and 3 checkers (after Tier 1):
  - "classical" (1, 2): `{ bits }` sent and parcels counted.
  - "sort" (3): `{ sort: { crateId: "sure"|"unsure" } }`.
  - "chance" (4): `{}` checked from the dial; P(up) within 0.03 of the target.
  - "optimise" (5): `{}` checked from the live state; worse of the two sureness values at least 0.84.
  - "prediction" (6, 9): `{ p }` accepted within 0.1 of the true probability.
  - "readings" (7): `{}` checked from state and lens against the target readings list.
  - "distinguish" (8): `{ arrows: [t1,t2,t3,t4] }`; win when `maxDistinguishable` equals 2.
  - "compare" (18): `{ answer: "same"|"different" }`.

### 3.4 Render state object (Role 2 produces; Role 3 consumes)
```js
{
  levelId, title, goalLine, mode, tier,
  newWords: [],                       // words to reveal now (the "name moment")
  target: { type, bits, ... },        // so the UI can draw "Target: 10"
  phase: "alice" | "transit" | "bob",
  state: [a00,a01,a10,a11],
  dial: { tDegrees } | null,
  toolsAvailable: [], lenses: ["ud","side"], lockedQubits: [],
  thread: true | false,               // from entanglement()
  lights: { zz: "agree"|"differ"|"unsure", xx: "agree"|"differ"|"unsure" } | null,
  meters: { ud: 0.85, side: 0.85 } | null,   // sureness, level 5
  tally: { ud:[n0,n1], side:[n0,n1] } | null,
  moveLog: ["H","Z","H"],             // visible for level 11
  moveCount, failureCount, par, stars: 0|1|2|3,
  extra: { codebook, factTable, budget, messages, ... },
  status: "playing" | "won",          // no "failed"; there are no lives
  feedback: { kind: "blocked"|"hint"|"info"|null, text: "" },
  score: null | { bitsPerParcel, parcelsUsed, twinsLeft },
  progress: { completedIds: [], starsById: {} }
}
```
Progress is saved in localStorage (wrap every read and write in try/catch; the game must work with it blocked).

IMPORTANT (lights vs unmake): the lights in levels 14 and 15 are a "blueprint view" of the pair's two facts, NOT something Bob can read with single-twin lenses. Label them as such. Level 16 is where Bob learns to read both facts with single-twin looks plus the unmake machine.

---

## 4. ROLE 1: CORE (physics, then the checkers everyone waits for)

Owner: `src/quantum/`, `tests/`, `src/engine/targets/`, level files `src/levels/01.json` to `11.json`. Branch: `role1-core`.

FIXED ORDER OF WORK (do not reorder; the order puts what others wait on first):
1. `src/quantum/sim.js` exactly per 3.1, with `makeRng`, plus the SIX CORE TESTS (below). Target: pushed by about 19:15. Post "sim pushed" in the group chat. (The six tests go with the simulator because wrong physics shipped to teammates costs more than the extra half hour.)
2. TIER 1 CHECKERS in `src/engine/targets/`: state, message, table, stream, budget, each with a test. Target: about 20:00. Post "checkers pushed". Roles 2 and 4 need these for levels 12 to 16 and 20.
3. Extra tests, and the cross-check test that reads `python/expected.json` (written by Role 4's script). The test MUST skip itself if the file is missing, so main stays green.
4. Tier 2 and 3 checkers (classical, sort, chance, optimise, prediction, readings, distinguish, compare).
5. Level JSON 1 to 11 (Tier 2 first: 2, 5, 7, 8, 9, 11; then 1, 3, 4, 6; then 10). Role 4 reviews your text against 1.7.

The six core tests (`npm test` runs `vitest run --passWithNoTests`; all must pass):
1. Pair-maker output equals (|00>+|11>)/sqrt2 (tolerance about 1e-9).
2. All four messages decode deterministically (probability 1) per the table in 1.5.
3. Alice's qubit alone is 50/50 in BOTH lenses for ALL four messages.
4. Peek: after Bob looks up-down early, only 1 bit survives.
5. At most 2 perfectly distinguishable single-qubit states.
6. H H = identity and H Z H = X.

Extra tests: normalisation after every gate; no function mutates its input; `measureSideways` leaves "+" or "-" (a second sideways look repeats the answer); `entanglement` is 1 for Phi+ and 0 for |00> and after H on A alone; `dialState(60)` gives P(up) = 0.75; `pairFacts` matches the table in 1.5 for all four messages and returns "unsure" otherwise; `angleOf(dialState(t))` returns t; `sureness` at t = 45 degrees is about 0.854 in both lenses.

BACKUP RULE: if the simulator and Tier 1 checkers are not pushed by 19:30, Role 4 (done with the referee by then) takes the Tier 2 level files (2, 5, 7, 8, 9, 11) so the on-ramp is not blocked.

Rules: no complex numbers, no libraries, no random calls inside gates.

AI prompt starter: "I am Role 1 (core) in ROLES.md. First implement src/quantum/sim.js and the six core tests exactly per sections 1.3 to 1.6 and 3.1. Do not invent physics. Run npm test and show me the output. Then the Tier 1 checkers in section 3.3."

---

## 5. ROLE 2: ENGINE, INTEGRATION AND TEAM LEAD

Owner: `src/engine/` (except `targets/`), `src/main.js`, `index.html`, `src/fixtures/`, `package.json`. Branch: `role2-engine`. You also confirm section 3 and handle merges.

BY 18:15, PUSH THE SCAFFOLD TO MAIN (this is what unblocks everybody):
- The repo owner adds the three teammates as collaborators (GitHub repo Settings, Collaborators). Everyone clones and creates their branch.
- Delete Vite starter files (counter demo, default assets, default CSS imports).
- Folders: `src/quantum`, `src/engine`, `src/engine/targets`, `src/ui`, `src/levels`, `src/fixtures`, `scripts`, `tests`, `docs`, `python`.
- `package.json` with Vitest configured and a working `npm test` and `npm run build`. YOU are the only person who edits `package.json`; others ask you.
- A STUB `src/quantum/sim.js` with the exact signatures from 3.1 (dummy but valid return values).
- STUB `src/engine/index.js` (`createEngine`, `getRenderState`, `subscribe`, the actions) and a STUB `src/ui/index.js` (`mountUI`).
- Three sample render states as JSON in `src/fixtures/`: `render-dial.json` (a dial level), `render-pair.json` (a pair level such as 14), `render-level20.json` (budget level). Role 3 builds against these.
- Post the scaffold in the group chat and confirm (or amend) section 3 in ONE message. After that it is frozen.

Then build:
- Level loader: `import.meta.glob` over `src/levels/*.json`, ordered by `index.json`, skipping missing files with a console warning.
- Engine per 3.3 and render state per 3.4, rebuilt after every action. `extra` carries level-specific data.
- Rules: locked qubits refuse tools (`feedback.kind = "blocked"`). The engine calls Role 1's simulator and checkers and contains NO physics formulas. Spy looks in transit (level 18) and Bob's early look (level 17) go through `look` with the actor implied by phase. Road noise (level 19) is applied in `deliver`.
- Event-triggered feedback: "tool-blocked", "no-visible-change", "wrong-result", "win".
- Stars by attempts versus `par` (3 stars at or under par, 2 at up to 2x par, otherwise 1). No lives, no fail state.
- Progress in localStorage (try/catch around every access). Level select data (completed, stars).
- Merge duty: review any PR that touches folders other than the author's; reject physics outside `src/quantum`, failing tests or unagreed interface changes. Keep `main` always deployable.
- Done when levels 12 to 16 and 20 play from JSON through the real UI and Vercel serves it.

AI prompt starter: "I am Role 2 (engine) in ROLES.md. First build the scaffold in section 5 (stubs and three fixture render states), then src/engine per 3.2 to 3.4. The engine calls the simulator in 3.1 and the checkers in src/engine/targets and contains no physics formulas. State must be plain JSON."

---

## 6. ROLE 3: VISUALS AND VIDEO

Owner: `src/ui/`, `src/style.css`. Branch: `role3-visuals`.

Start (needs nobody): build against `src/fixtures/*.json` from Role 2's scaffold. Export `mountUI(root, engine)` from `src/ui/index.js`. Until the real engine is wired, pass a fake engine that returns a fixture from `getRenderState()`. When the real engine lands, swap it in; nothing else changes.

Build:
- Draw the render state (3.4) and call engine actions only. NEVER compute physics.
- Dial (levels 1 to 11): arrow on a circle with angle labels, tally bars, two sureness meters (5), prediction slider (6, 9), arrow placer (8), crate sorter (3).
- Pair view (levels 12 to 20): two twin cards (Alice, Bob), a thread when `thread` is true, a locked marker on Bob's card, phase banner (Alice, in the mail, Bob).
- Tool buttons (flip, twist, lens-changer, linker, unmake) and a lens switch (up-down, sideways) with plain labels.
- Two lights ("agree"/"differ"/"unsure") labelled as a blueprint view; codebook and fact-table UIs (13, 15); message and budget UI (20); move log (11); feedback line; star display; level select screen; "new word" reveal when `newWords` is non-empty.
- Motion: flip and twist must look clearly different.
- Accessibility: NEVER colour alone. Pair every colour with a pattern, shape or label (for example red striped vs blue dotted; circle vs square). Works on laptop and phone.
- Plain and clear beats pretty. Polish only after Tier 1 works.
- LATER (from the feature freeze): record the short gameplay video of the core mechanic (levels 12 to 16 and 20) using Role 4's script.

Done when levels 12 to 16 and 20 are fully playable through your UI with the real engine.

AI prompt starter: "I am Role 3 (visuals) in ROLES.md. Build mountUI(root, engine) in src/ui/index.js that renders the object in 3.4 (use src/fixtures for now) and calls only the engine actions in 3.3. No physics in the UI. Never use colour alone."

---

## 7. ROLE 4: REFEREE, LEVELS 12-20, AND DELIVERY

Owner: level files `src/levels/12.json` to `20.json`, `src/levels/index.json`, `python/`, `scripts/`, `docs/`, README. Branch: `role4-levels`. You sign off every physics claim (including Role 1's level text for 1 to 11). You are the least blocked role: start now.

Order of work:
1. Qiskit referee and `python/expected.json` (see 7.3). Target: about 19:30.
2. `src/levels/index.json` with all 20 ids in play order, committed up front.
3. `scripts/validate-levels.js` (plain Node, no dependencies): checks every file in `src/levels/` against 3.2 (required fields, valid `target.type`, `tier` 1 to 4, ids listed in index.json, `extra` fields present for each type). Run it with `node scripts/validate-levels.js` (ask Role 2 to add an npm script if you want one). Once the engine loads levels, play every level yourself to confirm it truly works.
4. Level JSON 12 to 20: core first (12, 13, 14, 15, 16, 20), then 17, 18, 19.
5. Review Role 1's level files 1 to 11 against 1.7. Take over the Tier 2 files if the backup rule in section 4 triggers.
6. Playtests, README, video script, submission.

### 7.1 Level text rules
- Short goal lines and event hints only. Names appear after behaviour. Never state anything from 1.7. Every level has its pull-the-physics-out note.

### 7.2 Level 14 card skin (a skin, not a lesson)
- Each twin card answers one of two questions: colour (red or blue) or shape (circle or square); asking one erases the other. Never say real qubits secretly hold a colour and a shape.
- Mapping: colour = ZZ light; shape = XX light. Recolour = flip (X); Reshape = twist (Z). Alice's card only; Bob's is locked.
- Bits: bit 1 = twist = shape light "differ"; bit 2 = flip = colour light "differ". "10" means shapes differ, colours same.
- Failure first: trying to change Bob's card (blocked); pressing a button twice (cancels). Each button changes exactly one light.
- Lights are a blueprint view; the player cannot read both facts by looking at the cards (looking erases). Reading out as two bits comes in level 16.
- Pull-the-physics-out: without the pair, one card has one answer, so the second light has nothing to attach to.

### 7.3 Qiskit referee (python/), independent of the JS simulator
- `pip install qiskit qiskit-aer`. `python/referee.py` runs the six checks (same as Role 1's six tests) and prints PASS or FAIL for each.
- `python/make_expected.py` writes `python/expected.json`: states after pair-maker, after each of the four encodings, after decode, in OUR order [a00,a01,a10,a11], amplitudes to 12 decimals. Role 1's Vitest test reads this file (and skips if it is missing). Commit it. It lives in your folder, so there is no cross-folder write.
- QISKIT GOTCHA: Qiskit is little-endian (qubit 0 is the RIGHTMOST bit in bitstrings and statevector indices). Our A is the FIRST (leftmost) bit. Decide the mapping once, comment it, and validate with the known answers (Phi+ gives 00, Psi+ gives 01, Phi- gives 10, Psi- gives 11).
- If the referee and the JS disagree, find the bug. Never edit the expected answer to match.

### 7.4 Playtests
- At least 3 people who have never seen the game; you stay silent. Include one non-CS person. Note every moment that would need a lecture and fix it in the level, not with text.
- Test hardest: 5 (meters), 6 (prediction), 8, 13 (control), 16, 20.

### 7.5 "Wait, what?" notes and README
- Each member keeps `docs/wait-what-<name>.md` (honest, specific moments of confusion and resolution).
- README: what we learned in hours 0 to 3; the idea in plain language; how each act maps to the physics; how to run (`npm install`, `npm run dev`); the wait-what moments; how the physics was verified (six tests plus Qiskit referee plus expected.json cross-check); honest limits (cards are only a picture; not a secure channel; no faster-than-light; lights are a blueprint).

### 7.6 Delivery and submission
- Give Role 3 the video script (what to show, in order, under 2 minutes).
- Test the live link in incognito and on a phone.
- Submit via quriosity.devs.surf/submit with all 5 items and the permission clause. Submit early, not at the deadline.
- Search the web for an existing superdense-coding game before claiming "original". Do not claim originality you have not checked.
- Check the brief's list of ideas for option 5 on the site against the levels (Bell states, local moves by Alice, entangled subsystems, Bell-basis measurement are what we believe it covers; verify on the page).

AI prompt starter: "I am Role 4 (referee and levels) in ROLES.md. First write python/referee.py and python/make_expected.py with the six checks in Qiskit, mapping Qiskit's little-endian bit order carefully. Then src/levels/index.json, scripts/validate-levels.js, and level JSON 12 to 20 per 3.2."

---

## 8. HANDOFFS: WHO WAITS FOR WHOM, AND HOW TO UNBLOCK

| Who waits | For what | How to unblock meanwhile |
|---|---|---|
| Roles 2, 3 | Simulator (Role 1) | Stub `sim.js` with the same signatures (in Role 2's scaffold) |
| Role 2 | Tier 1 checkers (Role 1), for win detection on 12-16 and 20 | Fake "always true" checkers until real ones land; Role 1 does these second |
| Role 3 | Real engine and render state (Role 2) | Build against `src/fixtures/*.json` and a fake engine, then swap |
| Role 4 | Engine loading level JSON, to confirm levels play | `scripts/validate-levels.js` now, real play-through later |
| Role 1 | `python/expected.json` (Role 4) | Cross-check test skips if the file is missing |
| Role 2 | Level files 1-11 (Role 1) and 12-20 (Role 4) | Loader skips missing files; use one hand-made test level |
| Roles 3, 4 | Playable build, for video, playtests and README | Naturally late, at the feature freeze |

Nobody waits idle. Role 1 is the real bottleneck, so its order of work (section 4) is fixed.

## 9. TEAM WORKFLOW AND RULES
- Branches: role1-core, role2-engine, role3-visuals, role4-levels. PRs into main.
- Pull main before each new task. Push to your own branch at least every 45 minutes, even if unfinished. Post in the group chat the moment you push something others wait on ("sim pushed", "checkers pushed").
- Keep PRs small. If your PR touches ONLY your own folders and `npm test` and `npm run build` pass, you may merge it yourself. Anything touching another role's folder goes to Role 2 for review, who merges within minutes.
- File ownership exceptions (everything else: only touch your own folders):
  - `package.json`: only Role 2 edits it; others ask.
  - `src/levels/index.json`: only Role 4 edits it.
  - `src/engine/targets/`: Role 1 (inside Role 2's folder).
  - `src/fixtures/`: Role 2 owns; Role 3 may request changes.
  - `python/expected.json`: Role 4 writes; Role 1's test only reads.
- Small, frequent commits; one idea per commit; never commit node_modules.
- Setup: `git clone https://github.com/varshith385/quriosity-parcel`, `npm install`, `npm run dev`, `npm test`.
- If Vite or Vitest says "Cannot find native binding": `rm -rf node_modules package-lock.json`, then `npm install`.
- Git identity must be real: `git config user.name` and `git config user.email`.
- AI output is a draft. Run the tests. For physics, the tests and the Qiskit referee decide.
- One task at a time with the AI; paste exact errors back.

## 10. TIMELINE (PROPOSED; times IST; deadline of about 02:30 on 4 Oct is DERIVED, not confirmed)
- 18:15: Role 2 pushes the scaffold and confirms section 3; collaborators added; four branches created.
- 19:15: Role 1 pushes simulator and six core tests.
- 19:30: Role 4 referee green and `python/expected.json` committed; Role 2 engine plays level 12 on stubs; Role 3 UI draws all three fixtures. BACKUP CHECK: if Role 1 has not pushed sim and Tier 1 checkers, Role 4 takes the Tier 2 level files.
- 20:00: Role 1 pushes Tier 1 checkers.
- 21:30: Tier 1 (levels 12-16 and 20) playable end to end on the live link.
- 23:00: Tier 2 levels in; first playtest round with 3 people.
- 00:30: FEATURE FREEZE. Only fixes, README, video.
- 01:15: video and README done; final deploy check (incognito and phone).
- 01:30: submit (keeps an hour of margin before the derived deadline).

## 11. OPEN RISKS
- The real submission deadline is unconfirmed.
- Whether a superdense-coding game already exists is unverified.
- Levels 5, 6, 8, 11, 13 and 20 were redesigned and need playtesting.
- Section 3 is a draft that Role 2 must confirm once, at the scaffold.
