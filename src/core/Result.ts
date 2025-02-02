import type { ResultData } from '../types/index.js';

/**
 * A class representing a Result type that can contain either a success value of type A
 * or an error value of type E. This implementation is inspired by Rust's Result type
 * and provides a way to handle operations that might fail.
 *
 * @template E - The type of the error value
 * @template A - The type of the success value
 */
export class Result<E, A> {
  /** @internal */
  constructor(private readonly data: ResultData<E, A>) {}

  /**
   * Creates a new Result instance representing a successful operation.
   *
   * @template E - The type of the error value (unused in this case)
   * @template A - The type of the success value
   * @param {A} value - The success value to wrap
   * @returns {Result<E, A>} A new Result instance containing the success value
   */
  static ok<E, A>(value: A): Result<E, A> {
    return new Result({ _tag: 'Ok', value });
  }

  /**
   * Creates a new Result instance representing a failed operation.
   *
   * @template E - The type of the error value
   * @template A - The type of the success value (unused in this case)
   * @param {E} error - The error value to wrap
   * @returns {Result<E, A>} A new Result instance containing the error value
   */
  static err<E, A>(error: E): Result<E, A> {
    return new Result({ _tag: 'Err', error });
  }

  /**
   * Creates a Result from a nullable value. If the value is null or undefined,
   * returns an Err with the provided error, otherwise returns an Ok with the value.
   *
   * @template E - The type of the error value
   * @template A - The type of the success value
   * @param {E} error - The error value to use if the value is null or undefined
   * @param {A | null | undefined} value - The value to check
   * @returns {Result<E, A>} A Result containing either the value or the error
   */
  static fromNullableWithError<E, A>(
    error: E,
    value: A | null | undefined,
  ): Result<E, A> {
    return value == null ? Result.err(error) : Result.ok(value);
  }

  /**
   * Executes a function that might throw and wraps the result in a Result type.
   * If the function throws, the error is caught and transformed using the provided
   * error handler function.
   *
   * @template E - The type of the error value
   * @template A - The type of the success value
   * @param {() => A} f - The function to execute
   * @param {(error: unknown) => E} onError - Function to transform the caught error
   * @returns {Result<E, A>} A Result containing either the function's return value or the transformed error
   */
  static tryCatch<E, A>(
    f: () => A,
    onError: (error: unknown) => E,
  ): Result<E, A> {
    try {
      return Result.ok(f());
    } catch (error) {
      return Result.err(onError(error));
    }
  }

  /**
   * Maps a function over the success value of this Result.
   * If this Result is an Err, returns the error unchanged.
   *
   * @template B - The type of the new success value
   * @param {(a: A) => B} f - The function to apply to the success value
   * @returns {Result<E, B>} A new Result with the mapped success value
   */
  rMap<B>(f: (a: A) => B): Result<E, B> {
    return this.data._tag === 'Ok'
      ? Result.ok(f(this.data.value))
      : Result.err(this.data.error);
  }

  /**
   * Maps a function over the error value of this Result.
   * If this Result is an Ok, returns the success value unchanged.
   *
   * @template F - The type of the new error value
   * @param {(e: E) => F} f - The function to apply to the error value
   * @returns {Result<F, A>} A new Result with the mapped error value
   */
  rMapErr<F>(f: (e: E) => F): Result<F, A> {
    return this.data._tag === 'Err'
      ? Result.err(f(this.data.error))
      : Result.ok(this.data.value);
  }

  /**
   * Chains this Result with a function that returns another Result.
   * If this Result is an Ok, applies the function to the success value.
   * If this Result is an Err, returns the error unchanged.
   *
   * @template F - The type of the new error value
   * @template B - The type of the new success value
   * @param {(a: A) => Result<F, B>} f - The function to chain with
   * @returns {Result<E | F, B>} The chained Result
   */
  chain<F, B>(f: (a: A) => Result<F, B>): Result<E | F, B> {
    return this.data._tag === 'Ok'
      ? f(this.data.value)
      : Result.err(this.data.error);
  }

  /**
   * Pattern matches on this Result, applying the appropriate function based on
   * whether this Result is an Ok or an Err.
   *
   * @template B - The type of the return value
   * @param {(e: E) => B} onErr - The function to apply if this Result is an Err
   * @param {(a: A) => B} onOk - The function to apply if this Result is an Ok
   * @returns {B} The result of applying the appropriate function
   */
  match<B>(onErr: (e: E) => B, onOk: (a: A) => B): B {
    return this.data._tag === 'Ok'
      ? onOk(this.data.value)
      : onErr(this.data.error);
  }

  /**
   * Unwraps this Result, returning the success value if it exists.
   * Throws an error if this Result is an Err.
   *
   * @throws {Error} If this Result is an Err
   * @returns {A} The success value
   */
  unwrap(): A {
    if (this.data._tag === 'Ok') return this.data.value;
    throw new Error(`Called unwrap on an Err value: ${this.data.error}`);
  }

  /**
   * Returns the success value if this Result is an Ok,
   * otherwise returns the provided default value.
   *
   * @param {A} defaultValue - The value to return if this Result is an Err
   * @returns {A} Either the success value or the default value
   */
  unwrapOr(defaultValue: A): A {
    return this.data._tag === 'Ok' ? this.data.value : defaultValue;
  }

  /**
   * Unwraps this Result, returning the error value if it exists.
   * Throws an error if this Result is an Ok.
   *
   * @throws {Error} If this Result is an Ok
   * @returns {E} The error value
   */
  unwrapErr(): E {
    if (this.data._tag === 'Err') return this.data.error;
    throw new Error('Called unwrapErr on an Ok value');
  }

  /**
   * Converts this Result to a Promise.
   * If this Result is an Ok, returns a resolved Promise with the success value.
   * If this Result is an Err, returns a rejected Promise with the error value.
   *
   * @returns {Promise<A>} A Promise that resolves with the success value or rejects with the error value
   */
  toPromise(): Promise<A> {
    return this.data._tag === 'Ok'
      ? Promise.resolve(this.data.value)
      : Promise.reject(this.data.error);
  }

  /**
   * Type guard that checks if this Result is an Ok.
   *
   * @returns {boolean} true if this Result is an Ok, false otherwise
   */
  isOk(): this is Result<never, A> {
    return this.data._tag === 'Ok';
  }

  /**
   * Type guard that checks if this Result is an Err.
   *
   * @returns {boolean} true if this Result is an Err, false otherwise
   */
  isErr(): this is Result<E, never> {
    return this.data._tag === 'Err';
  }
}
