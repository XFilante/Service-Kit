/// <reference types="@adonisjs/core/providers/vinejs_provider" />

import { Bouncer } from '@adonisjs/bouncer'
import { HttpContext } from '@adonisjs/core/http'
import { VineValidator } from '@vinejs/vine'
import { Infer } from '@vinejs/vine/types'
import ProcessingException from './exceptions/processing_exception.js'

type LocalHttpContext = HttpContext & {
  bouncer: Bouncer<Exclude<any, undefined>, any, any>
}

function safeRoute<
  RouteOutput extends any,
  RouteInputObject extends VineValidator<any, any>,
>(params: {
  handle: (params: {
    ctx: LocalHttpContext
    payload: Infer<RouteInputObject>
  }) => Promise<RouteOutput>

  input?: RouteInputObject
  bouncer?: (b: LocalHttpContext['bouncer'], ctx: LocalHttpContext) => Promise<boolean>

  // limiter?: LimiterConsumptionOptions & {
  //   key: (params: { ctx: LocalHttpContext }) => string
  // }
}) {
  return async (ctx: LocalHttpContext) => {
    if (params?.bouncer) {
      if (await params.bouncer(ctx.bouncer, ctx)) {
        throw new ProcessingException('Forbidden')
      }
    }

    const payload = params?.input ? await ctx.request.validateUsing(params?.input) : undefined

    return params.handle({ payload, ctx })
  }
}

export { safeRoute }
