import { InvalidArgumentsException } from '@adonisjs/core/exceptions'
import { ServiceKitConfig } from './types.js'

export function defineConfig(config: ServiceKitConfig) {
  const groupsLength = Object.keys(config.groups).length

  if (groupsLength > 0) {
    for (const [key, value] of Object.entries(config.groups)) {
      if (!/^\/[a-z0-9-\/]+\/$/.test(value)) {
        throw new InvalidArgumentsException(
          `Invalid group "${key}" value: "${value}", Only alphanumeric characters and hyphens are allowed with leading and trailing slashes`
        )
      }

      if (!/^[a-z0-9_]+$/.test(key)) {
        throw new InvalidArgumentsException(
          `Invalid group "${key}" name, Only alphanumeric characters and underscores are allowed`
        )
      }
    }
  }

  return config
}
