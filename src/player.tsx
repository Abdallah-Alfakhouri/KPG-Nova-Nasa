import { createContext, useContext } from "react"
import { Button, Eyebrow, Icon, Meter, PageTitle, Panel, Status } from "./App"
import * as E from "./engine"
import { useT } from "./i18n"
import { PlayerFigure } from "./Visuals"

export interface HistoryEntry { id: number; mission: E.MissionId; result: "success" | "partial" | "failed"; score: number; ratio: number; events: number; lost: number; mode: string; aborted: boolean; key: string }
export interface Player { name: string; name2: string; history: HistoryEntry[] }
const EMPTY: Player = { name: "", name2: "", history: [] }
export const PlayerCtx = createContext<{ player: Player; setPlayer: (p: Player) => void }>({ player: EMPTY, setPlayer: () => {} })
const KEY = "mission-architect-player-v1"
export function loadPlayer(): Player {
  try {
    const r = localStorage.getItem(KEY)
    if (r) { const p = JSON.parse(r); if (p && Array.isArray(p.history)) return { name: String(p.name || ""), name2: String(p.name2 || ""), history: p.history } }
  } catch { /* storage unavailable: start fresh */ }
  return EMPTY
}
export function savePlayer(p: Player) { try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* ignore */ } }
export const initials = (n: string) => {
  const w = n.trim().split(/\s+/).filter(Boolean)
  return w.length ? (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase() : "?"
}

const RANKS: [string, number][] = [["Cadet", 0], ["Mission Analyst", 150], ["Systems Navigator", 400], ["Flight Director", 800], ["Mission Architect", 1500]]
export function statsOf(h: HistoryEntry[]) {
  const xp = h.reduce((s, x) => s + x.score, 0)
  const idx = RANKS.reduce((a, r, i) => (xp >= r[1] ? i : a), 0)
  const next = RANKS[idx + 1]
  return {
    attempted: h.length, success: h.filter((x) => x.result === "success").length, failed: h.filter((x) => x.result === "failed").length,
    partial: h.filter((x) => x.result === "partial").length, high: h.reduce((m, x) => Math.max(m, x.score), 0), xp,
    avg: h.length ? Math.round(xp / h.length) : 0, rank: RANKS[idx][0], next: next ? next[1] : null,
    pct: next ? Math.round(((xp - RANKS[idx][1]) / (next[1] - RANKS[idx][1])) * 100) : 100,
    ach: [
      ["Margin Keeper", "mass", h.some((x) => x.result === "success" && x.events === 0)],
      ["Link Stable", "signal", h.some((x) => !x.aborted && x.lost === 0 && x.ratio > 0)],
      ["Science First", "target", h.some((x) => x.ratio >= 1)],
    ] as [string, string, boolean][],
  }
}

export function NameFields({ mode }: { mode: string }) {
  const { t } = useT()
  const { player, setPlayer } = useContext(PlayerCtx)
  return (
    <div className="name-fields">
      <label><small>{t("YOUR NAME")}</small>
        <input value={player.name} maxLength={24} placeholder={t("Enter your name")} onChange={(e) => setPlayer({ ...player, name: e.target.value })} /></label>
      {mode === "coop" && (
        <label><small>{t("PLAYER 2 NAME")}</small>
          <input value={player.name2} maxLength={24} placeholder={t("Enter your name")} onChange={(e) => setPlayer({ ...player, name2: e.target.value })} /></label>
      )}
    </div>
  )
}

// Honorary cohort: real NASA scientists, engineers and astronauts (name, role, achievement).
// Points / efficiency are illustrative game values, NOT real scores.
const SAMPLE: { n: string; role: string; ach: string; pts: number; eff: number }[] = [
  { n: "Katherine Johnson", role: "Mathematician · NASA Langley", ach: "Calculated the trajectories for Alan Shepard's 1961 flight and John Glenn's 1962 orbit; checked Apollo 11 numbers.", pts: 1284, eff: 96 },
  { n: "Nancy Grace Roman", role: "Astronomer · first NASA Chief of Astronomy", ach: "Known as the Mother of Hubble: planned the space telescope programme. The Roman Space Telescope carries her name.", pts: 1210, eff: 93 },
  { n: "Gene Kranz", role: "Flight Director · Mission Control", ach: "Led Mission Control through Apollo 11's landing and the Apollo 13 rescue.", pts: 1108, eff: 88 },
  { n: "John C. Mather", role: "Astrophysicist · NASA Goddard", ach: "Nobel Prize in Physics 2006 for the COBE cosmic microwave background results; senior project scientist of the James Webb Space Telescope.", pts: 1046, eff: 86 },
  { n: "Ellen Ochoa", role: "Astronaut & engineer · Johnson Space Center", ach: "First Hispanic woman in space (1993) and later director of Johnson Space Center; co-inventor of optical image-processing systems.", pts: 962, eff: 82 },
  { n: "Farouk El-Baz", role: "Geologist · Apollo programme", ach: "Helped choose the Apollo landing sites and trained the astronauts in lunar observation and photography.", pts: 905, eff: 79 },
]

export function Profile2({ mode, setMode, go, mission }: { mode: string; setMode: (s: string) => void; go: (s: any) => void; mission: E.MissionId }) {
  const { t, dir } = useT()
  const { player, setPlayer } = useContext(PlayerCtx)
  const st = statsOf(player.history)
  const name = player.name.trim()
  const rows = [...SAMPLE.map((r) => ({ n: r.n, role: r.role, ach: r.ach, pts: r.pts, eff: r.eff, you: false })), { n: name || t("You"), role: "", ach: "", pts: st.xp, eff: st.avg, you: true }].sort((a, b) => b.pts - a.pts).slice(0, 6)
  if (!rows.some((r) => r.you)) rows[5] = { n: name || t("You"), role: "", ach: "", pts: st.xp, eff: st.avg, you: true }
  const recent = player.history.slice(-4).reverse()
  const tone = (r: string) => (r === "success" ? "good" : r === "partial" ? "warn" : "danger")
  return (
    <main className="page" dir={dir}>
      <PageTitle step="COMMAND CREW / COHORT 06" title="Commander profile" detail="Training record, engineering performance, and cooperative crew status."
        status={<div className="mode-toggle"><button className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>SOLO</button><button className={mode === "coop" ? "active" : ""} onClick={() => setMode("coop")}>CO-OP</button></div>} />
      <div className="profile-grid">
        <Panel className="identity-card">
          <div className="avatar">{initials(player.name)}<span /></div>
          <Eyebrow>MISSION COMMANDER</Eyebrow>
          <input className="name-input" value={player.name} maxLength={24} placeholder={t("Enter your name")} onChange={(e) => setPlayer({ ...player, name: e.target.value })} />
          <p>{t("New account · {n} mission(s) completed", { n: st.attempted })}</p>
          <div className="profile-stats">
            <div><strong>{st.attempted}</strong><small>ATTEMPTED</small></div>
            <div><strong>{st.success}</strong><small>SUCCESSFUL</small></div>
            <div><strong>{st.failed}</strong><small>FAILED</small></div>
            <div><strong>{st.high}</strong><small>HIGH SCORE</small></div>
          </div>
          {st.partial > 0 && <p style={{ margin: "-8px 0 12px" }}>{t("{n} partial", { n: st.partial })}</p>}
          <div className="rank">
            <small>ENGINEERING RANK</small>
            <b>{t(st.rank)}</b>
            <Meter label={st.next ? "Progress to next rank" : "Top rank reached"} value={st.next ? `${st.xp} / ${st.next} XP` : `${st.xp} XP`} percent={st.pct} />
          </div>
          <div className="achievements">
            <small>ACHIEVEMENTS</small>
            <div>{st.ach.map(([label, icon, on]) => <span key={label} style={{ opacity: on ? 1 : 0.35 }}><Icon name={icon} size={13} /> {t(label)}</span>)}</div>
          </div>
          <Button variant="ghost" icon={null} onClick={() => { if (window.confirm(t("Reset profile? This deletes your name and mission history."))) setPlayer(EMPTY) }}>{t("Reset profile")}</Button>
        </Panel>
        <Panel className="history">
          <div className="panel-head"><span>MISSION HISTORY</span><small>{t("{n} TOTAL", { n: st.attempted })}</small></div>
          {recent.length === 0 && <p style={{ padding: 18 }}>{t("No missions yet. Complete a mission to see it here.")}</p>}
          {recent.map((h, i) => (
            <div className="history-row" key={h.id}>
              <span>{String(st.attempted - i).padStart(2, "0")}</span>
              <div><b>{t(E.MISSIONS[h.mission].name)}</b><small>{t("RUN {n}", { n: st.attempted - i })} · {h.mode === "coop" ? "CO-OP" : "SOLO"}{h.aborted ? ` · ${t("LAUNCH BLOCKED")}` : ""}</small></div>
              <strong>{h.score}</strong>
              <Status tone={tone(h.result)}>{t(h.result.toUpperCase())}</Status>
            </div>
          ))}
        </Panel>
        <Panel className="leaderboard">
          <div className="panel-head"><span>COHORT LEADERBOARD</span><small>{t("NASA SCIENTISTS")}</small></div>
          {rows.map((r, i) => (
            <div className={`leader-row ${r.you ? "you" : ""}`} key={r.n + i}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <b>{r.n}{r.you && <small>YOU</small>}{!r.you && <em className="sci-role">{t(r.role)}</em>}{!r.you && <i className="sci-ach">{t(r.ach)}</i>}</b>
              <strong>{r.pts.toLocaleString("en-US")}<small>PTS</small></strong>
              <em>{r.eff}% EFF.</em>
            </div>
          ))}
          <p style={{ padding: "10px 14px" }}>{t("Names are real NASA scientists, engineers and astronauts shown as honorary mentors. Their points are illustrative game values, not real scores. Your points are the sum of your mission scores.")}</p>
        </Panel>
      </div>
      {mode === "coop" && (
        <Panel className="coop-panel">
          <div className="panel-head"><span>COOPERATIVE WORKSPACE</span><Status>CREW LINKED</Status></div>
          <div className="coop-roles">
            <div><div className="mini-avatar">{initials(player.name)}</div><span><small>PLAYER 01</small><b>{name || "MISSION COMMANDER"}</b><p>{t("Mission Commander · Mission Control (Earth)")}</p></span></div>
            <div className="joint-link"><i /><span className="joint-figs"><PlayerFigure n={1} size={34} tone="cyan" /><PlayerFigure n={2} size={34} tone="violet" /></span><small>SHARED DECISION CHANNEL</small></div>
            <div><div className="mini-avatar engineer">{initials(player.name2)}</div><span><small>PLAYER 02</small><b>{player.name2.trim() || "FLIGHT ENGINEER"}</b><p>{t("Flight Engineer · Spacecraft (real time)")}</p></span></div>
          </div>
          <div className="joint-status" style={{ gridTemplateColumns: "1fr 220px" }}>
            <span><small>SHARED MISSION</small><b>{t(E.MISSIONS[mission].name)}</b></span>
            <Button variant="secondary" onClick={() => go("builder")}>{t("Go to configuration")}</Button>
          </div>
          <p style={{ padding: "0 22px 16px" }}>{t("Both players approve the design on the Spacecraft screen before launch.")}</p>
        </Panel>
      )}
    </main>
  )
}
