// The Senior-Level (L4) Mastery Plan: 4 parts, 29 weeks, 6 lessons a week.
// Lesson IDs are <Week>-D<day>, e.g. "A1-D1". Each lesson has its topic and,
// where the plan gives one, the L4 (senior-level) target. Part D weeks carry
// one L4 target for the whole week.
// Source: the "Senior-Level (L4) Mastery Plan" doc (5 Nov 2026).

export const DEFAULT_START = "2026-11-09";

export const LEVELS = [
  { value: 1, short: "L1", label: "L1 Basic", what: "Define it and draw it" },
  { value: 2, short: "L2", label: "L2 Applied", what: "Build other things with it" },
  { value: 3, short: "L3", label: "L3 Design", what: "Solve design problems" },
  { value: 4, short: "L4", label: "L4 Senior", what: "Real-silicon behaviour, failures, how it's tested on ATE" },
];

// [week id, title, week L4 (Part D only), lessons: [topic, l4?]]
const RAW = {
  A: {
    title: "Digital",
    weeks: [
      ["A1", "Number systems & logic", "", [
        ["Binary, hex, BCD, Gray code", "Why Gray code is used for FIFO pointers crossing clock domains"],
        ["Signed numbers, 2's complement, overflow", "Overflow detection logic, saturating arithmetic"],
        ["Gates and universal gates", "Why NAND is preferred in CMOS; gate count vs delay trade-offs"],
        ["Boolean algebra, De Morgan, consensus theorem", "Logic minimisation for speed vs area"],
        ["K-maps (up to 5–6 variables), don't-cares", "Hazard-free covers"],
        ["Quine–McCluskey + week quiz", ""],
      ]],
      ["A2", "Combinational design", "", [
        ["Adders: half, full, ripple carry", "Critical path, delay grows with width"],
        ["Fast adders: carry look-ahead, carry select, carry save", "When each is chosen"],
        ["Mux: gates from mux, Shannon expansion", "Transmission-gate mux, glitch-free clock mux"],
        ["Decoders, encoders, priority encoders", "One-hot decoding, address decoding in memories"],
        ["Comparators, parity, multipliers (array, Booth)", "Multiplier delay and area"],
        ["Static and dynamic hazards, glitches + week quiz", ""],
      ]],
      ["A3", "Sequential building blocks", "", [
        ["SR, D latch; latch vs flip-flop", "Latch-based design and time borrowing"],
        ["D, JK, T flip-flops; conversions", "Master–slave flip-flop at transistor level"],
        ["Registers, shift registers, LFSR", "LFSR as a pattern generator in BIST"],
        ["Asynchronous counters", "Why ripple counters cause glitches in decoded outputs"],
        ["Synchronous counters, mod-N, Johnson and ring", "Self-correcting counters"],
        ["Frequency dividers (÷3 with 50% duty) + week quiz", ""],
      ]],
      ["A4", "State machines", "", [
        ["Moore vs Mealy", "Output glitches and registered outputs"],
        ["Sequence detectors, overlapping and non-overlapping", ""],
        ["State encoding: binary, Gray, one-hot", "Area vs speed vs power"],
        ["State minimisation; unreachable and lock-up states", ""],
        ["Real FSMs: traffic light, vending machine, UART receiver", ""],
        ["Week quiz", ""],
      ]],
      ["A5", "Timing", "", [
        ["Setup, hold, clock-to-Q, propagation and contamination delay", ""],
        ["Max frequency; setup and hold slack", "Fixing setup vs fixing hold violations"],
        ["Clock skew and jitter", "Useful skew; why hold is checked at the same edge"],
        ["Metastability, MTBF, two-flip-flop synchronisers", ""],
        ["Clock domain crossing: handshakes, async FIFOs, Gray pointers", ""],
        ["Clock gating, reset strategies + week quiz", ""],
      ]],
      ["A6", "Memories, Verilog & systems", "", [
        ["SRAM 6T cell, DRAM cell, ROM, flash", "Read and write margins"],
        ["Verilog: modules, assign, always, blocking vs non-blocking", "Race conditions"],
        ["Verilog: FSMs, counters, testbenches", "What synthesises and what doesn't"],
        ["Serial protocols: UART, SPI, I2C", "Timing diagrams and failure modes"],
        ["Microprocessor basics: datapath, pipelining, hazards", ""],
        ["Part A checkpoint", ""],
      ]],
    ],
  },
  B: {
    title: "Analog",
    weeks: [
      ["B1", "Devices", "", [
        ["PN junction, diode equation, Zener", "ESD protection diodes on IC pins"],
        ["Rectifiers, clippers, clampers", "Ripple and diode reverse recovery"],
        ["BJT regions and biasing", "Thermal runaway, VBE temperature coefficient"],
        ["MOSFET regions, Vth, gm, ro", "Channel-length modulation, body effect"],
        ["MOSFET second-order effects: subthreshold, leakage vs temperature, velocity saturation", ""],
        ["Small-signal models + week quiz", ""],
      ]],
      ["B2", "CMOS circuits", "", [
        ["CMOS inverter: transfer curve, noise margins", "Switching threshold and PMOS/NMOS sizing"],
        ["NAND, NOR, complex gates at transistor level", "Why stacks are slow"],
        ["Power: dynamic, short-circuit, leakage", "Why IDDQ rises with temperature"],
        ["Transmission gates, tri-state, dynamic logic", "Charge sharing"],
        ["Latch-up and ESD", "Guard rings, test for latch-up"],
        ["Week quiz", ""],
      ]],
      ["B3", "Amplifiers", "", [
        ["Common source, common gate, source follower", "Gain, output resistance"],
        ["Current mirrors: simple, cascode, Wilson", "Mismatch and output resistance"],
        ["Differential pair", "CMRR, offset from mismatch"],
        ["Two-stage op-amp structure", "Miller compensation"],
        ["Frequency response, poles and zeros", "Dominant pole"],
        ["Week quiz", ""],
      ]],
      ["B4", "Op-amps & feedback", "", [
        ["Ideal op-amp circuits: inverting, non-inverting, summing, integrator, differentiator", ""],
        ["Non-idealities: offset, bias current, GBW, slew rate, CMRR, PSRR", "How each is measured on ATE"],
        ["Feedback topologies", "Loop gain; why feedback lowers distortion"],
        ["Stability: phase margin, capacitive loads", "Why a big output capacitor oscillates"],
        ["Comparators, Schmitt triggers, hysteresis", ""],
        ["Active filters (Sallen-Key) + week quiz", ""],
      ]],
      ["B5", "Power management", "", [
        ["Linear regulators and LDOs", "Dropout, load and line regulation"],
        ["LDO stability and PSRR", "Why an LDO needs a minimum output capacitor"],
        ["Bandgap reference", "PTAT and CTAT cancellation, why about 1.2 V"],
        ["Switching converters: buck, boost", "Ripple, efficiency, inductor choice"],
        ["Oscillators and PLL basics", "Phase noise, jitter, lock time"],
        ["Week quiz", ""],
      ]],
      ["B6", "Data converters & noise", "", [
        ["Sampling, Nyquist, aliasing, anti-alias filters", ""],
        ["ADC types: flash, SAR, sigma-delta, pipeline", "Speed vs resolution trade-offs"],
        ["DAC types: R-2R, current steering", ""],
        ["Static specs: offset, gain error, INL, DNL", "Histogram test on ATE"],
        ["Dynamic specs: SNR, THD, SINAD, ENOB, SFDR", "Coherent sampling and FFT test"],
        ["Noise: thermal, flicker, kT/C + Part B checkpoint", ""],
      ]],
    ],
  },
  C: {
    title: "Test & DFT",
    weeks: [
      ["C1", "Faults & scan", "", [
        ["Defects, faults, yield, DPPM", "Why test escapes cost more than yield loss"],
        ["Stuck-at faults, controllability, observability, coverage", ""],
        ["ATPG basics (D-algorithm idea)", "Why some faults are untestable"],
        ["Scan flip-flops and chains: shift and capture", "Scan shift power, chain failures and how to diagnose them"],
        ["At-speed testing: transition and path-delay faults", "Launch-on-capture vs launch-on-shift"],
        ["Scan compression + week quiz", ""],
      ]],
      ["C2", "JTAG, BIST & the ATE view", "", [
        ["JTAG: TAP pins, the 16-state TAP controller, instructions", ""],
        ["Boundary scan: board-level interconnect test", ""],
        ["Memory faults and MBIST March algorithms", ""],
        ["LBIST, IDDQ testing", "Why IDDQ is harder at advanced nodes"],
        ["How scan, JTAG and trims run on the V93K: patterns, timing, failure logs", ""],
        ["Wafer sort vs final test, binning, Cpk, guardbands + Part C checkpoint", ""],
      ]],
    ],
  },
  D: {
    title: "B.Tech EEE refresh",
    weeks: [
      ["D1", "Network theory", "Choosing the fastest method for any circuit, and step-response intuition without equations", [
        ["KVL/KCL, mesh and nodal analysis"], ["Thevenin, Norton, superposition, maximum power transfer"], ["Transients in RC, RL, RLC"], ["Two-port networks"], ["Resonance; Laplace in circuits"], ["Review + week quiz"],
      ]],
      ["D2", "Signals & systems", "Reading a pole-zero plot to predict time and frequency behaviour", [
        ["Signal types and properties"], ["LTI systems and convolution"], ["Fourier series"], ["Fourier transform"], ["Laplace and Z-transform"], ["Sampling + week quiz"],
      ]],
      ["D3", "Control systems I", "Why adding a pole slows a system, and what each term of PID does", [
        ["Transfer functions"], ["Block diagrams and signal flow graphs"], ["Time response (first and second order)"], ["Steady-state error"], ["Routh-Hurwitz"], ["PID intuition + week quiz"],
      ]],
      ["D4", "Control systems II", "Designing a lead compensator and linking phase margin to op-amp and LDO stability", [
        ["Root locus"], ["Bode plots"], ["Nyquist"], ["Gain and phase margin"], ["Compensators (lead, lag)"], ["State-space basics + week quiz"],
      ]],
      ["D5", "Electromagnetics", "Impedance matching, reflections and why it matters on load boards", [
        ["Vector calculus"], ["Coulomb and Gauss"], ["Biot–Savart and Ampère"], ["Maxwell's equations"], ["Wave propagation"], ["Transmission lines + week quiz"],
      ]],
      ["D6", "Measurements & instrumentation", "Guarding and force-sense: exactly how the tester measures small currents", [
        ["Errors and accuracy"], ["Bridges"], ["Analog and digital meters"], ["CRO and DSO"], ["Transducers"], ["Kelvin (4-wire) measurement + week quiz"],
      ]],
      ["D7", "Machines I", "Transformer losses and why the core is laminated", [
        ["Magnetic circuits"], ["Transformers: equivalent circuit"], ["Transformers: tests, efficiency, regulation"], ["DC generators"], ["DC motors"], ["DC motor speed control + week quiz"],
      ]],
      ["D8", "Machines II", "Why induction motors draw high starting current, and how VFDs fix it", [
        ["Induction motors: torque–slip"], ["Induction motors: starting"], ["Induction motors: speed control"], ["Synchronous machines: V-curves"], ["Synchronous machines: power angle"], ["Special machines (stepper, BLDC) + week quiz"],
      ]],
      ["D9", "Power systems I", "Ferranti effect and reactive power control", [
        ["Generation"], ["Transmission line parameters"], ["Transmission line models"], ["Per-unit system"], ["Cables and insulators"], ["Ferranti effect, reactive power + week quiz"],
      ]],
      ["D10", "Power systems II", "Why a single line-to-ground fault is the most common", [
        ["Load flow formulation"], ["Gauss-Seidel load flow"], ["Newton-Raphson load flow"], ["Symmetrical faults"], ["Symmetrical components"], ["Unsymmetrical faults + week quiz"],
      ]],
      ["D11", "Power systems III", "Relay coordination logic", [
        ["Stability: swing equation"], ["Equal-area criterion"], ["Protection: relays"], ["Circuit breakers"], ["CTs and PTs"], ["Economic dispatch + week quiz"],
      ]],
      ["D12", "Power electronics", "Why GaN and SiC switch faster, and what that means for testing them", [
        ["Power devices: SCR, MOSFET, IGBT"], ["Wide-bandgap devices: GaN, SiC"], ["Rectifiers"], ["Choppers"], ["Inverters (PWM)"], ["Cycloconverters + week quiz"],
      ]],
      ["D13", "High voltage & utilisation", "Insulation testing and partial discharge", [
        ["Breakdown in gases"], ["Breakdown in liquids and solids"], ["HV generation and measurement"], ["Electric drives"], ["Heating and welding"], ["Traction + week quiz"],
      ]],
      ["D14", "Microprocessors & microcontrollers", "Interrupt latency, memory-mapped I/O and how firmware is tested on hardware", [
        ["8085 architecture"], ["8086 and addressing modes"], ["Interrupts"], ["8051"], ["ARM Cortex-M"], ["Your STM32 bare-metal work + week quiz"],
      ]],
      ["D15", "Communication & DSP", "Windowing and spectral leakage in FFT-based ATE tests", [
        ["AM, FM, PM"], ["Noise in communication"], ["Digital modulation: ASK, FSK, PSK, QAM"], ["DFT and FFT"], ["FIR and IIR filters"], ["Radar basics (FMCW) + week quiz"],
      ]],
    ],
  },
};

