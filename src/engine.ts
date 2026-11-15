// Mission Architect engine. All values are ILLUSTRATIVE (not NASA specs).
export const G0 = 9.80665
export const ISP = 320 // s, bipropellant (illustrative)
export type MissionId = "mars" | "lunar" | "earth" | "asteroid"
export type InstId = "HRC" | "SPEC" | "MAG" | "RAD"

// days = length of the CREWED journey (game-scaled, illustrative). The longer it is, the more food everybody needs.
export const MISSIONS: Record<MissionId, { name: string; dv: number; delayMin: number; days: number }> = {
  mars: { name: "Mars Exploration", dv: 1800, delayMin: 18, days: 28 },
  lunar: { name: "Lunar Research", dv: 1100, delayMin: 0.02, days: 14 },
  earth: { name: "Earth Observation", dv: 300, delayMin: 0.01, days: 10 },
  asteroid: { name: "Asteroid Study", dv: 1500, delayMin: 12, days: 21 },
}

export const INSTR: Record<InstId, { name: string; mass: number; power: number; gbDay: number; value: number; cost: number; rel: Record<MissionId, number> }> = {
  HRC: { name: "Hi-Res Camera", mass: 82, power: 420, gbDay: 180, value: 94, cost: 62, rel: { mars: 1, lunar: 1, earth: 1, asteroid: 1 } },
  SPEC: { name: "Spectrometer", mass: 46, power: 165, gbDay: 42, value: 88, cost: 48, rel: { mars: 1, lunar: 1, earth: 0.8, asteroid: 1 } },
  MAG: { name: "Magnetometer", mass: 14, power: 28, gbDay: 2, value: 72, cost: 14, rel: { mars: 0.7, lunar: 0.6, earth: 0.3, asteroid: 0.8 } },
  RAD: { name: "Radar Instrument", mass: 118, power: 760, gbDay: 96, value: 91, cost: 95, rel: { mars: 0.9, lunar: 1, earth: 0.5, asteroid: 0.7 } },
}
export const INST_IDS = Object.keys(INSTR) as InstId[]

export const VEHICLES = {
  atlas: { name: "Atlas N2 Medium", cap: 3200, cost: 118 },
  nova: { name: "Nova Heavy H4", cap: 7200, cost: 186 },
}
export type VehicleId = keyof typeof VEHICLES

// Core bus: sums of the nine core systems in the UI
export const CORE = { mass: 1473, cost: 360, hotelW: 800, solarW: 2400, battWh: 14800, maxProp: 1520 }
export const BUDGET = 820
export const ORBIT_H = 7, ECLIPSE = 0.35, CONTACT = 3 / 7
export const STORAGE_GB = 1000
export const RATE_GBH = { low: 3.6, high: 14.4 } // 1 Mbps / 4 Mbps
export const TX_HIGH_W = 220
export const STEP = 0.25, DURATION = 72
export const C_KMS = 299792.458

// ---------- crew (passengers) + food + fridges. ILLUSTRATIVE values, not NASA specs ----------
// Seats: up to CREW.max PASSENGERS, plus the PLAYERS (1 in Single Player, 2 in Co-op). Players are EXTRA
// (6 + 1 = 7 or 6 + 2 = 8 people max). Everybody eats, so food is never 0, even with 0 passengers.
export const CREW = {
  max: 6,
  mass: 260,      // kg per passenger: body ~90 + seat, suit, share of life-support hardware
  power: 180,     // W per passenger: air/CO2 loop, cabin thermal control, metabolic heat rejection
  cost: 22,       // $M per passenger (training, suit, life-support share)
  kgDay: 1.0,     // kg O2 + make-up water per person per day (after recycling), NOT food
  reserve: 1.2,   // consumables carried = journey days x this margin
  doseMsvDay: 1.8,// mSv/day, deep-space radiation (order of magnitude from Mars-cruise measurements)
  sci: 0.06,      // +6% science return per passenger (human-in-the-loop operations)
}
// The players' seats, suits and life-support hardware are already inside the core bus, but they still eat.
export const FOOD = {
  kgDay: 1.8,     // kg of food per person per day, packaging included (ISS-like order of magnitude)
  reserve: 1.15,  // carry 15% extra food as a safety margin
}
export const FRIDGE = {
  mass: 40,       // kg per fridge (empty)
  power: 200,     // W continuous per fridge (compressor + heat rejection)
  cost: 18,       // $M per fridge
  capKg: 120,     // kg of food ONE fridge can hold  (= about 58 person-days of food)
  max: 8,         // most fridges the bay can physically take
  tempC: 4,
}

