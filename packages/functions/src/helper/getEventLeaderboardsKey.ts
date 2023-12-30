import { type Phase } from 'src/types/models';

export const getEventLeaderboardsKey = (phase: Phase, noShorts?: boolean) =>
  `leaderboards.$.${phase as string}` + (noShorts ? '-noShorts' : '');
