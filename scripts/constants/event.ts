export enum AwardsBody {
    ACADEMY_AWARDS='ACADEMY_AWARDS',
    GOLDEN_GLOBES='GOLDEN_GLOBES',
    CRITICS_CHOICE='CRITICS_CHOICE',
    BAFTA='BAFTA',
    HCA='HCA',
    PGA='PGA',
    SAG='SAG',
    DGA='DGA',
    WGA='WGA',
    ADG='ADG',
    MAKEUP_GUILD='MAKEUP_GUILD',
    CDG='CDG',
    ASC='ASC',
    MPSE='MPSE',
}

export enum EventStatus {
    NOMS_STAGING='NOMS_STAGING', // before nominations go public
    NOMS_LIVE='NOMS_LIVE', // when everyone can predict nominations
    WINS_STAGING='WINS_STAGING', // when nominations are being announced + prepared
    WINS_LIVE='WINS_LIVE', // when everyone can predict wins
    ARCHIVED='ARCHIVED', // when winners have been announced and such
}

export enum CategoryType {
    FILM='FILM',
    PERFORMANCE='PERFORMANCE',
    SONG='SONG',
}

export enum Phase {
    SHORTLIST='SHORTLIST',
    NOMINATION='NOMINATION',
    WIN='WIN',
}

export enum CategoryName {
    PICTURE='PICTURE',
    DIRECTOR='DIRECTOR',
    ACTOR='ACTOR',
    ACTRESS='ACTRESS',
    SUPPORTING_ACTOR='SUPPORTING_ACTOR',
    SUPPORTING_ACTRESS='SUPPORTING_ACTRESS',
    ORIGINAL_SCREENPLAY='ORIGINAL_SCREENPLAY',
    ADAPTED_SCREENPLAY='ADAPTED_SCREENPLAY',
    SCREENPLAY='SCREENPLAY',
    INTERNATIONAL='INTERNATIONAL',
    ANIMATED='ANIMATED',
    DOCUMENTARY='DOCUMENTARY',
    EDITING='EDITING',
    CINEMATOGRAPHY='CINEMATOGRAPHY',
    PRODUCTION_DESIGN='PRODUCTION_DESIGN',
    COSTUMES='COSTUMES',
    MAKEUP='MAKEUP',
    VISUAL_EFFECTS='VISUAL_EFFECTS',
    SOUND='SOUND',
    SCORE='SCORE',
    SONG='SONG',
    SHORT_ANIMATED='SHORT_ANIMATED',
    SHORT_DOCUMENTARY='SHORT_DOCUMENTARY',
    SHORT_LIVE_ACTION='SHORT_LIVE_ACTION',
    ENSEMBLE='ENSEMBLE',
    COMEDY_PICTURE='COMEDY_PICTURE',
    COMEDY_ACTOR='COMEDY_ACTOR',
    COMEDY_ACTRESS='COMEDY_ACTRESS',
    ACTION_PICTURE='ACTION_PICTURE',
    YOUNG_ACTOR='YOUNG_ACTOR',
    RISING_STAR='RISING_STAR',
    DEBUT='DEBUT',
    FIRST_SCREENPLAY='FIRST_SCREENPLAY',
    BRITISH_PICTURE='BRITISH_PICTURE',
    ANIMATED_PERFORMANCE='ANIMATED_PERFORMANCE',
    BLOCKBUSTER='BLOCKBUSTER',
    ACTING_ACHIEVEMENT='ACTING_ACHIEVEMENT',
    FEMALE_DIRECTOR='FEMALE_DIRECTOR',
    MALE_DIRECTOR='MALE_DIRECTOR',
    INDIE_PICTURE='INDIE_PICTURE',
    BREAKTHROUGH='BREAKTHROUGH',
}


export type iCategoryData = {
  name: string;
  type: CategoryType;
  slots?: number; // 5 by default
  hideUntilShortlisted?: boolean;
};

type iCategoryObject = {
  [key in CategoryName]: iCategoryData | undefined;
};

export const CATEGORY_TYPE_TO_STRING: { [key in CategoryType]: string } = {
  [CategoryType.FILM]: 'Film',
  [CategoryType.PERFORMANCE]: 'Performance',
  [CategoryType.SONG]: 'Song',
};

export const getCategorySlots = (
  event: {
    awardsBody: AwardsBody;
    year: number;
  },
  categoryName: CategoryName,
  predictionType: Phase,
) => {
  // this could be history, so we need to check the prediction type specific to PredictionSet to see if predicting noms or wins
  if (predictionType === Phase.WIN) return 1;
  const awardsBodyCategory = getAwardsBodyCategories(event.awardsBody, event.year);
  // Get number of slots in category (5 by default)
  return awardsBodyCategory[categoryName]?.slots || 5;
};

