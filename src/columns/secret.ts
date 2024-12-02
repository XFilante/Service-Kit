import { Secret } from '@adonisjs/core/helpers'
import { ColumnOptions } from '@adonisjs/lucid/types/model'
import encryption from '@adonisjs/core/services/encryption'

export const SecretColumn = <INTERNAL = string>(
  options?: Partial<ColumnOptions>
): Partial<ColumnOptions> => ({
  prepare: (value: Secret<INTERNAL> | null) => {
    if (!value) {
      return null
    }

    return encryption.encrypt(value.release())
  },

  consume: (value: INTERNAL | null) => {
    if (!value) {
      return null
    }

    return new Secret(encryption.decrypt(value))
  },

  ...options,
})
