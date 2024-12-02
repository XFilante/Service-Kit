import { CacheProvider, GetOrSetOptions, GetSetFactory } from 'bentocache/types'
import { DateTime } from 'luxon'
import superjson from 'superjson'
import logger from '@adonisjs/core/services/logger'

superjson.registerCustom<DateTime, string>(
  {
    isApplicable: (v): v is DateTime => v instanceof DateTime,
    serialize: (v) => {
      const iso = v.toISO()

      if (!iso) {
        throw new Error('Invalid DateTime')
      }

      return iso
    },
    deserialize: (v) => DateTime.fromISO(v),
  },
  'DateTime'
)

type DefaultKeys = 'self'

type GetOptions = GetOrSetOptions & {
  latest?: boolean
}

type TargetModelT = {
  id: number
  $toJSON: () => any
  $isPersisted: boolean
  $hydrateOriginals: () => void
}

export class ModelCache<TargetModel extends TargetModelT, CacheKeys extends string> {
  constructor(
    private cache: StaticModelCache<TargetModel, CacheKeys>,
    private targetModel: TargetModel
  ) {}

  space() {
    return this.cache.space(this.targetModel.id)
  }

  key(key: DefaultKeys | CacheKeys) {
    return this.cache.key(key)
  }

  async expire(key: DefaultKeys | CacheKeys) {
    await this.space().delete(key)
  }

  async get<T, O>(
    key: DefaultKeys | CacheKeys,
    factory: GetSetFactory<T>,
    parser: (value: T) => Promise<O>,
    options?: GetOrSetOptions & {
      latest?: boolean
    }
  ) {
    return this.cache.get(this.targetModel.id, key, factory, parser, options)
  }
}

export class StaticModelCache<
  TargetModel extends TargetModelT,
  CacheKeys extends string = DefaultKeys,
> {
  constructor(
    private _cache: CacheProvider,
    private _fill: (values: ReturnType<TargetModel['$toJSON']>) => TargetModel,
    private _find: (id: number) => Promise<TargetModel | null>
  ) {}

  space(id: number) {
    return this._cache.namespace(String(id))
  }

  key(key: DefaultKeys | CacheKeys) {
    return key
  }

  async expire(id: number, key: DefaultKeys | CacheKeys) {
    await this.space(id).delete(key)
  }

  async get<T, O>(
    id: number,
    key: DefaultKeys | CacheKeys,
    factory: GetSetFactory<T>,
    parser: (value: T) => Promise<O> | O,
    options?: GetOptions
  ) {
    if (options?.latest === true) {
      await this.expire(id, key)
    }

    const result = await this.space(id).getOrSet(key, factory, options)

    return parser(result)
  }

  async find(id: number, options?: GetOptions) {
    const key = this.key('self')

    return this.get(
      id,
      key,
      async () => {
        const res = await this._find(id)

        if (!res) {
          return null
        }

        return superjson.stringify(res.$toJSON())
      },
      (row) => {
        if (!row) {
          return null
        }

        const res = this._fill(superjson.parse(row))

        res.$hydrateOriginals()
        res.$isPersisted = true

        return res
      },
      options
    )
  }

  async findStrict(id: number, options?: GetOptions) {
    const res = await this.find(id, options)

    if (!res) {
      logger.error({ id }, 'Model not found')

      throw new Error('Unexpected error')
    }

    return res
  }

  internal(targetModel: TargetModel) {
    return new ModelCache<TargetModel, CacheKeys>(this, targetModel)
  }
}