export interface Design {
  mission: MissionId
  vehicle: VehicleId
  propellant: number
  duty: Record<InstId, number> // 0 = not installed, else 10..100 %
  crew: number   // passengers on board (0..CREW.max), NOT counting the players
  fridges?: number // number of food fridges installed (0..FRIDGE.max)
  fridge?: boolean // legacy (old saved designs): true = 1 fridge
  players?: 1 | 2 // players on board who also need food (1 single, 2 co-op). Set from the game mode.
}

export const PRESETS: Record<"A" | "B" | "C", Design> = {
  A: { mission: "mars", vehicle: "nova", propellant: 1450, duty: { HRC: 60, SPEC: 60, MAG: 60, RAD: 0 }, crew: 0, fridges: 1 },
  B: { mission: "mars", vehicle: "nova", propellant: 1520, duty: { HRC: 100, SPEC: 100, MAG: 100, RAD: 100 }, crew: 0, fridges: 1 },
  C: { mission: "mars", vehicle: "atlas", propellant: 1520, duty: { HRC: 100, SPEC: 100, MAG: 0, RAD: 100 }, crew: 0, fridges: 1 },
}

export const crewOf = (d: Design) => Math.max(0, Math.min(CREW.max, Math.round(d.crew ?? 0)))
export const playersOf = (d: Design): 1 | 2 => (d.players === 2 ? 2 : 1)
export const fridgesOf = (d: Design) => Math.max(0, Math.min(FRIDGE.max, Math.round(d.fridges ?? (d.fridge ? 1 : 0))))
export const journeyDays = (d: Design) => MISSIONS[d.mission].days
export const MISSION_DAYS = DURATION / 24 // length of the simulated operations phase (days)

// Everything the people + food + fridges add to the design (all derived from the Design, nothing stored)
export function crewCalc(d: Design) {
  const n = crewOf(d), pl = playersOf(d), people = n + pl, fr = fridgesOf(d), days = journeyDays(d)
  const foodPerDay = people * FOOD.kgDay                       // kg/day the whole crew eats
  const foodNeed = foodPerDay * days * FOOD.reserve            // kg that must be stored for this journey
  const fridgeCap = fr * FRIDGE.capKg
  const fridgesNeeded = Math.ceil(foodNeed / FRIDGE.capKg)
  const foodOk = fridgeCap >= foodNeed
  const foodKg = Math.min(foodNeed, fridgeCap)                 // what is actually loaded
  const daysFed = foodKg / foodPerDay                          // days the loaded food lasts
  const consumables = people * CREW.kgDay * days * CREW.reserve // O2 + water
  const crewMass = n * CREW.mass + consumables               // passengers + O2/water
  const fridgeMass = fr * FRIDGE.mass + foodKg                // empty fridges + the food inside them
  const crewPower = n * CREW.power, fridgePower = fr * FRIDGE.power
  const crewCost = n * CREW.cost, fridgeCost = fr * FRIDGE.cost
  const mass = crewMass + fridgeMass
  const power = crewPower + fridgePower
  const cost = crewCost + fridgeCost
  const sciBonus = n * CREW.sci // fraction added to every instrument's science return
  const dose = CREW.doseMsvDay * days // mSv per person over the whole journey
  return { n, pl, people, fr, days, foodPerDay, foodNeed, fridgeCap, fridgesNeeded, foodOk, foodKg, daysFed, consumables, crewMass, fridgeMass, crewPower, fridgePower, crewCost, fridgeCost, mass, power, cost, sciBonus, dose }
}

export function calc(d: Design) {
  const on = INST_IDS.filter((i) => d.duty[i] > 0)
  const cr = crewCalc(d)
  const dry = CORE.mass + on.reduce((s, i) => s + INSTR[i].mass, 0) + cr.mass
  const total = dry + d.propellant
  const limit = VEHICLES[d.vehicle].cap
  const dv = ISP * G0 * Math.log(total / dry) // ideal rocket equation
  const dvReq = MISSIONS[d.mission].dv
  const instW = on.reduce((s, i) => s + (INSTR[i].power * d.duty[i]) / 100, 0)
  const avgGen = CORE.solarW * (1 - ECLIPSE)
  const cost = CORE.cost + on.reduce((s, i) => s + INSTR[i].cost, 0) + VEHICLES[d.vehicle].cost + cr.cost
  const fuelUsed = total * (1 - Math.exp(-dvReq / (ISP * G0)))
  return {
    on, dry, total, limit, dv, dvReq, instW, avgGen, cost, fuelUsed,
    fuelLeft: Math.max(0, d.propellant - fuelUsed),
    massOk: total <= limit, dvOk: dv >= dvReq, budgetOk: cost <= BUDGET, foodOk: cr.foodOk,
    crew: cr, lifeW: cr.power,
    loadW: CORE.hotelW + instW + cr.power, balanceW: avgGen - CORE.hotelW - instW - cr.power,
    target: 0.35 * INST_IDS.reduce((s, i) => s + INSTR[i].value * INSTR[i].rel[d.mission], 0) * (DURATION / 24),
  }
}

