import type { ApplicationService } from '@adonisjs/core/types'
import { Request } from '@adonisjs/core/http'
import { RequestValidator } from '../extension/request_validator.js'

export default class CommonProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register bindings to the container
   */
  register() {}

  /**
   * The container bindings have booted
   */
  async boot() {
    /**
     * The validate method can be used to validate the request
     * data for the current request using VineJS validators
     */
    Request.macro('validateUsing', function (this: Request, ...args) {
      return new RequestValidator(this.ctx!).validateUsing(...args)
    })
  }

  /**
   * The application has been booted
   */
  async start() {}

  /**
   * The process has been started
   */
  async ready() {}

  /**
   * Preparing to shutdown the app
   */
  async shutdown() {}
}
