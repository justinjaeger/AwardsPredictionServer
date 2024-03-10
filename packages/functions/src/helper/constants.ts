import { CategoryName, CategoryType } from 'src/types/models';

export const COMMUNITY_USER_ID = 'community';
export const DEFAULT_PAGINATE_LIMIT = 10;
export const RECENT_PREDICTION_SETS_TO_SHOW = 5;

// TODO: replace this
export const CATEGORY_NAME_TO_TYPE: { [key in CategoryName]: CategoryType } = {
  [CategoryName.PICTURE]: CategoryType.FILM,
  [CategoryName.DIRECTOR]: CategoryType.FILM,
  [CategoryName.ACTRESS]: CategoryType.PERFORMANCE,
  [CategoryName.ACTOR]: CategoryType.PERFORMANCE,
  [CategoryName.SUPPORTING_ACTRESS]: CategoryType.PERFORMANCE,
  [CategoryName.SUPPORTING_ACTOR]: CategoryType.PERFORMANCE,
  [CategoryName.ORIGINAL_SCREENPLAY]: CategoryType.FILM,
  [CategoryName.ADAPTED_SCREENPLAY]: CategoryType.FILM,
  [CategoryName.INTERNATIONAL]: CategoryType.FILM,
  [CategoryName.DOCUMENTARY]: CategoryType.FILM,
  [CategoryName.ANIMATED]: CategoryType.FILM,
  [CategoryName.CINEMATOGRAPHY]: CategoryType.FILM,
  [CategoryName.EDITING]: CategoryType.FILM,
  [CategoryName.PRODUCTION_DESIGN]: CategoryType.FILM,
  [CategoryName.COSTUMES]: CategoryType.FILM,
  [CategoryName.MAKEUP]: CategoryType.FILM,
  [CategoryName.VISUAL_EFFECTS]: CategoryType.FILM,
  [CategoryName.SOUND]: CategoryType.FILM,
  [CategoryName.SCORE]: CategoryType.FILM,
  [CategoryName.SONG]: CategoryType.SONG,
  [CategoryName.SHORT_DOCUMENTARY]: CategoryType.FILM,
  [CategoryName.SHORT_ANIMATED]: CategoryType.FILM,
  [CategoryName.SHORT_LIVE_ACTION]: CategoryType.FILM,
  [CategoryName.ACTING_ACHIEVEMENT]: CategoryType.PERFORMANCE,
  [CategoryName.ACTION_PICTURE]: CategoryType.FILM,
  [CategoryName.ANIMATED_PERFORMANCE]: CategoryType.PERFORMANCE,
  [CategoryName.BLOCKBUSTER]: CategoryType.FILM,
  [CategoryName.BREAKTHROUGH]: CategoryType.FILM,
  [CategoryName.BRITISH_PICTURE]: CategoryType.FILM,
  [CategoryName.COMEDY_ACTOR]: CategoryType.PERFORMANCE,
  [CategoryName.COMEDY_ACTRESS]: CategoryType.PERFORMANCE,
  [CategoryName.COMEDY_PICTURE]: CategoryType.PERFORMANCE,
  [CategoryName.DEBUT]: CategoryType.FILM,
  [CategoryName.ENSEMBLE]: CategoryType.FILM,
  [CategoryName.FEMALE_DIRECTOR]: CategoryType.FILM,
  [CategoryName.FIRST_SCREENPLAY]: CategoryType.FILM,
  [CategoryName.INDIE_PICTURE]: CategoryType.FILM,
  [CategoryName.MALE_DIRECTOR]: CategoryType.FILM,
  [CategoryName.RISING_STAR]: CategoryType.PERFORMANCE,
  [CategoryName.SCREENPLAY]: CategoryType.FILM,
  [CategoryName.YOUNG_ACTOR]: CategoryType.PERFORMANCE,
  [CategoryName.CASTING]: CategoryType.FILM,
  [CategoryName.BOX_OFFICE]: CategoryType.FILM,
  [CategoryName.STUNT]: CategoryType.FILM
};