export const PARTS = Object.entries(RAW).map(([id, p]) => ({
  id,
  title: p.title,
  weeks: p.weeks.map(([wid, title, weekL4, lessons]) => ({
    id: wid,
    part: id,
    title,
    l4: weekL4,
    lessons: lessons.map(([topic, l4 = ""], i) => ({
      id: `${wid}-D${i + 1}`,
      week: wid,
      part: id,
      day: i + 1,
      topic,
      l4: l4 || weekL4,
      quizDay: i === 5,
    })),
  })),
}));

export const WEEKS = PARTS.flatMap((p) => p.weeks);
export const LESSONS = WEEKS.flatMap((w) => w.lessons);
export const LESSON = Object.fromEntries(LESSONS.map((l, i) => [l.id, { ...l, index: i }]));
export const WEEK = Object.fromEntries(WEEKS.map((w) => [w.id, w]));
export const PART = Object.fromEntries(PARTS.map((p) => [p.id, p]));

// Part checkpoints: pass each question out loud, without notes.
export const CHECKPOINTS = {
  A: [
    "Implement f(A,B,C,D) = Σm(1,3,4,7,9,12,14,15) with one 4:1 mux and minimum extra gates.",
    "Design a glitch-free clock mux and explain why a plain mux glitches.",
    "Design a divide-by-3 counter with a 50% duty cycle.",
    "Given Tclk-q = 0.2 ns, Tlogic = 2.5 ns, Tsetup = 0.3 ns and skew 0.2 ns, find Fmax. Then fix a hold violation without slowing the clock.",
    "Why do async FIFO pointers use Gray code?",
    "One-hot vs binary FSM encoding: when do you pick each?",
    "Write Verilog for a 1011 sequence detector and explain the blocking vs non-blocking choices.",
  ],
  B: [
    "Why is the PMOS in an inverter wider than the NMOS? What happens to the switching point if it isn't?",
    "Why does IDDQ fail at hot on some units but not others?",
    "Explain Miller compensation and why it lowers bandwidth.",
    "Why does an LDO oscillate with too small an output capacitor?",
    "How does a bandgap reach about 1.2 V regardless of temperature?",
    "How do you test an ADC's INL and DNL on ATE? Why does an FFT test need coherent sampling?",
  ],
  C: [
    "A scan chain fails on the tester. How do you find which flip-flop is broken?",
    "Launch-on-capture vs launch-on-shift: trade-offs.",
    "Walk through the TAP state machine from reset to shifting a data register.",
    "Why can a part pass functional test but fail IDDQ?",
    "Coverage is 99% stuck-at but DPPM is high. What is missing?",
  ],
  D: [
    "Read a Bode plot and give the phase margin; link it to an op-amp's stability.",
    "Explain 4-wire (Kelvin) measurement and why the tester uses it.",
    "Why is a single line-to-ground fault the most common, and how is it calculated?",
    "GaN vs Si MOSFET: what changes in switching and in testing?",
    "Why does an FFT need windowing when the sampling isn't coherent?",
  ],
};

// The daily 2 hours.
export const PHASES = [
  { id: "learn", label: "Learn", minutes: 60, what: "Say “Lesson <ID>” to Claude: L1 → L4 with drawings." },
  { id: "practise", label: "Practise", minutes: 45, what: "5–8 problems, at least two at L3 or L4, on paper without notes." },
  { id: "log", label: "Log", minutes: 15, what: "One line on what clicked; add every mistake to the weak list." },
];
