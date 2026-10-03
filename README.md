# Parcel for Two (Superdense Coding)

## Quriosity Hackathon (Option 5)
Submission for ISACA, Infinium 2026, IIIT Hyderabad, H204.
Live link: https://quriosity-parcel.vercel.app 

## What We Learned in Hours 0 to 3
During the learning phase, we realized that quantum mechanics is often taught with heavy math that hides the actual mechanics. For superdense coding, the core magic lies not in holding two bits on one particle, but in the relationship between two entangled particles. We learned:
- **Entanglement is a resource**: It's prepared beforehand and consumed after one use. It isn't "free".
- **One qubit holds one bit**: A single particle only ever yields one bit of information upon measurement. 
- **The message is in the relationship**: Alice only touches her particle, applying a twist (Z) or flip (X). The parcel in transit looks completely random. The message only appears when Bob reunites the two particles and decodes the relationship.

## The Idea in Plain Language
Alice and Bob share an entangled pair of qubits BEFORE any message exists. Later Alice wants to send Bob two classical bits. She touches ONLY her own qubit of the pair (applies one of four moves) and sends that single qubit to Bob. Bob now holds both qubits. He runs a decoder on the two together and measures. He reads two bits, with certainty. One qubit travelled, two bits arrived, because the pre-shared pair did half the work. 

## How Each Act Maps to the Physics
Our game teaches this without lectures or quizzes, using failure-first design:
- **Act 1: Post office**: Establishes the classical baseline. One parcel = one bit. You learn that quantum states have a probability tied to a dial angle.
- **Act 2: Looking changes things**: Introduces lenses (bases: up-down/Z and sideways/X). Shows that certainty in one lens means randomness in the other, and that measurements alter the state.
- **Act 3: Undo and mix**: Introduces the lens-changer (Hadamard) and shows that gates are reversible. Undo means applying moves in reverse.
- **Act 4: Twins (CORE)**: We create an entangled pair (Bell state) using a lens-changer and a linker (CNOT). Players discover that one twin alone is noise, but together they share facts. Alice writes the message by changing only her twin.
- **Act 5: Delivery (CORE)**: Bob unmakes the pair to extract the two bits. Players see the cost of looking early (the peek) and prove that the parcel in transit holds no readable message by itself.

## Wait, What? Moments
1. **One twin alone is pure noise**: Look at one twin of the pair, in either lens, as often as you like: it comes out 50/50 every time. Nothing about it hints at the pair.
2. **The two twins together are not noise**: Compare both readings from the same pair and in the right lens they always agree (or always differ). The pattern lives in the pair, not in either twin.
3. **The parcel is blank, yet it carries two bits**: Alice only touches her twin, and the pair was prepared in advance and is used up after one use. Bob unmakes the pair, reads both twins, and gets two bits. One look at one twin still gives only one bit.
4. **The engine has no physics in it**: It only calls the simulator, and the tests plus an independent Qiskit check decide what is true.

## How to Run
This is a plain web app using Vite and vanilla JS.
```bash
npm install
npm run dev
```

## How the Physics was Verified
To ensure complete accuracy, we enforce strict separation between the simulation and the UI:
- **Independent Qiskit Referee**: We run a Python script using IBM's Qiskit (`python/`) to independently verify all quantum states.
- **Six Physics Checks**: The core simulator (`src/quantum/sim.js`) is tested by Vitest against the 6 core quantum facts for this protocol.
- **Cross-check**: We enforce a strict cross-check against an `expected.json` which is verified by both our simulator and the Qiskit referee.

## Honest Limits
- **Cards are only a picture**: The card visual is just a representation; a real qubit doesn't secretly hold a hidden "color and shape".
- **Not a secure channel**: Superdense coding does not provide a secure channel, nor does it detect spies (that is QKD - Option 6). The stolen parcel alone looks blank because it's entangled, not because it's encrypted.
- **No faster-than-light communication**: The entangled pair is prepared in advance, and Alice's qubit still has to physically travel to Bob at or below light speed.
- **Lights are a blueprint**: The "facts" (ZZ and XX parities) shown as lights are an abstraction of the pair's relationship, not physical lightbulbs on the qubits.
