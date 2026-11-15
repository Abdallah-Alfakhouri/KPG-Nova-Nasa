import { useContext, useEffect, useMemo, useState } from "react"
import { Designer, Ops } from "./Game"
import { Resources2, Results2, scoreReport, type Outcome } from "./Screens"
import { NameFields, PlayerCtx, Profile2, initials, loadPlayer, savePlayer, type Player } from "./player"
import { PRESETS, type Design } from "./engine"
import { LangCtx, useT, type Lang } from "./i18n"
import { AutoTranslate } from "./autotranslate"
import { PlayerFigure, PlayersPair } from "./Visuals"

type Screen = "home" | "missions" | "builder" | "resources" | "simulation" | "results" | "guide" | "about" | "profile"
type Scenario = "balanced" | "power" | "mass"

// ---- CSS-drawn artwork (no image files, no photos, no NASA logos) ----
const star = (x: number, y: number, c = "#cfe6f2") => `radial-gradient(1.7px 1.7px at ${x}px ${y}px, ${c}, transparent)`
const STAR_TILES = [
  [star(30, 40) + "," + star(120, 110, "#9fc3d6"), "190px 160px"],
  [star(70, 20, "#fff") + "," + star(210, 150), "260px 200px"],
  [star(15, 90, "#9fc3d6") + "," + star(90, 60) + "," + star(150, 25, "#fff"), "170px 130px"],
] as const
const SPACE_BG = {
  // hero: deep space, sun glow, Earth limb at the bottom right (rocket is drawn in CSS, see .hero-art)
  hero: (overlay: string) => ({
    backgroundImage: [
      overlay,
      "radial-gradient(circle at 76% 124%, transparent 0 31%, rgba(34,211,238,.5) 32%, rgba(34,211,238,.12) 36%, transparent 44%)",
      "radial-gradient(circle at 76% 124%, #2a86b8 0 14%, #17648d 24%, #0a3150 31%, transparent 32%)",
      "radial-gradient(circle at 14% 18%, #fff4c9 0 1.2%, rgba(255,190,80,.55) 2.6%, rgba(255,150,50,.14) 8%, transparent 14%)",
      ...STAR_TILES.map((t) => t[0]),
      "linear-gradient(135deg, #040b17, #0b2340 62%, #07162b)",
    ].join(","),
    backgroundSize: ["cover", "cover", "cover", "cover", ...STAR_TILES.map((t) => t[1]), "cover"].join(","),
    backgroundRepeat: ["no-repeat", "no-repeat", "no-repeat", "no-repeat", "repeat", "repeat", "repeat", "no-repeat"].join(","),
  }),
  // about page: dark control-room look made from glowing console lines
  control: (overlay: string) => ({
    backgroundImage: [
      overlay,
      "radial-gradient(ellipse at 70% 30%, rgba(34,211,238,.22), transparent 55%)",
      "repeating-linear-gradient(0deg, rgba(34,211,238,.07) 0 1px, transparent 1px 34px)",
      "repeating-linear-gradient(90deg, rgba(34,211,238,.07) 0 1px, transparent 1px 34px)",
      "linear-gradient(135deg, #040b17, #0a1f38)",
    ].join(","),
  }),
  mars: {
    backgroundImage: [
      "linear-gradient(180deg, transparent, rgba(5,12,23,.88))",
      "radial-gradient(circle at 70% 38%, #e8794a 0 12%, #c1440e 22%, #7a2a0a 34%, transparent 35%)",
      ...STAR_TILES.map((t) => t[0]),
      "linear-gradient(135deg, #060b16, #1b0f0a)",
    ].join(","),
    backgroundSize: ["cover", "cover", ...STAR_TILES.map((t) => t[1]), "cover"].join(","),
    backgroundRepeat: ["no-repeat", "no-repeat", "repeat", "repeat", "repeat", "no-repeat"].join(","),
  },
}

const nav: { id: Screen; label: string }[] = [
  { id: "home", label: "Overview" },
  { id: "missions", label: "Missions" },
  { id: "builder", label: "Spacecraft" },
  { id: "resources", label: "Resources" },
  { id: "simulation", label: "Simulation" },
  { id: "results", label: "Report" },
]

const missionData = [
  {
    id: "mars",
    name: "Mars Exploration",
    code: "MX–24",
    objective: "Map hydrated minerals and characterize surface geology.",
    duration: "687 days",
    budget: "$820M",
    difficulty: "Advanced",
    constraint: "18 min scenario signal delay",
    tone: "mars",
  },
  {
    id: "lunar",
    name: "Lunar Research",
    code: "LR–12",
    objective: "Study regolith composition near the lunar south pole.",
    duration: "180 days",
    budget: "$480M",
    difficulty: "Intermediate",
    constraint: "Thermal cycling and shadow zones",
    tone: "moon",
  },
  {
    id: "earth",
    name: "Earth Observation",
    code: "EO–08",
    objective: "Monitor atmospheric aerosols and coastal change.",
    duration: "365 days",
    budget: "$340M",
    difficulty: "Foundational",
    constraint: "High daily data volume",
    tone: "earth",
  },
  {
    id: "asteroid",
    name: "Asteroid Study",
    code: "AS–31",
    objective: "Characterize composition and rotational dynamics.",
    duration: "1,120 days",
    budget: "$940M",
    difficulty: "Expert",
    constraint: "Low-light navigation conditions",
    tone: "asteroid",
  },
]

const componentData = [
  {
    name: "Spacecraft Bus",
    spec: "Aegis M-120",
    mass: "420 kg",
    power: "180 W",
    cost: "$92M",
  },
  {
    name: "Solar Array",
    spec: "Dual-junction / 8.2 m²",
    mass: "86 kg",
    power: "+2.4 kW",
    cost: "$38M",
  },
  {
    name: "Battery Bank",
    spec: "Li-ion / 14.8 kWh",
    mass: "112 kg",
    power: "96% eff.",
    cost: "$26M",
  },
  {
    name: "High-gain Antenna",
    spec: "2.1 m Ka-band",
    mass: "48 kg",
    power: "220 W",
    cost: "$31M",
  },
  {
    name: "Propulsion",
    spec: "Bipropellant / 1.8 kN",
    mass: "610 kg",
    power: "35 W",
    cost: "$76M",
  },
  {
    name: "Attitude Control",
    spec: "4 wheels + thrusters",
    mass: "54 kg",
    power: "145 W",
    cost: "$29M",
  },
  {
    name: "Thermal Control",
    spec: "Passive + 12 heaters",
    mass: "74 kg",
    power: "310 W",
    cost: "$22M",
  },
  {
    name: "Communication System",
    spec: "Ka/X-band transponder",
    mass: "31 kg",
    power: "185 W",
    cost: "$27M",
  },
  {
    name: "Data System",
    spec: "Radiation-tolerant / 4 TB",
    mass: "38 kg",
    power: "90 W",
    cost: "$19M",
  },
]

const instruments = [
  {
    name: "Hi-Res Camera",
    short: "HRC",
    detail: "0.5 m/px imaging",
    mass: "82 kg",
    power: "420 W",
    data: "180 Gb/day",
    value: "94",
  },
  {
    name: "Spectrometer",
    short: "SPEC",
    detail: "0.4–2.5 μm range",
    mass: "46 kg",
    power: "165 W",
    data: "42 Gb/day",
    value: "88",
  },
  {
    name: "Magnetometer",
    short: "MAG",
    detail: "±65,000 nT",
    mass: "14 kg",
    power: "28 W",
    data: "2 Gb/day",
    value: "72",
  },
  {
    name: "Radar Instrument",
    short: "RAD",
    detail: "Subsurface sounding",
    mass: "118 kg",
    power: "760 W",
    data: "96 Gb/day",
    value: "91",
  },
]

