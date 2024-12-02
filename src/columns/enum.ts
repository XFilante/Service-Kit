import { ColumnOptions } from '@adonisjs/lucid/types/model'
import { $enum } from 'ts-enum-util'

export const EnumColumn = (
  enumObject: Record<string, string | number>,
  options?: Partial<ColumnOptions>
): Partial<ColumnOptions> => ({
  prepare: (value?: string) => {
    if (!value) {
      return null
    }

    return $enum(enumObject).getValueOrThrow(value)
  },

  consume: (value: any) => {
    if (!value) {
      return null
    }

    return $enum(enumObject).getKeyOrThrow(value)
  },

  ...options,
})
