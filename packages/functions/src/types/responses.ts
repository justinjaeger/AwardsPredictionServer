export type ApiResponse<T> = {
  statusCode: number;
  data?: T;
  error?: string;
  message?: string;
};

export type ErrorResponse = {
  statusCode: number;
  error: string;
  message: string;
};

export const SERVER_ERROR: Record<string, ErrorResponse> = {
  BadRequest: {
    statusCode: 400,
    error: 'BadRequest',
    message: 'Something is missing in the request'
  },
  NotFound: {
    statusCode: 400,
    error: 'NotFound',
    message: 'The requested resource was not found'
  },
  InvalidTokenError: {
    statusCode: 401,
    error: 'InvalidTokenError',
    message: 'Token is not valid for this action'
  },
  Unauthenticated: {
    statusCode: 401,
    error: 'Unauthenticated',
    message: 'User must be authenticated for this action'
  },
  Forbidden: {
    statusCode: 403,
    error: 'Forbidden',
    message: 'User is not authorized for this action'
  },
  RevokeAccess: {
    statusCode: 403,
    error: 'RevokeAccess',
    message: 'Bad refresh token'
  }
};