const scenarioInfo = {
  balanced: {
    label: "Balanced design",
    status: "READY",
    color: "good",
    mass: "2,840",
    massPct: 71,
    power: "1,640",
    powerPct: 68,
    cost: "$642M",
    data: "224",
    outcome: "success",
  },
  power: {
    label: "Power-intensive",
    status: "CAUTION",
    color: "warn",
    mass: "2,970",
    massPct: 74,
    power: "2,610",
    powerPct: 108,
    cost: "$688M",
    data: "320",
    outcome: "partial",
  },
  mass: {
    label: "Payload overload",
    status: "NO-GO",
    color: "danger",
    mass: "4,180",
    massPct: 105,
    power: "2,080",
    powerPct: 86,
    cost: "$756M",
    data: "286",
    outcome: "failed",
  },
}

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    orbit: (
      <>
        <circle cx="12" cy="12" r="2.4" />
        <ellipse
          cx="12"
          cy="12"
          rx="9"
          ry="4.2"
          transform="rotate(-28 12 12)"
        />
        <circle cx="19.5" cy="8" r="1.2" fill="currentColor" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    warning: (
      <>
        <path d="M12 3 2.5 20h19L12 3Z" />
        <path d="M12 9v4M12 17h.01" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 21c.8-4 3-6 7-6s6.2 2 7 6" />
      </>
    ),
    signal: (
      <>
        <path d="M5 16a10 10 0 0 1 14 0M8 19a6 6 0 0 1 8 0" />
        <circle cx="12" cy="22" r="1" fill="currentColor" />
      </>
    ),
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z" />,
    food: (
      <>
        <rect x="6" y="2.5" width="12" height="19" rx="1.5" />
        <path d="M6 9.5h12M9 5.5v2M9 12.5v3" />
      </>
    ),
    mass: (
      <>
        <path d="M7 8h10l3 13H4L7 8Z" />
        <circle cx="12" cy="5" r="3" />
      </>
    ),
    data: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
      </>
    ),
    book: (
      <>
        <path d="M4 5c4-1 6 0 8 2v14c-2-2-4-3-8-2V5ZM20 5c-4-1-6 0-8 2v14c2-2 4-3 8-2V5Z" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" />,
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      </>
    ),
  }
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.orbit}
    </svg>
  )
}

export function Button({
  children,
  onClick,
  variant = "primary",
  icon = "arrow",
  className = "",
  disabled = false,
}: {
  children: React.ReactNode
  onClick?: () => void
  variant?: "primary" | "secondary" | "ghost" | "danger"
  icon?: string | null
  className?: string
  disabled?: boolean
}) {
  return (
    <button className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
      {icon && <Icon name={icon} size={16} />}
    </button>
  )
}

export function Status({
  children,
  tone = "good",
}: {
  children: React.ReactNode
  tone?: string
}) {
  return (
    <span className={`status status-${tone}`}>
      <i />
      {children}
    </span>
  )
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode
  className?: string
}) {
  return <section className={`panel ${className}`}>{children}</section>
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="eyebrow">
      <span /> {children}
    </div>
  )
}

function Header({
  screen,
  setScreen,
}: {
  screen: Screen
  setScreen: (s: Screen) => void
}) {
  const { t, lang } = useT()
  const { setLang } = useContext(LangCtx)
  const { player } = useContext(PlayerCtx)
  return (
    <header className="topbar">
      <button
        className="brand"
        onClick={() => setScreen("home")}
        aria-label="Mission Architect home"
      >
        <span className="brandmark">
          <Icon name="orbit" size={22} />
        </span>
        <span>
          <b>MISSION</b> ARCHITECT<small>EDUCATIONAL SYSTEMS LAB</small>
        </span>
      </button>
      <nav className="mainnav" aria-label="Primary navigation">
        {nav.map((item) => (
          <button
            key={item.id}
            className={screen === item.id ? "active" : ""}
            onClick={() => setScreen(item.id)}
          >
            {t(item.label)}
          </button>
        ))}
      </nav>
      <div className="top-actions">
        <Status>{t("LINK ONLINE")}</Status>
        <select className="language-select" aria-label="Interface language" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
          <option value="EN">English</option>
          <option value="FR">Français</option>
        </select>
        <button
          className="icon-btn"
          onClick={() => setScreen("guide")}
          aria-label="How to play"
        >
          <Icon name="book" />
        </button>
        <button className="profile-chip" onClick={() => setScreen("profile")}>
          <span>{initials(player.name)}</span>
          <b>
            {player.name.trim() ? player.name.trim().toUpperCase() : t("SET YOUR NAME")}<small>COMMANDER</small>
          </b>
        </button>
      </div>
    </header>
  )
}

function PrevBar({ label, onBack }: { label: string; onBack: () => void }) {
  const { t } = useT()
  return (
    <div className="prevbar">
      <button onClick={onBack} aria-label={t("Previous page")}>
        <Icon name="arrow" size={14} />
        <span>{t("Previous page")}</span>
        <small>{t(label)}</small>
      </button>
    </div>
  )
}

export function PageTitle({
  step,
  title,
  detail,
  status,
}: {
  step: string
  title: string
  detail: string
  status?: React.ReactNode
}) {
  return (
    <div className="page-title">
      <div>
        <Eyebrow>{step}</Eyebrow>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      {status}
    </div>
  )
}

function Home({
  go,
  mode,
  setMode,
}: {
  go: (s: Screen) => void
  mode: string
  setMode: (s: string) => void
}) {
  return (
    <main className="home">
      <div
        className="hero-image"
        style={SPACE_BG.hero("linear-gradient(90deg, rgba(4,10,20,.98) 0%, rgba(4,10,20,.82) 42%, rgba(4,10,20,.08) 74%)")}
      />
      <div className="hero-art" aria-hidden="true">
        <div className="hero-rocket">
          <i className="hr-glow" />
          <i className="hr-flame" />
          <i className="hr-boost l" />
          <i className="hr-boost r" />
          <i className="hr-fin l" />
          <i className="hr-fin r" />
          <i className="hr-body"><b className="hr-tip" /><b className="hr-win" /><b className="hr-band" /></i>
          <i className="hr-nozzle" />
        </div>
        <div className="hero-sat"><i /><b /><i /></div>
        <svg className="hero-orbit" viewBox="0 0 1000 600" preserveAspectRatio="none"><path d="M60,560 C380,160 780,60 1000,120" /></svg>
      </div>
      <div className="hero-grid" />
      <div className="hero-content">
        <Eyebrow>MISSION DESIGN / COHORT 06</Eyebrow>
        <h1>
          ENGINEER THE
          <br />
          <em>IMPOSSIBLE.</em>
        </h1>
        <p className="hero-tagline">
          Design your mission. Manage your resources. Shape your success.
        </p>
        <p className="hero-copy">
          You are the commander of a new space mission. Configure the
          spacecraft, select scientific instruments, manage limited resources,
          and ensure mission success.
        </p>
        <NameFields mode={mode} />
        <div className="mode-select" role="group" aria-label="Player mode">
          <button
            className={mode === "single" ? "selected" : ""}
            onClick={() => setMode("single")}
          >
            <Icon name="user" />{" "}
            <span>
              <b>Single Player</b>
              <small>Full mission authority</small>
            </span>
          </button>
          <button
            className={mode === "coop" ? "selected" : ""}
            onClick={() => setMode("coop")}
          >
            <PlayersPair size={22} />{" "}
            <span>
              <b>Co-op Crew</b>
              <small>Commander + engineer</small>
            </span>
          </button>
        </div>
        <div className="hero-actions">
          <Button onClick={() => go("missions")}>Initialize mission</Button>
          <Button variant="secondary" icon="book" onClick={() => go("guide")}>
            How it works
          </Button>
        </div>
      </div>
      <div className="hero-telemetry">
        <div>
          <small>NETWORK</small>
          <b>DSN / 03</b>
        </div>
        <div>
          <small>MISSION CLOCK</small>
          <b>T− 00:18:42</b>
        </div>
        <div>
          <small>TRAINING MODE</small>
          <b>SCENARIO-BASED</b>
        </div>
      </div>
      <button className="about-link" onClick={() => go("about")}>
        About the project <Icon name="arrow" size={14} />
      </button>
    </main>
  )
}

