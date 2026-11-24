import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { CATALOG_VERSION, DEFAULT_CATALOG, DEFAULT_SETTINGS, clone } from '../engine/catalog'
import { calcProject, type ProjectTotals } from '../engine/bom'
import { newProject } from '../engine/project'
import type { AppSettings, Catalog, Position, Project } from '../engine/types'

export type View = 'studio' | 'quote' | 'cost' | 'catalog' | 'projects'

interface State {
  project: Project
  catalog: Catalog
  settings: AppSettings
  view: View
  activePosId: string
  selectedFieldId: string | null
  past: Project[]
  future: Project[]
  lastPush: number
}

type Action =
  | { type: 'project'; fn: (p: Project) => Project; coalesce?: boolean }
  | { type: 'load'; project: Project }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'catalog'; fn: (c: Catalog) => Catalog }
  | { type: 'settings'; fn: (s: AppSettings) => AppSettings }
  | { type: 'view'; view: View }
  | { type: 'activePos'; id: string }
  | { type: 'selectField'; id: string | null }

const K = { project: 'ozk.v5.project', catalog: 'ozk.v5.catalog', settings: 'ozk.v5.settings', saved: 'ozk.v5.saved', view: 'ozk.v5.view' }

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
function write(key: string, v: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* depolama kapalı olabilir — sessizce geç */
  }
}

function init(): State {
  const storedCatalog = read<Catalog>(K.catalog)
  const catalog = storedCatalog && storedCatalog.version === CATALOG_VERSION ? storedCatalog : clone(DEFAULT_CATALOG)
  const storedSettings = read<AppSettings>(K.settings)
  const settings: AppSettings = storedSettings
    ? { ...clone(DEFAULT_SETTINGS), ...storedSettings, company: { ...DEFAULT_SETTINGS.company, ...storedSettings.company }, exportRules: { ...DEFAULT_SETTINGS.exportRules, ...storedSettings.exportRules }, cut: { ...DEFAULT_SETTINGS.cut, ...storedSettings.cut } }
    : clone(DEFAULT_SETTINGS)
  const project = read<Project>(K.project) ?? newProject()
  const view = read<View>(K.view) ?? 'studio'
  return { project, catalog, settings, view, activePosId: project.positions[0]?.id ?? '', selectedFieldId: null, past: [], future: [], lastPush: 0 }
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'project': {
      const next = { ...a.fn(s.project), updatedAt: new Date().toISOString() }
      const now = Date.now()
      const push = !a.coalesce || now - s.lastPush > 700
      const past = push ? [...s.past.slice(-79), s.project] : s.past
      const activePosId = next.positions.some((p) => p.id === s.activePosId) ? s.activePosId : (next.positions[0]?.id ?? '')
      return { ...s, project: next, past, future: [], lastPush: push ? now : s.lastPush, activePosId }
    }
    case 'load':
      return { ...s, project: a.project, past: [...s.past.slice(-79), s.project], future: [], activePosId: a.project.positions[0]?.id ?? '', selectedFieldId: null }
    case 'undo': {
      if (!s.past.length) return s
      const prev = s.past[s.past.length - 1]
      return { ...s, project: prev, past: s.past.slice(0, -1), future: [s.project, ...s.future], activePosId: prev.positions.some((p) => p.id === s.activePosId) ? s.activePosId : (prev.positions[0]?.id ?? ''), lastPush: 0 }
    }
    case 'redo': {
      if (!s.future.length) return s
      const nx = s.future[0]
      return { ...s, project: nx, past: [...s.past, s.project], future: s.future.slice(1), activePosId: nx.positions.some((p) => p.id === s.activePosId) ? s.activePosId : (nx.positions[0]?.id ?? ''), lastPush: 0 }
    }
    case 'catalog':
      return { ...s, catalog: a.fn(s.catalog) }
    case 'settings':
      return { ...s, settings: a.fn(s.settings) }
    case 'view':
      return { ...s, view: a.view }
    case 'activePos':
      return { ...s, activePosId: a.id, selectedFieldId: null }
    case 'selectField':
      return { ...s, selectedFieldId: a.id }
  }
}

interface Ctx {
  state: State
  totals: ProjectTotals
  activePos: Position | undefined
  updateProject: (fn: (p: Project) => Project, coalesce?: boolean) => void
  updatePosition: (id: string, fn: (p: Position) => Position, coalesce?: boolean) => void
  loadProject: (p: Project) => void
  undo: () => void
  redo: () => void
  setCatalog: (fn: (c: Catalog) => Catalog) => void
  setSettings: (fn: (s: AppSettings) => AppSettings) => void
  setView: (v: View) => void
  setActivePos: (id: string) => void
  selectField: (id: string | null) => void
  saved: SavedApi
}

export interface SavedApi {
  list: () => Project[]
  save: (p: Project) => void
  remove: (id: string) => void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)

  useEffect(() => write(K.project, state.project), [state.project])
  useEffect(() => write(K.catalog, state.catalog), [state.catalog])
  useEffect(() => write(K.settings, state.settings), [state.settings])
  useEffect(() => write(K.view, state.view), [state.view])

  const totals = useMemo(() => calcProject(state.project.positions, state.catalog, state.project.commercial, state.settings), [state.project, state.catalog, state.settings])

  const updateProject = useCallback((fn: (p: Project) => Project, coalesce = false) => dispatch({ type: 'project', fn, coalesce }), [])
  const updatePosition = useCallback(
    (id: string, fn: (p: Position) => Position, coalesce = false) => dispatch({ type: 'project', coalesce, fn: (p) => ({ ...p, positions: p.positions.map((x) => (x.id === id ? fn(x) : x)) }) }),
    [],
  )

  const saved: SavedApi = useMemo(
    () => ({
      list: () => read<Project[]>(K.saved) ?? [],
      save: (p) => {
        const all = read<Project[]>(K.saved) ?? []
        const i = all.findIndex((x) => x.id === p.id)
        if (i >= 0) all[i] = p
        else all.unshift(p)
        write(K.saved, all)
      },
      remove: (id) => write(K.saved, (read<Project[]>(K.saved) ?? []).filter((x) => x.id !== id)),
    }),
    [],
  )

  const value: Ctx = {
    state,
    totals,
    activePos: state.project.positions.find((p) => p.id === state.activePosId),
    updateProject,
    updatePosition,
    loadProject: (project) => dispatch({ type: 'load', project }),
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    setCatalog: (fn) => dispatch({ type: 'catalog', fn }),
    setSettings: (fn) => dispatch({ type: 'settings', fn }),
    setView: (view) => dispatch({ type: 'view', view }),
    setActivePos: (id) => dispatch({ type: 'activePos', id }),
    selectField: (id) => dispatch({ type: 'selectField', id }),
    saved,
  }
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp(): Ctx {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp, AppProvider dışında kullanıldı')
  return c
}
