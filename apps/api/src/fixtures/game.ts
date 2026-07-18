import type { GameState } from '@cadence/shared';

export const INITIAL_GAME: GameState = {
  streaks: { injection: 0, logging: 0 },
  points: 0,
  level: 1,
  activeQuests: [
    {
      id: 'quest-protein',
      title: 'Protein quest — hit your daily target',
      progress: 0,
      goal: 110,
    },
    {
      id: 'quest-steps',
      title: 'Step challenge — evening walk streak',
      progress: 0,
      goal: 5,
    },
  ],
  nonScaleVictories: [],
  streakRepairUsed: false,
};