function Missions({
  selected,
  setSelected,
  go,
}: {
  selected: string
  setSelected: (s: string) => void
  go: (s: Screen) => void
}) {
  const mission = missionData.find((m) => m.id === selected)!
  return (
    <main className="page">
      <PageTitle
        step="PHASE 01 / MISSION DEFINITION"
        title="Select mission profile"
        detail="Choose a scientific objective. Every profile introduces different resource and engineering constraints."
        status={
          <div className="assumption-note">
            <Icon name="book" />
            <span>
              <b>EDUCATIONAL ASSUMPTIONS</b>All values are simplified scenario
              parameters.
            </span>
          </div>
        }
      />
      <div className="mission-layout">
        <div className="mission-cards">
          {missionData.map((m, i) => (
            <button
              key={m.id}
              className={`mission-card ${selected === m.id ? "selected" : ""}`}
              onClick={() => setSelected(m.id)}
            >
              <div
                className={`mission-art ${m.tone}`}
                style={
                  m.id === "mars"
                    ? SPACE_BG.mars
                    : undefined
                }
              >
                <span>0{i + 1}</span>
                <Status
                  tone={
                    m.difficulty === "Expert"
                      ? "danger"
                      : m.difficulty === "Advanced"
                        ? "warn"
                        : "good"
                  }
                >
                  {m.difficulty}
                </Status>
              </div>
              <div className="mission-card-body">
                <small>{m.code}</small>
                <h3>{m.name}</h3>
                <p>{m.objective}</p>
                <div className="card-constraint">
                  <Icon name="warning" size={12} />
                  {m.constraint}
                </div>
                <dl>
                  <div>
                    <dt>DURATION</dt>
                    <dd>{m.duration}</dd>
                  </div>
                  <div>
                    <dt>BUDGET</dt>
                    <dd>{m.budget}</dd>
                  </div>
                </dl>
              </div>
            </button>
          ))}
        </div>
        <Panel className="mission-detail">
          <div className="panel-head">
            <span>MISSION BRIEF / {mission.code}</span>
            <Status>AVAILABLE</Status>
          </div>
          <div className={`planet-visual ${mission.tone}`}>
            <div className="orbit-ring" />
            <div className="planet" />
            <span>TRAJECTORY PREVIEW</span>
          </div>
          <Eyebrow>PRIMARY OBJECTIVE</Eyebrow>
          <h2>{mission.name}</h2>
          <p className="lead">{mission.objective}</p>
          <div className="spec-list">
            <div>
              <Icon name="target" />
              <span>
                <small>SCIENCE TARGET</small>
                <b>Surface & environment characterization</b>
              </span>
            </div>
            <div>
              <Icon name="signal" />
              <span>
                <small>COMMUNICATION</small>
                <b>{mission.constraint}</b>
              </span>
            </div>
            <div>
              <Icon name="mass" />
              <span>
                <small>PAYLOAD ENVELOPE</small>
                <b>4,000 kg scenario capacity</b>
              </span>
            </div>
          </div>
          <div className="constraint">
            <Icon name="warning" />
            <p>
              <b>Special constraint</b>
              {mission.constraint}. Account for this condition before final
              configuration.
            </p>
          </div>
          <Button className="full" onClick={() => go("builder")}>
            Confirm {mission.code}
          </Button>
        </Panel>
      </div>
    </main>
  )
}

