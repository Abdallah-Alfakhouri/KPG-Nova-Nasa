import { useEffect, useState } from "react"
import { Button, Icon, Meter, PageTitle, Panel, Status } from "./App"
import * as E from "./engine"
import { useT } from "./i18n"
import { FlightPanel, VehicleArt } from "./Visuals"

type Go = (s: any) => void
const tone = (p: number) => (p > 100 ? "danger" : p >= 85 ? "warn" : "good")

export function Designer({ design, setDesign, go, mode }: { design: E.Design; setDesign: (d: E.Design) => void; go: Go; mode?: string }) {
  const { t, dir } = useT()
  const coop = mode === "coop"
  const [ap, setAp] = useState({ p1: false, p2: false })
  useEffect(() => setAp({ p1: false, p2: false }), [JSON.stringify(design)])
  const c = E.calc(design)
  const set = (p: Partial<E.Design>) => setDesign({ ...design, ...p })
  const ok = c.massOk && c.dvOk && c.foodOk
  const cr = c.crew
  const mname = t(E.MISSIONS[design.mission].name)
  const setCrew = (n: number) => set({ crew: Math.max(0, Math.min(E.CREW.max, n)) })
  const setFridges = (n: number) => set({ fridges: Math.max(0, Math.min(E.FRIDGE.max, n)), fridge: undefined })
  return (
    <main className="page" dir={dir}>
      <PageTitle step={t("PHASE 02 / SYSTEMS ENGINEERING")} title={t("Spacecraft configuration")}
        detail={t("Every choice below is calculated live: mass sum, rocket equation, energy balance. Values are illustrative.")}
        status={<Status tone={ok ? "good" : "danger"}>{ok ? t("LAUNCH READY") : t("NO-GO")}</Status>} />
      <div className="builder-layout">
        <Panel className="components-panel">
          <div className="panel-head"><span>{t("MISSION + LAUNCH")}</span><small>{t("PRESETS")}</small></div>
          <div className="scenario-tabs">
            {(["A", "B", "C"] as const).map((k) => (
              <button key={k} onClick={() => setDesign(E.PRESETS[k])}><span>{k}</span>{t(k === "A" ? "Balanced" : k === "B" ? "Power-heavy" : "Overweight")}</button>
            ))}
          </div>
          <div className="component-list">
            {(Object.keys(E.MISSIONS) as E.MissionId[]).map((m) => (
              <div key={m} className="component-row" style={{ cursor: "pointer", opacity: design.mission === m ? 1 : 0.55 }} onClick={() => set({ mission: m })}>
                <span className="component-num">{design.mission === m ? "●" : "○"}</span>
                <div><b>{t(E.MISSIONS[m].name)}</b><small>{t("Δv needed {dv} m/s · one-way delay {d} min", { dv: E.MISSIONS[m].dv, d: E.MISSIONS[m].delayMin })}</small></div>
              </div>
            ))}
            {(Object.keys(E.VEHICLES) as E.VehicleId[]).map((v) => (
              <div key={v} className="component-row" style={{ cursor: "pointer", opacity: design.vehicle === v ? 1 : 0.55 }} onClick={() => set({ vehicle: v })}>
                <span className="component-num">{design.vehicle === v ? "●" : "○"}</span>
                <div><b>{E.VEHICLES[v].name}</b><small>{t("{cap} kg max · ${cost}M", { cap: E.VEHICLES[v].cap, cost: E.VEHICLES[v].cost })}</small></div>
              </div>
            ))}
          </div>
          <div className="meter"><div><span>{t("Propellant")}</span><b>{t("{n} kg", { n: design.propellant })}</b></div>
            <input type="range" min={600} max={E.CORE.maxProp} step={10} value={design.propellant} onChange={(e) => set({ propellant: +e.target.value })} style={{ width: "100%" }} />
            <small>{t("Δv = Isp·g0·ln(m0/mf) — more propellant = more Δv, but more mass")}</small></div>
        </Panel>
        <div className="builder-center">
          <Panel>
            <div className="panel-head"><span>{t("SCIENCE INSTRUMENTS")}</span><small>{t("{n} INSTALLED", { n: c.on.length })}</small></div>
            <div className="instrument-grid">
              {E.INST_IDS.map((i) => {
                const I = E.INSTR[i], d = design.duty[i]
                return (
                  <div key={i} className={`instrument ${d > 0 ? "selected" : ""}`}>
                    <div className="instrument-top"><span>{i}</span>
                      <button onClick={() => set({ duty: { ...design.duty, [i]: d > 0 ? 0 : 60 } })}>{d > 0 ? t("Remove") : t("Install")}</button></div>
                    <b>{t(I.name)}</b>
                    <small>{t("Relevance to {m}: {p}%", { m: mname, p: Math.round(I.rel[design.mission] * 100) })}</small>
                    <div className="instrument-stats">
                      <span>{t("{n} kg", { n: I.mass })}<small>{t("MASS")}</small></span>
                      <span>{t("{n} W", { n: Math.round((I.power * d) / 100) })}<small>{t("AVG POWER")}</small></span>
                      <span>{t("{n} Gb/d", { n: Math.round((I.gbDay * d) / 100) })}<small>{t("DATA")}</small></span>
                    </div>
                    {d > 0 && (<><input type="range" min={10} max={100} step={10} value={d} onChange={(e) => set({ duty: { ...design.duty, [i]: +e.target.value } })} style={{ width: "100%" }} /><small>{t("DUTY CYCLE {d}%", { d })}</small></>)}
                    <div className="science-value"><i style={{ width: `${I.value * I.rel[design.mission]}%` }} /><small>{t("SCIENCE VALUE {n}", { n: Math.round(I.value * I.rel[design.mission]) })}</small></div>
                  </div>
                )
              })}
            </div>
          </Panel>
          <Panel className="crew-panel">
            <div className="panel-head"><span>{t("CREW / PASSENGERS")}</span><small>{t("{n} PASSENGERS + {p} PLAYER(S) = {a} PEOPLE", { n: cr.n, p: cr.pl, a: cr.people })}</small></div>
            <div className="crew-stepper">
              <button aria-label={t("Remove one passenger")} disabled={cr.n <= 0} onClick={() => setCrew(cr.n - 1)}>−</button>
              <div className="crew-count"><strong>{cr.n}</strong><small>{t("PASSENGERS")}</small></div>
              <button aria-label={t("Add one passenger")} disabled={cr.n >= E.CREW.max} onClick={() => setCrew(cr.n + 1)}>+</button>
              <div className="crew-seats">
                {Array.from({ length: E.CREW.max }).map((_, k) => <span key={k} className={k < cr.n ? "on" : ""}><Icon name="user" size={20} /></span>)}
                <span className="seat-gap" />
                {Array.from({ length: cr.pl }).map((_, k) => <span key={`p${k}`} className="player" title={t("Player (always on board, always eats)")}><Icon name="user" size={20} /></span>)}
              </div>
            </div>
            <div className="crew-stats">
              <span>{`+${Math.round(cr.crewMass)} kg`}<small>{t("MASS (incl. O₂ + water)")}</small></span>
              <span>{`+${cr.crewPower} W`}<small>{t("LIFE SUPPORT POWER")}</small></span>
              <span>{`+$${cr.crewCost}M`}<small>{t("COST")}</small></span>
              <span>{`+${Math.round(cr.sciBonus * 100)}%`}<small>{t("SCIENCE RETURN")}</small></span>
              <span>{`${cr.dose.toFixed(0)} mSv`}<small>{t("DOSE PER PERSON")}</small></span>
            </div>
            <div className="effects">
              <p>{t("Seats: up to {m} passengers, and the players ride along on top of that ({p} here), so the most people on board is {a}. Players' seats and suits are part of the core bus, but they still eat.", { m: E.CREW.max, p: cr.pl, a: E.CREW.max + cr.pl })}</p>
              <p>{t("Mass: each passenger adds {m} kg (body, seat, suit, life-support share), plus oxygen and water for everyone for the whole journey. More mass lowers Δv through the rocket equation.", { m: E.CREW.mass })}</p>
              <p>{t("Power: {n} W per passenger for CO₂ removal, air circulation and cooling the crew's body heat. It keeps running even in safe mode, so the battery drains faster.", { n: E.CREW.power })}</p>
              <p>{t("Science: human operators add {n}% return per passenger.", { n: Math.round(E.CREW.sci * 100) })}</p>
              <p>{t("Radiation: about {r} mSv per person per day in deep space, so {d} mSv per person over this {h}-day journey.", { r: E.CREW.doseMsvDay, d: cr.dose.toFixed(0), h: cr.days })}</p>
            </div>
          </Panel>
          <Panel className="crew-panel food-panel">
            <div className="panel-head"><span>{t("FOOD + FRIDGES")}</span><small>{t("{n} FRIDGE(S) INSTALLED", { n: cr.fr })}</small></div>
            <div className="crew-stepper">
              <button aria-label={t("Remove one fridge")} disabled={cr.fr <= 0} onClick={() => setFridges(cr.fr - 1)}>−</button>
              <div className="crew-count"><strong>{cr.fr}</strong><small>{t("FRIDGES")}</small></div>
              <button aria-label={t("Add one fridge")} disabled={cr.fr >= E.FRIDGE.max} onClick={() => setFridges(cr.fr + 1)}>+</button>
              <div className="crew-seats">
                {Array.from({ length: Math.max(cr.fridgesNeeded, cr.fr, 1) }).map((_, k) => <span key={k} className={k < cr.fr ? "on" : ""}><Icon name="food" size={20} /></span>)}
              </div>
            </div>
            <Meter label={t("Food that must be stored / fridge capacity")} value={`${Math.round(cr.foodNeed)} / ${cr.fridgeCap} kg`} percent={Math.round((cr.foodNeed / Math.max(1, cr.fridgeCap)) * 100)} tone={cr.foodOk ? tone((cr.foodNeed / Math.max(1, cr.fridgeCap)) * 100) : "danger"} />
            {!cr.foodOk && <div className="food-fix"><Button variant="secondary" icon={null} onClick={() => setFridges(cr.fridgesNeeded)}>{t("Add the {n} fridge(s) this crew needs", { n: cr.fridgesNeeded })}</Button></div>}
            <div className="crew-stats">
              <span>{`${cr.days} ${t("days")}`}<small>{t("JOURNEY LENGTH")}</small></span>
              <span>{`${cr.people} × ${E.FOOD.kgDay} kg`}<small>{t("FOOD PER DAY")}</small></span>
              <span>{`${Math.round(cr.foodNeed)} kg`}<small>{t("FOOD NEEDED")}</small></span>
              <span>{`+${Math.round(cr.fridgeMass)} kg`}<small>{t("MASS (fridges + food)")}</small></span>
              <span>{`+${cr.fridgePower} W`}<small>{t("FRIDGE POWER")}</small></span>
              <span>{`+$${cr.fridgeCost}M`}<small>{t("COST")}</small></span>
            </div>
            <div className="effects">
              <p>{t("Food needed = people × {k} kg per day × {d} days × {r} safety margin. {p} people on board right now, so it is never zero: the players eat too.", { k: E.FOOD.kgDay, d: cr.days, r: E.FOOD.reserve, p: cr.people })}</p>
              <p>{t("Each fridge keeps food at {c} °C and holds {k} kg. It also costs {m} kg, {w} W (always on) and ${x}M, so a bigger crew means more fridges and less room for instruments.", { c: E.FRIDGE.tempC, k: E.FRIDGE.capKg, m: E.FRIDGE.mass, w: E.FRIDGE.power, x: E.FRIDGE.cost })}</p>
              <p>{t("A longer journey needs more food: {mm} takes {d} days. Not enough fridges means the crew would run out of food, so the launch is blocked.", { mm: mname, d: cr.days })}</p>
            </div>
          </Panel>
        </div>
        <div className="builder-side">
        <Panel className="summary-panel">
          <div className="panel-head"><span>{t("LIVE ENGINEERING CHECKS")}</span></div>
          <Meter label={t("Total mass")} value={`${Math.round(c.total)} / ${c.limit}`} percent={Math.round((c.total / c.limit) * 100)} tone={tone((c.total / c.limit) * 100)} />
          <Meter label={t("Δv margin (required / available)")} value={`${c.dvReq} / ${Math.round(c.dv)}`} percent={Math.round((c.dvReq / c.dv) * 100)} tone={tone((c.dvReq / c.dv) * 100)} />
          <Meter label={t("Avg power load / avg generation")} value={`${Math.round(c.loadW)} / ${Math.round(c.avgGen)}`} percent={Math.round((c.loadW / c.avgGen) * 100)} tone={tone((c.loadW / c.avgGen) * 100)} />
          <Meter label={t("Cost")} value={`$${c.cost}M / $${E.BUDGET}M`} percent={Math.round((c.cost / E.BUDGET) * 100)} tone={tone((c.cost / E.BUDGET) * 100)} />
          {!c.massOk && <div className="constraint danger"><Icon name="warning" /><p><b>{t("Launch blocked")}</b>{t("Mass exceeds vehicle capacity by {n} kg.", { n: Math.round(c.total - c.limit) })}</p></div>}
          {!c.dvOk && <div className="constraint danger"><Icon name="warning" /><p><b>{t("Cannot reach target orbit")}</b>{t("Short by {n} m/s of Δv.", { n: Math.round(c.dvReq - c.dv) })}</p></div>}
          {c.balanceW < 0 && <div className="constraint warn"><Icon name="warning" /><p><b>{t("Energy deficit")}</b>{t("Orbit-average load exceeds generation by {n} W. Battery will drain.", { n: Math.round(-c.balanceW) })}</p></div>}
          {!c.foodOk && <div className="constraint danger"><Icon name="warning" /><p><b>{t("Not enough food storage")}</b>{t("{p} people need {n} kg of food for {d} days but {f} fridge(s) hold only {c} kg. Add {k} more fridge(s) or remove passengers.", { p: cr.people, n: Math.round(cr.foodNeed), d: cr.days, f: cr.fr, c: cr.fridgeCap, k: cr.fridgesNeeded - cr.fr })}</p></div>}
          {coop && (
            <div className="decision-options">
              <button className={ap.p1 ? "selected" : ""} onClick={() => setAp({ ...ap, p1: !ap.p1 })}><span>1</span><div><b>{t("Commander (Player 1) approves")}</b><small>{ap.p1 ? t("APPROVED") : t("Objectives, instruments, mission plan")}</small></div></button>
              <button className={ap.p2 ? "selected" : ""} onClick={() => setAp({ ...ap, p2: !ap.p2 })}><span>2</span><div><b>{t("Flight Engineer (Player 2) approves")}</b><small>{ap.p2 ? t("APPROVED") : t("Mass, power, Δv and link margins")}</small></div></button>
            </div>
          )}
          <Button className="full" disabled={coop && !(ap.p1 && ap.p2)} onClick={() => go("simulation")}>{coop && !(ap.p1 && ap.p2) ? t("Both players must approve before launch") : ok ? t("Launch to operations") : t("Try launch anyway")}</Button>
        </Panel>
        <Panel className="vehicle-panel">
          <div className="panel-head"><span>{t("LAUNCH VEHICLE")}</span><small>{design.vehicle === "nova" ? "H4" : "N2"}</small></div>
          <VehicleArt vehicle={design.vehicle as "atlas" | "nova"} />
          <div className="vehicle-caption"><b>{E.VEHICLES[design.vehicle].name}</b><small>{t("{cap} kg max · ${cost}M", { cap: E.VEHICLES[design.vehicle].cap, cost: E.VEHICLES[design.vehicle].cost })}</small></div>
        </Panel>
        </div>
      </div>
    </main>
  )
}

