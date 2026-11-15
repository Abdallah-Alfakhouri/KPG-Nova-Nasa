import { useContext, useEffect } from "react"
import { LangCtx } from "./i18n"
import { FR } from "./fr"

const ALL: Record<string, string> = FR
const norm = (s: string) => s.replace(/\s+/g, " ").trim()
const lookup = (s: string) => {
  const k = norm(s)
  if (!k || !(k in ALL)) return null
  const m = s.match(/^(\s*)[\s\S]*?(\s*)$/)!
  return m[1] + ALL[k] + m[2]
}

export function AutoTranslate() {
  const { lang } = useContext(LangCtx)
  useEffect(() => {
    const rec = new Map<Text, { orig: string; ar: string }>()
    const tr = (n: Text) => {
      const r = rec.get(n)
      if (r && n.nodeValue === r.ar) return
      const v = n.nodeValue ?? ""
      const out = lookup(v)
      if (out && out !== v) { rec.set(n, { orig: v, ar: out }); n.nodeValue = out }
    }
    const walk = (root: Node) => {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      let n: Node | null
      while ((n = w.nextNode())) { const p = (n as Text).parentElement; if (p && !/^(SCRIPT|STYLE)$/.test(p.tagName)) tr(n as Text) }
    }
    document.documentElement.dir = "ltr"
    document.documentElement.lang = lang === "FR" ? "fr" : "en"
    if (lang !== "FR") return
    walk(document.body)
    const mo = new MutationObserver((ms) => {
      mo.disconnect()
      for (const m of ms) {
        if (m.type === "characterData") tr(m.target as Text)
        m.addedNodes.forEach((a) => (a.nodeType === 3 ? tr(a as Text) : walk(a)))
      }
      mo.observe(document.body, { childList: true, characterData: true, subtree: true })
    })
    mo.observe(document.body, { childList: true, characterData: true, subtree: true })
    return () => { mo.disconnect(); rec.forEach((r, n) => { if (n.nodeValue === r.ar) n.nodeValue = r.orig }) }
  }, [lang])
  return null
}
