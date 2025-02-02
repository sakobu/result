/**
 * Internal type representing the two possible states of a Result
 * @internal
 */
export type ResultData<E, A> =
  | { readonly _tag: 'Ok'; readonly value: A }
  | { readonly _tag: 'Err'; readonly error: E };
