import { Button, Eyebrow, Icon, Meter, Panel, PageTitle, Status } from "./App"
import * as E from "./engine"
import { useT } from "./i18n"

type Go = (s: any) => void
export interface Outcome { aborted?: boolean; key: string; result: "success" | "partial" | "failed"; ratio: number; returned: number; target: number; lost: number; events: number }
const tone = (p: number) => (p > 100 ? "danger" : p >= 85 ? "warn" : "good")
const fmt = (n: number) => Math.round(n).toLocaleString("en-US")
// 100 while usage <= 80%, falling linearly to 0 at 100%
const marginScore = (p: number) => Math.max(0, Math.min(100, Math.round(((100 - p) / 20) * 100)))

export function scoreReport(design: E.Design, o: Outcome | null) {
  const c = E.calc(design)
  const launchFail = !c.massOk || !c.dvOk || !c.foodOk
  const result: "success" | "partial" | "failed" = launchFail ? "failed" : (o?.result ?? "failed")
  const events = o?.events ?? 0, lost = o?.lost ?? 0, ratio = o?.ratio ?? 0
  const cause = !c.massOk ? "mass" : !c.dvOk ? "dv" : !c.foodOk ? "food" : events > 0 ? "power" : result !== "success" ? "comms" : "ok"
  const gbDay = c.on.reduce((s, i) => s + (E.INSTR[i].gbDay * design.duty[i]) / 100, 0)
  const science = launchFail ? 0 : Math.min(100, Math.round(ratio * 100))
  const rel = launchFail ? 0 : Math.max(0, 100 - 25 * events)
  const parts = [marginScore((c.cost / E.BUDGET) * 100), marginScore((c.total / c.limit) * 100), marginScore((c.loadW / c.avgGen) * 100), marginScore((c.fuelUsed / design.propellant) * 100), marginScore((gbDay / (24 * E.CONTACT * E.RATE_GBH.high)) * 100), marginScore((gbDay / E.STORAGE_GB) * 100)]
  const scores = [science, parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], rel]
  const total = launchFail ? Math.round(parts.reduce((a, b) => a + b, 0) / 12) : Math.round(0.4 * science + 0.1 * rel + 0.5 * (parts.reduce((a, b) => a + b, 0) / 6))
  return { launchFail, result, events, lost, ratio, cause, scores, total }
}

