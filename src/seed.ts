import type { BlocksDB } from './db'
import { SETTINGS_ID } from './db'

const uid = () => crypto.randomUUID()
const today = () => new Date().toISOString().slice(0, 10)

export function seedInitialData(db: BlocksDB) {
  const areaSport = uid()
  const areaUniversity = uid()
  const areaSkills = uid()

  db.areas.bulkAdd([
    { id: areaSport, name: 'Sport', color: '#D9481F', sortOrder: 0 },
    { id: areaUniversity, name: 'University', color: '#2B6CB0', sortOrder: 1 },
    { id: areaSkills, name: 'Skills & Knowledge', color: '#1E9E6A', sortOrder: 2 },
  ])

  const goalHSPU = uid()
  const goalLSit = uid()
  const goalStrength = uid()
  const goalPosture = uid()
  const goalEndurance = uid()
  const goalKnowledgeExample = uid()
  const createdAt = new Date().toISOString()

  db.goals.bulkAdd([
    {
      id: goalHSPU,
      areaId: areaSport,
      name: 'Handstand push-up',
      modules: ['metrics', 'milestones'],
      status: 'active',
      createdAt,
    },
    {
      id: goalLSit,
      areaId: areaSport,
      name: 'L-sit to handstand',
      modules: ['metrics', 'milestones'],
      status: 'active',
      createdAt,
    },
    {
      id: goalStrength,
      areaId: areaSport,
      name: 'Strength & muscle',
      modules: ['metrics', 'routines'],
      status: 'active',
      createdAt,
    },
    {
      id: goalPosture,
      areaId: areaSport,
      name: 'Posture & left arm',
      modules: ['metrics', 'milestones', 'routines', 'photos'],
      status: 'active',
      createdAt,
    },
    {
      id: goalEndurance,
      areaId: areaSport,
      name: 'Endurance / marathon',
      modules: ['metrics', 'routines'],
      status: 'active',
      createdAt,
    },
    {
      id: goalKnowledgeExample,
      areaId: areaSkills,
      name: 'Example: learning a topic',
      description: 'An example knowledge goal showing resources, notes and cards — edit or delete freely.',
      modules: ['resources', 'cards', 'notes'],
      status: 'active',
      createdAt,
    },
  ])

  db.metrics.bulkAdd([
    { id: uid(), goalId: goalHSPU, name: 'Wall HSPU reps', unit: 'reps', direction: 'increase', aggregation: 'max', showOnDashboard: false },
    { id: uid(), goalId: goalLSit, name: 'L-sit hold', unit: 's', direction: 'increase', aggregation: 'max', showOnDashboard: false },
    { id: uid(), goalId: goalStrength, name: 'Squat top set', unit: 'kg', direction: 'increase', aggregation: 'max', showOnDashboard: false },
    { id: uid(), goalId: goalStrength, name: 'Left/right press gap', unit: '%', direction: 'decrease', aggregation: 'last', showOnDashboard: false },
    { id: uid(), goalId: goalPosture, name: 'Left/right row gap', unit: '%', direction: 'decrease', aggregation: 'last', showOnDashboard: false },
    { id: uid(), goalId: goalEndurance, name: 'Weekly km', unit: 'km', direction: 'increase', aggregation: 'sum', showOnDashboard: false },
    { id: uid(), goalId: goalEndurance, name: 'Long run', unit: 'km', direction: 'increase', aggregation: 'max', showOnDashboard: false },
    { id: uid(), goalId: null, name: 'Body weight', unit: 'kg', direction: 'decrease', aggregation: 'avg', showOnDashboard: true },
    { id: uid(), goalId: null, name: 'Daily rating', unit: '/10', direction: 'increase', aggregation: 'avg', showOnDashboard: true },
  ])

  db.milestones.bulkAdd([
    { id: uid(), goalId: goalHSPU, title: 'Pike push-ups 3×8', done: false, sortOrder: 0 },
    { id: uid(), goalId: goalHSPU, title: 'Feet-elevated pike push-ups 3×8', done: false, sortOrder: 1 },
    { id: uid(), goalId: goalHSPU, title: 'Wall HSPU eccentrics 5×3 (5 s)', done: false, sortOrder: 2 },
    { id: uid(), goalId: goalHSPU, title: 'Wall HSPU 3×5', done: false, sortOrder: 3 },
    { id: uid(), goalId: goalHSPU, title: 'Freestanding HSPU', done: false, sortOrder: 4 },

    { id: uid(), goalId: goalLSit, title: 'L-sit 20 s', done: false, sortOrder: 0 },
    { id: uid(), goalId: goalLSit, title: 'Compression drills 3×10', done: false, sortOrder: 1 },
    { id: uid(), goalId: goalLSit, title: 'Tuck press attempts', done: false, sortOrder: 2 },
    { id: uid(), goalId: goalLSit, title: 'L-sit to handstand on parallettes', done: false, sortOrder: 3 },

    { id: uid(), goalId: goalPosture, title: 'Pain-free support holds 60 s', done: false, sortOrder: 0 },
    { id: uid(), goalId: goalPosture, title: 'Row gap < 15%', done: false, sortOrder: 1 },
    { id: uid(), goalId: goalPosture, title: 'Row gap < 5%', done: false, sortOrder: 2 },
  ])

  db.routines.bulkAdd([
    { id: uid(), name: 'Posture routine (10–15 min)', goalIds: [goalPosture], schedule: [0, 1, 2, 3, 4, 5, 6], quickMetricIds: [], active: true },
    { id: uid(), name: 'Zone 2 run', goalIds: [goalEndurance], schedule: [1, 3], quickMetricIds: [], active: true },
    { id: uid(), name: 'Long run', goalIds: [goalEndurance], schedule: [5], quickMetricIds: [], active: true },
    { id: uid(), name: 'Strength — legs + arm rehab', goalIds: [goalStrength, goalPosture], schedule: [0, 4], quickMetricIds: [], active: true },
    { id: uid(), name: 'Upper body maintenance', goalIds: [goalStrength], schedule: [2], quickMetricIds: [], active: true },
    { id: uid(), name: 'Progress photo (weekly)', goalIds: [goalPosture], schedule: [6], quickMetricIds: [], active: true },
  ])

  db.planEntries.bulkAdd([
    {
      id: uid(),
      title: 'Anatomy lecture',
      time: '10:00',
      durationMin: 90,
      areaId: areaUniversity,
      recurrence: 'weekly',
      weekday: 1,
      createdAt,
    },
    {
      id: uid(),
      title: 'Study group',
      time: '14:00',
      durationMin: 120,
      areaId: areaUniversity,
      recurrence: 'weekly',
      weekday: 3,
      createdAt,
    },
    {
      id: uid(),
      title: 'Half marathon',
      time: '09:00',
      durationMin: 150,
      areaId: areaSport,
      recurrence: 'once',
      date: '2026-08-30',
      createdAt,
    },
  ])

  db.blocks.bulkAdd([
    {
      id: uid(),
      name: 'Block 1 — Base + Arm Rehab',
      startDate: '2026-07-07',
      endDate: '2026-09-13',
      focusGoalId: goalEndurance,
      secondaryGoalIds: [goalPosture, goalStrength],
      weeklyFocusNotes: {},
    },
  ])

  const resourceId = uid()
  db.resources.bulkAdd([
    {
      id: resourceId,
      goalId: goalKnowledgeExample,
      title: 'Example resource — an article or video',
      url: 'https://example.com',
      note: 'Example resource note: key takeaways go here.',
      createdAt,
    },
    {
      id: uid(),
      goalId: goalKnowledgeExample,
      title: 'Example free-form note',
      note: 'Example note: write anything you learned here — this is the "notes" module content.',
      createdAt,
    },
  ])

  db.cards.bulkAdd([
    { id: uid(), goalId: goalKnowledgeExample, front: 'Example question — front of card', back: 'Example answer — back of card', sourceResourceId: resourceId, ease: 2.5, intervalDays: 0, dueDate: today(), reps: 0, createdAt },
    { id: uid(), goalId: goalKnowledgeExample, front: 'Second example question', back: 'Second example answer', ease: 2.5, intervalDays: 0, dueDate: today(), reps: 0, createdAt },
  ])

  db.settings.add({
    id: SETTINGS_ID,
    dailyQuestion: 'How was your day?',
    newCardsPerDay: 10,
    dueCardsPerDay: 30,
    hideRoutineChecklist: false,
  })
}
