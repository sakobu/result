import type { ResultData } from '../types/index';

/**
 * A class representing an AsyncResult type that can contain either a success value of type A
 * or an error value of type E. This implementation is similar to Result but works with
 * asynchronous operations.
 *
 * @template E - The type of the error value
 * @template A - The type of the success value
 */
export class AsyncResult<E, A> {
  /** @internal */
  constructor(private readonly promise: Promise<ResultData<E, A>>) {}
  private resolvedData: ResultData<E, A> | null = null;
  private async getResolvedData(): Promise<ResultData<E, A>> {
    if (!this.resolvedData) {
      this.resolvedData = await this.promise;
    }
    return this.resolvedData;
  }

  /**
   * Creates a new AsyncResult instance representing a successful operation.
   *
   * @template E - The type of the error value (unused in this case)
   * @template A - The type of the success value
   * @param {A | Promise<A>} value - The success value or promise to wrap
   * @returns {Promise<AsyncResult<E, A>>} A new AsyncResult instance containing the success value
   */
  static async ok<E, A>(value: A | Promise<A>): Promise<AsyncResult<E, A>> {
    const resolvedValue = await Promise.resolve(value);
    return new AsyncResult(
      Promise.resolve({ _tag: 'Ok' as const, value: resolvedValue }),
    );
  }

  /**
   * Creates a new AsyncResult instance representing a failed operation.
   *
   * @template E - The type of the error value
   * @template A - The type of the success value (unused in this case)
   * @param {E | Promise<E>} error - The error value or promise to wrap
   * @returns {Promise<AsyncResult<E, A>>} A new AsyncResult instance containing the error value
   */
  static async err<E, A>(error: E | Promise<E>): Promise<AsyncResult<E, A>> {
    const resolvedError = await Promise.resolve(error);
    return new AsyncResult(
      Promise.resolve({ _tag: 'Err' as const, error: resolvedError }),
    );
  }

  /**
   * Creates an AsyncResult from a nullable value or promise. If the value is null or undefined,
   * returns an Err with the provided error, otherwise returns an Ok with the value.
   *
   * @template E - The type of the error value
   * @template A - The type of the success value
   * @param {E} error - The error value to use if the value is null or undefined
   * @param {Promise<A | null | undefined> | A | null | undefined} value - The value or promise to check
   * @returns {Promise<AsyncResult<E, A>>} An AsyncResult containing either the value or the error
   */
  static async fromNullableWithError<E, A>(
    error: E,
    value: Promise<A | null | undefined> | A | null | undefined,
  ): Promise<AsyncResult<E, A>> {
    const resolvedValue = await Promise.resolve(value);
    return resolvedValue == null
      ? AsyncResult.err(error)
      : AsyncResult.ok(resolvedValue);
  }

  /**
   * Executes an async function that might throw and wraps the result in an AsyncResult type.
   * If the function throws or rejects, the error is caught and transformed using the provided
   * error handler function.
   *
   * @template E - The type of the error value
   * @template A - The type of the success value
   * @param {() => Promise<A>} f - The async function to execute
   * @param {(error: unknown) => E} onError - Function to transform the caught error
   * @returns {Promise<AsyncResult<E, A>>} An AsyncResult containing either the function's return value or the transformed error
   */
  static async tryCatch<E, A>(
    f: () => Promise<A>,
    onError: (error: unknown) => E,
  ): Promise<AsyncResult<E, A>> {
    try {
      const value = await f();
      return AsyncResult.ok(value);
    } catch (error) {
      return AsyncResult.err(onError(error));
    }
  }

  /**
   * Converts a Promise to an AsyncResult, catching any errors and transforming them
   * using the provided error handler function.
   *
   * @template E - The type of the error value
   * @template A - The type of the success value
   * @param {Promise<A>} promise - The promise to convert
   * @param {(error: unknown) => E} onError - Function to transform any caught errors
   * @returns {Promise<AsyncResult<E, A>>} A Promise that resolves to an AsyncResult containing either the resolved value or the transformed error
   */
  static async fromPromise<E, A>(
    promise: Promise<A>,
    onError: (error: unknown) => E,
  ): Promise<AsyncResult<E, A>> {
    try {
      const value = await promise;
      return AsyncResult.ok(value);
    } catch (error) {
      return AsyncResult.err(onError(error));
    }
  }

  /**
   * Maps a function over the success value of this AsyncResult.
   * If this AsyncResult is an Err, returns the error unchanged.
   *
   * @template B - The type of the new success value
   * @param {(a: A) => B | Promise<B>} f - The function to apply to the success value
   * @returns {Promise<AsyncResult<E, B>>} A new AsyncResult with the mapped success value
   */
  async rMap<B>(f: (a: A) => B | Promise<B>): Promise<AsyncResult<E, B>> {
    const data = await this.getResolvedData();
    if (data._tag === 'Ok') {
      const b = await Promise.resolve(f(data.value));
      return AsyncResult.ok(b);
    }
    return AsyncResult.err(data.error);
  }

