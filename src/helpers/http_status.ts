export const HTTPStatus = {
  OK: {
    status: 200,
    code: 'OK',
  },
  CREATED: {
    status: 201,
    code: 'CREATED',
  },
  NOT_FOUND: {
    status: 404,
    code: 'NOT_FOUND',
  },
  BAD_REQUEST: {
    status: 400,
    code: 'BAD_REQUEST',
  },
  UNAUTHORIZED: {
    status: 401,
    code: 'UNAUTHORIZED',
  },
  FORBIDDEN: {
    status: 403,
    code: 'FORBIDDEN',
  },
  CONFLICT: {
    status: 409,
    code: 'CONFLICT',
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    code: 'INTERNAL_SERVER_ERROR',
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
  },
} as const

export type HTTPStatusT = keyof typeof HTTPStatus
