import { AwardsBody, CategoryName, CategoryType } from 'src/types/enums';

export const DEFAULT_PAGINATE_LIMIT = 10;

export const getAwardsBodyCategories = (
  awardsBody: AwardsBody,
  year: number
): iCategoryObject => {
  switch (awardsBody) {
    case AwardsBody.ACADEMY_AWARDS:
      // This is just an example of how to use this when an awards body updates their category list
      if (year > 2022) {
        return ACADEMY_AWARDS_CATEGORIES_V1;
      }
      return ACADEMY_AWARDS_CATEGORIES_V1;
    case AwardsBody.GOLDEN_GLOBES:
      return GOLDEN_GLOBE_CATEGORIES_V1;
    default:
      return ALL_CATEGORIES;
  }
};

export const ALL_CATEGORIES: { [key in CategoryName]: undefined } = {
  [CategoryName.PICTURE]: undefined,
  [CategoryName.DIRECTOR]: undefined,
  [CategoryName.ACTRESS]: undefined,
  [CategoryName.ACTOR]: undefined,
  [CategoryName.SUPPORTING_ACTRESS]: undefined,
  [CategoryName.SUPPORTING_ACTOR]: undefined,
  [CategoryName.ORIGINAL_SCREENPLAY]: undefined,
  [CategoryName.ADAPTED_SCREENPLAY]: undefined,
  [CategoryName.INTERNATIONAL]: undefined,
  [CategoryName.DOCUMENTARY]: undefined,
  [CategoryName.ANIMATED]: undefined,
  [CategoryName.CINEMATOGRAPHY]: undefined,
  [CategoryName.EDITING]: undefined,
  [CategoryName.PRODUCTION_DESIGN]: undefined,
  [CategoryName.COSTUMES]: undefined,
  [CategoryName.MAKEUP]: undefined,
  [CategoryName.VISUAL_EFFECTS]: undefined,
  [CategoryName.SOUND]: undefined,
  [CategoryName.SCORE]: undefined,
  [CategoryName.SONG]: undefined,
  [CategoryName.SHORT_DOCUMENTARY]: undefined,
  [CategoryName.SHORT_ANIMATED]: undefined,
  [CategoryName.SHORT_LIVE_ACTION]: undefined,
  [CategoryName.ACTING_ACHIEVEMENT]: undefined,
  [CategoryName.ACTION_PICTURE]: undefined,
  [CategoryName.ANIMATED_PERFORMANCE]: undefined,
  [CategoryName.BLOCKBUSTER]: undefined,
  [CategoryName.BREAKTHROUGH]: undefined,
  [CategoryName.BRITISH_PICTURE]: undefined,
  [CategoryName.COMEDY_ACTOR]: undefined,
  [CategoryName.COMEDY_ACTRESS]: undefined,
  [CategoryName.COMEDY_PICTURE]: undefined,
  [CategoryName.DEBUT]: undefined,
  [CategoryName.ENSEMBLE]: undefined,
  [CategoryName.FEMALE_DIRECTOR]: undefined,
  [CategoryName.FIRST_SCREENPLAY]: undefined,
  [CategoryName.INDIE_PICTURE]: undefined,
  [CategoryName.MALE_DIRECTOR]: undefined,
  [CategoryName.RISING_STAR]: undefined,
  [CategoryName.SCREENPLAY]: undefined,
  [CategoryName.YOUNG_ACTOR]: undefined
};

type iCategoryData = {
  name: string;
  type: CategoryType;
  slots?: number; // 5 by default
  hideUntilShortlisted?: boolean;
};

type iCategoryObject = {
  [key in CategoryName]: iCategoryData | undefined;
};

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
  [CategoryName.YOUNG_ACTOR]: CategoryType.PERFORMANCE
};

