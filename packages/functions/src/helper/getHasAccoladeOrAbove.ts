import { Phase } from 'src/types/models';

export const getHasAccoladeOrAbove = (
  eventPhase: Phase,
  contenderAccolade: Phase | undefined
) => {
  if (eventPhase === Phase.SHORTLIST) {
    // any accolade at all means it is shortlisted or above
    return contenderAccolade !== undefined;
  }
  if (eventPhase === Phase.NOMINATION) {
    return (
      contenderAccolade === Phase.NOMINATION ||
      contenderAccolade === Phase.WINNER
    );
  }
  if (eventPhase === Phase.WINNER) {
    return contenderAccolade === Phase.WINNER;
  }
  return true;
};
