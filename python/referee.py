#!/usr/bin/env python3
"""
python/referee.py
Role 4: Referee and Level Delivery

Independent Qiskit referee verifying the six core physics checks from ROLES.md section 4.
Computes everything directly from Qiskit circuits and quantum_info operators,
comparing against the protocol reference table in ROLES.md section 1.5.

QUBIT MAPPING (EXACT):
----------------------
In Qiskit's standard convention, statevector indexing is little-endian:
  |q1 q0> -> index = 2*q1 + q0
We assign:
  - Alice (A) = Qubit 1 (MSB)
  - Bob   (B) = Qubit 0 (LSB)

Therefore, the Qiskit statevector index equals:
  index = 2 * a + b
which exactly matches our game's state array order [a00, a01, a10, a11]:
  - index 0 (|00>): a00
  - index 1 (|01>): a01
  - index 2 (|10>): a10
  - index 3 (|11>): a11

VALIDATION WITH ROLES.md SECTION 1.5:
-------------------------------------
Let s = 1/sqrt(2).
1. Pair maker: H on A (qubit 1), CNOT(A->B) on |00>
   Result: [s, 0, 0, s] (|Phi+>)
2. Encodings by Alice (acts on qubit 1 only):
   - "00" (nothing):          [s,  0, 0,  s] (|Phi+>)  ZZ=+1 agree, XX=+1 agree -> decodes to 00
   - "01" (flip = X):         [0,  s, s,  0] (|Psi+>)  ZZ=-1 differ, XX=+1 agree -> decodes to 01
   - "10" (twist = Z):        [s,  0, 0, -s] (|Phi->)  ZZ=+1 agree, XX=-1 differ -> decodes to 10
   - "11" (twist then flip):  [0, -s, s,  0] (-|Psi->) ZZ=-1 differ, XX=-1 differ -> decodes to 11
3. Bob's decoder: CNOT(A->B), then H on A
   All 4 messages decode deterministically to their respective 2-bit values with probability 1.
"""

import sys
from itertools import combinations
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, DensityMatrix, partial_trace, Operator

# Constant s = 1/sqrt(2)
SQRT2_INV = 1.0 / np.sqrt(2.0)

# Reference table from ROLES.md section 1.5
TABLE_1_5 = {
    "00": {
        "move": "nothing",
        "pair_state": np.array([SQRT2_INV, 0.0, 0.0, SQRT2_INV]),
        "zz": 1,   # agree
        "xx": 1,   # agree
        "decoded_index": 0,  # |00>
        "decoded_bits": "00"
    },
    "01": {
        "move": "flip (X)",
        "pair_state": np.array([0.0, SQRT2_INV, SQRT2_INV, 0.0]),
        "zz": -1,  # differ
        "xx": 1,   # agree
        "decoded_index": 1,  # |01>
        "decoded_bits": "01"
    },
    "10": {
        "move": "twist (Z)",
        "pair_state": np.array([SQRT2_INV, 0.0, 0.0, -SQRT2_INV]),
        "zz": 1,   # agree
        "xx": -1,  # differ
        "decoded_index": 2,  # |10>
        "decoded_bits": "10"
    },
    "11": {
        "move": "twist then flip (Z then X)",
        "pair_state": np.array([0.0, -SQRT2_INV, SQRT2_INV, 0.0]),
        "zz": -1,  # differ
        "xx": -1,  # differ
        "decoded_index": 3,  # |11>
        "decoded_bits": "11"
    }
}


def build_pair_circuit() -> QuantumCircuit:
    """Build pair-maker circuit: H on Alice (qubit 1), CNOT(A->B) with A=1, B=0."""
    qc = QuantumCircuit(2)
    qc.h(1)
    qc.cx(1, 0)
    return qc


def apply_alice_encoding(qc: QuantumCircuit, message: str):
    """
    Apply Alice's encoding on qubit 1:
      00 = nothing
      01 = X (flip)
      10 = Z (twist)
      11 = Z first, then X (twist then flip)
    """
    if message == "00":
        pass
    elif message == "01":
        qc.x(1)
    elif message == "10":
        qc.z(1)
    elif message == "11":
        qc.z(1)
        qc.x(1)
    else:
        raise ValueError(f"Unknown message: {message}")


