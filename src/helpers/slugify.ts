import stringHelpers from '@adonisjs/core/helpers/string'

export const slugify = (str: string) => stringHelpers.slug(str, { lower: true })