export function Resources2({ design, go }: { design: E.Design; go: Go }) {
  const { t, dir } = useT()
  const c = E.calc(design)
  const gbDay = c.on.reduce((s, i) => s + (E.INSTR[i].gbDay * design.duty[i]) / 100, 0)
  const highDay = 24 * E.CONTACT * E.RATE_GBH.high
  const lowDay = 24 * E.CONTACT * E.RATE_GBH.low
  const pc = (a: number, b: number) => Math.round((a / b) * 100)
  const resources = [
    ["Budget", `$${c.cost}M`, `$${E.BUDGET}M`, pc(c.cost, E.BUDGET), "grid"],
    ["Mass", `${fmt(c.total)} kg`, `${fmt(c.limit)} kg`, pc(c.total, c.limit), "mass"],
    ["Power", `${fmt(c.loadW)} W`, `${fmt(c.avgGen)} W`, pc(c.loadW, c.avgGen), "bolt"],
    ["Fuel", `${fmt(c.fuelUsed)} kg`, `${fmt(design.propellant)} kg`, pc(c.fuelUsed, design.propellant), "orbit"],
    ["Food storage", `${fmt(c.crew.foodNeed)} kg`, `${fmt(c.crew.fridgeCap)} kg`, pc(c.crew.foodNeed, Math.max(1, c.crew.fridgeCap)), "food"],
    ["Data storage", `${fmt(gbDay)} Gb/d`, `${fmt(E.STORAGE_GB)} Gb`, pc(gbDay, E.STORAGE_GB), "data"],
    ["Communication", `${fmt(gbDay)} Gb/d`, `${fmt(highDay)} Gb/d`, pc(gbDay, highDay), "signal"],
  ] as const
  const critical = resources.filter((r) => r[3] >= 85).length + (c.massOk ? 0 : 1) * 0
  const rec = !c.foodOk
    ? ["Not enough food storage", "The fridges cannot hold the food that everyone on board needs for the whole journey. Add a fridge, or reduce the number of passengers."]
    : !c.massOk
    ? ["Payload overload", "Mass exceeds the selected launch vehicle capacity. Remove an instrument, reduce propellant or select the heavy vehicle."]
    : !c.dvOk
      ? ["Insufficient Δv", "Available Δv is below the mission requirement. Add propellant or remove mass."]
      : c.balanceW < 0
        ? ["Low power warning", "Battery reserves are decreasing. Disable non-essential instruments or stagger radar and camera operations."]
        : gbDay > lowDay
          ? ["Downlink bottleneck", "Instrument data exceeds LOW downlink capacity. Use HIGH downlink during operations or lower duty cycles."]
          : ["Proceed to mission execution", "Current margins support the planned science sequence and communications schedule."]
  const bad = rec[0] !== "Proceed to mission execution"
  const hard = !c.massOk || !c.dvOk || !c.foodOk
  const dm = E.MISSIONS[design.mission].delayMin
  const delay = dm >= 1 ? `${Math.floor(dm)}m ${String(Math.round((dm % 1) * 60)).padStart(2, "0")}s` : `${(dm * 60).toFixed(1)}s`
  return (
    <main className="page" dir={dir}>
      <PageTitle step="PHASE 03 / RESOURCE ALLOCATION" title="Mission resources"
        detail="Review how configuration choices affect system margins before mission execution."
        status={<Status tone={critical || bad ? "warn" : "good"}>{critical ? t("{n} LIMITS REQUIRE REVIEW", { n: critical }) : bad ? t("ACTION RECOMMENDED") : t("ALL SYSTEMS WITHIN LIMITS")}</Status>} />
      <div className="resource-grid">
        {resources.map(([name, used, total, pct, icon]) => (
          <Panel key={name} className="resource-card">
            <div className="resource-icon"><Icon name={icon} /></div>
            <div><small>{t(name).toUpperCase()}</small><strong>{pct}%</strong></div>
            <Meter label="Consumed / available" value={`${used} / ${total}`} percent={pct} tone={tone(pct)} />
            <p><b>{pct >= 85 ? "Margin critical" : "Margin nominal"}</b>{Math.max(0, 100 - pct)}% remaining</p>
          </Panel>
        ))}
      </div>
      <div className="communications-layout">
        <Panel className="telemetry">
          <div className="panel-head"><span>MISSION CONTROL COMMUNICATION</span><Status tone={gbDay > highDay ? "warn" : "good"}>{gbDay > highDay ? "DEGRADED" : "NOMINAL"}</Status></div>
          <div className="telemetry-visual">
            <div className="earth-node"><div className="mini-earth" /><b>EARTH / DSN-03</b><small>RECEIVING</small></div>
            <div className="signal-path"><i /><i /><i /><span>{delay} {t("DELAY")}</span></div>
            <div className="craft-node"><div className="mini-craft"><span /><i /></div><b>MX–24 / ORBITER</b><small>TRANSMITTING</small></div>
          </div>
          <div className="telemetry-stats">
            <div><small>BATTERY</small><b>{fmt(E.CORE.battWh)} Wh</b></div>
            <div><small>FUEL</small><b>{pc(c.fuelLeft, design.propellant)}%</b></div>
            <div><small>{t("DOWNLINK")}</small><b>1–4 Mbps</b></div>
            <div><small>{t("CONTACT")}</small><b>{Math.round(E.CONTACT * 100)}% {t("of orbit")}</b></div>
          </div>
        </Panel>
        <Panel className={`recommendation ${bad ? "warning" : ""}`}>
          <div className="panel-head"><span>FLIGHT DIRECTOR ADVISORY</span><Icon name={bad ? "warning" : "check"} /></div>
          <Eyebrow>{bad ? t("ACTION RECOMMENDED") : t("CONFIGURATION VALIDATED")}</Eyebrow>
          <h2>{t(rec[0])}</h2>
          <p>{t(rec[1])}</p>
          <div className="impact-chain"><span>DESIGN DECISION</span><Icon name="arrow" /><span>RESOURCE IMPACT</span><Icon name="arrow" /><span>MISSION RISK</span></div>
          <Button onClick={() => go(hard ? "builder" : "simulation")}>{hard ? t("Back to configuration") : bad ? t("Continue with risk") : t("Begin simulation")}</Button>
        </Panel>
      </div>
    </main>
  )
}