export const getAwardsBodyCategories = (
  awardsBody: AwardsBody,
  year: number,
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
  [CategoryName.YOUNG_ACTOR]: undefined,
};

const ACADEMY_AWARDS_CATEGORIES_V1: iCategoryObject = {
  [CategoryName.PICTURE]: { name: 'Picture', type: CategoryType.FILM, slots: 10 },
  [CategoryName.DIRECTOR]: { name: 'Director', type: CategoryType.FILM },
  [CategoryName.ACTRESS]: { name: 'Actress', type: CategoryType.PERFORMANCE },
  [CategoryName.ACTOR]: { name: 'Actor', type: CategoryType.PERFORMANCE },
  [CategoryName.SUPPORTING_ACTRESS]: {
    name: 'Supporting Actress',
    type: CategoryType.PERFORMANCE,
  },
  [CategoryName.SUPPORTING_ACTOR]: {
    name: 'Supporting Actor',
    type: CategoryType.PERFORMANCE,
  },
  [CategoryName.ORIGINAL_SCREENPLAY]: {
    name: 'Original Screenplay',
    type: CategoryType.FILM,
  },
  [CategoryName.ADAPTED_SCREENPLAY]: {
    name: 'Adapted Screenplay',
    type: CategoryType.FILM,
  },
  [CategoryName.INTERNATIONAL]: {
    name: 'International Feature',
    type: CategoryType.FILM,
  },
  [CategoryName.DOCUMENTARY]: { name: 'Documentary Feature', type: CategoryType.FILM },
  [CategoryName.ANIMATED]: { name: 'Animated Feature', type: CategoryType.FILM },
  [CategoryName.CINEMATOGRAPHY]: { name: 'Cinematography', type: CategoryType.FILM },
  [CategoryName.EDITING]: { name: 'Editing', type: CategoryType.FILM },
  [CategoryName.PRODUCTION_DESIGN]: {
    name: 'Production Design',
    type: CategoryType.FILM,
  },
  [CategoryName.COSTUMES]: { name: 'Costumes', type: CategoryType.FILM },
  [CategoryName.MAKEUP]: { name: 'Makeup and Hair', type: CategoryType.FILM },
  [CategoryName.VISUAL_EFFECTS]: { name: 'Visual Effects', type: CategoryType.FILM },
  [CategoryName.SOUND]: { name: 'Sound', type: CategoryType.FILM },
  [CategoryName.SCORE]: { name: 'Original Score', type: CategoryType.FILM },
  [CategoryName.SONG]: { name: 'Original Song', type: CategoryType.SONG },
  [CategoryName.SHORT_DOCUMENTARY]: {
    name: 'Documentary Short',
    type: CategoryType.FILM,
    hideUntilShortlisted: true,
  },
  [CategoryName.SHORT_ANIMATED]: {
    name: 'Animated Short',
    type: CategoryType.FILM,
    hideUntilShortlisted: true,
  },
  [CategoryName.SHORT_LIVE_ACTION]: {
    name: 'Live Action Short',
    type: CategoryType.FILM,
    hideUntilShortlisted: true,
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
  BREAKTHROUGH: undefined,
};

const GOLDEN_GLOBE_CATEGORIES_V1: iCategoryObject = {
  [CategoryName.PICTURE]: { name: 'Motion Picture - Drama', type: CategoryType.FILM },
  [CategoryName.COMEDY_PICTURE]: {
    name: 'Motion Picture - Musical or Comedy',
    type: CategoryType.FILM,
  },
  [CategoryName.DIRECTOR]: { name: 'Director', type: CategoryType.FILM },
  [CategoryName.ACTOR]: { name: 'Actor - Drama', type: CategoryType.PERFORMANCE },
  [CategoryName.ACTRESS]: { name: 'Actress - Drama', type: CategoryType.PERFORMANCE },
  [CategoryName.COMEDY_ACTOR]: {
    name: 'Actor - Musical or Comedy',
    type: CategoryType.PERFORMANCE,
  },
  [CategoryName.COMEDY_ACTRESS]: {
    name: 'Actress - Musical or Comedy',
    type: CategoryType.PERFORMANCE,
  },
  [CategoryName.SUPPORTING_ACTOR]: {
    name: 'Supporting Actor',
    type: CategoryType.PERFORMANCE,
  },
  [CategoryName.SUPPORTING_ACTRESS]: {
    name: 'Supporting Actress',
    type: CategoryType.PERFORMANCE,
  },
  [CategoryName.SCREENPLAY]: { name: 'Screenplay', type: CategoryType.FILM },
  [CategoryName.INTERNATIONAL]: {
    name: 'Motion Picture - Foreign Language',
    type: CategoryType.FILM,
  },
  [CategoryName.ANIMATED]: { name: 'Motion Picture - Animated', type: CategoryType.FILM },
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
  BREAKTHROUGH: undefined,
};
