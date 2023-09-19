export enum AmplifyUserRole {
  ADMIN = "ADMIN",
  TESTER = "TESTER",
  USER = "USER",
}

export type AmplifyUser = {
  __typename: "User",
  id: string,
  email: string,
  oauthId?: string | null,
  username?: string | null,
  name?: string | null,
  bio?: string | null,
  image?: string | null,
  role: AmplifyUserRole,
  createdAt: string,
  updatedAt: string,
};

export type AmplifyPredictionSet = {
  __typename: "PredictionSet",
  id: string,
  userId: string,
  user: AmplifyUser,
  eventId: string,
  event: Event,
  categoryId: string,
  category: AmplifyCategory,
  type?: AmplifyPredictionType | null,
  comment?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type AmplifyEvent = {
  __typename: "Event",
  id: string,
  categories?: null,
  awardsBody: AmplifyAwardsBody,
  year: number,
  nominationDateTime?: string | null,
  winDateTime?: string | null,
  status?: AmplifyEventStatus | null,
  predictionSets?: null,
  historyPredictions?: null,
  liveAt?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type AmplifyCategory = {
  __typename: "Category",
  id: string,
  eventId: string,
  event: Event,
  name: AmplifyCategoryName,
  type: AmplifyCategoryType,
  phase?: AmplifyContenderAccolade | null,
  lockTime?: string | null,
  predictionSets?: null,
  historyPredictions?: null,
  createdAt: string,
  updatedAt: string,
};

export enum AmplifyCategoryName {
  PICTURE = "PICTURE",
  DIRECTOR = "DIRECTOR",
  ACTOR = "ACTOR",
  ACTRESS = "ACTRESS",
  SUPPORTING_ACTOR = "SUPPORTING_ACTOR",
  SUPPORTING_ACTRESS = "SUPPORTING_ACTRESS",
  ORIGINAL_SCREENPLAY = "ORIGINAL_SCREENPLAY",
  ADAPTED_SCREENPLAY = "ADAPTED_SCREENPLAY",
  SCREENPLAY = "SCREENPLAY",
  INTERNATIONAL = "INTERNATIONAL",
  ANIMATED = "ANIMATED",
  DOCUMENTARY = "DOCUMENTARY",
  EDITING = "EDITING",
  CINEMATOGRAPHY = "CINEMATOGRAPHY",
  PRODUCTION_DESIGN = "PRODUCTION_DESIGN",
  COSTUMES = "COSTUMES",
  MAKEUP = "MAKEUP",
  VISUAL_EFFECTS = "VISUAL_EFFECTS",
  SOUND = "SOUND",
  SCORE = "SCORE",
  SONG = "SONG",
  SHORT_ANIMATED = "SHORT_ANIMATED",
  SHORT_DOCUMENTARY = "SHORT_DOCUMENTARY",
  SHORT_LIVE_ACTION = "SHORT_LIVE_ACTION",
  ENSEMBLE = "ENSEMBLE",
  COMEDY_PICTURE = "COMEDY_PICTURE",
  COMEDY_ACTOR = "COMEDY_ACTOR",
  COMEDY_ACTRESS = "COMEDY_ACTRESS",
  ACTION_PICTURE = "ACTION_PICTURE",
  YOUNG_ACTOR = "YOUNG_ACTOR",
  RISING_STAR = "RISING_STAR",
  DEBUT = "DEBUT",
  FIRST_SCREENPLAY = "FIRST_SCREENPLAY",
  BRITISH_PICTURE = "BRITISH_PICTURE",
  ANIMATED_PERFORMANCE = "ANIMATED_PERFORMANCE",
  BLOCKBUSTER = "BLOCKBUSTER",
  ACTING_ACHIEVEMENT = "ACTING_ACHIEVEMENT",
  FEMALE_DIRECTOR = "FEMALE_DIRECTOR",
  MALE_DIRECTOR = "MALE_DIRECTOR",
  INDIE_PICTURE = "INDIE_PICTURE",
  BREAKTHROUGH = "BREAKTHROUGH",
}


export enum AmplifyCategoryType {
  FILM = "FILM",
  PERFORMANCE = "PERFORMANCE",
  SONG = "SONG",
}


export enum AmplifyContenderAccolade {
  WINNER = "WINNER",
  NOMINEE = "NOMINEE",
  SHORTLISTED = "SHORTLISTED",
}

export type AmplifyHistoryPredictionSet = {
  __typename: "HistoryPredictionSet",
  id: string,
  userId: string,
  user: AmplifyUser,
  eventId: string,
  event: Event,
  categoryId: string,
  category: AmplifyCategory,
  predictions?: null,
  type?: AmplifyPredictionType | null,
  comment?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type AmplifyHistoryPrediction = {
  __typename: "HistoryPrediction",
  id: string,
  historyPredictionSetId: string,
  contenderId: string,
  contender: AmplifyContender,
  categoryId: string,
  category: AmplifyCategory,
  ranking: number,
  createdAt: string,
  updatedAt: string,
};

export type AmplifyContender = {
  __typename: "Contender",
  id: string,
  categoryId: string,
  category: AmplifyCategory,
  eventId: string,
  event: Event,
  movieId: string,
  movie: AmplifyMovie,
  personId?: string | null,
  person?: AmplifyPerson | null,
  songId?: string | null,
  song?: AmplifySong | null,
  visibility?: AmplifyContenderVisibility | null,
  accolade?: AmplifyContenderAccolade | null,
  createdAt: string,
  updatedAt: string,
};

export type AmplifyMovie = {
  __typename: "Movie",
  id: string,
  tmdbId: number,
  studio?: string | null,
  createdAt: string,
  updatedAt: string,
};

export type AmplifyPerson = {
  __typename: "Person",
  id: string,
  tmdbId: number,
  createdAt: string,
  updatedAt: string,
};

export type AmplifySong = {
  __typename: "Song",
  id: string,
  movieId: string,
  movie: AmplifyMovie,
  title: string,
  artist: string,
  createdAt: string,
  updatedAt: string,
};

export enum AmplifyContenderVisibility {
  HIDDEN = "HIDDEN",
  VISIBLE = "VISIBLE",
}


export enum AmplifyPredictionType {
  WIN = "WIN",
  NOMINATION = "NOMINATION",
}


export enum AmplifyAwardsBody {
  ACADEMY_AWARDS = "ACADEMY_AWARDS",
  GOLDEN_GLOBES = "GOLDEN_GLOBES",
  CRITICS_CHOICE = "CRITICS_CHOICE",
  BAFTA = "BAFTA",
  HCA = "HCA",
  PGA = "PGA",
  SAG = "SAG",
  DGA = "DGA",
  WGA = "WGA",
  ADG = "ADG",
  MAKEUP_GUILD = "MAKEUP_GUILD",
  CDG = "CDG",
  ASC = "ASC",
  MPSE = "MPSE",
}


export enum AmplifyEventStatus {
  NOMS_STAGING = "NOMS_STAGING",
  NOMS_LIVE = "NOMS_LIVE",
  WINS_STAGING = "WINS_STAGING",
  WINS_LIVE = "WINS_LIVE",
  ARCHIVED = "ARCHIVED",
}

export type AmplifyPrediction = {
  __typename: "Prediction",
  id: string,
  predictionSetId: string,
  contenderId: string,
  contender: AmplifyContender,
  ranking: number,
  createdAt: string,
  updatedAt: string,
};

export type AmplifyRelationship = {
  __typename: "Relationship",
  id: string,
  followedUserId: string,
  followedUser: AmplifyUser,
  followingUserId: string,
  followingUser: AmplifyUser,
  createdAt: string,
  updatedAt: string,
};
