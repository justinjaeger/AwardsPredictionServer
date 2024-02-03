import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SERVER_ERROR } from './types/responses';
import { ApiHandler, useHeader } from 'sst/node/api';
import Jwt from './helper/jwt';
import {
  ProfileImageSize,
  ProfileImageSuffix,
  type User
} from './types/models';
import { MongoClient, ObjectId } from 'mongodb';
import { mongoClientOptions, mongoClientUrl } from './helper/connect';
import { type APIGatewayProxyEventV2 } from 'aws-lambda';
import sharp from 'sharp';

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

export const post = ApiHandler(async (e: APIGatewayProxyEventV2) => {
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
    const key = user.email.split('@')[0] + random.toString() + 'v2';

    // 4) Parse body and upload to s3
    // @ts-expect-error - e.body is defined
    const buff = Buffer.from(e.body, 'base64');
    const [buffSm, buffMd, buffLg] = await Promise.all(
      [
        ProfileImageSize.SMALL,
        ProfileImageSize.MEDIUM,
        ProfileImageSize.LARGE
      ].map(async (size) => await sharp(buff).resize(size, size).toBuffer())
    );

    const commands = [
      { buff: buffSm, suffix: ProfileImageSuffix.SMALL },
      { buff: buffMd, suffix: ProfileImageSuffix.MEDIUM },
      { buff: buffLg, suffix: ProfileImageSuffix.LARGE }
    ].map(
      ({ buff, suffix }) =>
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: 'public/' + key + suffix,
          Body: buff,
          ContentType: 'image/jpeg'
        })
    );
    await Promise.all(
      commands.map(async (command) => await s3Client.send(command))
    );

    // 5) Update user in db. image becomes key WITHOUT suffix
    await db.collection<User>('users').updateOne(
      {
        _id: new ObjectId(userId)
      },
      { $set: { image: key } }
    );

    return { statusCode: 200, data: key };
  } catch (err: any) {
    console.log('Error getting s3 file:', err);
    return { ...SERVER_ERROR.Error, message: err };
  }
});
