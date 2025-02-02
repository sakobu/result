import { describe, it, expect } from 'vitest';
import { AsyncResult } from '../core/AsyncResult';

describe('AsyncResult', () => {
  describe('static methods', () => {
    describe('ok', () => {
      it('should create an Ok AsyncResult from a value', async () => {
        const result = await AsyncResult.ok(42);
        expect(await result.isOk()).toBe(true);
        expect(await result.unwrap()).toBe(42);
      });

      it('should create an Ok AsyncResult from a promise', async () => {
        const promise = Promise.resolve(42);
        const result = await AsyncResult.ok(promise);
        expect(await result.isOk()).toBe(true);
        expect(await result.unwrap()).toBe(42);
      });
    });

    describe('err', () => {
      it('should create an Err AsyncResult from a value', async () => {
        const result = await AsyncResult.err('error');
        expect(await result.isErr()).toBe(true);
        expect(await result.unwrapErr()).toBe('error');
      });

      it('should create an Err AsyncResult from a promise', async () => {
        const promise = Promise.resolve('error');
        const result = await AsyncResult.err(promise);
        expect(await result.isErr()).toBe(true);
        expect(await result.unwrapErr()).toBe('error');
      });
    });

    describe('fromNullableWithError', () => {
      it('should create an Ok AsyncResult from a non-null value', async () => {
        const result = await AsyncResult.fromNullableWithError('error', 42);
        expect(await result.isOk()).toBe(true);
        expect(await result.unwrap()).toBe(42);
      });

      it('should create an Err AsyncResult from null', async () => {
        const result = await AsyncResult.fromNullableWithError('error', null);
        expect(await result.isErr()).toBe(true);
        expect(await result.unwrapErr()).toBe('error');
      });

      it('should create an Err AsyncResult from undefined', async () => {
        const result = await AsyncResult.fromNullableWithError(
          'error',
          undefined,
        );
        expect(await result.isErr()).toBe(true);
        expect(await result.unwrapErr()).toBe('error');
      });

      it('should handle promises', async () => {
        const result = await AsyncResult.fromNullableWithError(
          'error',
          Promise.resolve(42),
        );
        expect(await result.isOk()).toBe(true);
        expect(await result.unwrap()).toBe(42);
      });
    });

    describe('tryCatch', () => {
      it('should create an Ok AsyncResult when function succeeds', async () => {
        const result = await AsyncResult.tryCatch(
          async () => 42,
          (e) => String(e),
        );
        expect(await result.isOk()).toBe(true);
        expect(await result.unwrap()).toBe(42);
      });

      it('should create an Err AsyncResult when function throws', async () => {
        const error = new Error('test error');
        const result = await AsyncResult.tryCatch(
          async () => {
            throw error;
          },
          (e) => String(e),
        );
        expect(await result.isErr()).toBe(true);
        expect(await result.unwrapErr()).toBe(String(error));
      });
    });

    describe('fromPromise', () => {
      it('should create an Ok AsyncResult when promise resolves', async () => {
        const result = await AsyncResult.fromPromise(Promise.resolve(42), (e) =>
          String(e),
        );
        expect(await result.isOk()).toBe(true);
        expect(await result.unwrap()).toBe(42);
      });

      it('should create an Err AsyncResult when promise rejects', async () => {
        const error = new Error('test error');
        const result = await AsyncResult.fromPromise(
          Promise.reject(error),
          (e) => String(e),
        );
        expect(await result.isErr()).toBe(true);
        expect(await result.unwrapErr()).toBe(String(error));
      });
    });
  });

  describe('instance methods', () => {
    describe('rMap', () => {
      it('should map Ok value', async () => {
        const result = await AsyncResult.ok(42);
        const mapped = await result.rMap((x) => x * 2);
        expect(await mapped.unwrap()).toBe(84);
      });

      it('should handle async mapping function', async () => {
        const result = await AsyncResult.ok(42);
        const mapped = await result.rMap(async (x) => x * 2);
        expect(await mapped.unwrap()).toBe(84);
      });

      it('should not map Err value', async () => {
        const result = await AsyncResult.err<string, number>('error');
        const mapped = await result.rMap((x) => x * 2);
        expect(await mapped.unwrapErr()).toBe('error');
      });
    });

    describe('rMapErr', () => {
      it('should map Err value', async () => {
        const result = await AsyncResult.err(42);
        const mapped = await result.rMapErr((x) => x * 2);
        expect(await mapped.unwrapErr()).toBe(84);
      });

      it('should handle async mapping function', async () => {
        const result = await AsyncResult.err(42);
        const mapped = await result.rMapErr(async (x) => x * 2);
        expect(await mapped.unwrapErr()).toBe(84);
      });

      it('should not map Ok value', async () => {
        const result = await AsyncResult.ok<number, string>('value');
        const mapped = await result.rMapErr((x) => x * 2);
        expect(await mapped.unwrap()).toBe('value');
      });
    });

    describe('chain', () => {
      it('should chain Ok values', async () => {
        const result = await AsyncResult.ok(42);
        const chained = await result.chain((x) => AsyncResult.ok(x * 2));
        expect(await chained.unwrap()).toBe(84);
      });

      it('should chain Ok values with direct AsyncResult return', async () => {
        const result = await AsyncResult.ok(42);
        const chained = await result.chain((x) => {
          // This tests the direct AsyncResult return path
          return new AsyncResult(
            Promise.resolve({ _tag: 'Ok' as const, value: x * 2 }),
          );
        });
        expect(await chained.unwrap()).toBe(84);
      });

      it('should chain Ok values with Promise<AsyncResult> return', async () => {
        const result = await AsyncResult.ok(42);
        const chained = await result.chain((x) =>
          Promise.resolve(AsyncResult.ok(x * 2)),
        );
        expect(await chained.unwrap()).toBe(84);
      });

      it('should chain Ok values with Promise<AsyncResult> return that is not an instance', async () => {
        const result = await AsyncResult.ok(42);
        const chained = await result.chain(async (x) => {
          return AsyncResult.ok(x * 2);
        });
        expect(await chained.unwrap()).toBe(84);
      });

      it('should not chain Err values', async () => {
        const result = await AsyncResult.err<string, number>('error');
        const chained = await result.chain((x) => AsyncResult.ok(x * 2));
        expect(await chained.unwrapErr()).toBe('error');
      });
    });

    describe('match', () => {
      it('should match Ok value', async () => {
        const result = await AsyncResult.ok(42);
        const matched = await result.match(
          (e) => `error: ${e}`,
          (v) => `value: ${v}`,
        );
        expect(matched).toBe('value: 42');
      });

      it('should match Err value', async () => {
        const result = await AsyncResult.err('error');
        const matched = await result.match(
          (e) => `error: ${e}`,
          (v) => `value: ${v}`,
        );
        expect(matched).toBe('error: error');
      });

      it('should handle async match functions', async () => {
        const result = await AsyncResult.ok(42);
        const matched = await result.match(
          async (e) => `error: ${e}`,
          async (v) => `value: ${v}`,
        );
        expect(matched).toBe('value: 42');
      });
    });

    describe('unwrap', () => {
      it('should unwrap Ok value', async () => {
        const result = await AsyncResult.ok(42);
        expect(await result.unwrap()).toBe(42);
      });

      it('should throw on unwrapping Err', async () => {
        const result = await AsyncResult.err('error');
        await expect(() => result.unwrap()).rejects.toThrow();
      });
    });

    describe('unwrapOr', () => {
      it('should return Ok value when Ok', async () => {
        const result = await AsyncResult.ok(42);
        expect(await result.unwrapOr(0)).toBe(42);
      });

      it('should return default value when Err', async () => {
        const result = await AsyncResult.err('error');
        expect(await result.unwrapOr(0)).toBe(0);
      });
    });

    describe('unwrapErr', () => {
      it('should unwrap Err value', async () => {
        const result = await AsyncResult.err('error');
        expect(await result.unwrapErr()).toBe('error');
      });

      it('should throw on unwrapping Ok', async () => {
        const result = await AsyncResult.ok(42);
        await expect(() => result.unwrapErr()).rejects.toThrow();
      });
    });

    describe('toPromise', () => {
      it('should resolve with Ok value', async () => {
        const result = await AsyncResult.ok(42);
        await expect(result.toPromise()).resolves.toBe(42);
      });

      it('should reject with Err value', async () => {
        const result = await AsyncResult.err('error');
        await expect(result.toPromise()).rejects.toBe('error');
      });
    });

    describe('isOk and isErr', () => {
      it('should correctly identify Ok values', async () => {
        const result = await AsyncResult.ok(42);
        expect(await result.isOk()).toBe(true);
        expect(await result.isErr()).toBe(false);
      });

      it('should correctly identify Err values', async () => {
        const result = await AsyncResult.err('error');
        expect(await result.isOk()).toBe(false);
        expect(await result.isErr()).toBe(true);
      });
    });
  });
});