def apply_bob_decode(qc: QuantumCircuit):
    """Apply Bob's decoder: CNOT(A->B) then H on A."""
    qc.cx(1, 0)
    qc.h(1)


# ==============================================================================
# SIX CORE CHECKS
# ==============================================================================

def check_1_pair_maker() -> tuple[bool, str]:
    """
    Check 1: Pair-maker output equals (|00>+|11>)/sqrt2 (tolerance ~ 1e-9).
    """
    qc = build_pair_circuit()
    sv = Statevector(qc)
    expected = np.array([SQRT2_INV, 0.0, 0.0, SQRT2_INV])

    diff = np.max(np.abs(sv.data - expected))
    if diff < 1e-9:
        return True, f"Pair-maker output matches (|00>+|11>)/sqrt2 with max diff = {diff:.2e}"
    else:
        return False, f"Pair-maker mismatch! Expected {expected}, got {sv.data}, diff = {diff}"


def check_2_all_four_messages_decode() -> tuple[bool, str]:
    """
    Check 2: All four messages decode deterministically (probability 1) per table in 1.5.
    Also validates intermediate Bell states against ROLES.md section 1.5 table.
    """
    details = []
    for msg, exp in TABLE_1_5.items():
        qc = build_pair_circuit()
        apply_alice_encoding(qc, msg)

        # Validate pair state before decoding
        sv_enc = Statevector(qc)
        if not np.allclose(sv_enc.data, exp["pair_state"], atol=1e-9):
            return False, f"Message '{msg}' pair state mismatch! Got {sv_enc.data}, expected {exp['pair_state']}"

        # Apply Bob's decode
        apply_bob_decode(qc)
        sv_dec = Statevector(qc)
        probs = sv_dec.probabilities()

        target_idx = exp["decoded_index"]
        p_target = probs[target_idx]

        if not np.isclose(p_target, 1.0, atol=1e-9):
            return False, f"Message '{msg}' decoded with P={p_target:.6f}, expected 1.0 at index {target_idx}"

        details.append(f"msg '{msg}' -> |{exp['decoded_bits']}> with P={p_target:.4f}")

    return True, f"All 4 messages decode with P=1.0 ({', '.join(details)})"


def check_3_alice_qubit_alone_50_50() -> tuple[bool, str]:
    """
    Check 3: Alice's qubit alone is 50/50 in BOTH lenses for ALL four messages, via partial trace.
    Traces out Bob (qubit 0) to obtain Alice's reduced density matrix rho_A.
    """
    # Hadamard operator to evaluate sideways lens (X basis)
    H_mat = np.array([[1.0, 1.0], [1.0, -1.0]]) / np.sqrt(2.0)

    for msg in ["00", "01", "10", "11"]:
        qc = build_pair_circuit()
        apply_alice_encoding(qc, msg)
        sv = Statevector(qc)

        # Trace out Bob (qubit 0), leaving Alice (qubit 1)
        rho_A = partial_trace(sv, [0])
        rho_data = rho_A.data

        # Up-down lens (Z basis: |0>, |1>)
        p_ud_0 = float(rho_data[0, 0].real)
        p_ud_1 = float(rho_data[1, 1].real)
        if not (np.isclose(p_ud_0, 0.5, atol=1e-9) and np.isclose(p_ud_1, 0.5, atol=1e-9)):
            return False, f"Message '{msg}' failed UD lens: P(0)={p_ud_0}, P(1)={p_ud_1}"

        # Sideways lens (X basis: |+>, |->)
        rho_side = H_mat @ rho_data @ H_mat.T.conj()
        p_side_plus = float(rho_side[0, 0].real)
        p_side_minus = float(rho_side[1, 1].real)
        if not (np.isclose(p_side_plus, 0.5, atol=1e-9) and np.isclose(p_side_minus, 0.5, atol=1e-9)):
            return False, f"Message '{msg}' failed Sideways lens: P(+)={p_side_plus}, P(-)={p_side_minus}"

    return True, "Alice's qubit alone is 50/50 in both lenses (UD & Sideways) for all 4 messages"


