import { cuid } from '@adonisjs/core/helpers'
import stringHelpers from '@adonisjs/core/helpers/string'
import { DateTime } from 'luxon'

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

/**
 * Checks if it is time to retry a task based on the timestamp and last attempt time.
 */
const isTimeToRetry = (task: RetryTask, maxDelay: number): boolean => {
  const timeSinceLastAttempt = DateTime.now().diff(task.lastAttempt, 'seconds').seconds
  const timeSinceStart = Math.max(task.lastAttempt.diff(task.timestamp, 'seconds').seconds, 1)
  const desiredDelay = Math.min(timeSinceStart * 1.2, maxDelay)

  return timeSinceLastAttempt >= desiredDelay
}

/**
 * Checks if it is time to bail out based on the given timestamp.
 */
const isTimeToBail = (task: RetryTask, timeout: number): boolean => {
  return task.age > timeout
}

/**
 * A class to represent a task in the retry queue.
 */
class RetryTask {
  /**
   * The unique ID for the task.
   */
  id = cuid()

  /**
   * The function to call.
   */
  fn: Function

  /**
   * The error that was thrown.
   */
  error: Error

  /**
   * The timestamp of the task.
   */
  timestamp = DateTime.now()

  /**
   * The timestamp of the last attempt.
   */
  lastAttempt = this.timestamp

  /**
   * The resolve function for the promise.
   */
  resolve: Function

  /**
   * The reject function for the promise.
   */
  reject: Function

  /**
   * The AbortSignal to monitor for cancellation.
   */
  signal?: AbortSignal

  /**
   * Creates a new instance.
   * @param {Function} fn The function to call.
   * @param {Error} error The error that was thrown.
   * @param {Function} resolve The resolve function for the promise.
   * @param {Function} reject The reject function for the promise.
   * @param {AbortSignal|undefined} signal The AbortSignal to monitor for cancellation.
   */
  constructor(
    fn: Function,
    error: Error,
    resolve: Function,
    reject: Function,
    signal?: AbortSignal
  ) {
    this.fn = fn
    this.error = error
    this.timestamp = DateTime.now()
    this.lastAttempt = DateTime.now()
    this.resolve = resolve
    this.reject = reject
    this.signal = signal
  }

  /**
   * Gets the age of the task.
   */
  get age() {
    return DateTime.now().diff(this.timestamp, 'milliseconds').milliseconds
  }
}

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

/**
 * A class that manages a queue of retry jobs.
 */
export class Retrier {
  /**
   * Represents the queue for processing tasks.
   */
  #queue: RetryTask[] = []

  /**
   * The timeout for the queue.
   */
  #timeout: number

  /**
   * The maximum delay for the queue.
   */
  #maxDelay: number

  /**
   * The setTimeout() timer ID.
   */
  #timerId?: NodeJS.Timeout

  /**
   * The function to call.
   */
  #check: (error: unknown) => boolean

  constructor(check: (error: unknown) => boolean, params?: { timeout: string; maxDelay: string }) {
    this.#check = check
    this.#timeout = stringHelpers.milliseconds.parse(params?.timeout ?? '6s')
    this.#maxDelay = stringHelpers.milliseconds.parse(params?.maxDelay ?? '1s')
  }

  /**
   * Adds a new retry job to the queue.
   */
  async retry<Fn extends (...args: any) => any>(
    fn: Fn,
    params?: { signal: AbortSignal }
  ): Promise<ReturnType<Fn>> {
    params?.signal?.throwIfAborted()

    let result: ReturnType<Fn>

    try {
      result = fn()
    } catch (error) {
      return Promise.reject(new Error(`Synchronous error: ${error.message}`, { cause: error }))
    }

    return Promise.resolve(result).catch((error) => {
      if (!this.#check(error)) {
        throw error
      }

      return new Promise((resolve, reject) => {
        this.#queue.push(new RetryTask(fn, error, resolve, reject, params?.signal))

        params?.signal?.addEventListener('abort', () => {
          reject(params?.signal.reason)
        })

        this.#processQueue()
      })
    })
  }

  #processQueue() {
    // clear any timer because we're going to check right now
    clearTimeout(this.#timerId)
    this.#timerId = undefined

    // if there's nothing in the queue, we're done
    const task = this.#queue.shift()
    if (!task) {
      return
    }
    const processAgain = () => {
      this.#timerId = setTimeout(() => this.#processQueue(), 0)
    }

    // if it's time to bail, then bail
    if (isTimeToBail(task, this.#timeout)) {
      task.reject(task.error)
      processAgain()
      return
    }

    // if it's not time to retry, then wait and try again
    if (!isTimeToRetry(task, this.#maxDelay)) {
      this.#queue.push(task)
      processAgain()
      return
    }

    // otherwise, try again
    task.lastAttempt = DateTime.now()

    // Promise.resolve needed in case it's a thenable but not a Promise
    Promise.resolve(task.fn())
      // @ts-ignore because we know it's any
      .then((result) => task.resolve(result))

      // @ts-ignore because we know it's any
      .catch((error) => {
        if (!this.#check(error)) {
          task.reject(error)
          return
        }

        // update the task timestamp and push to back of queue to try again
        task.lastAttempt = DateTime.now()
        this.#queue.push(task)
      })
      .finally(() => this.#processQueue())
  }
}
