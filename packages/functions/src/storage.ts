import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SERVER_ERROR } from './types/responses';
import { ApiHandler, useHeader } from 'sst/node/api';
import Jwt from './helper/jwt';
import connect from './helper/connect';
import { type User } from './types/models';
import { ObjectId } from 'mongodb';

const BUCKET = 'awards-app-profile-images-prod';
const client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ''
  }
});

export const post = ApiHandler(async (event) => {
  try {
    const { db } = connect();

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
    const key = user.email.split('@')[0] + random.toString();

    // 4) Parse body and upload to s3
    // @ts-expect-error - event.body is defined
    const buff = Buffer.from(event.body, 'base64');
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: 'public/' + key,
      Body: buff,
      ContentType: 'image/jpeg'
    });
    await client.send(command);

    // 5) Update user in db
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
