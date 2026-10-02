// "Fact of the day": a progressive electronics course, one lesson per day,
// starting from the very basics. Day 1 = COURSE_START; each day unlocks the next.

export const COURSE_START = "2026-10-03";

export const UNITS = [
  "Foundations",
  "Passive components",
  "Semiconductors",
  "Digital electronics",
  "Measurement & test",
];

export const FACTS = [
  // ---------- Unit 1: Foundations ----------
  {
    unit: 0,
    title: "Electric charge",
    body: "Everything electrical starts with charge. Electrons carry a tiny negative charge and protons an equal positive one. Opposite charges attract and like charges repel; that push and pull is what makes electricity do work.",
    formula: "1 coulomb (C) ≈ the charge of 6.24 × 10¹⁸ electrons",
    example: "A single electron carries about 1.6 × 10⁻¹⁹ C, so it takes an enormous number of them to make one coulomb.",
  },
  {
    unit: 0,
    title: "Current — the flow of charge",
    body: "Current is how much charge passes a point every second, measured in amperes (A). By convention, current flows from + to −, even though electrons actually drift the other way.",
    formula: "I = Q / t   (amps = coulombs ÷ seconds)",
    example: "If 2 C of charge passes through a wire in 4 s, the current is 0.5 A (500 mA).",
  },
  {
    unit: 0,
    title: "Voltage — the push",
    body: "Voltage is the electrical 'pressure' between two points: the energy given to each coulomb of charge. It's always measured between two points, never at one point on its own.",
    formula: "V = W / Q   (volts = joules per coulomb)",
    example: "A 9 V battery gives every coulomb that passes through it 9 joules of energy.",
  },
  {
    unit: 0,
    title: "Resistance",
    body: "Resistance is how much a material opposes current, measured in ohms (Ω). It depends on the material, length (longer = more), cross-section (thicker = less) and temperature.",
    formula: "R = ρ × L / A",
    example: "Doubling a wire's length doubles its resistance; doubling its thickness (area) halves it.",
  },
  {
    unit: 0,
    title: "Ohm's law",
    body: "The single most-used equation in electronics: the voltage across a resistor equals the current through it times its resistance. Know any two and you can find the third.",
    formula: "V = I × R",
    example: "5 V across a 1 kΩ resistor drives 5 / 1000 = 5 mA through it.",
  },
  {
    unit: 0,
    title: "Power",
    body: "Power is the rate at which energy is used, in watts (W). Resistors turn electrical power into heat, which is why they have power ratings (¼ W, ½ W …).",
    formula: "P = V × I = I² × R = V² / R",
    example: "A 100 Ω resistor carrying 50 mA dissipates 0.05² × 100 = 0.25 W — right at the limit of a ¼ W part.",
  },
  {
    unit: 0,
    title: "Conductors, insulators and semiconductors",
    body: "Conductors (copper, silver) have many free electrons. Insulators (glass, plastic) have almost none. Semiconductors (silicon, germanium) sit in between — and their conductivity can be controlled, which is what makes chips possible.",
    formula: "Copper ≈ 1.7 × 10⁻⁸ Ω·m   ·   pure silicon ≈ 2 × 10³ Ω·m",
    example: "Pure silicon is a poor conductor, but adding a few parts per million of impurities can change its conductivity by many orders of magnitude.",
  },
  {
    unit: 0,
    title: "Resistors in series",
    body: "In series, components share the same current, one after another. Their resistances simply add, and the supply voltage is split between them.",
    formula: "R_total = R1 + R2 + R3 …",
    example: "1 kΩ + 2.2 kΩ in series = 3.2 kΩ.",
  },
  {
    unit: 0,
    title: "Resistors in parallel",
    body: "In parallel, components share the same voltage and the current splits between the paths. The total resistance is always smaller than the smallest resistor.",
    formula: "1/R_total = 1/R1 + 1/R2   ·   two resistors: R1·R2 / (R1 + R2)",
    example: "Two 1 kΩ resistors in parallel = 500 Ω.",
  },
  {
    unit: 0,
    title: "Kirchhoff's current law (KCL)",
    body: "Charge can't pile up at a junction, so the total current flowing into a node equals the total flowing out. This is conservation of charge.",
    formula: "Σ I_in = Σ I_out",
    example: "If 3 mA enters a node and 1 mA leaves by one branch, the other branch must carry 2 mA.",
  },
  {
    unit: 0,
    title: "Kirchhoff's voltage law (KVL)",
    body: "Go around any closed loop and the voltage rises and drops add up to zero. Energy given by sources is used up by the components in the loop.",
    formula: "Σ V around a loop = 0",
    example: "A 9 V battery with two resistors in series: if one drops 4 V, the other must drop 5 V.",
  },
  {
    unit: 0,
    title: "The voltage divider",
    body: "Two series resistors give a fraction of the input voltage at their midpoint. It's how you scale a signal down, set a bias point, or read a sensor.",
    formula: "V_out = V_in × R2 / (R1 + R2)",
    example: "5 V with R1 = R2 = 10 kΩ gives 2.5 V at the middle.",
  },
  {
    unit: 0,
    title: "DC and AC",
    body: "Direct current (DC) flows one way at a steady level — batteries, chip supplies. Alternating current (AC) reverses direction periodically — the mains supply, audio, radio signals.",
    formula: "AC: v(t) = V_peak × sin(2πft)",
    example: "Indian mains is about 230 V AC at 50 Hz; a phone charger turns it into about 5 V DC.",
  },
  {
    unit: 0,
    title: "Frequency and period",
    body: "Frequency is how many cycles happen per second, in hertz (Hz). The period is the time for one cycle. They are simply reciprocals.",
    formula: "f = 1 / T",
    example: "50 Hz mains has a 20 ms period; a 1 GHz clock has a 1 ns period.",
  },
  {
    unit: 0,
    title: "RMS — the 'useful' AC value",
    body: "The RMS (root-mean-square) value of an AC wave is the DC voltage that would heat a resistor equally. Mains '230 V' is an RMS value.",
    formula: "Sine wave: V_rms = V_peak / √2 ≈ 0.707 × V_peak",
    example: "230 V RMS mains actually peaks at about 325 V.",
  },

  // ---------- Unit 2: Passive components ----------
  {
    unit: 1,
    title: "The capacitor",
    body: "Two conductive plates separated by an insulator. It stores energy in an electric field and resists sudden changes in voltage — like a tiny, very fast rechargeable tank.",
    formula: "Q = C × V   (C in farads)",
    example: "A 100 µF capacitor charged to 5 V holds 0.0005 C of charge.",
  },
  {
    unit: 1,
    title: "Energy in a capacitor",
    body: "A charged capacitor stores energy that it can release quickly — the reason camera flashes and decoupling capacitors work.",
    formula: "E = ½ × C × V²",
    example: "A 1000 µF capacitor at 12 V stores ½ × 0.001 × 144 = 0.072 J.",
  },
  {
    unit: 1,
    title: "The RC time constant",
    body: "When a capacitor charges through a resistor, it follows a curve. After one time constant (τ) it reaches about 63% of the final voltage; after about 5τ it's considered fully charged.",
    formula: "τ = R × C",
    example: "10 kΩ with 100 µF gives τ = 1 s, so it's essentially full after about 5 s.",
  },
  {
    unit: 1,
    title: "Capacitors block DC, pass AC",
    body: "Once charged, a capacitor stops DC flowing. AC keeps charging and discharging it, so it passes — more easily at higher frequencies. That opposition is called capacitive reactance.",
    formula: "X_C = 1 / (2πfC)",
    example: "A 1 µF capacitor has about 3.2 kΩ of reactance at 50 Hz but only about 0.16 Ω at 1 MHz.",
  },
  {
    unit: 1,
    title: "Decoupling capacitors",
    body: "Every chip has small capacitors (often 100 nF) right next to its power pins. They supply the brief spikes of current when logic switches, keeping the supply voltage steady.",
    formula: "Typical: 100 nF per power pin + a larger bulk capacitor nearby",
    example: "On a load board or DUT board, missing or badly placed decoupling caps can make good chips fail at speed.",
  },
  {
    unit: 1,
    title: "The inductor",
    body: "A coil of wire that stores energy in a magnetic field. It resists sudden changes in current — the mirror image of a capacitor.",
    formula: "V = L × dI/dt   (L in henries)",
    example: "Switching a 1 mH inductor's current by 1 A in 1 µs produces a 1000 V spike — why relay coils need a flyback diode.",
  },
  {
    unit: 1,
    title: "Inductive reactance",
    body: "An inductor lets DC through easily but opposes AC more as frequency rises. That's why inductors are used to filter out high-frequency noise.",
    formula: "X_L = 2πfL",
    example: "A 10 µH inductor has about 63 Ω of reactance at 1 MHz.",
  },
  {
    unit: 1,
    title: "Impedance",
    body: "Impedance (Z) is the AC version of resistance — it combines resistance with reactance. Because reactance is out of phase, they add like the sides of a right triangle, not directly.",
    formula: "Z = √(R² + (X_L − X_C)²)",
    example: "R = 30 Ω with a net reactance of 40 Ω gives Z = 50 Ω.",
  },
  {
    unit: 1,
    title: "Resonance",
    body: "When an inductor and capacitor's reactances are equal, they cancel. The circuit 'rings' at that frequency — the basis of radio tuning, oscillators and filters.",
    formula: "f₀ = 1 / (2π√(LC))",
    example: "10 µH with 100 pF resonates at about 5 MHz.",
  },
  {
    unit: 1,
    title: "Transformers",
    body: "Two coils sharing a magnetic core. AC in one coil induces AC in the other, scaled by the ratio of turns. Transformers only work with changing current — not DC.",
    formula: "V_s / V_p = N_s / N_p",
    example: "A 20 : 1 transformer turns 230 V AC into about 11.5 V AC.",
  },

  // ---------- Unit 3: Semiconductors ----------
  {
    unit: 2,
    title: "Doping: N-type and P-type",
    body: "Adding a few atoms of phosphorus to silicon gives spare electrons (N-type). Adding boron leaves 'holes' — missing electrons that act like positive carriers (P-type).",
    formula: "Electrons are the majority carrier in N-type; holes in P-type",
    example: "Doping can be as light as one impurity atom per hundred million silicon atoms — and still raise conductivity enormously.",
  },
  {
    unit: 2,
    title: "The PN junction",
    body: "Where P and N silicon meet, carriers cross and cancel, leaving a thin 'depletion region' with no free carriers. That region acts like a one-way gate for current.",
    formula: "Built-in potential in silicon ≈ 0.6–0.7 V",
    example: "This junction is the building block of diodes, LEDs, solar cells and transistors.",
  },
  {
    unit: 2,
    title: "The diode",
    body: "A diode lets current flow one way (forward bias) and blocks it the other way (reverse bias). A silicon diode needs roughly 0.6–0.7 V before it conducts noticeably.",
    formula: "Forward drop: Si ≈ 0.7 V · Schottky ≈ 0.2–0.4 V",
    example: "Put a diode in series with a 5 V supply and the load sees about 4.3 V.",
  },
  {
    unit: 2,
    title: "Rectifiers: AC to DC",
    body: "Diodes turn AC into DC. A half-wave rectifier uses one diode and wastes half the wave; a full-wave bridge of four diodes uses both halves. A capacitor then smooths the bumps.",
    formula: "Bridge output peak ≈ V_peak − 2 × 0.7 V",
    example: "Every phone charger and laptop adapter starts with a rectifier.",
  },
  {
    unit: 2,
    title: "The Zener diode",
    body: "A Zener is designed to conduct in reverse at a precise voltage. Put one across a load (with a series resistor) and it holds the voltage steady — a simple regulator or protection clamp.",
    formula: "Series resistor: R = (V_in − V_Z) / I",
    example: "A 5.1 V Zener with a 12 V supply and 10 mA needs (12 − 5.1) / 0.01 ≈ 690 Ω.",
  },
  {
    unit: 2,
    title: "The LED",
    body: "A light-emitting diode gives off light when forward biased. The colour depends on the semiconductor material, and so does the forward voltage. Always limit an LED's current with a resistor.",
    formula: "R = (V_supply − V_LED) / I_LED",
    example: "A red LED (≈2 V) at 10 mA from 5 V needs (5 − 2) / 0.01 = 300 Ω.",
  },
  {
    unit: 2,
    title: "The bipolar transistor (BJT)",
    body: "A BJT has a base, collector and emitter. A small base current controls a much larger collector current — that's amplification.",
    formula: "I_C = β × I_B   (β often 100–300)",
    example: "With β = 100, a 0.1 mA base current allows up to 10 mA of collector current.",
  },
  {
    unit: 2,
    title: "The transistor as a switch",
    body: "Drive a transistor hard (saturation) and it acts like a closed switch; give it no drive (cut-off) and it's open. This on/off behaviour is the root of all digital logic.",
    formula: "Saturated BJT: V_CE(sat) ≈ 0.1–0.3 V",
    example: "A microcontroller pin can switch a relay or motor through a transistor without supplying the big current itself.",
  },
  {
    unit: 2,
    title: "The MOSFET",
    body: "A MOSFET is controlled by voltage, not current. Voltage on the gate (insulated by a thin oxide) creates a channel between source and drain once it passes the threshold voltage.",
    formula: "Conducts when V_GS > V_th",
    example: "Nearly all of the billions of transistors in a modern chip are MOSFETs.",
  },
  {
    unit: 2,
    title: "CMOS",
    body: "CMOS pairs an N-MOSFET with a P-MOSFET. In any steady state one is off, so almost no current flows — which is why CMOS chips use so little power when idle.",
    formula: "Dynamic power ≈ α × C × V² × f",
    example: "Halving a chip's supply voltage cuts its switching power to roughly a quarter.",
  },

  // ---------- Unit 4: Digital electronics ----------
  {
    unit: 3,
    title: "Binary",
    body: "Digital circuits use just two states — 0 and 1, low and high. Each binary digit (bit) doubles the number of values you can represent.",
    formula: "n bits → 2ⁿ values",
    example: "8 bits (a byte) can hold 256 values, 0 to 255; 1011₂ = 8 + 2 + 1 = 11.",
  },
  {
    unit: 3,
    title: "Logic gates",
    body: "Gates combine bits: AND (1 only if all inputs are 1), OR (1 if any is 1), NOT (flips the input), XOR (1 if the inputs differ). Every computation reduces to these.",
    formula: "A·B (AND) · A+B (OR) · Ā (NOT) · A⊕B (XOR)",
    example: "A half adder — the start of all arithmetic — is just one XOR (sum) and one AND (carry).",
  },
  {
    unit: 3,
    title: "NAND is universal",
    body: "Any logic function can be built using only NAND gates (or only NOR gates). Chip libraries lean on this because NAND is small and fast in CMOS.",
    formula: "NOT A = A NAND A",
    example: "An AND gate is a NAND followed by a NAND-wired-as-NOT: two NAND gates.",
  },
  {
    unit: 3,
    title: "Flip-flops — memory",
    body: "A flip-flop stores one bit. A D flip-flop copies its input (D) to its output (Q) only at the clock edge, and holds it until the next edge. Registers and counters are built from them.",
    formula: "At the rising clock edge: Q ← D",
    example: "A 32-bit register is simply 32 D flip-flops sharing one clock.",
  },
  {
    unit: 3,
    title: "Clocks, setup and hold time",
    body: "Data must be stable for a short time before the clock edge (setup) and after it (hold). Violate either and the flip-flop may capture the wrong value. Timing tests check these margins.",
    formula: "Max clock frequency ≈ 1 / (t_clk→Q + t_logic + t_setup)",
    example: "With 0.2 ns + 0.6 ns + 0.2 ns = 1 ns of path delay, the circuit can run at up to about 1 GHz.",
  },
  {
    unit: 3,
    title: "Logic levels and noise margin",
    body: "Inputs read anything above V_IH as 1 and below V_IL as 0; outputs guarantee at least V_OH for 1 and at most V_OL for 0. The gap between them is the noise margin.",
    formula: "NM_H = V_OH − V_IH   ·   NM_L = V_IL − V_OL",
    example: "These four levels (VIH, VIL, VOH, VOL) appear in every datasheet and are measured on every digital ATE test program.",
  },

  // ---------- Unit 5: Measurement & test ----------
  {
    unit: 4,
    title: "Using a multimeter",
    body: "Measure voltage across a component (in parallel). Measure current by breaking the circuit and putting the meter in series. Measure resistance only with the power off.",
    formula: "Ideal voltmeter: infinite resistance · ideal ammeter: zero resistance",
    example: "Putting a meter set to amps across a battery is a short circuit — it usually blows the meter's fuse.",
  },
  {
    unit: 4,
    title: "The oscilloscope",
    body: "A scope draws voltage against time, so you can see signal shape, timing, rise times and noise. Bandwidth matters: it should be several times your signal's highest frequency.",
    formula: "Rise time ≈ 0.35 / bandwidth",
    example: "A 100 MHz scope can't show edges faster than about 3.5 ns accurately.",
  },
  {
    unit: 4,
    title: "Four-wire (Kelvin) measurement",
    body: "When measuring small resistances, the test leads' own resistance gets in the way. Force current through one pair of wires and sense voltage with a separate pair that carries almost no current.",
    formula: "R = V_sense / I_force   (lead resistance drops out)",
    example: "ATE parametric units use force/sense (Kelvin) connections for precise DC measurements at the DUT pin.",
  },
  {
    unit: 4,
    title: "Continuity (open/short) test",
    body: "The first test in most chip programs. Each pin has protection diodes to the supply rails; forcing a small current and measuring the diode drop (≈0.6 V) proves the pin is connected — not open, not shorted.",
    formula: "Typical: force −100 µA, expect about −0.2 to −0.9 V",
    example: "Reading ~0 V suggests a short; hitting the voltage clamp suggests an open (bad contact or bond wire).",
  },
  {
    unit: 4,
    title: "Input leakage (IIL / IIH)",
    body: "An input should draw almost no current. Leakage tests force the pin low (IIL) and high (IIH) and check the current stays within limits — often under ±1 µA.",
    formula: "Pass if |I_leak| ≤ spec (e.g. 1 µA)",
    example: "High leakage can point to damaged gate oxide or ESD damage, even when the chip still works functionally.",
  },
  {
    unit: 4,
    title: "IDDQ testing",
    body: "A healthy CMOS chip draws only tiny current when idle. IDDQ tests stop the clock in known states and measure supply current; an unusually high reading reveals defects that functional tests miss.",
    formula: "Fail if I_DDQ > limit (often µA–mA, depending on the chip)",
    example: "A bridging defect between two wires can show up only as extra quiescent current.",
  },
  {
    unit: 4,
    title: "Functional test vectors",
    body: "A functional test applies a sequence of input patterns (vectors) at speed and compares each output with the expected value at a strobe time. Each pass/fail is decided per pin, per cycle.",
    formula: "Expected 'H'/'L' compared at the strobe edge",
    example: "On the V93000, patterns plus timing and level specs make up a functional test.",
  },
  {
    unit: 4,
    title: "Shmoo plots",
    body: "A shmoo plot sweeps two conditions — usually supply voltage and clock period — and marks pass/fail at each point. It shows how much margin a chip really has.",
    formula: "X axis: period/frequency · Y axis: VDD · cells: pass/fail",
    example: "A 'wall' of failures at high frequency and low voltage is normal; holes inside the pass region point to a real problem.",
  },
];

// Which lesson is today's (1-based day number) — never beyond the course length.
export function dayNumber(todayISO) {
  const [y, m, d] = COURSE_START.split("-").map(Number);
  const [ty, tm, td] = todayISO.split("-").map(Number);
  const days = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(y, m - 1, d)) / 86400000);
  return Math.max(1, days + 1);
}
