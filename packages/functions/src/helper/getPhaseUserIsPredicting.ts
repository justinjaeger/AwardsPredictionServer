import { EventStatus, Phase } from 'src/types/models';

export const getPhaseUserIsPredicting = (
  eventStatus: EventStatus,
  nomDateTime: Date | undefined,
  winDateTime: Date | undefined,
  shortlistDateTime: Date | undefined
) => {
  const shortlistDateHasPassed = !!(
    shortlistDateTime && shortlistDateTime < new Date()
  );
  const nomDateHasPassed = !!(nomDateTime && nomDateTime < new Date());
  const winDateHasPassed = !!(winDateTime && winDateTime < new Date());
  const canPredictWinners =
    !winDateHasPassed && eventStatus === EventStatus.WINS_LIVE;
  const canPredictNominations =
    !nomDateHasPassed && eventStatus === EventStatus.NOMS_LIVE;
  const canPredictShortlist =
    !shortlistDateHasPassed && eventStatus === EventStatus.NOMS_LIVE;
  const phaseUserIsPredicting = canPredictWinners
    ? Phase.WINNER
    : canPredictShortlist
    ? Phase.SHORTLIST
    : canPredictNominations
    ? Phase.NOMINATION
    : Phase.CLOSED;
  return phaseUserIsPredicting;
};