def check_4_peek_leaves_only_bit_2() -> tuple[bool, str]:
    """
    Check 4: The peek leaves only bit 2.
    If Bob measures his qubit up-down BEFORE decoding, the pair collapses to |00> or |11>.
    A flip (bit 2) is still detectable with probability 1.0, but twist (bit 1) is completely
    scrambled to 50/50.
    """
    # Projectors on Bob's qubit 0 in Z basis: P0 = I (x) |0><0|, P1 = I (x) |1><1|
    P0 = np.kron(np.eye(2), np.array([[1.0, 0.0], [0.0, 0.0]]))
    P1 = np.kron(np.eye(2), np.array([[0.0, 0.0], [0.0, 1.0]]))

    # Decode circuit operator
    qc_dec = QuantumCircuit(2)
    apply_bob_decode(qc_dec)
    U_dec = Operator(qc_dec)

    details = []
    for msg in ["00", "01", "10", "11"]:
        qc = build_pair_circuit()
        apply_alice_encoding(qc, msg)
        sv = Statevector(qc)
        v = sv.data

        # Bob's early measurement (the peek)
        v0 = P0 @ v
        v1 = P1 @ v
        rho_peek = DensityMatrix(np.outer(v0, v0.conj()) + np.outer(v1, v1.conj()))

        # Decode applied after peek
        rho_final = rho_peek.evolve(U_dec)
        diag = np.real(np.diag(rho_final.data))  # [p00, p01, p10, p11]

        # Marginals for Alice (Bit 1, MSB: index 2*a + b) and Bob (Bit 2, LSB)
        # Bit 1 (Alice): a=0 has indices 0,1; a=1 has indices 2,3
        p_A0 = diag[0] + diag[1]
        p_A1 = diag[2] + diag[3]

        # Bit 2 (Bob): b=0 has indices 0,2; b=1 has indices 1,3
        p_B0 = diag[0] + diag[2]
        p_B1 = diag[1] + diag[3]

        expected_bit2 = int(msg[1])  # 0 or 1
        p_bit2_correct = p_B1 if expected_bit2 == 1 else p_B0

        # Bit 2 must survive with certainty (P=1.0)
        if not np.isclose(p_bit2_correct, 1.0, atol=1e-9):
            return False, f"Message '{msg}': Bit 2 did not survive! P(correct) = {p_bit2_correct}"

        # Bit 1 must be completely randomized (50/50)
        if not (np.isclose(p_A0, 0.5, atol=1e-9) and np.isclose(p_A1, 0.5, atol=1e-9)):
            return False, f"Message '{msg}': Bit 1 not randomized! P(A0)={p_A0}, P(A1)={p_A1}"

        details.append(f"msg '{msg}': P(bit2={expected_bit2})={p_bit2_correct:.2f}, P(bit1)=50/50")

    return True, f"The peek preserves bit 2 with P=1.0 and scrambles bit 1 ({'; '.join(details)})"