// ---------- time-stepped simulation with Earth <-> spacecraft link ----------
export type Cmd = { kind: "duty"; id: InstId; value: number } | { kind: "safe"; value: boolean }
// Snap = ONE telemetry packet. Every spacecraft value is in it, so Earth sees everything (one-way delay later).
export interface Snap {
  t: number; battPct: number; battWh: number; bufPct: number; bufGb: number; fuel: number; mass: number
  returned: number; lost: number; events: number; safe: boolean; tx: "low" | "high"; duty: Record<InstId, number>
  sun: boolean; contact: boolean; genW: number; loadW: number
  crew: number; people: number; fridges: number; consPct: number; foodKg: number; foodPct: number; day: number; dose: number
}
export interface Sim {
  t: number; batt: number; buffer: number; bufSci: number; returned: number; lost: number; events: number
  safe: boolean; manualSafe: boolean; tx: "low" | "high"; duty: Record<InstId, number>
  inbox: { arrive: number; sent: number; cmd: Cmd }[]
  telem: { arrive: number; snap: Snap }[]
  earth: Snap | null
  log: { t: number; tag: string; msg: string }[]
  phase: { sun: boolean; contact: boolean }
}

export function initSim(d: Design): Sim {
  return { t: 0, batt: CORE.battWh, buffer: 0, bufSci: 0, returned: 0, lost: 0, events: 0, safe: false, manualSafe: false, tx: "low",
    duty: { ...d.duty }, inbox: [], telem: [], earth: null, phase: { sun: true, contact: true },
    log: [{ t: 0, tag: "OPS", msg: "Science operations begin. Link: Earth view lags by one-way delay." }] }
}

export const delayH = (d: Design) => MISSIONS[d.mission].delayMin / 60
export const lightKm = (d: Design) => MISSIONS[d.mission].delayMin * 60 * C_KMS

export function sendCmd(s: Sim, d: Design, cmd: Cmd): Sim {
  const n = structuredClone(s)
  n.inbox.push({ arrive: s.t + delayH(d), sent: s.t, cmd })
  n.log.push({ t: s.t, tag: "TX", msg: `Earth sent ${cmd.kind === "duty" ? `${cmd.id} duty → ${cmd.value}%` : `safe mode ${cmd.value ? "ON" : "OFF"}`} (arrives T+${(s.t + delayH(d)).toFixed(2)}h)` })
  return n
}
export function setTx(s: Sim, tx: "low" | "high"): Sim {
  const n = structuredClone(s); n.tx = tx
  n.log.push({ t: s.t, tag: "ENG", msg: `Downlink mode ${tx.toUpperCase()}` }); return n
}

