import { ColumnOptions } from '@adonisjs/lucid/types/model'

export const JSONColumn = (options?: Partial<ColumnOptions>): Partial<ColumnOptions> => ({
  prepare: (value: any) => {
    if (!value) {
      return null
    }

    return JSON.stringify(value)
  },

  consume: (value: any) => {
    if (!value) {
      return null
    }

    return JSON.parse(value)
  },

  ...options,
})
