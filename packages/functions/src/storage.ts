import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SERVER_ERROR } from './types/responses';
import { ApiHandler, useHeader } from 'sst/node/api';
import Jwt from './helper/jwt';
import { type User } from './types/models';
import { MongoClient, ObjectId } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';
import { type APIGatewayProxyEventV2 } from 'aws-lambda';

const BUCKET = 'awards-app-profile-images-prod';
const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ''
  }
});

const mongoClient = new MongoClient(mongoClientUrl, mongoClientOptions);
const db = mongoClient.db('db');

const storeImage = async (
  e: APIGatewayProxyEventV2,
  size?: 'sm' | 'md' | 'lg'
) => {
  try {
    // 1) Get/parse jwt from header
    const authorization = useHeader('authorization');
    const token = authorization?.split(' ')?.[1];
    if (!token) {
      return SERVER_ERROR.Unauthenticated;
    }
    const jwtPayload = Jwt.validateToken(token);
    if (!jwtPayload) {
      return SERVER_ERROR.Unauthenticated;
    }
    const { userId } = jwtPayload;

    // 2) Get user from db
    const user = await db
      .collection<User>('users')
      .findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return SERVER_ERROR.NotFound;
    }

    // 3) Generate key from user email
    const random = Math.floor(100000 + Math.random() * 900000); // 6 digit random number
    const key =
      user.email.split('@')[0] + random.toString() + (size ? '-' + size : '');

    // 4) Parse body and upload to s3
    // @ts-expect-error - e.body is defined
    const buff = Buffer.from(e.body, 'base64');
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: 'public/' + key,
      Body: buff,
      ContentType: 'image/jpeg'
    });
    await s3Client.send(command);

    const imageKey: keyof User = !size
      ? 'image'
      : size === 'sm'
      ? 'imageSm'
      : size === 'md'
      ? 'imageMd'
      : 'imageLg';

    // 5) Update user in db
    await db.collection<User>('users').updateOne(
      {
        _id: new ObjectId(userId)
      },
      { $set: { [imageKey]: key } }
    );

    return { statusCode: 200, data: key };
  } catch (err: any) {
    console.log('Error getting s3 file:', err);
    return { ...SERVER_ERROR.Error, message: err };
  }
};

// Must preserve original endpoint for bw compatibility
export const post = ApiHandler(async (e) => {
  return await storeImage(e);
});

export const postSm = ApiHandler(async (e) => {
  return await storeImage(e, 'sm');
});

export const postMd = ApiHandler(async (e) => {
  return await storeImage(e, 'md');
});

export const postLg = ApiHandler(async (e) => {
  return await storeImage(e, 'lg');
});
