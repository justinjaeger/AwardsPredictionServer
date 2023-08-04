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
  _id: ObjectId;
  eventId: ObjectId;
  userId: ObjectId;
  contenderId: ObjectId;
  expireAt: Date;
  place: number;
  phase?: Phase;
}

export interface CategoryUpdateLog {
  _id: ObjectId;
  userId: ObjectId;
  eventId: ObjectId;
  category: CategoryName;
  yyyymmddUpdates: Record<string, boolean>;
}

export interface Contender {
  _id: ObjectId;
  eventId: ObjectId;
  movieId: ObjectId;
  visible: boolean;
  category: CategoryName;
  numPredicting: Record<string, number>;
  accolade?: Phase;
  songId?: ObjectId;
  personId?: ObjectId;
}

export interface EventModel {
  _id: ObjectId;
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

export interface Movie {
  _id: ObjectId;
  tmdbId: number;
  title: string;
  studio?: string;
  plot?: string;
  cast?: string;
  posterPath?: string;
  categoryInfo: {
    director?: string;
    screenplay?: string;
    cinematography?: string;
    costumes?: string;
    editing?: string;
    productionDesign?: string;
    score?: string;
    visualEffects?: string;
  };
}

export interface Person {
  _id: ObjectId;
  tmdbId: number;
  imdbId?: string;
  name?: string;
  posterPath?: string;
}

export interface PredictionSet {
  _id: ObjectId;
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
  _id: ObjectId;
  followedUserId: ObjectId;
  followingUserId: ObjectId;
}

export interface Song {
  _id: ObjectId;
  movieId: ObjectId;
  title: string;
  artist?: string;
}

export interface Token {
  _id: ObjectId;
  userId: ObjectId;
  token: string;
}

export interface User {
  _id: ObjectId;
  email: string;
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