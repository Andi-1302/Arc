import Dexie, { type EntityTable } from 'dexie'
import { seedInitialData } from './seed'

export interface Area {
  id: string
  name: string
  color: string
  image?: string
  sortOrder: number
}

export type Module =
  | 'metrics'
  | 'milestones'
  | 'routines'
  | 'resources'
  | 'cards'
  | 'photos'
  | 'notes'

export interface Goal {
  id: string
  areaId: string
  name: string
  description?: string
  coverImage?: string
  modules: Module[]
  status: 'active' | 'paused' | 'archived'
  createdAt: string
}

export interface Metric {
  id: string
  goalId: string | null
  name: string
  unit: string
  direction: 'increase' | 'decrease'
  aggregation: 'sum' | 'max' | 'last' | 'avg'
  showOnDashboard: boolean
  target?: number
}

export interface MetricEntry {
  id: string
  metricId: string
  date: string
  value: number
  note?: string
}

export interface Milestone {
  id: string
  goalId: string
  title: string
  done: boolean
  doneAt?: string
  sortOrder: number
}

export interface Routine {
  id: string
  name: string
  goalIds: string[]
  schedule: number[]
  quickMetricIds: string[]
  active: boolean
}

export interface RoutineCheck {
  id: string
  routineId: string
  date: string
  done: boolean
}

export interface HabitStrength {
  routineId: string
  value: number
  lastUpdated: string
}

export interface Block {
  id: string
  name: string
  startDate: string
  endDate: string
  focusGoalId: string
  secondaryGoalIds: string[]
  weeklyFocusNotes: Record<string, string>
  reflection?: string
  closedAt?: string
}

export interface WeeklyReview {
  id: string
  isoWeek: string
  processQuota: number
  note: string
  nextWeekFocus?: string
  createdAt: string
}

export interface DayLog {
  date: string
  rating?: number
  note?: string
  tomorrowFocus?: string
  gratitude?: string[]
}

export interface Resource {
  id: string
  goalId: string
  title: string
  url?: string
  note?: string
  createdAt: string
}

export interface Card {
  id: string
  goalId: string
  front: string
  back: string
  sourceResourceId?: string
  ease: number
  intervalDays: number
  dueDate: string
  reps: number
  createdAt: string
}

export interface ReviewLog {
  id: string
  cardId: string
  date: string
  grade: 0 | 1 | 2 | 3
}

export interface Photo {
  id: string
  goalId: string | null
  date: string
  blob: Blob
  caption?: string
}

export type PlanRecurrence = 'once' | 'weekly'

export interface PlanEntry {
  id: string
  title: string
  time?: string // "HH:MM"
  durationMin?: number // only meaningful when time is set; defaults to 60 in the UI
  areaId?: string // optional, colors the timetable block
  recurrence: PlanRecurrence
  date?: string // set when recurrence === 'once'
  weekday?: number // 0=Monday..6=Sunday, set when recurrence === 'weekly'
  createdAt: string
}

export interface PlanEntryCheck {
  id: string
  planEntryId: string
  date: string
  done: boolean
}

export interface Todo {
  id: string
  title: string
  done: boolean
  doneAt?: string
  dueDate?: string
  goalId?: string
  createdAt: string
}

export interface Settings {
  id: string
  dailyQuestion: string
  newCardsPerDay: number
  dueCardsPerDay: number
  lastBackupAt?: string
  hideRoutineChecklist: boolean
}

export const SETTINGS_ID = 'settings'

export class BlocksDB extends Dexie {
  areas!: EntityTable<Area, 'id'>
  goals!: EntityTable<Goal, 'id'>
  metrics!: EntityTable<Metric, 'id'>
  entries!: EntityTable<MetricEntry, 'id'>
  milestones!: EntityTable<Milestone, 'id'>
  routines!: EntityTable<Routine, 'id'>
  routineChecks!: EntityTable<RoutineCheck, 'id'>
  strengths!: EntityTable<HabitStrength, 'routineId'>
  blocks!: EntityTable<Block, 'id'>
  reviews!: EntityTable<WeeklyReview, 'id'>
  dayLogs!: EntityTable<DayLog, 'date'>
  resources!: EntityTable<Resource, 'id'>
  cards!: EntityTable<Card, 'id'>
  cardReviews!: EntityTable<ReviewLog, 'id'>
  photos!: EntityTable<Photo, 'id'>
  planEntries!: EntityTable<PlanEntry, 'id'>
  planEntryChecks!: EntityTable<PlanEntryCheck, 'id'>
  settings!: EntityTable<Settings, 'id'>
  todos!: EntityTable<Todo, 'id'>

  constructor() {
    super('blocks')
    this.version(1).stores({
      areas: 'id, sortOrder',
      goals: 'id, areaId, status',
      metrics: 'id, goalId',
      entries: 'id, metricId, date',
      milestones: 'id, goalId, sortOrder',
      routines: 'id, active, *goalIds',
      routineChecks: 'id, routineId, date, [routineId+date]',
      strengths: 'routineId',
      blocks: 'id, startDate, endDate',
      reviews: 'id, isoWeek',
      dayLogs: 'date',
      resources: 'id, goalId',
      cards: 'id, goalId, dueDate',
      cardReviews: 'id, cardId, date',
      photos: 'id, goalId, date',
      settings: 'id',
    })
    this.version(2).stores({
      entries: 'id, metricId, date, [metricId+date]',
      routineChecks: 'id, routineId, date, &[routineId+date]',
    })
    this.version(3).stores({
      planEntries: 'id, recurrence, date, weekday',
      planEntryChecks: 'id, planEntryId, date, &[planEntryId+date]',
    })
    this.version(4).stores({
      todos: 'id, goalId, done, dueDate',
    })
  }
}

export const db = new BlocksDB()

db.on('populate', () => seedInitialData(db))

// open eagerly so seeding runs on first launch instead of on first query
db.open().catch((err) => console.error('Failed to open db', err))

// spec §9: ask the browser not to evict IndexedDB under storage pressure (photos make this matter)
navigator.storage?.persist?.().catch(() => {})
