import type { CSSProperties } from "react"
import { useT } from "./i18n"

// ---------- Player figurines (replace the old wifi icon for Co-op Crew) ----------
export function PlayerFigure({ n, size = 44, tone = "cyan" }: { n: 1 | 2; size?: number; tone?: "cyan" | "violet" }) {
  const c = tone === "cyan" ? "#22d3ee" : "#c084fc"
  const f = tone === "cyan" ? "#1d4ed8" : "#7c3aed"
  return (
    <svg className="player-fig" width={size} height={size * 1.15} viewBox="0 0 44 50" aria-hidden="true">
      {/* shoulders / suit */}
      <path d="M5 49c0-11 6-17 17-17s17 6 17 17Z" fill={f} stroke={c} strokeWidth="1.5" />
      {/* helmet */}
      <circle cx="22" cy="17" r="13" fill="#0b1b2e" stroke={c} strokeWidth="1.8" />
      {/* visor */}
      <path d="M12.5 15.5c0-5 4-8 9.5-8s9.5 3 9.5 8c0 4-3 6.5-9.5 6.5S12.5 19.5 12.5 15.5Z" fill={c} opacity=".28" stroke={c} strokeWidth="1" />
      <path d="M15.5 12.5c2-2 5-2.6 8-1.6" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity=".7" fill="none" />
      {/* chest badge with player number */}
      <rect x="15" y="38" width="14" height="8" rx="2" fill="#06101d" stroke={c} strokeWidth="1" />
      <text x="22" y="44.3" textAnchor="middle" fontFamily="'Space Mono',monospace" fontWeight="700" fontSize="6.5" fill={c}>P{n}</text>
    </svg>
  )
}

export function PlayersPair({ size = 26 }: { size?: number }) {
  return (
    <span className="players-pair" aria-hidden="true">
      <PlayerFigure n={1} size={size} tone="cyan" />
      <PlayerFigure n={2} size={size} tone="violet" />
    </span>
  )
}

// ---------- Animated rocket on its way to the destination ----------
const P0 = [70, 112], P1 = [400, -10], P2 = [730, 112]
const bez = (p: number) => {
  const a = (1 - p) * (1 - p), b = 2 * (1 - p) * p, c = p * p
  const x = a * P0[0] + b * P1[0] + c * P2[0], y = a * P0[1] + b * P1[1] + c * P2[1]
  const dx = 2 * (1 - p) * (P1[0] - P0[0]) + 2 * p * (P2[0] - P1[0])
  const dy = 2 * (1 - p) * (P1[1] - P0[1]) + 2 * p * (P2[1] - P1[1])
  return { x, y, ang: (Math.atan2(dy, dx) * 180) / Math.PI }
}
const DEST: Record<string, { color: string; glow: string; label: string }> = {
  mars: { color: "#c1440e", glow: "#f97316", label: "MARS" },
  lunar: { color: "#b8bcc2", glow: "#e2e8f0", label: "MOON" },
  earth: { color: "#1d6fa5", glow: "#22d3ee", label: "EARTH ORBIT" },
  asteroid: { color: "#7a6a58", glow: "#d6c3a5", label: "ASTEROID" },
}