export function Results2({ design, outcome, go }: { design: E.Design; outcome: Outcome | null; go: Go }) {
  const { t, dir } = useT()
  const c = E.calc(design)
  const launchFail = !c.massOk || !c.dvOk || !c.foodOk
  const o = outcome && outcome.key === JSON.stringify(design) ? outcome : null
  if (!launchFail && !o) return (
    <main className="page" dir={dir}>
      <PageTitle step="MISSION MX–24 / FINAL REPORT" title="No mission data yet" detail="Run the simulation to the end (72 h) to get the report for your current design."
        status={<Status tone="warn">{t("PENDING")}</Status>} />
      <Panel><div style={{ padding: 16 }}><Button onClick={() => go("simulation")}>{t("Begin simulation")}</Button></div></Panel>
    </main>
  )
  const { result, events, lost, cause } = scoreReport(design, o)
  const copy: Record<string, string[]> = {
    mass: ["Launch vehicle payload limit exceeded", "The configuration never left the pad: total mass was above the selected vehicle capacity."],
    dv: ["Spacecraft cannot reach the target orbit", "The rocket equation gives less Δv than the mission requires."],
    food: ["The crew would have run out of food", "The fridges could not hold enough food for everyone on board for the whole journey, so the mission was not allowed to leave."],
    power: ["Power cascade caused spacecraft safe mode", "The battery dropped below 20% and instruments shut down; each event costs science."],
    comms: ["Downlink capacity limited science return", "Data was generated faster than it could be sent to Earth, or the buffer filled up."],
    ok: ["All primary science objectives achieved", "A balanced design and staged operations preserved every critical engineering margin."],
  }
  const head = result === "success" ? "Mission successful" : result === "partial" ? "Mission partially successful" : "Mission failed"
  const { scores, total } = scoreReport(design, o)
  const labels = ["Science", "Budget", "Mass", "Power", "Fuel", "Comms", "Data", "Reliability"]
  const tn = result === "success" ? "good" : result === "partial" ? "warn" : "danger"
  const lesson: Record<string, [string, string]> = {
    mass: ["Vehicle capacity is a hard design boundary", "Under the scenario assumptions, M_total = Σ component masses. Reduce mass or select a compatible vehicle before launch."],
    dv: ["Δv is a hard requirement", "Available Δv comes from the rocket equation: add propellant or remove mass until Δv meets the mission requirement."],
    food: ["Food is a mass, power and cost problem", "Every extra person needs food for every day of the journey, and every fridge holds a fixed amount. More people means more fridges, which take mass, power and budget away from science."],
    power: ["Power and energy are different constraints", "Instantaneous demand (W) exceeded generation, then depleted stored battery energy (Wh). Schedule high-demand instruments separately."],
    comms: ["Science only counts once it reaches Earth", "Instrument data must fit the onboard buffer and be downlinked in contact windows. Use HIGH downlink or lower duty cycles."],
    ok: ["Margin is a mission capability", "Staging instrument operations preserved stored energy while maintaining science value."],
  }
  const conseq: Record<string, string> = { mass: "Payload exceeded capacity", dv: "Δv shortfall", food: "Not enough food storage", power: "Peak demand exceeded supply", comms: "Downlink limited science return", ok: "Healthy system margins" }
  return (
    <main className="page" dir={dir}>
      <div className={`result-hero ${result}`}>
        <div className="result-orbit"><Icon name={result === "success" ? "check" : "warning"} size={38} /></div>
        <div>
          <Eyebrow>MISSION MX–24 / FINAL REPORT</Eyebrow>
          <h1>{t(head)}</h1><h2>{t(copy[cause][0])}</h2><p>{t(copy[cause][1])}</p>
        </div>
        <div className="result-score"><small>MISSION SCORE</small><strong>{total}</strong><span>/ 100</span><Status tone={tn}>{t(result.toUpperCase())}</Status></div>
      </div>
      <div className="results-grid">
        <Panel className="performance">
          <div className="panel-head"><span>ENGINEERING PERFORMANCE</span><small>{o ? t("Science returned {r} / {t}", { r: fmt(o.returned), t: fmt(o.target) }) : ""}</small></div>
          <div className="score-grid">
            {labels.map((l, i) => (
              <div key={l}>
                <div className={`radial ${scores[i] < 50 ? "danger" : scores[i] < 75 ? "warn" : ""}`} style={{ "--score": `${scores[i] * 3.6}deg` } as React.CSSProperties}><span>{scores[i]}</span></div>
                <b>{t(l)}</b>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="analysis-panel">
          <div className="panel-head"><span>WHY THIS OUTCOME?</span><Status tone={tn}>ANALYSIS</Status></div>
          <div className="decision-chain">
            <div><small>01 / PLAYER DECISION</small><b>{t(E.MISSIONS[design.mission].name)} · {t("{n} instruments · {v}", { n: c.on.length, v: E.VEHICLES[design.vehicle].name })}</b></div>
            <Icon name="arrow" />
            <div><small>02 / CONSEQUENCE</small><b>{t(conseq[cause])}</b></div>
            <Icon name="arrow" />
            <div><small>03 / OUTCOME</small><b>{t(head)}</b></div>
          </div>
          <div className={`lesson ${result}`}>
            <Icon name={result === "success" ? "check" : "book"} />
            <div><small>LESSON LEARNED</small><h3>{t(lesson[cause][0])}</h3><p>{t(lesson[cause][1])}</p></div>
          </div>
          {o && <p style={{ padding: "8px 0" }}>{t("Data lost (buffer full): {a} Gb · Safe-mode events: {b}", { a: fmt(lost), b: events })}</p>}
        </Panel>
      </div>
      <div className="report-actions">
        <Button variant="secondary" icon="arrow" onClick={() => go("builder")}>Review design</Button>
        <Button onClick={() => go("missions")}>Retry mission</Button>
        <Button variant="ghost" icon={null} onClick={() => go("home")}>Return home</Button>
      </div>
      <p className="educational-disclaimer">{t("Scores come from the time-stepped simulation of your own design. All values are illustrative educational assumptions, not validated mission analysis.")}</p>
    </main>
  )
}
