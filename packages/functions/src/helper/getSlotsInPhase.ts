import { Phase, type iCategory } from 'src/types/models';

export const getSlotsInPhase = (eventPhase: Phase, categoryData: iCategory) => {
  const { slots: nomSlots, shortlistSlots, winSlots } = categoryData;

  return eventPhase === Phase.SHORTLIST
    ? shortlistSlots ?? 15
    : eventPhase === Phase.NOMINATION
    ? nomSlots ?? 5
    : winSlots ?? 1;
};
