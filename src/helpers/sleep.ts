import stringHelpers from '@adonisjs/core/helpers/string'

export const sleep = async (ms: string) => {
  const parsedMs = stringHelpers.milliseconds.parse(ms)

  await new Promise((resolve) => setTimeout(resolve, parsedMs))
}
