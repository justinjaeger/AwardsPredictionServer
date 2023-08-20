import { type ObjectId } from 'mongodb';
import {
  type CategoryType,
  type CategoryName,
  type Phase,
  type AwardsBody,
  type EventStatus,
  type UserRole
} from './enums';

export interface ActivePrediction {
  eventId: ObjectId;
  userId: ObjectId;
  contenderId: ObjectId;
  expireAt: Date;
  place: number;
  phase?: Phase;
}

export interface CategoryUpdateLog {
  userId: ObjectId;
  eventId: ObjectId;
  category: CategoryName;
  yyyymmddUpdates: Record<string, boolean>;
}

export interface Contender {
  eventId: ObjectId;
  movieId: ObjectId;
  category: CategoryName;
  isHidden?: boolean;
  numPredicting?: Record<string, number>;
  accolade?: Phase;
  songId?: ObjectId;
  personId?: ObjectId;
}

export interface EventModel {
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

export type IMovieCategoryCredit =
  | 'directing'
  | 'screenplay'
  | 'cinematography'
  | 'costumes'
  | 'editing'
  | 'productionDesign'
  | 'score'
  | 'vfx';

export interface Movie {
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

export interface Person {
  tmdbId: number;
  imdbId?: string;
  name?: string;
  posterPath?: string;
}

export interface PredictionSet {
  userId: ObjectId;
  eventId: ObjectId;
  yyyymmdd: number;
  categories: Record<
    CategoryName,
    {
      type: CategoryType;
      phase?: Phase;
      predictions: Array<{
        contenderId: ObjectId;
        ranking: number;
        movie: {
          tmdbId: number;
          title: string;
          posterPath?: string;
        };
        person?: {
          tmdbId: number;
          name: string;
          posterPath?: string;
        };
        song?: {
          title: string;
          artist?: string;
        };
      }>;
    }
  >;
}

export interface Relationship {
  followedUserId: ObjectId;
  followingUserId: ObjectId;
}

export interface RelationshipWithUser extends Relationship {
  followedUserList: User[];
  followingUserList: User[];
}

export interface Song {
  movieId: ObjectId;
  title: string;
  artist?: string;
}

export interface Token {
  userId: ObjectId;
  token: string;
}

export interface User {
  email: string;
  oauthId?: string;
  username?: string;
  name?: string;
  bio?: string;
  role?: UserRole;
  followingCount?: number;
  followerCount?: number;
  eventsPredicting?: ObjectId[];
  recentPredictionSets?: [
    {
      awardsBody: string;
      category: string;
      year: string;
      predictionSetId: ObjectId;
      createdAt: Date;
      topPredictions: [
        {
          ranking: number;
          movie: {
            tmdbId: number;
            title: string;
            posterPath: string;
          };
          person?: {
            tmdbId: number;
            name: string;
            profilePath: string;
          };
          song?: {
            title: string;
            artist?: string;
          };
        }
      ];
    }
  ];
}
