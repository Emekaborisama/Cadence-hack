import type { Patient } from '@cadence/shared';

/** Meera — seed patient for the hackathon demo. */
export const MEERA: Patient = {
  id: 'patient-meera',
  name: 'Meera',
  condition: 'Type 2 diabetes · starting GLP-1',
  medication: {
    name: 'Semaglutide',
    currentDose: '0.25 mg once weekly',
    schedule: 'Same day each week',
    titrationPlan: [
      {
        label: 'Weeks 1–4',
        dose: '0.25 mg once a week',
        note: 'Starting dose — kept low to keep side effects gentle.',
      },
      { label: 'Weeks 5–8', dose: '0.5 mg once a week' },
      {
        label: 'Week 9 onwards',
        dose: '1 mg once a week',
        note: 'Usual maintenance dose if tolerated.',
      },
    ],
  },
  baselineLabs: {
    a1c: 58,
    lipids: 'LDL elevated',
    weightKg: 92,
  },
  goals: [
    'Bring morning sugars down',
    'Protect lean mass with protein',
    'Build a sustainable evening walk habit',
  ],
  coachName: 'Asha',
};