export function FlightPanel({ mission, progress, playing, done, speed, fields }: {
  mission: string; progress: number; playing: boolean; done: boolean; speed: number; fields: number
}) {
  const { t } = useT()
  const p = Math.max(0, Math.min(1, progress))
  const r = bez(p)
  const d = DEST[mission] ?? DEST.mars
  const moving = playing && !done
  const sending = moving
  const style: CSSProperties = { transform: `translate(${r.x}px, ${r.y}px) rotate(${r.ang}deg)`, transition: moving ? `transform ${160 / speed}ms linear` : "none" }
  return (
    <section className={`panel flight-panel ${moving ? "is-moving" : "is-stopped"}`} aria-label={t("FLIGHT TRACK")}>
      <div className="panel-head">
        <span>{t("FLIGHT TRACK")}</span>
        <small>{done ? t("ARRIVED") : moving ? t("IN FLIGHT") : p > 0 ? t("HOLDING") : t("ON THE PAD")} · {Math.round(p * 100)}%</small>
      </div>
      <svg className="flight-svg" viewBox="0 0 800 150" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="fl-earth" cx=".35" cy=".35"><stop offset="0" stopColor="#6bc0d1" /><stop offset=".5" stopColor="#17648d" /><stop offset="1" stopColor="#061528" /></radialGradient>
          <radialGradient id="fl-dest" cx=".35" cy=".35"><stop offset="0" stopColor={d.glow} /><stop offset=".55" stopColor={d.color} /><stop offset="1" stopColor="#0a0a0f" /></radialGradient>
          <linearGradient id="fl-flame" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#fde68a" /><stop offset=".5" stopColor="#f59e0b" /><stop offset="1" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
        </defs>
        {/* scrolling stars: they only drift while the rocket is flying */}
        <g className="stars stars-a">{[[40, 20], [150, 120], [260, 45], [390, 130], [520, 25], [640, 100], [760, 55], [830, 130]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 1 : 1.6} fill="#cfe6f2" opacity={0.5 + (i % 3) * 0.2} />)}</g>
        <g className="stars stars-b">{[[90, 70], [210, 25], [330, 100], [460, 60], [580, 135], [700, 20], [790, 90], [880, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={0.9} fill="#9fc3d6" opacity=".6" />)}</g>
        {/* trajectory */}
        <path d={`M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`} fill="none" stroke="#2a4660" strokeWidth="1.4" strokeDasharray="4 6" />
        <path d={`M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}`} fill="none" stroke="#22d3ee" strokeWidth="2" pathLength={1} strokeDasharray={`${p} 1`} opacity=".85" />
        {/* Earth + destination */}
        <circle cx={P0[0]} cy={P0[1]} r="26" fill="url(#fl-earth)" /><text x={P0[0]} y="146" textAnchor="middle" fontFamily="'Space Mono',monospace" fontSize="9" fill="#7d92a2">EARTH</text>
        <circle cx={P2[0]} cy={P2[1]} r="22" fill="url(#fl-dest)" /><text x={P2[0]} y="146" textAnchor="middle" fontFamily="'Space Mono',monospace" fontSize="9" fill="#7d92a2">{d.label}</text>
        {/* telemetry link: rocket -> Earth, packets only run while flying and in contact */}
        <line className={`downlink ${sending ? "on" : ""}`} x1={r.x} y1={r.y} x2={P0[0] + 24} y2={P0[1] - 6} stroke="#22d3ee" strokeWidth="1.3" strokeDasharray="3 7" opacity={p > 0 ? 0.8 : 0.25} style={{ transition: moving ? `all ${160 / speed}ms linear` : "none" }} />
        {/* rocket */}
        <g style={style}>
          <g className={`rocket ${moving ? "rocket-shake" : ""}`}>
            <g className="flame" style={{ opacity: moving ? 1 : 0 }}><path d="M-12 -4 L-40 0 L-12 4 Z" fill="url(#fl-flame)" /></g>
            <path d="M-14 -7 L-24 -15 L-20 -3 Z M-14 7 L-24 15 L-20 3 Z" fill="#ef4444" />
            <path d="M-16 -7 H8 Q22 -7 30 0 Q22 7 8 7 H-16 Z" fill="#e8eef2" stroke="#9fb3c0" strokeWidth="1" />
            <path d="M8 -7 Q22 -7 30 0 Q22 7 8 7 Z" fill="#ef4444" />
            <circle cx="-2" cy="0" r="3.2" fill="#0b1b2e" stroke="#22d3ee" strokeWidth="1.2" />
            <rect x="-15" y="-7" width="4" height="14" fill="#9fb3c0" opacity=".5" />
          </g>
        </g>
      </svg>
      <div className="flight-foot">
        <span><i className={sending ? "dot on" : "dot"} />{sending ? t("TELEMETRY → EARTH: {n} fields streaming", { n: fields }) : t("Rocket stopped — telemetry paused")}</span>
        <span>{moving ? t("Engines burning") : done ? t("Mission complete — orbit reached") : t("Engines off")}</span>
      </div>
    </section>
  )
}

