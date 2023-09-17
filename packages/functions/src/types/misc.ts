export type iJwtPayload = {
  userId: string;
  isRefreshToken?: boolean;
};

export type iJwtEmailPayload = {
  email: string;
};