export function Ops({ design, mode, go, onFinish }: { design: E.Design; mode: string; go: Go; onFinish?: (o: any) => void }) {
  const { t, dir } = useT()
  const c = E.calc(design)
  const [sim, setSim] = useState(() => E.initSim(design))
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [active, setActive] = useState<1 | 2>(1)
  const done = sim.t >= E.DURATION
  useEffect(() => {
    if (!playing || done || !(c.massOk && c.dvOk && c.foodOk)) return
    const id = setInterval(() => setSim((s) => (s.t >= E.DURATION ? s : E.step(s, design))), 160 / speed)
    return () => clearInterval(id)
  }, [playing, speed, done, design])
  useEffect(() => { if (done) setPlaying(false) }, [done])
  useEffect(() => {
    if (onFinish && !(c.massOk && c.dvOk && c.foodOk)) onFinish({ key: JSON.stringify(design), result: "failed", ratio: 0, returned: 0, target: c.target, lost: 0, events: 0, aborted: true })
  }, [])
  useEffect(() => {
    if (!done || !onFinish) return
    const vv = E.verdict(sim, design)
    onFinish({ key: JSON.stringify(design), result: vv.result, ratio: vv.ratio, returned: sim.returned, target: c.target, lost: sim.lost, events: sim.events })
  }, [done])

  if (!c.massOk || !c.dvOk || !c.foodOk) return (
    <main className="page" dir={dir}>
      <PageTitle step={t("PHASE 04 / LAUNCH")} title={t("Launch aborted")}
        detail={!c.massOk ? t("Mass {a} kg > capacity {b} kg.", { a: Math.round(c.total), b: c.limit }) : !c.dvOk ? t("Available Δv {a} m/s < required {b} m/s.", { a: Math.round(c.dv), b: c.dvReq }) : t("Food storage {b} kg < {a} kg needed by {p} people for {d} days.", { a: Math.round(c.crew.foodNeed), b: c.crew.fridgeCap, p: c.crew.people, d: c.crew.days })}
        status={<Status tone="danger">{t("FAILED")}</Status>} />
      <Panel><p style={{ padding: 16 }}>{t("The failure is caused by your configuration, not by chance. Return to the spacecraft screen and change vehicle, propellant, instruments, crew or fridges.")}</p><Button onClick={() => go("builder")}>{t("Back to configuration")}</Button></Panel>
    </main>
  )

  const e = sim.earth, two = mode === "coop"
  const v = E.verdict(sim, design)
  const dl = E.delayH(design)
  const pct = Math.round((sim.batt / E.CORE.battWh) * 100)
  const buf = Math.round((sim.buffer / E.STORAGE_GB) * 100)
  const ageMin = e ? Math.round((sim.t - e.t) * 60) : 0
  const lockE = two && active !== 1, lockS = two && active !== 2
  const P = (n: 1 | 2) => (two ? t(n === 1 ? "PLAYER 1 · " : "PLAYER 2 · ") : "")
  // every field the spacecraft transmits in one telemetry packet (what Earth receives, one-way delay later)
  const rows: [string, string][] = e ? [
    ["SPACECRAFT TIME", `T+ ${e.t.toFixed(2)} h`],
    ["BATTERY CHARGE", `${e.battWh} / ${E.CORE.battWh} Wh`],
    ["LIGHTING", e.sun ? t("☀ SUNLIT") : t("● ECLIPSE")],
    ["POWER GENERATED", `${e.genW} W`],
    ["POWER LOAD", `${e.loadW} W`],
    ["DATA BUFFER", `${e.bufGb} / ${E.STORAGE_GB} Gb`],
    ["DATA LOST", `${e.lost} Gb`],
    ["SCIENCE RETURNED", `${e.returned} / ${Math.round(c.target)}`],
    ["FUEL LEFT", `${e.fuel} kg`],
    ["CURRENT MASS", `${e.mass} kg`],
    ["DOWNLINK MODE", e.tx.toUpperCase()],
    ["EARTH LINK", e.contact ? t("EARTH LINK OPEN") : t("NO CONTACT")],
    ["SAFE MODE", e.safe ? t("ON") : t("OFF")],
    ["SAFE-MODE EVENTS", `${e.events}`],
    ...c.on.map((i): [string, string] => [`${i} DUTY`, `${e.duty[i]}%`]),
    ["PEOPLE ON BOARD", `${e.people}`],
    ["FRIDGES", `${e.fridges}`],
    ["JOURNEY DAY", `${e.day} / ${c.crew.days}`],
    ["FOOD LEFT", `${e.foodKg} kg (${e.foodPct}%)`],
    ["CONSUMABLES LEFT", `${e.consPct}%`],
    ["CREW DOSE (each)", `${e.dose} mSv`],
  ] : []
  const fieldCount = e ? rows.length : 20 + c.on.length
  const flying = playing && !done
  return (
    <main className="page simulation-page" dir={dir}>
      <PageTitle step={t("PHASE 04 / OPERATIONS + EARTH LINK")} title={t("Mission operations")}
        detail={t("{m} · one-way light time {d} min ({km}M km)", { m: t(E.MISSIONS[design.mission].name), d: E.MISSIONS[design.mission].delayMin, km: (E.lightKm(design) / 1e6).toFixed(1) })}
        status={<div className="mission-clock"><small>{t("MISSION ELAPSED")}</small><b>T+ {sim.t.toFixed(2)} / {E.DURATION} h</b></div>} />
      <div className="scenario-switch">
        <Button onClick={() => setPlaying(!playing)} icon="play" disabled={done}>{playing ? t("Pause") : done ? t("Finished") : t("Run")}</Button>
        {[1, 4, 12].map((x) => <button key={x} className={speed === x ? "active" : ""} onClick={() => setSpeed(x)}>×{x}</button>)}
        <button onClick={() => { setSim(E.initSim(design)); setPlaying(false) }}>{t("Reset")}</button>
        {two && <button className="active" onClick={() => setActive(active === 1 ? 2 : 1)}>{t("Active: Player {n} · pass control to Player {m}", { n: active, m: active === 1 ? 2 : 1 })}</button>}
        <span>{two ? t("2 PLAYERS: P1 = Mission Control (Earth) · P2 = Flight Engineer (spacecraft)") : t("1 PLAYER: you control both Earth and spacecraft")}</span>
        <span>{sim.phase.sun ? t("☀ SUNLIT") : t("● ECLIPSE")} · {sim.phase.contact ? t("EARTH LINK OPEN") : t("NO CONTACT")}</span>
      </div>
      <FlightPanel mission={design.mission} progress={sim.t / E.DURATION} playing={playing} done={done} speed={speed} fields={fieldCount} />
      <div className="sim-layout">
        <Panel>
          <div className="panel-head"><span>{P(1)}{t("MISSION CONTROL — EARTH VIEW")}</span><Status tone={ageMin > 0 ? "warn" : "good"}>{t("DATA AGE {n} MIN", { n: ageMin })}</Status></div>
          {e ? (<>
            <Meter label={t("Battery (as last received)")} value={`${e.battPct}%`} percent={e.battPct} tone={e.battPct < 25 ? "danger" : e.battPct < 40 ? "warn" : "good"} />
            <Meter label={t("Onboard buffer (last received)")} value={`${e.bufPct}%`} percent={e.bufPct} tone={tone(e.bufPct)} />
            <div className="telem-head"><small>{t("FULL TELEMETRY PACKET · {n} FIELDS", { n: rows.length })}</small><small>{flying ? t("STREAMING") : t("PAUSED")}</small></div>
            <div className="telem-grid">{rows.map(([k, v]) => <div key={k}><small>{t(k)}</small><b>{v}</b></div>)}</div>
          </>) : <p>{t("Waiting for first packet…")}</p>}
          <div className="cause"><small>{t("EARTH ANALYSIS (from delayed data only)")}</small>
            {E.advice(e, design).map((a, i) => (<p key={i}>{t(a.text, a.vars)}{a.cmd && <> <Button variant="secondary" icon={null} disabled={lockE} onClick={() => setSim(E.sendCmd(sim, design, a.cmd!))}>{t("Send command")}</Button></>}</p>))}
          </div>
          <div className="decision-options" style={{ opacity: lockE ? 0.45 : 1 }}>
            {c.on.map((i) => (<button key={i} disabled={lockE} onClick={() => setSim(E.sendCmd(sim, design, { kind: "duty", id: i, value: Math.max(10, (e?.duty[i] ?? design.duty[i]) - 30) }))}><span>{i}</span><div><b>{t("Lower {i} duty", { i })}</b><small>{t("Command arrives after {n} min", { n: Math.round(dl * 60) })}</small></div></button>))}
            <button disabled={lockE} onClick={() => setSim(E.sendCmd(sim, design, { kind: "safe", value: !sim.manualSafe }))}><span>⏻</span><div><b>{t("Toggle safe mode")}</b><small>{t("Stops all instruments")}</small></div></button>
          </div>
          <small>{t("COMMANDS IN FLIGHT: {n}", { n: sim.inbox.length })}</small>
          {lockE && <small style={{ display: "block" }}>{t("Locked: this panel belongs to Player 1")}</small>}
        </Panel>
        <Panel className={sim.safe ? "event-panel alert" : "event-panel"}>
          <div className="panel-head"><span>{P(2)}{t("SPACECRAFT — REAL TIME")}</span><Status tone={sim.safe || sim.manualSafe ? "warn" : "good"}>{sim.safe || sim.manualSafe ? t("SAFE MODE") : t("NOMINAL")}</Status></div>
          <Meter label={t("Battery")} value={`${Math.round(sim.batt)} / ${E.CORE.battWh} Wh`} percent={pct} tone={pct < 25 ? "danger" : pct < 40 ? "warn" : "good"} />
          <Meter label={t("Data buffer")} value={`${Math.round(sim.buffer)} / ${E.STORAGE_GB} Gb`} percent={buf} tone={tone(buf)} />
          <p style={{ padding: "6px 0" }}>{t("Data lost (buffer full): {a} Gb · Safe-mode events: {b}", { a: Math.round(sim.lost), b: sim.events })}</p>
          <div className="decision-options" style={{ opacity: lockS ? 0.45 : 1 }}>
            <button disabled={lockS} className={sim.tx === "low" ? "selected" : ""} onClick={() => setSim(E.setTx(sim, "low"))}><span>L</span><div><b>{t("Downlink LOW (1 Mbps)")}</b><small>{t("No extra power")}</small></div></button>
            <button disabled={lockS} className={sim.tx === "high" ? "selected" : ""} onClick={() => setSim(E.setTx(sim, "high"))}><span>H</span><div><b>{t("Downlink HIGH (4 Mbps)")}</b><small>{t("+{n} W while in contact", { n: E.TX_HIGH_W })}</small></div></button>
          </div>
          {lockS && <small style={{ display: "block" }}>{t("Locked: this panel belongs to Player 2")}</small>}
          <div className="event-log">{sim.log.slice(-6).reverse().map((l, i) => <p key={i}><time>T+{l.t.toFixed(1)}h</time><Status tone={l.tag === "WARN" ? "warn" : "good"}>{l.tag}</Status>{l.msg}</p>)}</div>
        </Panel>
      </div>
      {done && (
        <Panel>
          <div className="panel-head"><span>{t("MISSION REPORT")}</span><Status tone={v.result === "success" ? "good" : v.result === "partial" ? "warn" : "danger"}>{t(v.result.toUpperCase())}</Status></div>
          <p style={{ padding: 12 }}>{t("Science returned to Earth: {r} (target {t}) · score ratio {p}%. Data lost: {l} Gb. Safe-mode events: {e} (each costs 15% science). Science only counts once it is downlinked, so downlink capacity and energy decisions drove this result.", { r: Math.round(sim.returned), t: Math.round(c.target), p: (v.ratio * 100).toFixed(0), l: Math.round(sim.lost), e: sim.events })}</p>
        </Panel>
      )}
    </main>
  )
}
