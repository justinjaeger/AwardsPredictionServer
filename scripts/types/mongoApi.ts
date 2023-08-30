const { ObjectId } = require("mongodb");

enum Phase {
  CLOSED = "CLOSED",
  SHORTLIST = "SHORTLIST",
  NOMINATION = "NOMINATION",
  WINNER = "WINNER",
}

enum UserRole {
  ADMIN = "ADMIN",
  TESTER = "TESTER",
  USER = "USER",
}

enum AwardsBody {
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

enum EventStatus {
  NOMS_STAGING = "NOMS_STAGING", // before nominations go public
  NOMS_LIVE = "NOMS_LIVE", // when everyone can predict nominations
  WINS_STAGING = "WINS_STAGING", // when nominations are being announced + prepared
  WINS_LIVE = "WINS_LIVE", // when everyone can predict wins
  ARCHIVED = "ARCHIVED", // when winners have been announced and such
}

enum CategoryType {
  FILM = "FILM",
  PERFORMANCE = "PERFORMANCE",
  SONG = "SONG",
}

enum CategoryName {
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

type MongoActivePrediction = {
  eventId: typeof ObjectId;
  userId: typeof ObjectId;
  contenderId: typeof ObjectId;
  expireAt: Date;
  place: number;
  phase?: Phase;
}

type MongoCategoryUpdateLog = {
  userId: typeof ObjectId;
  eventId: typeof ObjectId;
  category: CategoryName;
  yyyymmddUpdates: Record<number, boolean>;
}

type MongoContender = {
  eventId: typeof ObjectId;
  movieId: typeof ObjectId;
  category: CategoryName;
  isHidden?: boolean;
  accolade?: Phase;
  songId?: typeof ObjectId;
  personId?: typeof ObjectId;
  numPredicting?: Record<number, number>;
}

type MongoEventModel = {
  categories: Record<
    CategoryName,
    {
      type: CategoryType;
      phase?: Phase;
      shortlistDateTime?: Date;
    }
  >;
  awardsBody: AwardsBody;
  year: number;
  status: EventStatus;
  liveAt?: Date;
  nomDateTime?: Date;
  winDateTime?: Date;
}

type MongoIMovieCategoryCredit =
  | "directing"
  | "screenplay"
  | "cinematography"
  | "costumes"
  | "editing"
  | "productionDesign"
  | "score"
  | "vfx";

type IMovieCategoryCredit =
  | 'directing'
  | 'screenplay'
  | 'cinematography'
  | 'costumes'
  | 'editing'
  | 'productionDesign'
  | 'score'
  | 'vfx';

type MongoMovie = {
  tmdbId: number;
  title: string;
  year?: number;
  studio?: string;
  plot?: string;
  imdbId?: string;
  cast?: string;
  posterPath?: string;
  backdropPath?: string;
  categoryCredits: Record<IMovieCategoryCredit, string[]>;
}

type MongoPerson = {
  tmdbId: number;
  imdbId?: string;
  name?: string;
  posterPath?: string;
}

type iPredictions = Array<{
  contenderId: typeof ObjectId;
  ranking: number;
  movieId: typeof ObjectId;
  personId?: typeof ObjectId;
  songId?: typeof ObjectId;
  numPredicting?: Record<number, number>; // only applies to community predictions
}>;

type MongoiCategoryPrediction = {
  type: CategoryType;
  createdAt: Date;
  predictions: iPredictions;
  phase?: Phase | undefined;
};

type iCategoryPrediction = {
  type: CategoryType;
  createdAt: Date;
  predictions: iPredictions;
  phase?: Phase | undefined;
};


type MongoPredictionSet = {
  userId: typeof ObjectId | "community";
  eventId: typeof ObjectId;
  yyyymmdd: number;
  categories: {
    [key in CategoryName]: iCategoryPrediction;
  };
}

type MongoRelationship = {
  followedUserId: typeof ObjectId;
  followingUserId: typeof ObjectId;
}

type MongoRelationshipWithUser = MongoRelationship & {
  followedUserList: MongoUser[];
  followingUserList: MongoUser[];
}

type MongoSong = {
  movieId: typeof ObjectId;
  title: string;
  artist?: string;
}

type MongoToken = {
  userId: typeof ObjectId;
  token: string;
}

type MongoUser = {
  email: string;
  oauthId?: string;
  username?: string;
  name?: string;
  bio?: string;
  role?: UserRole;
  followingCount?: number;
  followerCount?: number;
  eventsPredicting?: typeof ObjectId[];
  recentPredictionSets?: Array<{
    awardsBody: string;
    category: string;
    year: number;
    predictionSetId: typeof ObjectId;
    createdAt: Date;
    topPredictions: iPredictions;
  }>;
}