  /**
   * Maps a function over the error value of this AsyncResult.
   * If this AsyncResult is an Ok, returns the success value unchanged.
   *
   * @template F - The type of the new error value
   * @param {(e: E) => F | Promise<F>} f - The function to apply to the error value
   * @returns {Promise<AsyncResult<F, A>>} A new AsyncResult with the mapped error value
   */
  async rMapErr<F>(f: (e: E) => F | Promise<F>): Promise<AsyncResult<F, A>> {
    const data = await this.getResolvedData();
    if (data._tag === 'Err') {
      const e = await Promise.resolve(f(data.error));
      return AsyncResult.err(e);
    }
    return AsyncResult.ok(data.value);
  }

  /**
   * Chains this AsyncResult with a function that returns another AsyncResult.
   * If this AsyncResult is an Ok, applies the function to the success value.
   * If this AsyncResult is an Err, returns the error unchanged.
   *
   * @template B - The type of the new success value
   * @param {(a: A) => Promise<AsyncResult<E, B>> | AsyncResult<E, B>} f - The function to chain with
   * @returns {Promise<AsyncResult<E, B>>} The chained AsyncResult
   */
  async chain<B>(
    f: (a: A) => Promise<AsyncResult<E, B>> | AsyncResult<E, B>,
  ): Promise<AsyncResult<E, B>> {
    const data = await this.getResolvedData();
    if (data._tag === 'Ok') {
      const result = await f(data.value);
      if (result instanceof AsyncResult) {
        return result;
      }
      return AsyncResult.ok(result);
    }
    return AsyncResult.err(data.error);
  }

  /**
   * Pattern matches on this AsyncResult, applying the appropriate function based on
   * whether this AsyncResult is an Ok or an Err.
   *
   * @template B - The type of the return value
   * @param {(e: E) => B | Promise<B>} onErr - The function to apply if this AsyncResult is an Err
   * @param {(a: A) => B | Promise<B>} onOk - The function to apply if this AsyncResult is an Ok
   * @returns {Promise<B>} The result of applying the appropriate function
   */
  async match<B>(
    onErr: (e: E) => B | Promise<B>,
    onOk: (a: A) => B | Promise<B>,
  ): Promise<B> {
    const data = await this.getResolvedData();
    return data._tag === 'Ok'
      ? Promise.resolve(onOk(data.value))
      : Promise.resolve(onErr(data.error));
  }

  /**
   * Unwraps this AsyncResult, returning the success value if it exists.
   * Throws an error if this AsyncResult is an Err.
   *
   * @throws {Error} If this AsyncResult is an Err
   * @returns {Promise<A>} The success value
   */
  async unwrap(): Promise<A> {
    const data = await this.getResolvedData();
    if (data._tag === 'Ok') return data.value;
    throw new Error(`Called unwrap on an Err value: ${data.error}`);
  }

  /**
   * Returns the success value if this AsyncResult is an Ok,
   * otherwise returns the provided default value.
   *
   * @param {A} defaultValue - The value to return if this AsyncResult is an Err
   * @returns {Promise<A>} Either the success value or the default value
   */
  async unwrapOr(defaultValue: A): Promise<A> {
    const data = await this.getResolvedData();
    return data._tag === 'Ok' ? data.value : defaultValue;
  }

  /**
   * Unwraps this AsyncResult, returning the error value if it exists.
   * Throws an error if this AsyncResult is an Ok.
   *
   * @throws {Error} If this AsyncResult is an Ok
   * @returns {Promise<E>} The error value
   */
  async unwrapErr(): Promise<E> {
    const data = await this.getResolvedData();
    if (data._tag === 'Err') return data.error;
    throw new Error('Called unwrapErr on an Ok value');
  }

  /**
   * Converts this AsyncResult to a Promise.
   * If this AsyncResult is an Ok, returns a resolved Promise with the success value.
   * If this AsyncResult is an Err, returns a rejected Promise with the error value.
   *
   * @returns {Promise<A>} A Promise that resolves with the success value or rejects with the error value
   */
  async toPromise(): Promise<A> {
    const data = await this.getResolvedData();
    if (data._tag === 'Ok') {
      return data.value;
    }
    throw data.error;
  }

  /**
   * Returns a Promise that resolves to true if this AsyncResult is an Ok,
   * false otherwise.
   *
   * @returns {Promise<boolean>} A Promise that resolves to true if this AsyncResult is an Ok
   */
  async isOk(): Promise<boolean> {
    const data = await this.getResolvedData();
    return data._tag === 'Ok';
  }

  /**
   * Returns a Promise that resolves to true if this AsyncResult is an Err,
   * false otherwise.
   *
   * @returns {Promise<boolean>} A Promise that resolves to true if this AsyncResult is an Err
   */
  async isErr(): Promise<boolean> {
    const data = await this.getResolvedData();
    return data._tag === 'Err';
  }
}
