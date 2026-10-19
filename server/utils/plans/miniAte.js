// The full plan for the Mini-ATE project, shown on the project's Plan page.
// Simple formatting: "## " heading, "- " bullet, "**bold**", blank line = gap.
export const MINI_ATE_STAGES = [
  "Plan & block diagram",
  "Bring-up: clock + PC link",
  "Pattern engine (drive)",
  "Strobe & compare",
  "Pattern format + first chip",
  "DUT power & IDD",
  "PMU: DC tests",
  "Test flow, bins, datalog",
  "Shmoo characterisation",
  "Second device (serial)",
  "PCB v2",
  "README, demo, post",
];

export const MINI_ATE_PLAN = `## What it is
A small chip tester you build yourself — a miniature version of a production ATE. Your STM32 Black Pill drives test patterns into a chip's pins with exact timing, reads the chip's answers at a chosen moment, measures voltages and currents on its pins, and a Python program on your laptop runs a full test program and writes a pass/fail datalog.

First chips to test: **74HC00** (NAND gates) and **74HC04** (inverters). Later: **74HC595** (shift register) and a **24C02** I²C EEPROM.

## Why it's worth it
- It's the same job you want, end to end: pattern → timing → levels → DC tests → test flow → bins → datalog → characterisation.
- Every layer is yours, from register-level C to the report — great for interviews.
- It produces real numbers (pattern rate, timing accuracy, measurement accuracy, test time) you can put on a resume.

## How it maps to a production tester
- **Timing set** → a timer sets the period; one edge drives the pins, another edge is the strobe that reads them.
- **Pattern** → a list of vectors in memory, pushed to the pins by DMA (the chip moves data on its own, no software delay).
- **Levels** → the chip runs at a voltage you set (start at 3.3 V).
- **PMU / DC tests** → a DAC + op-amp forces a voltage and the ADC measures the current (continuity, leakage, VOH/VOL).
- **Test flow & bins** → Python sequencer runs tests in order, stops on fail if asked, assigns a bin.
- **Datalog** → STDF file that your ATE log parser can read.
- **Shmoo** → sweep supply voltage against speed and draw the pass/fail grid.

## Hardware (start on a breadboard)
- **STM32F411 Black Pill** (100 MHz) — you have it.
- **8 drive/compare channels** on one GPIO port (PB0–PB7). DUT runs at 3.3 V, so no level shifters needed at first.
- **PC link:** CP2102 USB-to-UART at 921600 baud (USB CDC later, optional).
- **DUT power:** a load switch (P-MOSFET) + **INA219** to switch VDD and measure supply current (IDD).
- **PMU:** **MCP4725** DAC → op-amp buffer (MCP6002) → sense resistor → DUT pin, measured by the STM32's ADC. Note: the F411 has no built-in DAC, so the external one is needed.
- **Pin switching:** CD74HC4067 analogue mux to connect the PMU to one pin at a time.
- **Socket:** 16-pin ZIF socket for DIP chips.
- **For checking your timing:** a cheap 8-channel 24 MHz logic analyser (with PulseView).

## Rough cost
About ₹2,000–2,500 for the breadboard version (CP2102 ₹150, logic analyser ₹600, ZIF ₹150, MCP4725 ₹250, INA219 ₹200, mux ₹150, chips ₹150, op-amps and 0.1% resistors ₹200, wires and board ₹300). PCB later: ₹800–1,500.

## Firmware (bare-metal C, like your blink code)
- Clock at 100 MHz (PLL), GPIO, UART, I²C, ADC — your own register-level drivers, no HAL.
- **Pattern engine:** TIM1 update event → DMA2 writes the next vector to GPIOB->BSRR (sets/clears pins in one write). DMA2 is needed because DMA1 can't reach the GPIO bus on the F4.
- **Strobe:** a TIM1 compare channel later in the same period → DMA2 copies GPIOB->IDR into a capture buffer. Moving the compare value moves the strobe — that's your timing edge.
- **Compare:** after the burst, compare captured vs expected with a mask (X = don't care), record the first fails and the fail count.
- **PMU driver:** set the DAC, settle, average many ADC samples (ADC + DMA), convert to volts/µA with calibration values.
- **Command protocol:** small binary or text commands — LOAD_PATTERN, SET_TIMING, RUN, READ_FAILS, PMU_FORCE_V, PMU_MEASURE, SET_VDD, MEASURE_IDD.

## PC software (Python)
- **Pattern files:** a simple text format — pins, a timing block (period, drive edge, strobe edge) and one vector per line with 0/1 (drive) and L/H/X (expect). Compiled into the bytes the board needs.
- **Test program:** a list of tests per chip — continuity, IDD, functional patterns, VOH/VOL, input leakage — with limits.
- **Runner:** runs the flow, applies limits, assigns bins (1 = pass, others = which test failed).
- **Datalog:** writes STDF (PIR, PTR, FTR, PRR records) plus a readable CSV → feeds your ATE log parser.
- **Shmoo:** sweeps VDD and period, plots the pass/fail grid.

## Phases (these are the project stages)
- **Plan & block diagram** — pin map, blocks, the vector format on paper. Outcome: one-page diagram. (1 weekend)
- **Bring-up: clock + PC link** — 100 MHz clock, UART to Python, a "ping" command. Outcome: Python talks to the board. (1–2 weekends)
- **Pattern engine (drive)** — timer + DMA pushing vectors to the pins. Outcome: logic-analyser capture showing a clean pattern at 1 MHz; then push for the highest stable rate. (2 weekends)
- **Strobe & compare** — capture at the strobe edge, compare with expected and mask. Outcome: deliberately wrong pattern reports the right failing vector. (2 weekends)
- **Pattern format + first chip** — Python pattern compiler; full truth-table test of 74HC00 and 74HC04. Outcome: good chip passes, a chip with a pin lifted fails. (2 weekends)
- **DUT power & IDD** — switch VDD, measure static supply current. Outcome: IDD within a few µA of the multimeter. (1 weekend)
- **PMU: DC tests** — continuity (force current, check the protection diode ~0.6 V), input leakage, VOH/VOL under load; calibrate against a multimeter. Outcome: a table of measured vs meter values with the error. (3 weekends)
- **Test flow, bins, datalog** — sequencer with limits and bins; STDF + CSV output; read it back with your log parser. Outcome: one command tests a chip and saves a datalog. (2 weekends)
- **Shmoo characterisation** — sweep VDD (e.g. 2.0–3.6 V) against period; plot. Outcome: a shmoo plot for 74HC00. (2 weekends)
- **Second device (serial)** — 74HC595 or 24C02: serial protocol written as patterns. Outcome: write/read test passes. (1–2 weekends)
- **PCB v2** — KiCad shield: ZIF socket, mux, PMU, power, test points. Outcome: the breadboard is gone. (3 weekends + fab time)
- **README, demo, post** — block diagram, numbers table, 60-second video, LinkedIn post. (1 weekend)

**Total:** about 20–22 weekends (roughly 5 months at a weekend pace). A first working version — patterns + compare + first chip — takes about 8 weekends.

## Numbers to measure and show
- Highest stable pattern rate (target 1 MHz first, then 2–4 MHz).
- Strobe placement accuracy and jitter (target ±50 ns; timer step is 10 ns).
- PMU accuracy vs a multimeter (voltage in mV, current in µA).
- Test time per chip and number of tests.
- Pass/fail of known-good vs deliberately damaged parts.

## Watch-outs
- DMA to GPIO has small timing jitter — measure it instead of assuming it.
- Breadboard wiring adds noise; keep wires short and add decoupling capacitors (100 nF at every chip).
- 12-bit ADC = about 0.8 mV per step; average samples for stable readings.
- Keep everything at 3.3 V until the PCB, to avoid damaging the Black Pill.
- Use UART first; USB CDC only if you need more speed.

## Resume line (fill in your real numbers)
Built a bare-metal STM32 mini-ATE: timer + DMA pattern engine at up to __ MHz with ±__ ns strobe placement, a DAC/op-amp PMU for continuity, leakage and VOH/VOL tests, and a Python test sequencer writing STDF datalogs; characterised 74HC logic with VDD-vs-period shmoo plots.`;