export function step(prev: Sim, d: Design): Sim {
  const s = structuredClone(prev)
  const ph = (s.t % ORBIT_H) / ORBIT_H
  s.phase = { sun: ph < 1 - ECLIPSE, contact: ph < CONTACT }
  // commands arriving at the spacecraft
  s.inbox = s.inbox.filter((m) => {
    if (m.arrive > s.t) return true
    if (m.cmd.kind === "duty" && s.duty[m.cmd.id] > 0) s.duty[m.cmd.id] = m.cmd.value
    if (m.cmd.kind === "safe") s.manualSafe = m.cmd.value
    s.log.push({ t: s.t, tag: "RX", msg: `Command executed (sent T+${m.sent.toFixed(2)}h)` })
    return false
  })
  const inSafe = s.safe || s.manualSafe
  const cr = crewCalc(d)
  const instW = inSafe ? 0 : INST_IDS.reduce((a, i) => a + (INSTR[i].power * s.duty[i]) / 100, 0)
  const txW = s.phase.contact && s.tx === "high" ? TX_HIGH_W : 0
  const lifeW = cr.power // life support + fridge can never be switched off, even in safe mode
  const net = (s.phase.sun ? CORE.solarW : 0) - (CORE.hotelW + instW + txW + lifeW)
  s.batt = Math.min(CORE.battWh, Math.max(0, s.batt + (net > 0 ? net * 0.96 : net) * STEP))
  const pct = s.batt / CORE.battWh
  if (!s.safe && pct < 0.2) { s.safe = true; s.events++; s.log.push({ t: s.t, tag: "WARN", msg: "Battery < 20%: instruments shut down (safe mode, -15% science: thermal cycling)" }) }
  else if (s.safe && pct > 0.8) { s.safe = false; s.log.push({ t: s.t, tag: "OPS", msg: "Battery recovered > 80%: instruments resume" }) }
  if (!inSafe) for (const i of INST_IDS) {
    if (s.duty[i] <= 0) continue
    const gb = (INSTR[i].gbDay * s.duty[i]) / 100 / 24 * STEP
    const sci = (INSTR[i].value * INSTR[i].rel[d.mission] * s.duty[i]) / 100 / 24 * STEP * (1 + cr.sciBonus)
    const acc = Math.min(gb, STORAGE_GB - s.buffer)
    s.buffer += acc; s.bufSci += sci * (acc / gb); s.lost += gb - acc
  }
  if (s.phase.contact && s.batt > 0 && s.buffer > 0) {
    const dl = Math.min(s.buffer, RATE_GBH[s.tx] * STEP), f = dl / s.buffer
    s.returned += s.bufSci * f; s.bufSci -= s.bufSci * f; s.buffer -= dl
  }
  const c = calc(d)
  const day = (s.t / DURATION) * cr.days                       // sim time (0..72 h) is mapped onto the whole journey
  const foodLeft = Math.max(0, cr.foodKg - cr.foodPerDay * day)
  const snap: Snap = {
    t: s.t, battPct: Math.round(pct * 100), battWh: Math.round(s.batt), bufPct: Math.round((s.buffer / STORAGE_GB) * 100), bufGb: Math.round(s.buffer),
    fuel: Math.round(c.fuelLeft), mass: Math.round(c.dry + c.fuelLeft), returned: Math.round(s.returned), lost: Math.round(s.lost), events: s.events,
    safe: inSafe, tx: s.tx, duty: { ...s.duty }, sun: s.phase.sun, contact: s.phase.contact,
    genW: s.phase.sun ? CORE.solarW : 0, loadW: Math.round(CORE.hotelW + instW + txW + lifeW),
    crew: cr.n, people: cr.people, fridges: cr.fr, consPct: Math.max(0, Math.round(100 * (1 - day / (cr.days * CREW.reserve)))),
    foodKg: Math.round(foodLeft), foodPct: cr.foodKg > 0 ? Math.round((100 * foodLeft) / cr.foodKg) : 0, day: +day.toFixed(1),
    dose: +(CREW.doseMsvDay * day).toFixed(1),
  }
  s.telem.push({ arrive: s.t + delayH(d), snap })
  const arrived = s.telem.filter((p) => p.arrive <= s.t + STEP)
  if (arrived.length) s.earth = arrived[arrived.length - 1].snap
  s.telem = s.telem.filter((p) => p.arrive > s.t + STEP)
  s.t = +(s.t + STEP).toFixed(2)
  s.log = s.log.slice(-40)
  return s
}

// Earth-side advice, computed ONLY from the (delayed) Earth view
export function advice(e: Snap | null, d: Design): { text: string; vars?: Record<string, string | number>; cmd?: Cmd }[] {
  if (!e) return [{ text: "Waiting for first telemetry packet…" }]
  const out: { text: string; vars?: Record<string, string | number>; cmd?: Cmd }[] = []
  const hot = INST_IDS.filter((i) => e.duty[i] > 40).sort((a, b) => INSTR[b].power - INSTR[a].power)[0]
  if (e.battPct < 40 && hot) out.push({ text: "Battery was {p}% at last packet. Reduce {i} duty to 40% to rebalance energy.", vars: { p: e.battPct, i: hot }, cmd: { kind: "duty", id: hot, value: 40 } })
  if (e.bufPct > 70) out.push({ text: "Onboard buffer {p}% full. Ask Flight Engineer for HIGH downlink or reduce imaging duty.", vars: { p: e.bufPct } })
  if (e.foodPct < 30) out.push({ text: "Food stores at {p}% ({k} kg left, crew of {n}). Enough to finish the journey, but the safety margin is nearly used up.", vars: { p: e.foodPct, k: e.foodKg, n: e.people } })
  if (!out.length) out.push({ text: "Resources nominal at last packet. Continue plan." })
  return out
}

export function verdict(s: Sim, d: Design) {
  const c = calc(d)
  const ratio = (s.returned * Math.max(0.4, 1 - 0.15 * s.events)) / c.target
  return { ratio, result: ratio >= 1 ? "success" : ratio >= 0.5 ? "partial" : "failed" as "success" | "partial" | "failed" }
}
