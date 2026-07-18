import type { CarePlan } from '@cadence/shared';
import { MEERA } from './patient.js';

export const WEEK_ONE_PLAN: CarePlan = {
  patientId: MEERA.id,
  weekNumber: 1,
  proteinTargetG: 110,
  stepTarget: 6500,
  calorieRange: { min: 1500, max: 1800 },
  dailyActions: [
    {
      id: 'act-protein',
      title: 'Hit 110g protein',
      detail: 'Three protein anchors — breakfast eggs, lunch lentils, dinner fish or tofu.',
      when: 'All day',
    },
    {
      id: 'act-walk',
      title: 'Evening walk',
      detail: '20 minutes after your evening meal.',
      when: '19:30',
    },
    {
      id: 'act-injection',
      title: 'Semaglutide injection',
      detail: '0.25 mg — same day each week. Log it when done.',
      when: 'Weekly',
    },
    {
      id: 'act-water',
      title: 'Sip water through the day',
      detail: 'Helps with early GLP-1 nausea. Aim for steady sips, not gulps.',
      when: 'All day',
    },
  ],
  titrationTimeline: MEERA.medication.titrationPlan,
  summary:
    'Week one: protect protein, keep the evening walk, start semaglutide gently at 0.25 mg. We review every log.',
  generatedAt: new Date().toISOString(),
  constraints: {
    calorieFloor: 1400,
    proteinFloor: 90,
    maxLossRatePerWeekKg: 1.0,
  },
};
