import { Secret, base64, safeEqual } from '@adonisjs/core/helpers'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'
import SH from '@adonisjs/core/helpers/string'
import { HttpContext } from '@adonisjs/core/http'
import { CRC32 } from '../helpers/crc32.js'
import ProcessingException from '../exceptions/processing_exception.js'

type AccessTokenDraft = {
  secret: Secret<string>
  hash: string
  ownerId: number
  expiresAt: DateTime<boolean> | null
}

type AccessTokenDecoded = {
  /** Id of token in database table */
  id: number
  secret: Secret<string>
}

type AccessTokenModel = {
  id: number
  secret: Secret<string> | null
  hash: string
  expiresAt: DateTime<boolean> | null
}

type OwnerModel = {}

type Params<ATMODEL extends AccessTokenModel, OWNERMODEL extends OwnerModel> = {
  prefix?: string
  size?: number
  packer: (atd: AccessTokenDraft) => ATMODEL
  getter: (atd: AccessTokenDecoded) => Promise<ATMODEL>
  owner: (atm: ATMODEL) => Promise<OWNERMODEL>
}

export class AccessTokenHandler<ATMODEL extends AccessTokenModel, OWNERMODEL extends OwnerModel> {
  prefix = 'oat_'
  size = 64

  packer: Params<ATMODEL, OWNERMODEL>['packer']
  getter: Params<ATMODEL, OWNERMODEL>['getter']
  owner: Params<ATMODEL, OWNERMODEL>['owner']

  constructor(params: Params<ATMODEL, OWNERMODEL>) {
    this.prefix = params.prefix ? params.prefix + '_' : this.prefix
    this.size = params.size ?? this.size

    this.packer = params.packer
    this.getter = params.getter
    this.owner = params.owner
  }

  /**
   * Creates a secret opaque token and its hash. The secret is
   * suffixed with a crc32 checksum for secret scanning tools
   * to easily identify the token.
   */
  #seed() {
    const seed = SH.random(this.size)
    const secret = new Secret(`${seed}${new CRC32().calculate(seed)}`)
    const hash = createHash('sha256').update(secret.release()).digest('hex')
    return { secret, hash }
  }

  draft(ownerId: number, expiresIn?: string | number) {
    let expiresAt: DateTime | null = null

    if (expiresIn) {
      expiresAt = DateTime.now().plus({
        seconds: SH.seconds.parse(expiresIn),
      })
    }

    const seed = this.#seed()

    return this.packer({
      secret: seed.secret,
      hash: seed.hash,
      ownerId,
      expiresAt,
    })
  }

  /**
   * Decodes a publicly shared token and return the series
   * and the token value from it.
   *
   * Returns null when unable to decode the token because of
   * invalid format or encoding.
   */
  async #decode(value: string) {
    /**
     * Ensure value is a string and starts with the prefix.
     */
    if (typeof value !== 'string' || !value.startsWith(`${this.prefix}`)) {
      return null
    }

    /**
     * Remove prefix from the rest of the token.
     */
    const token = value.replace(new RegExp(`^${this.prefix}`), '')

    if (!token) {
      return null
    }

    const [identifier, ...tokenValue] = token.split('.')

    if (!identifier || tokenValue.length === 0) {
      return null
    }

    const decodedIdentifier = base64.urlDecode(identifier)

    const decodedSecret = base64.urlDecode(tokenValue.join('.'))

    if (!decodedIdentifier || !decodedSecret) {
      return null
    }

    return this.getter({
      id: Number(decodedIdentifier),
      secret: new Secret(decodedSecret),
    })
  }

  value(id: number, secret: Secret<string> | null) {
    if (!secret) {
      return null
    }

    return new Secret(
      `${this.prefix}${base64.urlEncode(String(id))}.${base64.urlEncode(secret.release())}`
    )
  }

  #isVerified(hash: string, secret: Secret<string>): boolean {
    const newHash = createHash('sha256').update(secret.release()).digest('hex')

    return safeEqual(hash, newHash)
  }

  #isExpired(expiresAt: DateTime<boolean>) {
    return expiresAt < DateTime.now()
  }

  async authenticate(ctx: HttpContext) {
    const bearerToken = ctx.request.header('authorization', '')!

    const [, token] = bearerToken.split('Bearer ')

    if (!token) {
      throw new ProcessingException('Not a valid token', {
        meta: {
          private: {
            reason: "Token was null after splitting it's bearer prefix",
            bearerToken,
          },
        },
      })
    }

    const accessToken = await this.#decode(token)

    if (!accessToken) {
      throw new ProcessingException('Not a valid token', {
        meta: {
          private: {
            bearerToken,
          },
        },
      })
    }

    if (accessToken.secret) {
      if (!this.#isVerified(accessToken.hash, accessToken.secret)) {
        throw new ProcessingException('Not a valid token', {
          meta: {
            private: {
              reason: 'Invalid secret',
              bearerToken,
              decoded: accessToken,
            },
          },
        })
      }
    } else {
      throw new ProcessingException('Not a valid token', {
        meta: {
          private: {
            reason: 'Secret not found in decoded token',
            bearerToken,
            decoded: accessToken,
          },
        },
      })
    }

    if (accessToken.expiresAt) {
      if (this.#isExpired(accessToken.expiresAt)) {
        throw new ProcessingException('Not a valid token', {
          meta: {
            private: {
              reason: 'Expired token',
            },
          },
        })
      }
    }

    return this.owner(accessToken)
  }
}
