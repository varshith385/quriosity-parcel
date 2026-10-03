#!/usr/bin/env python3
"""
python/make_expected.py
Role 4: Referee and Level Delivery

Generates python/expected.json containing analytical reference statevectors
and quantum simulation benchmarks for superdense coding.

QUBIT MAPPING (CRITICAL):
-------------------------
In Qiskit, qubit indexing is little-endian:
A 2-qubit state |q1 q0> places qubit 1 as the MSB and qubit 0 as the LSB.
Statevector index i = 2*q1 + q0.

We map:
  - Alice (A) -> Qubit 1
  - Bob   (B) -> Qubit 0

Therefore, the Qiskit statevector index equals:
  index = 2 * a + b
which directly maps to our project's basis state order:
  index 0 (00) -> a00
  index 1 (01) -> a01
  index 2 (10) -> a10
  index 3 (11) -> a11
State vector order: [a00, a01, a10, a11].

VALIDATION WITH ROLES.md SECTION 1.5:
-------------------------------------
Let s = 1 / sqrt(2).
1. Pair maker (H on A, CNOT A->B):
   |00> -> (1/sqrt2)(|00> + |11>) = [s, 0, 0, s] (Phi+) -> index 0 and 3. Matches table!
2. Alice encodes:
   - 00 (nothing):      [s,  0, 0,  s] (Phi+)
   - 01 (flip = X on A): [0,  s, s,  0] (Psi+)
   - 10 (twist = Z on A):[s,  0, 0, -s] (Phi-)
   - 11 (twist then flip = Z then X on A): [0, -s, s, 0] (-Psi-)
3. Bob decodes (CNOT A->B, then H on A):
   - 00: [1, 0, 0,  0] -> |00> (P=1)
   - 01: [0, 1, 0,  0] -> |01> (P=1)
   - 10: [0, 0, 1,  0] -> |10> (P=1)
   - 11: [0, 0, 0, -1] -> -|11> (P=1, up to global sign)
All match ROLES.md 1.5 exactly!
"""

import json
import math
from pathlib import Path
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector


def round_statevector(data, decimals=12):
    """
    Assert imaginary parts are ~0 and round real parts to `decimals` decimal places.
    Converts -0.0 to 0.0 for clean JSON output.
    """
    cleaned = []
    for amp in data:
        assert abs(amp.imag) < 1e-12, f"Expected imaginary part ~0, got {amp.imag}"
        val = round(float(amp.real), decimals)
        if val == 0.0:
            val = 0.0
        cleaned.append(val)
    return cleaned


def generate_expected():
    # 1. Pair maker: H on A (qubit 1), CNOT A->B (qubit 1 -> qubit 0)
    qc_pair = QuantumCircuit(2)
    qc_pair.h(1)
    qc_pair.cx(1, 0)
    sv_pair = Statevector(qc_pair)
    pair_maker_expected = round_statevector(sv_pair.data)

    # 2. Encode states for all 4 messages
    # 00 = nothing; 01 = X; 10 = Z; 11 = Z first, then X (all on Alice = qubit 1)
    messages = ["00", "01", "10", "11"]
    encode_expected = {}
    decode_expected = {}

    for msg in messages:
        qc = QuantumCircuit(2)
        # Pair maker
        qc.h(1)
        qc.cx(1, 0)

        # Alice's encoding
        if msg == "00":
            pass
        elif msg == "01":
            qc.x(1)
        elif msg == "10":
            qc.z(1)
        elif msg == "11":
            # Exact sequence: Z first, then X
            qc.z(1)
            qc.x(1)

        sv_enc = Statevector(qc)
        encode_expected[msg] = round_statevector(sv_enc.data)

        # Bob's decode: CNOT(A->B) then H on A
        qc.cx(1, 0)
        qc.h(1)
        sv_dec = Statevector(qc)
        decode_expected[msg] = round_statevector(sv_dec.data)

    # 3. Dial extras computed directly from Qiskit Statevectors:
    # At t = 60 degrees: single-qubit state cos(t/2)|0> + sin(t/2)|1> via Ry rotation
    qc60 = QuantumCircuit(1)
    qc60.ry(np.radians(60), 0)
    sv60 = Statevector(qc60)
    probs_60 = sv60.probabilities()
    p_up_t60 = round(float(probs_60[0]), 12)

    # At t = 45 degrees: sureness = max(p, 1-p) for both up-down (Z) and sideways (X) lenses
    qc45 = QuantumCircuit(1)
    qc45.ry(np.radians(45), 0)
    sv45_ud = Statevector(qc45)
    probs_45_ud = sv45_ud.probabilities()
    sureness_t45_ud = max(probs_45_ud[0], probs_45_ud[1])

    # Sideways lens (apply H before measurement)
    qc45_side = qc45.copy()
    qc45_side.h(0)
    sv45_side = Statevector(qc45_side)
    probs_45_side = sv45_side.probabilities()
    sureness_t45_side = max(probs_45_side[0], probs_45_side[1])

    assert np.isclose(sureness_t45_ud, sureness_t45_side, atol=1e-12), (
        f"Sureness mismatch between lenses at t=45: UD={sureness_t45_ud}, Side={sureness_t45_side}"
    )
    sureness_t45 = round(float(sureness_t45_ud), 12)

    data = {
        "mapping": "Alice (A) on qubit 1, Bob (B) on qubit 0. Index = 2*a + b = [a00, a01, a10, a11]",
        "note": "Comparisons must be up to a global sign (message 11 gives -|11>)",
        "pairMaker": pair_maker_expected,
        "encode": encode_expected,
        "afterDecode": decode_expected,
        "dialExtras": {
            "pUp_t60": p_up_t60,
            "sureness_t45": sureness_t45
        },
        "pUp_t60": p_up_t60,
        "sureness_t45": sureness_t45
    }

    out_path = Path(__file__).parent / "expected.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"Successfully wrote {out_path}")
    print(f"pairMaker:   {pair_maker_expected}")
    for msg in messages:
        print(f"encode {msg}:      {encode_expected[msg]}")
    for msg in messages:
        print(f"afterDecode {msg}: {decode_expected[msg]}")
    print(f"dialExtras: P(up)@t=60={p_up_t60}, sureness@t=45={sureness_t45}")


if __name__ == "__main__":
    generate_expected()