function Builder({
  scenario,
  setScenario,
  go,
}: {
  scenario: Scenario
  setScenario: (s: Scenario) => void
  go: (s: Screen) => void
}) {
  const info = scenarioInfo[scenario]
  const selectedInstruments =
    scenario === "balanced"
      ? ["HRC", "SPEC", "MAG"]
      : scenario === "power"
        ? ["HRC", "SPEC", "MAG", "RAD"]
        : ["HRC", "SPEC", "RAD"]
  return (
    <main className="page">
      <PageTitle
        step="PHASE 02 / SYSTEMS ENGINEERING"
        title="Spacecraft configuration"
        detail="Explore three predefined design cases. Values demonstrate decision relationships, not live physics."
        status={<Status tone={info.color}>CONFIGURATION {info.status}</Status>}
      />
      <div className="builder-layout">
        <Panel className="components-panel">
          <div className="panel-head">
            <span>CORE SYSTEMS / 09</span>
            <small>ILLUSTRATIVE VALUES</small>
          </div>
          <div className="component-list">
            {componentData.map((c, i) => (
              <div className="component-row" key={c.name}>
                <span className="component-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <b>{c.name}</b>
                  <small>{c.spec}</small>
                </div>
                <dl>
                  <span>
                    <dt>MASS</dt>
                    <dd>{c.mass}</dd>
                  </span>
                  <span>
                    <dt>POWER</dt>
                    <dd>{c.power}</dd>
                  </span>
                  <span>
                    <dt>COST</dt>
                    <dd>{c.cost}</dd>
                  </span>
                </dl>
                <Icon name="check" />
              </div>
            ))}
          </div>
        </Panel>
        <div className="builder-center">
          <Panel className="spacecraft-stage">
            <div className="stage-label">
              <span>ASSEMBLY VIEW / PORT</span>
              <Status tone={info.color}>{info.status}</Status>
            </div>
            <div
              className="craft-graphic"
              aria-label="Modular spacecraft schematic"
            >
              <div className="solar left" />
              <div className="solar right" />
              <div className="craft-body">
                <div className="antenna" />
                <div className="bus-lines" />
              </div>
              <div className="engine" />
              <span className="callout c1">HGA / KA-BAND</span>
              <span className="callout c2">BUS / AEGIS M-120</span>
              <span className="callout c3">SOLAR ARRAY / 2.4 kW</span>
            </div>
            <div className="scenario-tabs">
              {(["balanced", "power", "mass"] as Scenario[]).map((s) => (
                <button
                  key={s}
                  className={scenario === s ? "active" : ""}
                  onClick={() => setScenario(s)}
                >
                  <span>
                    {s === "balanced" ? "A" : s === "power" ? "B" : "C"}
                  </span>
                  {scenarioInfo[s].label}
                  <Status tone={scenarioInfo[s].color}>
                    {scenarioInfo[s].status}
                  </Status>
                </button>
              ))}
            </div>
          </Panel>
          <Panel>
            <div className="panel-head">
              <span>SCIENCE PAYLOAD</span>
              <small>{selectedInstruments.length} SELECTED</small>
            </div>
            <div className="instrument-grid">
              {instruments.map((ins) => (
                <div
                  key={ins.short}
                  className={`instrument ${
                    selectedInstruments.includes(ins.short) ? "selected" : ""
                  }`}
                >
                  <div className="instrument-top">
                    <span>{ins.short}</span>
                    {selectedInstruments.includes(ins.short) && (
                      <Icon name="check" />
                    )}
                  </div>
                  <b>{ins.name}</b>
                  <small>{ins.detail}</small>
                  <div className="instrument-stats">
                    <span>
                      {ins.mass}
                      <small>MASS</small>
                    </span>
                    <span>
                      {ins.power}
                      <small>POWER</small>
                    </span>
                    <span>
                      {ins.data}
                      <small>DATA</small>
                    </span>
                  </div>
                  <div className="science-value">
                    <i style={{ width: `${ins.value}%` }} />
                    <small>SCIENCE VALUE {ins.value}</small>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
        <Panel className="summary-panel">
          <div className="panel-head">
            <span>DESIGN SUMMARY</span>
            <small>
              CASE{" "}
              {scenario === "balanced" ? "A" : scenario === "power" ? "B" : "C"}
            </small>
          </div>
          <div className="summary-score">
            <small>CONFIGURATION STATUS</small>
            <strong className={info.color}>{info.status}</strong>
            <p>
              {scenario === "balanced"
                ? "All margins remain within scenario limits."
                : scenario === "power"
                  ? "Peak operations exceed available power."
                  : "Launch payload capacity exceeded by 180 kg."}
            </p>
          </div>
          <Meter
            label="Total mass"
            value={`${info.mass} / 4,000 kg`}
            percent={info.massPct}
            tone={info.color}
          />
          <Meter
            label="Peak power"
            value={`${info.power} / 2,420 W`}
            percent={info.powerPct}
            tone={info.color}
          />
          <Meter
            label="Mission budget"
            value={`${info.cost} / $820M`}
            percent={scenario === "mass" ? 92 : 78}
            tone={scenario === "mass" ? "warn" : "good"}
          />
          <div className="launch-card">
            <small>LAUNCH VEHICLE / SELECTED</small>
            <b>Atlas N2 Medium</b>
            <span>4,000 kg max · $118M · Mars compatible</span>
            <span>Constraint: medium payload envelope</span>
          </div>
          <div className="launch-card alternate">
            <small>ALTERNATE VEHICLE</small>
            <b>Nova Heavy H4</b>
            <span>7,200 kg max · $186M · Mars compatible</span>
            <span>Constraint: higher cost / limited window</span>
            <button>Select alternate</button>
          </div>
          {scenario !== "balanced" && (
            <div className={`constraint ${info.color}`}>
              <Icon name="warning" />
              <p>
                <b>Engineering warning</b>
                {scenario === "power"
                  ? "Radar and camera cannot operate together at full duty cycle."
                  : "Payload exceeds selected launch vehicle capacity."}
              </p>
            </div>
          )}
          <Button className="full" onClick={() => go("resources")}>
            Lock configuration
          </Button>
        </Panel>
      </div>
    </main>
  )
}

export function Meter({
  label,
  value,
  percent,
  tone = "good",
}: {
  label: string
  value: string
  percent: number
  tone?: string
}) {
  return (
    <div className="meter">
      <div>
        <span>{label}</span>
        <b>{value}</b>
      </div>
      <div className="meter-track">
        <i className={tone} style={{ width: `${Math.min(percent, 100)}%` }} />
        <em style={{ left: "85%" }} />
      </div>
      <small>
        {percent}% USED <span>WARNING AT 85%</span>
      </small>
    </div>
  )
}

function Resources({
  scenario,
  go,
}: {
  scenario: Scenario
  go: (s: Screen) => void
}) {
  const info = scenarioInfo[scenario]
  const resources = [
    ["Budget", info.cost, "$820M", scenario === "mass" ? 92 : 78, "grid"],
    ["Mass", `${info.mass} kg`, "4,000 kg", info.massPct, "mass"],
    ["Power", `${info.power} W`, "2,420 W", info.powerPct, "bolt"],
    ["Fuel", "1,140 kg", "1,520 kg", scenario === "mass" ? 82 : 75, "orbit"],
    [
      "Data storage",
      `${scenario === "power" ? "3.7" : "2.2"} TB`,
      "4.0 TB",
      scenario === "power" ? 93 : 55,
      "data",
    ],
    [
      "Communication",
      scenario === "power" ? "68 Mbps" : "42 Mbps",
      "72 Mbps",
      scenario === "power" ? 94 : 58,
      "signal",
    ],
  ] as const
  const critical = scenario !== "balanced"
  return (
    <main className="page">
      <PageTitle
        step="PHASE 03 / RESOURCE ALLOCATION"
        title="Mission resources"
        detail="Review how configuration choices affect system margins before mission execution."
        status={
          <Status tone={critical ? "warn" : "good"}>
            {critical ? "2 LIMITS REQUIRE REVIEW" : "ALL SYSTEMS WITHIN LIMITS"}
          </Status>
        }
      />
      <div className="resource-grid">
        {resources.map(([name, used, total, pct, icon]) => (
          <Panel key={name} className="resource-card">
            <div className="resource-icon">
              <Icon name={icon} />
            </div>
            <div>
              <small>{name.toUpperCase()}</small>
              <strong>{pct}%</strong>
            </div>
            <Meter
              label="Consumed / available"
              value={`${used} / ${total}`}
              percent={pct}
              tone={pct > 100 ? "danger" : pct >= 85 ? "warn" : "good"}
            />
            <p>
              <b>{pct >= 85 ? "Margin critical" : "Margin nominal"}</b>
              {Math.max(0, 100 - pct)}% remaining
            </p>
          </Panel>
        ))}
      </div>
      <div className="communications-layout">
        <Panel className="telemetry">
          <div className="panel-head">
            <span>MISSION CONTROL COMMUNICATION</span>
            <Status tone={critical ? "warn" : "good"}>
              {critical ? "DEGRADED" : "NOMINAL"}
            </Status>
          </div>
          <div className="telemetry-visual">
            <div className="earth-node">
              <div className="mini-earth" />
              <b>EARTH / DSN-03</b>
              <small>RECEIVING</small>
            </div>
            <div className="signal-path">
              <i />
              <i />
              <i />
              <span>
                {scenario === "balanced" ? "18m 42s" : "21m 08s"} DELAY
              </span>
            </div>
            <div className="craft-node">
              <div className="mini-craft">
                <span />
                <i />
              </div>
              <b>MX–24 / ORBITER</b>
              <small>TRANSMITTING</small>
            </div>
          </div>
          <div className="telemetry-stats">
            <div>
              <small>BATTERY</small>
              <b className={scenario === "power" ? "warn-text" : ""}>
                {scenario === "power" ? "18%" : "74%"}
              </b>
            </div>
            <div>
              <small>FUEL</small>
              <b>76%</b>
            </div>
            <div>
              <small>SIGNAL</small>
              <b>−72 dBm</b>
            </div>
            <div>
              <small>ANTENNA</small>
              <b>LOCKED</b>
            </div>
            <div>
              <small>LAST PACKET</small>
              <b>04:21 UTC</b>
            </div>
          </div>
        </Panel>
        <Panel className={`recommendation ${critical ? "warning" : ""}`}>
          <div className="panel-head">
            <span>FLIGHT DIRECTOR ADVISORY</span>
            <Icon name={critical ? "warning" : "check"} />
          </div>
          <Eyebrow>
            {critical ? "ACTION RECOMMENDED" : "CONFIGURATION VALIDATED"}
          </Eyebrow>
          <h2>
            {scenario === "power"
              ? "Low power warning"
              : scenario === "mass"
                ? "Payload overload"
                : "Proceed to mission execution"}
          </h2>
          <p>
            {scenario === "power"
              ? "Battery reserves are decreasing. Disable non-essential instruments or stagger radar and camera operations."
              : scenario === "mass"
                ? "The selected launch vehicle cannot safely accommodate this configuration under scenario assumptions."
                : "Current margins support the planned science sequence and communications schedule."}
          </p>
          <div className="impact-chain">
            <span>DESIGN DECISION</span>
            <Icon name="arrow" />
            <span>RESOURCE IMPACT</span>
            <Icon name="arrow" />
            <span>MISSION RISK</span>
          </div>
          <Button onClick={() => go("simulation")}>
            {critical ? "Continue with risk" : "Begin simulation"}
          </Button>
        </Panel>
      </div>
      <Panel className="comm-timeline">
        <div className="panel-head">
          <span>TELEMETRY EXCHANGE / PREDEFINED SEQUENCE</span>
          <small>SCENARIO-BASED CONCEPT</small>
        </div>
        <div className="timeline-steps">
          {[
            "Collect resources",
            "Generate telemetry",
            "Transmit to Earth",
            "Signal delay",
            "Control evaluates",
            "Command uplink",
          ].map((x, i) => (
            <div key={x}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <b>{x}</b>
              {i < 5 && <Icon name="arrow" />}
            </div>
          ))}
        </div>
      </Panel>
    </main>
  )
}

function Simulation({
  scenario,
  setScenario,
  decision,
  setDecision,
  go,
}: {
  scenario: Scenario
  setScenario: (s: Scenario) => void
  decision: string
  setDecision: (s: string) => void
  go: (s: Screen) => void
}) {
  const danger = scenario !== "balanced"
  const stages = [
    "Launch",
    "Orbit insertion",
    "Deployment",
    "Science ops",
    "Data downlink",
    "Completion",
  ]
  return (
    <main className="page simulation-page">
      <PageTitle
        step="PHASE 04 / BRANCHING SCENARIO"
        title="Mission execution"
        detail="MX–24 · Mars orbital insertion · Sol 118"
        status={
          <div className="mission-clock">
            <small>MISSION ELAPSED TIME</small>
            <b>T+ 118:07:42:19</b>
          </div>
        }
      />
      <div className="sim-layout">
        <Panel className="trajectory">
          <div className="panel-head">
            <span>TRAJECTORY / MARS ARRIVAL</span>
            <Status tone={danger ? "warn" : "good"}>
              {danger ? "CAUTION" : "NOMINAL"}
            </Status>
          </div>
          <div className="space-map">
            <div className="starfield" />
            <div className="mars-sphere" />
            <svg viewBox="0 0 900 430" preserveAspectRatio="none">
              <path
                d="M40 335 C250 320, 300 100, 540 128 S770 325, 848 170"
                className="orbit-path"
              />
              <path
                d="M520 310 C600 220, 700 220, 825 170"
                className="transfer-path"
              />
              <circle cx="564" cy="120" r="7" className="craft-dot" />
            </svg>
            <span className="map-label arrival">
              MARS ORBIT INSERTION
              <br />
              <b>PERIAPSIS 04:12 UTC</b>
            </span>
            <span className="map-label craft">
              MX–24
              <br />
              <b>12,840 km/h</b>
            </span>
          </div>
          <div className="stage-track">
            {stages.map((s, i) => (
              <div key={s} className={i < 3 ? "done" : i === 3 ? "active" : ""}>
                <i>{i < 3 ? <Icon name="check" size={12} /> : i + 1}</i>
                <span>
                  <b>{s}</b>
                  <small>
                    {i < 3 ? "COMPLETE" : i === 3 ? "IN PROGRESS" : "PENDING"}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className={`event-panel ${danger ? "alert" : ""}`}>
          <div className="event-number">EVENT / 04</div>
          <Icon name={danger ? "warning" : "target"} size={30} />
          <Eyebrow>
            {danger ? "DECISION REQUIRED" : "SCIENCE WINDOW OPEN"}
          </Eyebrow>
          <h2>
            {scenario === "power"
              ? "Low power reserves"
              : scenario === "mass"
                ? "Launch constraint violated"
                : "Optimal imaging pass"}
          </h2>
          <p>
            {scenario === "power"
              ? "Concurrent radar and camera operations drove battery state below the 20% scenario threshold."
              : scenario === "mass"
                ? "Pre-launch verification confirms total mass exceeds the Atlas N2 payload assumption by 180 kg."
                : "The spacecraft is stable and resources are within margin. Select the planned science response."}
          </p>
          <div className="cause">
            <small>LINKED DESIGN DECISION</small>
            <b>
              {scenario === "power"
                ? "Four high-demand instruments selected"
                : scenario === "mass"
                  ? "Heavy radar + propulsion package"
                  : "Balanced payload and staggered operations"}
            </b>
          </div>
          <div className="decision-options">
            <button
              className={decision === "safe" ? "selected" : ""}
              onClick={() => setDecision("safe")}
            >
              <span>A</span>
              <div>
                <b>
                  {scenario === "mass"
                    ? "Return to vehicle selection"
                    : "Protect mission systems"}
                </b>
                <small>
                  {scenario === "power"
                    ? "Disable radar; preserve battery."
                    : scenario === "mass"
                      ? "Select heavy-lift vehicle."
                      : "Execute staged observation plan."}
                </small>
              </div>
            </button>
            <button
              className={decision === "risk" ? "selected risk" : ""}
              onClick={() => setDecision("risk")}
            >
              <span>B</span>
              <div>
                <b>
                  {scenario === "mass"
                    ? "Proceed with launch"
                    : "Prioritize science yield"}
                </b>
                <small>
                  {scenario === "power"
                    ? "Continue all instruments."
                    : scenario === "mass"
                      ? "Accept payload exceedance."
                      : "Run all instruments concurrently."}
                </small>
              </div>
            </button>
          </div>
          {decision && (
            <div
              className={`outcome-preview ${decision === "risk" ? "risk" : ""}`}
            >
              <b>PREDEFINED OUTCOME</b>
              <p>
                {decision === "safe"
                  ? scenario === "mass"
                    ? "Vehicle change restores payload margin; budget efficiency decreases."
                    : "Battery recovers; radar science is deferred, protecting mission continuity."
                  : scenario === "balanced"
                    ? "Data yield increases, but power margin drops to caution."
                    : "Constraint escalates and mission outcome deteriorates."}
              </p>
            </div>
          )}
          <Button
            variant={decision === "risk" ? "danger" : "primary"}
            onClick={() => go("results")}
            className="full"
          >
            {decision ? "Resolve scenario" : "Select a response"}
          </Button>
        </Panel>
      </div>
      <div className="sim-bottom">
        <Panel>
          <div className="panel-head">
            <span>LIVE TELEMETRY</span>
            <small>PACKET 4,820</small>
          </div>
          <div className="mini-chart">
            <svg viewBox="0 0 500 90" preserveAspectRatio="none">
              <path d="M0 68 L45 63 90 67 135 46 180 51 225 22 270 38 315 30 360 52 405 44 450 58 500 47" />
              <path
                className="cyan"
                d="M0 48 L45 50 90 45 135 52 180 43 225 49 270 44 315 47 360 42 405 44 450 40 500 42"
              />
            </svg>
            <div>
              <span>
                POWER BUS <b>{scenario === "power" ? "18%" : "74%"}</b>
              </span>
              <span>
                FUEL MARGIN <b>24%</b>
              </span>
              <span>
                DATA BUFFER <b>{scenario === "power" ? "93%" : "55%"}</b>
              </span>
            </div>
          </div>
        </Panel>
        <Panel>
          <div className="panel-head">
            <span>EVENT LOG</span>
            <small>UTC</small>
          </div>
          <div className="event-log">
            <p>
              <time>04:21:18</time>
              <Status>LINK</Status>Telemetry packet received
            </p>
            <p>
              <time>04:18:02</time>
              <Status tone={danger ? "warn" : "good"}>
                {danger ? "WARN" : "OPS"}
              </Status>
              {danger
                ? "Resource threshold crossed"
                : "Observation pass initiated"}
            </p>
            <p>
              <time>04:12:44</time>
              <Status>GNC</Status>Attitude lock confirmed
            </p>
          </div>
        </Panel>
      </div>
      <div className="scenario-switch">
        <span>DEMO SCENARIO:</span>
        {(["balanced", "power", "mass"] as Scenario[]).map((s, i) => (
          <button
            key={s}
            className={scenario === s ? "active" : ""}
            onClick={() => {
              setScenario(s)
              setDecision("")
            }}
          >
            0{i + 1} · {scenarioInfo[s].label}
          </button>
        ))}
      </div>
    </main>
  )
}

function Results({
  scenario,
  decision,
  go,
  setScenario,
}: {
  scenario: Scenario
  decision: string
  go: (s: Screen) => void
  setScenario: (s: Scenario) => void
}) {
  const rescued = decision === "safe"
  const result =
    scenario === "balanced"
      ? "success"
      : scenario === "power" && rescued
        ? "partial"
        : scenario === "mass" && rescued
          ? "partial"
          : "failed"
  const copy =
    result === "success"
      ? [
          "Mission successful",
          "All primary science objectives achieved",
          "A balanced design and staged operations preserved every critical engineering margin.",
        ]
      : result === "partial"
        ? [
            "Mission partially successful",
            scenario === "mass"
              ? "Vehicle change protected launch feasibility"
              : "Core objectives achieved; radar study deferred",
            "Your corrective decision protected mission continuity, but reduced efficiency or science return.",
          ]
        : [
            "Mission failed",
            scenario === "mass"
              ? "Launch vehicle payload limit exceeded"
              : "Power cascade caused spacecraft safe mode",
            "The initial design constraint was not corrected at the decision point.",
          ]
  const scores =
    result === "success"
      ? [94, 86, 90, 92, 82, 91, 88, 93]
      : result === "partial"
        ? [72, 68, 78, 61, 76, 80, 65, 74]
        : [
            24,
            58,
            scenario === "mass" ? 18 : 64,
            scenario === "power" ? 12 : 62,
            54,
            48,
            31,
            27,
          ]
  const labels = [
    "Science",
    "Budget",
    "Mass",
    "Power",
    "Fuel",
    "Comms",
    "Data",
    "Reliability",
  ]
  return (
    <main className="page">
      <div className={`result-hero ${result}`}>
        <div className="result-orbit">
          <Icon name={result === "success" ? "check" : "warning"} size={38} />
        </div>
        <div>
          <Eyebrow>MISSION MX–24 / FINAL REPORT</Eyebrow>
          <h1>{copy[0]}</h1>
          <h2>{copy[1]}</h2>
          <p>{copy[2]}</p>
        </div>
        <div className="result-score">
          <small>MISSION SCORE</small>
          <strong>
            {result === "success" ? "91" : result === "partial" ? "72" : "34"}
          </strong>
          <span>/ 100</span>
          <Status
            tone={
              result === "success"
                ? "good"
                : result === "partial"
                  ? "warn"
                  : "danger"
            }
          >
            {result.toUpperCase()}
          </Status>
        </div>
      </div>
      <div className="results-grid">
        <Panel className="performance">
          <div className="panel-head">
            <span>ENGINEERING PERFORMANCE</span>
            <small>WEIGHTED SCENARIO SCORE</small>
          </div>
          <div className="score-grid">
            {labels.map((l, i) => (
              <div key={l}>
                <div
                  className={`radial ${
                    scores[i] < 50 ? "danger" : scores[i] < 75 ? "warn" : ""
                  }`}
                  style={
                    {
                      "--score": `${scores[i] * 3.6}deg`,
                    } as React.CSSProperties
                  }
                >
                  <span>{scores[i]}</span>
                </div>
                <b>{l}</b>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="analysis-panel">
          <div className="panel-head">
            <span>WHY THIS OUTCOME?</span>
            <Status
              tone={
                result === "success"
                  ? "good"
                  : result === "partial"
                    ? "warn"
                    : "danger"
              }
            >
              ANALYSIS
            </Status>
          </div>
          <div className="decision-chain">
            <div>
              <small>01 / PLAYER DECISION</small>
              <b>{scenarioInfo[scenario].label} configuration</b>
            </div>
            <Icon name="arrow" />
            <div>
              <small>02 / CONSEQUENCE</small>
              <b>
                {scenario === "balanced"
                  ? "Healthy system margins"
                  : scenario === "power"
                    ? "Peak demand exceeded supply"
                    : "Payload exceeded capacity"}
              </b>
            </div>
            <Icon name="arrow" />
            <div>
              <small>03 / OUTCOME</small>
              <b>{copy[0]}</b>
            </div>
          </div>
          <div className={`lesson ${result}`}>
            <Icon name={result === "success" ? "check" : "book"} />
            <div>
              <small>LESSON LEARNED</small>
              <h3>
                {scenario === "balanced"
                  ? "Margin is a mission capability"
                  : scenario === "power"
                    ? "Power and energy are different constraints"
                    : "Vehicle capacity is a hard design boundary"}
              </h3>
              <p>
                {scenario === "balanced"
                  ? "Staging instrument operations preserved stored energy while maintaining science value."
                  : scenario === "power"
                    ? "Instantaneous demand (W) exceeded generation, then depleted stored battery energy (Wh). Schedule high-demand instruments separately."
                    : "Under the scenario assumptions, M_total = Σ component masses. Reduce mass or select a compatible vehicle before launch."}
              </p>
            </div>
          </div>
        </Panel>
      </div>
      <div className="report-actions">
        <Button
          variant="secondary"
          icon="arrow"
          onClick={() => {
            setScenario("balanced")
            go("builder")
          }}
        >
          Review design
        </Button>
        <Button onClick={() => go("missions")}>Retry mission</Button>
        <Button variant="ghost" icon={null} onClick={() => go("home")}>
          Return home
        </Button>
      </div>
      <p className="educational-disclaimer">
        This report represents a predefined educational branch. It is not an
        operational simulation or validated mission-performance analysis.
      </p>
    </main>
  )
}

function Guide({ go }: { go: (s: Screen) => void }) {
  const concepts = [
    [
      "Mass management",
      "M_total = Σ component masses",
      "Total spacecraft mass must remain within the selected vehicle capacity.",
    ],
    [
      "Power & energy",
      "E_remaining = E_available − E_consumed",
      "Power (W) is instantaneous demand; energy (Wh) is stored capacity over time.",
    ],
    [
      "Budget",
      "B_remaining = B_initial − B_spent",
      "Every system choice trades cost against capability, risk, and margin.",
    ],
    [
      "Fuel & propulsion",
      "Δv = ve ln(m₀ / mf)",
      "The Tsiolkovsky equation introduces how mass ratio relates to velocity change.",
    ],
    [
      "Orbital constraints",
      "Trajectory → time + fuel + access",
      "Orbit changes observation conditions, communication windows, and mission duration.",
    ],
    [
      "Communication",
      "Volume = rate × contact time",
      "Signal delay, antenna gain, windows, and data rate constrain operations.",
    ],
  ]
  return (
    <main className="page guide-page">
      <PageTitle
        step="MISSION COMMAND ACADEMY"
        title="How to play"
        detail="A field guide to systems thinking, engineering tradeoffs, and scenario-based decisions."
        status={<Button onClick={() => go("missions")}>Start training</Button>}
      />
      <div className="guide-intro">
        <div>
          <Eyebrow>YOUR ROLE</Eyebrow>
          <h2>You are Mission Commander.</h2>
          <p>
            Define the science goal, build a feasible spacecraft, protect
            resource margins, and respond to predefined mission events. In co-op
            mode, your Flight Engineer monitors constraints and recommends
            corrective actions.
          </p>
        </div>
        <div className="role-cards">
          <div>
            <span>01</span>
            <b>COMMANDER</b>
            <small>Objectives · configuration · decisions</small>
          </div>
          <div>
            <span>02</span>
            <b>FLIGHT ENGINEER</b>
            <small>Resources · telemetry · recommendations</small>
          </div>
        </div>
      </div>
      <div className="learning-path">
        {[
          "Select mission",
          "Build spacecraft",
          "Balance resources",
          "Review telemetry",
          "Resolve events",
          "Analyze results",
        ].map((x, i) => (
          <div key={x}>
            <span>0{i + 1}</span>
            <Icon name={i === 5 ? "target" : "arrow"} />
            <b>{x}</b>
            <small>
              {
                [
                  "Set scientific priority",
                  "Choose systems & payload",
                  "Protect engineering margin",
                  "Account for delay",
                  "Explore a branch",
                  "Learn from consequences",
                ][i]
              }
            </small>
          </div>
        ))}
      </div>
      <div className="concept-grid">
        {concepts.map(([title, formula, text], i) => (
          <Panel key={title}>
            <div className="concept-index">CONCEPT / 0{i + 1}</div>
            <Icon
              name={["mass", "bolt", "grid", "orbit", "target", "signal"][i]}
            />
            <h3>{title}</h3>
            <code>{formula}</code>
            <p>{text}</p>
          </Panel>
        ))}
      </div>
      <Panel className="assumption-banner">
        <Icon name="book" size={28} />
        <div>
          <b>Scientific principles, simplified scenarios</b>
          <p>
            The relationships shown are scientifically grounded, but all mission
            values are illustrative educational assumptions unless explicitly
            sourced. The prototype does not perform operational physics
            analysis.
          </p>
        </div>
      </Panel>
    </main>
  )
}

function About() {
  return (
    <main className="page about-page">
      <PageTitle
        step="PROJECT DOSSIER / 2026"
        title="Mission Architect"
        detail="Design your mission. Manage your resources. Shape your success."
        status={<Status>EDUCATIONAL PROTOTYPE</Status>}
      />
      <div
        className="about-hero"
        style={SPACE_BG.control("linear-gradient(90deg, rgba(4,10,20,.98), rgba(4,10,20,.35))")}
      >
        <div>
          <Eyebrow>NASA SPACE APPS CHALLENGE 2026 CONTEXT</Eyebrow>
          <h2>
            Systems thinking for the next generation of mission designers.
          </h2>
          <p>
            An interactive educational experience demonstrating how scientific
            ambition, engineering constraints, and limited resources shape
            mission outcomes.
          </p>
        </div>
      </div>
      <div className="about-grid">
        <Panel>
          <span className="big-index">01</span>
          <h3>Purpose</h3>
          <p>
            Make complex spacecraft tradeoffs visible, approachable, and
            connected through clear chains of cause and effect.
          </p>
        </Panel>
        <Panel>
          <span className="big-index">02</span>
          <h3>Audience</h3>
          <p>
            University students, aerospace engineering learners, educators, and
            space exploration enthusiasts.
          </p>
        </Panel>
        <Panel>
          <span className="big-index">03</span>
          <h3>Educational value</h3>
          <p>
            Build intuition around mass, power, energy, fuel, orbital access,
            communications, and data constraints.
          </p>
        </Panel>
      </div>
      <div className="about-columns">
        <Panel>
          <div className="panel-head">
            <span>PROJECT OBJECTIVES</span>
          </div>
          <ul>
            <li>
              Connect every major design choice to a documented consequence.
            </li>
            <li>
              Encourage iteration instead of presenting one “correct”
              spacecraft.
            </li>
            <li>
              Distinguish scientific principles from simplified scenario values.
            </li>
            <li>
              Support individual learning and cooperative role-based discussion.
            </li>
          </ul>
        </Panel>
        <Panel>
          <div className="panel-head">
            <span>TEAM & CREDITS</span>
          </div>
          <p>
            <b>Team KPG Nova · ZU University, Jordan</b>
            <br />
            Experience design · aerospace research · learning systems
          </p>
          <p className="muted">
            All artwork is drawn with CSS and code. Built with AI assistance
            (Figma Make and Claude by Anthropic). Scientific concepts: introductory systems
            engineering, orbital mechanics, and spacecraft communications
            principles.
          </p>
        </Panel>
      </div>
    </main>
  )
}

function Profile({
  mode,
  setMode,
}: {
  mode: string
  setMode: (s: string) => void
}) {
  return (
    <main className="page">
      <PageTitle
        step="COMMAND CREW / COHORT 06"
        title="Commander profile"
        detail="Training record, engineering performance, and cooperative crew status."
        status={
          <div className="mode-toggle">
            <button
              className={mode === "single" ? "active" : ""}
              onClick={() => setMode("single")}
            >
              SOLO
            </button>
            <button
              className={mode === "coop" ? "active" : ""}
              onClick={() => setMode("coop")}
            >
              CO-OP
            </button>
          </div>
        }
      />
      <div className="profile-grid">
        <Panel className="identity-card">
          <div className="avatar">
            AK
            <span />
          </div>
          <Eyebrow>MISSION COMMANDER</Eyebrow>
          <h2>Alex Kim</h2>
          <p>Aerospace Engineering · Level 06</p>
          <div className="profile-stats">
            <div>
              <strong>14</strong>
              <small>ATTEMPTED</small>
            </div>
            <div>
              <strong>9</strong>
              <small>SUCCESSFUL</small>
            </div>
            <div>
              <strong>2</strong>
              <small>FAILED</small>
            </div>
            <div>
              <strong>94</strong>
              <small>HIGH SCORE</small>
            </div>
          </div>
          <div className="rank">
            <small>ENGINEERING RANK</small>
            <b>Systems Navigator</b>
            <Meter
              label="Progress to next rank"
              value="2,840 / 3,200 XP"
              percent={89}
            />
          </div>
          <div className="achievements">
            <small>ACHIEVEMENTS</small>
            <div>
              <span>
                <Icon name="mass" size={13} /> Margin Keeper
              </span>
              <span>
                <Icon name="signal" size={13} /> Link Stable
              </span>
              <span>
                <Icon name="target" size={13} /> Science First
              </span>
            </div>
          </div>
        </Panel>
        <Panel className="history">
          <div className="panel-head">
            <span>MISSION HISTORY</span>
            <small>LAST 04</small>
          </div>
          {[
            ["MX–24", "Mars Exploration", "91", "SUCCESS"],
            ["EO–08", "Earth Observation", "84", "SUCCESS"],
            ["LR–12", "Lunar Research", "72", "PARTIAL"],
            ["AS–31", "Asteroid Study", "34", "FAILED"],
          ].map((x, i) => (
            <div className="history-row" key={x[0]}>
              <span>0{i + 1}</span>
              <div>
                <b>{x[1]}</b>
                <small>{x[0]} · CASE STUDY</small>
              </div>
              <strong>{x[2]}</strong>
              <Status
                tone={
                  x[3] === "SUCCESS"
                    ? "good"
                    : x[3] === "PARTIAL"
                      ? "warn"
                      : "danger"
                }
              >
                {x[3]}
              </Status>
            </div>
          ))}
        </Panel>
        <Panel className="leaderboard">
          <div className="panel-head">
            <span>COHORT LEADERBOARD</span>
            <small>WEEK 06</small>
          </div>
          {[
            ["01", "M. Chen", "1,284", "96%"],
            ["02", "S. Okafor", "1,210", "93%"],
            ["03", "A. Kim", "1,172", "91%"],
            ["04", "L. Garcia", "1,108", "88%"],
            ["05", "R. Patel", "1,046", "86%"],
          ].map((r) => (
            <div
              className={`leader-row ${r[1] === "A. Kim" ? "you" : ""}`}
              key={r[0]}
            >
              <span>{r[0]}</span>
              <b>
                {r[1]}
                {r[1] === "A. Kim" && <small>YOU</small>}
              </b>
              <strong>
                {r[2]}
                <small>PTS</small>
              </strong>
              <em>{r[3]} EFF.</em>
            </div>
          ))}
        </Panel>
      </div>
      {mode === "coop" && (
        <Panel className="coop-panel">
          <div className="panel-head">
            <span>COOPERATIVE WORKSPACE</span>
            <Status>CREW LINKED</Status>
          </div>
          <div className="coop-roles">
            <div>
              <div className="mini-avatar">AK</div>
              <span>
                <small>PLAYER 01</small>
                <b>MISSION COMMANDER</b>
                <p>Objectives · spacecraft configuration · mission decisions</p>
              </span>
            </div>
            <div className="joint-link">
              <i />
              <span className="joint-figs"><PlayerFigure n={1} size={34} tone="cyan" /><PlayerFigure n={2} size={34} tone="violet" /></span>
              <small>SHARED DECISION CHANNEL</small>
            </div>
            <div>
              <div className="mini-avatar engineer">SO</div>
              <span>
                <small>PLAYER 02</small>
                <b>FLIGHT ENGINEER</b>
                <p>Resources · power & fuel · telemetry recommendations</p>
              </span>
            </div>
          </div>
          <div className="joint-status">
            <span>
              <small>SHARED MISSION</small>
              <b>MX–24 / DESIGN REVIEW</b>
            </span>
            <span>
              <small>COMMANDER VOTE</small>
              <Status>APPROVED</Status>
            </span>
            <span>
              <small>ENGINEER VOTE</small>
              <Status tone="warn">REVISION</Status>
            </span>
            <Button variant="secondary">Open joint review</Button>
          </div>
        </Panel>
      )}
    </main>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [mission, setMission] = useState("mars")
  const [scenario, setScenario] = useState<Scenario>("balanced")
  const [decision, setDecision] = useState("")
  const [mode, setMode] = useState("single")
  const [lang, setLang] = useState<Lang>("EN")
  const [design, setDesign] = useState<Design>(PRESETS.A)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [player, setPlayer] = useState<Player>(loadPlayer)
  useEffect(() => savePlayer(player), [player])
  const onFinish = (o: Outcome) => {
    setOutcome(o)
    const d: Design = JSON.parse(o.key)
    const r = scoreReport(d, o.aborted ? null : o)
    const entry = { id: Date.now(), mission: d.mission, result: r.result, score: r.total, ratio: o.ratio, events: o.events, lost: o.lost, mode, aborted: !!o.aborted, key: o.key }
    setPlayer((p) => {
      const last = p.history[p.history.length - 1]
      if (entry.aborted && last && last.aborted && last.key === entry.key) return p
      return { ...p, history: [...p.history, entry].slice(-100) }
    })
  }
  const [hist, setHist] = useState<Screen[]>([])
  const go = (next: Screen) => {
    if (next !== screen) setHist((h) => [...h, screen].slice(-30))
    setScreen(next)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const back = () => {
    const prev = hist[hist.length - 1]
    if (!prev) return
    setHist(hist.slice(0, -1))
    setScreen(prev)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const extraNames: Record<string, string> = { guide: "How to play", about: "About", profile: "Profile" }
  const prevScreen = hist[hist.length - 1]
  const prevLabel = prevScreen ? (nav.find((n) => n.id === prevScreen)?.label ?? extraNames[prevScreen] ?? "Overview") : ""
  // The players are extra people on board (1 in Single Player, 2 in Co-op): they need food too.
  const effDesign = useMemo<Design>(() => ({ ...design, players: mode === "coop" ? 2 : 1 }), [design, mode])
  const content = useMemo(() => {
    if (screen === "home") return <Home go={go} mode={mode} setMode={setMode} />
    if (screen === "missions")
      return <Missions selected={mission} setSelected={(m: string) => { setMission(m); setDesign({ ...design, mission: m as Design["mission"] }) }} go={go} />
    if (screen === "builder")
      return <Designer design={effDesign} setDesign={setDesign} go={go} mode={mode} />
    if (screen === "resources") return <Resources2 design={effDesign} go={go} />
    if (screen === "simulation")
      return <Ops key={JSON.stringify(effDesign)} design={effDesign} mode={mode} go={go} onFinish={onFinish} />
    if (screen === "results")
      return (
        <Results2 design={effDesign} outcome={outcome} go={go} />
      )
    if (screen === "guide") return <Guide go={go} />
    if (screen === "about") return <About />
    return <Profile2 mode={mode} setMode={setMode} go={go} mission={design.mission} />
  }, [screen, mode, mission, scenario, decision, design, effDesign, outcome, lang, player])
  return (
    <LangCtx.Provider value={{ lang, setLang }}>
    <PlayerCtx.Provider value={{ player, setPlayer: (p: Player) => setPlayer(p) }}>
    <AutoTranslate />
    <div className="app-shell">
      <Header screen={screen} setScreen={go} />
      {hist.length > 0 && <PrevBar label={prevLabel} onBack={back} />}
      {content}
      <footer>
        <span>MISSION ARCHITECT / EDUCATIONAL SYSTEMS LAB</span>
        <span>SCENARIO VALUES ARE ILLUSTRATIVE UNLESS SOURCED</span>
        <span>BUILD 26.04</span>
      </footer>
    </div>
    </PlayerCtx.Provider>
    </LangCtx.Provider>
  )
}
