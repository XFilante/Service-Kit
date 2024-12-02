import { Exception } from '@adonisjs/core/exceptions'
import { HttpContext } from '@adonisjs/core/http'
import { HTTPStatus, HTTPStatusT } from '../helpers/http_status.js'

const http = {
  status: 400,
  code: 'E_PROCESSING_EXCEPTION',
  message: 'An error occurred while processing your request',
}

export default class ProcessingException extends Exception {
  constructor(
    public message: string,
    public options?: {
      error?: unknown
      field?: string
      meta?: {
        private?: {
          reason?: string
          [key: string]: unknown
        }
        public?: object
      }
      message?: string
      http?: HTTPStatusT
    }
  ) {
    const httpStatus = options?.http ? HTTPStatus[options?.http] : undefined

    super(options?.message || http.message, {
      status: httpStatus?.status || http.status,
      code: httpStatus?.code ? `E_${httpStatus.code}` : http.code,
      cause: {
        ...options,
      },
    })
  }

  async handle(error: this, ctx: HttpContext) {
    ctx.response.status(error.status).json({
      errors: [
        {
          title: error.options?.message || http.message,
          code: error.code,
          status: error.status,
          field: error.options?.field,
          message: error.message,
          meta: error.options?.meta?.public,
        },
      ],
    })
  }

  async report(error: this, ctx: HttpContext) {
    ctx.logger.error({ error }, error.message)
  }
}
