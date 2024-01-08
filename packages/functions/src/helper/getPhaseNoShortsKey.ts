import { type Phase } from 'src/types/models';

export const getPhaseNoShortsKey = (phase: Phase, noShorts?: boolean) =>
  `${phase as string}` + (noShorts ? '-noShorts' : '');