export const ACADEMY_AWARDS_CATEGORIES_V1: iCategoryObject = {
  [CategoryName.PICTURE]: {
    name: 'Picture',
    type: CategoryType.FILM,
    slots: 10
  },
  [CategoryName.DIRECTOR]: { name: 'Director', type: CategoryType.FILM },
  [CategoryName.ACTRESS]: { name: 'Actress', type: CategoryType.PERFORMANCE },
  [CategoryName.ACTOR]: { name: 'Actor', type: CategoryType.PERFORMANCE },
  [CategoryName.SUPPORTING_ACTRESS]: {
    name: 'Supporting Actress',
    type: CategoryType.PERFORMANCE
  },
  [CategoryName.SUPPORTING_ACTOR]: {
    name: 'Supporting Actor',
    type: CategoryType.PERFORMANCE
  },
  [CategoryName.ORIGINAL_SCREENPLAY]: {
    name: 'Original Screenplay',
    type: CategoryType.FILM
  },
  [CategoryName.ADAPTED_SCREENPLAY]: {
    name: 'Adapted Screenplay',
    type: CategoryType.FILM
  },
  [CategoryName.INTERNATIONAL]: {
    name: 'International Feature',
    type: CategoryType.FILM
  },
  [CategoryName.DOCUMENTARY]: {
    name: 'Documentary Feature',
    type: CategoryType.FILM
  },
  [CategoryName.ANIMATED]: {
    name: 'Animated Feature',
    type: CategoryType.FILM
  },
  [CategoryName.CINEMATOGRAPHY]: {
    name: 'Cinematography',
    type: CategoryType.FILM
  },
  [CategoryName.EDITING]: { name: 'Editing', type: CategoryType.FILM },
  [CategoryName.PRODUCTION_DESIGN]: {
    name: 'Production Design',
    type: CategoryType.FILM
  },
  [CategoryName.COSTUMES]: { name: 'Costumes', type: CategoryType.FILM },
  [CategoryName.MAKEUP]: { name: 'Makeup and Hair', type: CategoryType.FILM },
  [CategoryName.VISUAL_EFFECTS]: {
    name: 'Visual Effects',
    type: CategoryType.FILM
  },
  [CategoryName.SOUND]: { name: 'Sound', type: CategoryType.FILM },
  [CategoryName.SCORE]: { name: 'Original Score', type: CategoryType.FILM },
  [CategoryName.SONG]: { name: 'Original Song', type: CategoryType.SONG },
  [CategoryName.SHORT_DOCUMENTARY]: {
    name: 'Documentary Short',
    type: CategoryType.FILM,
    hideUntilShortlisted: true
  },
  [CategoryName.SHORT_ANIMATED]: {
    name: 'Animated Short',
    type: CategoryType.FILM,
    hideUntilShortlisted: true
  },
  [CategoryName.SHORT_LIVE_ACTION]: {
    name: 'Live Action Short',
    type: CategoryType.FILM,
    hideUntilShortlisted: true
  },
  SCREENPLAY: undefined,
  ENSEMBLE: undefined,
  COMEDY_PICTURE: undefined,
  COMEDY_ACTOR: undefined,
  COMEDY_ACTRESS: undefined,
  ACTION_PICTURE: undefined,
  YOUNG_ACTOR: undefined,
  RISING_STAR: undefined,
  DEBUT: undefined,
  FIRST_SCREENPLAY: undefined,
  BRITISH_PICTURE: undefined,
  ANIMATED_PERFORMANCE: undefined,
  BLOCKBUSTER: undefined,
  ACTING_ACHIEVEMENT: undefined,
  FEMALE_DIRECTOR: undefined,
  MALE_DIRECTOR: undefined,
  INDIE_PICTURE: undefined,
  BREAKTHROUGH: undefined
};

export const GOLDEN_GLOBE_CATEGORIES_V1: iCategoryObject = {
  [CategoryName.PICTURE]: {
    name: 'Motion Picture - Drama',
    type: CategoryType.FILM
  },
  [CategoryName.COMEDY_PICTURE]: {
    name: 'Motion Picture - Musical or Comedy',
    type: CategoryType.FILM
  },
  [CategoryName.DIRECTOR]: { name: 'Director', type: CategoryType.FILM },
  [CategoryName.ACTOR]: {
    name: 'Actor - Drama',
    type: CategoryType.PERFORMANCE
  },
  [CategoryName.ACTRESS]: {
    name: 'Actress - Drama',
    type: CategoryType.PERFORMANCE
  },
  [CategoryName.COMEDY_ACTOR]: {
    name: 'Actor - Musical or Comedy',
    type: CategoryType.PERFORMANCE
  },
  [CategoryName.COMEDY_ACTRESS]: {
    name: 'Actress - Musical or Comedy',
    type: CategoryType.PERFORMANCE
  },
  [CategoryName.SUPPORTING_ACTOR]: {
    name: 'Supporting Actor',
    type: CategoryType.PERFORMANCE
  },
  [CategoryName.SUPPORTING_ACTRESS]: {
    name: 'Supporting Actress',
    type: CategoryType.PERFORMANCE
  },
  [CategoryName.SCREENPLAY]: { name: 'Screenplay', type: CategoryType.FILM },
  [CategoryName.INTERNATIONAL]: {
    name: 'Motion Picture - Foreign Language',
    type: CategoryType.FILM
  },
  [CategoryName.ANIMATED]: {
    name: 'Motion Picture - Animated',
    type: CategoryType.FILM
  },
  [CategoryName.SCORE]: { name: 'Original Score', type: CategoryType.FILM },
  [CategoryName.SONG]: { name: 'Original Song', type: CategoryType.SONG },
  ORIGINAL_SCREENPLAY: undefined,
  ADAPTED_SCREENPLAY: undefined,
  DOCUMENTARY: undefined,
  EDITING: undefined,
  CINEMATOGRAPHY: undefined,
  PRODUCTION_DESIGN: undefined,
  COSTUMES: undefined,
  MAKEUP: undefined,
  VISUAL_EFFECTS: undefined,
  SOUND: undefined,
  SHORT_ANIMATED: undefined,
  SHORT_DOCUMENTARY: undefined,
  SHORT_LIVE_ACTION: undefined,
  ENSEMBLE: undefined,
  ACTION_PICTURE: undefined,
  YOUNG_ACTOR: undefined,
  RISING_STAR: undefined,
  DEBUT: undefined,
  FIRST_SCREENPLAY: undefined,
  BRITISH_PICTURE: undefined,
  ANIMATED_PERFORMANCE: undefined,
  BLOCKBUSTER: undefined,
  ACTING_ACHIEVEMENT: undefined,
  FEMALE_DIRECTOR: undefined,
  MALE_DIRECTOR: undefined,
  INDIE_PICTURE: undefined,
  BREAKTHROUGH: undefined
};