// ---------- Launch vehicle pictures (Spacecraft screen) ----------
export function VehicleArt({ vehicle }: { vehicle: "atlas" | "nova" }) {
  const heavy = vehicle === "nova"
  const accent = heavy ? "#f59e0b" : "#22d3ee"
  const Flame = ({ x, w, h }: { x: number; w: number; h: number }) => (
    <g className="veh-flame">
      <path d={`M${x - w} 262 Q${x} ${262 + h} ${x + w} 262 Z`} fill="#f59e0b" opacity=".85" />
      <path d={`M${x - w / 2} 262 Q${x} ${262 + h * 0.65} ${x + w / 2} 262 Z`} fill="#fde68a" />
    </g>
  )
  return (
    <svg className="vehicle-svg" viewBox="0 0 240 320" aria-hidden="true">
      <defs>
        <linearGradient id={`vb-${vehicle}`} x1="0" x2="1"><stop offset="0" stopColor="#9fb3c0" /><stop offset=".45" stopColor="#f4f8fa" /><stop offset="1" stopColor="#8aa0ae" /></linearGradient>
      </defs>
      {/* launch pad */}
      <rect x="40" y="288" width="160" height="6" fill="#2a4660" />
      <rect x="168" y="120" width="8" height="168" fill="#2a4660" opacity=".6" />
      {heavy ? (
        <>
          {/* side boosters */}
          {[-1, 1].map((s) => {
            const cx = 120 + s * 52
            return (
              <g key={s}>
                <path d={`M${cx - 15} 118 Q${cx} 84 ${cx + 15} 118 V256 H${cx - 15} Z`} fill={`url(#vb-${vehicle})`} stroke="#9fb3c0" />
                <path d={`M${cx - 15} 118 Q${cx} 84 ${cx + 15} 118 Z`} fill="#ef4444" />
                <rect x={cx - 15} y="170" width="30" height="8" fill={accent} opacity=".85" />
                <path d={`M${cx - 15} 232 L${cx - 27} 258 L${cx - 15} 252 Z M${cx + 15} 232 L${cx + 27} 258 L${cx + 15} 252 Z`} fill="#ef4444" />
                <path d={`M${cx - 8} 256 L${cx - 11} 264 H${cx + 11} L${cx + 8} 256 Z`} fill="#4b5d6b" />
                <Flame x={cx} w={9} h={34} />
              </g>
            )
          })}
          {/* core */}
          <path d="M96 78 Q120 22 144 78 V256 H96 Z" fill={`url(#vb-${vehicle})`} stroke="#9fb3c0" />
          <path d="M96 78 Q120 22 144 78 Z" fill="#1e293b" />
          <rect x="96" y="120" width="48" height="9" fill={accent} opacity=".9" />
          <rect x="96" y="196" width="48" height="9" fill={accent} opacity=".9" />
          <circle cx="120" cy="98" r="5" fill="#0b1b2e" stroke="#22d3ee" strokeWidth="1.2" />
          <path d="M101 256 L96 266 H144 L139 256 Z" fill="#4b5d6b" />
          <Flame x={120} w={14} h={44} />
        </>
      ) : (
        <>
          <path d="M101 74 Q120 14 139 74 V256 H101 Z" fill={`url(#vb-${vehicle})`} stroke="#9fb3c0" />
          <path d="M101 74 Q120 14 139 74 Z" fill="#ef4444" />
          <rect x="101" y="112" width="38" height="8" fill={accent} opacity=".9" />
          <rect x="101" y="196" width="38" height="8" fill={accent} opacity=".9" />
          <circle cx="120" cy="92" r="5" fill="#0b1b2e" stroke="#22d3ee" strokeWidth="1.2" />
          <path d="M101 224 L82 258 L101 250 Z M139 224 L158 258 L139 250 Z" fill="#ef4444" />
          <path d="M106 256 L102 266 H138 L134 256 Z" fill="#4b5d6b" />
          <Flame x={120} w={12} h={40} />
        </>
      )}
    </svg>
  )
}
