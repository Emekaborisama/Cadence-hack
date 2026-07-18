import type { ProtocolCard } from '@cadence/shared';

/** Clinician-authored. Never model-generated. Read in fixture + live mode. */
export const PROTOCOLS: ProtocolCard[] = [
  {
    id: 'proto-nausea',
    topic: 'nausea',
    label: 'Nausea (early weeks)',
    matchTriggers: ['nausea', 'queasy', 'sick', 'vomit', 'vomiting'],
    patientFacingGuidance: [
      'Eat smaller meals and stop as soon as you feel full.',
      'Sip water regularly through the day to stay hydrated.',
      'Avoid rich, greasy, or very sweet foods for a few days.',
      'Keep taking your medicine as scheduled unless told otherwise.',
    ],
    escalates: true,
    escalationThreshold: 'moderate',
  },
  {
    id: 'proto-injection-site',
    topic: 'injection-site',
    label: 'Injection-site reaction',
    matchTriggers: ['injection site', 'redness', 'bruise', 'itchy at site'],
    patientFacingGuidance: [
      'Rotate sites — abdomen, thigh, or upper arm.',
      'A cool compress for 10 minutes can ease mild redness.',
      'Do not rub the site after injecting.',
    ],
    escalates: true,
    escalationThreshold: 'severe',
  },
  {
    id: 'proto-missed-dose',
    topic: 'missed-dose',
    label: 'Missed dose',
    matchTriggers: ['missed', 'forgot', 'skip', 'skipped'],
    patientFacingGuidance: [
      'If it has been fewer than 5 days, take the missed dose when you remember.',
      'If more than 5 days have passed, skip and take the next dose on your usual day.',
      'Log the miss honestly — that helps your care team more than a perfect streak.',
    ],
    escalates: false,
    escalationThreshold: 'severe',
  },
  {
    id: 'proto-rapid-loss',
    topic: 'rapid-loss',
    label: 'Rapid weight loss',
    matchTriggers: ['lost too much', 'losing too fast', 'clothes falling', 'rapid loss'],
    patientFacingGuidance: [
      'We raise your protein floor and review calories — lean mass matters.',
      'Keep logging meals so we can adjust your plan this week.',
    ],
    escalates: true,
    escalationThreshold: 'always',
  },
  {
    id: 'proto-low-mood',
    topic: 'low-mood',
    label: 'Low mood / wanting to stop',
    matchTriggers: [
      'want to stop',
      'thinking of stopping',
      'depressed',
      'low mood',
      "can't do this",
      'give up',
    ],
    patientFacingGuidance: [
      'Thank you for saying this — it matters.',
      'A clinician on your care team will reach out. You do not have to figure this out alone.',
    ],
    escalates: true,
    escalationThreshold: 'always',
  },
  {
    id: 'proto-emergency',
    topic: 'emergency',
    label: 'Urgent symptoms',
    matchTriggers: [
      'chest pain',
      'pancreatitis',
      'severe abdominal',
      'can\'t keep fluids',
      'cannot keep fluids',
      'trouble breathing',
    ],
    patientFacingGuidance: [
      'This needs urgent care now — do not wait for a coach reply.',
      'Seek emergency services or go to A&E / ER immediately.',
    ],
    escalates: true,
    escalationThreshold: 'always',
  },
];