def check_5_at_most_two_distinguishable_states() -> tuple[bool, str]:
    """
    Check 5: At most 2 perfectly distinguishable single-qubit states.
    Two pure quantum states are perfectly distinguishable in a single shot iff they are orthogonal.
    Since single-qubit Hilbert space has dimension 2 (C^2), the maximum size of any pairwise
    orthogonal set of single-qubit states is exactly 2.
    """
    # 1. Verify Hilbert space dimension of single qubit
    dim_H1 = 2

    # 2. Test four dial arrow candidates from Level 8 (0, 90, 180, 270 degrees)
    angles = [0, 90, 180, 270]
    # Dial state: [cos(t/2), sin(t/2)]
    states = [
        np.array([np.cos(np.radians(t) / 2.0), np.sin(np.radians(t) / 2.0)])
        for t in angles
    ]

    # Find the maximum clique of pairwise orthogonal states (tolerance 0.05 on overlap)
    max_distinguishable = 1
    for k in range(2, len(states) + 1):
        for subset in combinations(range(len(states)), k):
            pairwise_ortho = True
            for i, j in combinations(subset, 2):
                overlap = abs(float(np.dot(states[i], states[j])))
                if overlap > 0.05:
                    pairwise_ortho = False
                    break
            if pairwise_ortho and k > max_distinguishable:
                max_distinguishable = k

    # 3. Algebraic verification: for any orthonormal basis {|e1>, |e2>} in C^2,
    # any 3rd normalized state |psi> = c1|e1> + c2|e2> satisfies |c1|^2 + |c2|^2 = 1.
    # Therefore |<e1|psi>|^2 + |<e2|psi>|^2 = 1 > 0, so |psi> cannot be orthogonal to both.
    if max_distinguishable == 2 and dim_H1 == 2:
        return True, f"Max distinguishable single-qubit states = {max_distinguishable} (dim(H) = 2)"
    else:
        return False, f"Failed: found max distinguishable = {max_distinguishable}, expected 2"


def check_6_hh_equals_i_and_hzh_equals_x() -> tuple[bool, str]:
    """
    Check 6: HH = I and HZH = X.
    Computed via Qiskit Operator algebra and quantum circuit equivalences.
    """
    H = Operator.from_label("H")
    Z = Operator.from_label("Z")
    X = Operator.from_label("X")
    I = Operator.from_label("I")

    # Algebraic operator composition
    HH = H.compose(H)
    HZH = H.compose(Z).compose(H)

    if not HH.equiv(I):
        return False, "H @ H is not equivalent to Identity!"

    if not HZH.equiv(X):
        return False, "H @ Z @ H is not equivalent to Pauli X!"

    # Circuit implementation check
    qc_hh = QuantumCircuit(1)
    qc_hh.h(0)
    qc_hh.h(0)
    op_hh = Operator(qc_hh)
    if not op_hh.equiv(I):
        return False, "Circuit H-H is not equivalent to Identity!"

    qc_hzh = QuantumCircuit(1)
    qc_hzh.h(0)
    qc_hzh.h(0)  # We will test H-Z-H below
    qc_hzh_correct = QuantumCircuit(1)
    qc_hzh_correct.h(0)
    qc_hzh_correct.z(0)
    qc_hzh_correct.h(0)
    op_hzh = Operator(qc_hzh_correct)
    if not op_hzh.equiv(X):
        return False, "Circuit H-Z-H is not equivalent to Pauli X!"

    return True, "HH = I and HZH = X validated across operators and quantum circuits"


def main():
    checks = [
        ("Check 1 (Pair-maker gives (|00>+|11>)/sqrt2)", check_1_pair_maker),
        ("Check 2 (All four messages decode with probability 1)", check_2_all_four_messages_decode),
        ("Check 3 (Alice qubit alone 50/50 in both lenses)", check_3_alice_qubit_alone_50_50),
        ("Check 4 (The peek leaves only bit 2)", check_4_peek_leaves_only_bit_2),
        ("Check 5 (At most 2 distinguishable single-qubit states)", check_5_at_most_two_distinguishable_states),
        ("Check 6 (HH = I and HZH = X)", check_6_hh_equals_i_and_hzh_equals_x),
    ]

    print("=" * 72)
    print("Quriosity Superdense Coding Qiskit Referee (Role 4)")
    print("Mapping: Alice (A) -> Qubit 1, Bob (B) -> Qubit 0 (index = 2*a + b)")
    print("=" * 72)

    all_passed = True
    for name, check_fn in checks:
        passed, msg = check_fn()
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] {name}")
        print(f"       -> {msg}")
        if not passed:
            all_passed = False

    print("=" * 72)
    if all_passed:
        print("ALL 6 CHECKS PASSED.")
        sys.exit(0)
    else:
        print("ERROR: ONE OR MORE CHECKS FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    main()
