import { createContext, useContext } from "react"
import { FR } from "./fr"
export type Lang = "EN" | "FR"
export const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "EN", setLang: () => {} })
export const AR = FR
export function useT() {
  const { lang } = useContext(LangCtx)
  const t = (k: string, v?: Record<string, string | number>) => {
    let s = lang === "FR" ? (FR[k] ?? k) : k
    if (v) for (const x in v) s = s.split(`{${x}}`).join(String(v[x]))
    return s
  }
  return { t, lang, dir: "ltr" as "rtl" | "ltr" }
}
