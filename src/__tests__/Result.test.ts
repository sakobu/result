import { describe, it, expect } from 'vitest';
import { Result } from '../core/Result';

describe('Result', () => {
  describe('static methods', () => {
    describe('ok', () => {
      it('should create a successful result', () => {
        const result = Result.ok<string, number>(42);
        expect(result.isOk()).toBe(true);
        expect(result.isErr()).toBe(false);
        expect(result.unwrap()).toBe(42);
      });
    });

    describe('err', () => {
      it('should create an error result', () => {
        const result = Result.err<string, number>('error');
        expect(result.isErr()).toBe(true);
        expect(result.isOk()).toBe(false);
        expect(result.unwrapErr()).toBe('error');
      });
    });

    describe('fromNullableWithError', () => {
      it('should return Ok for non-null value', () => {
        const result = Result.fromNullableWithError('error', 42);
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(42);
      });

      it('should return Err for null value', () => {
        const result = Result.fromNullableWithError('error', null);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('error');
      });

      it('should return Err for undefined value', () => {
        const result = Result.fromNullableWithError('error', undefined);
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('error');
      });
    });

    describe('tryCatch', () => {
      it('should return Ok for successful operation', () => {
        const result = Result.tryCatch(
          () => 42,
          (e) => String(e),
        );
        expect(result.isOk()).toBe(true);
        expect(result.unwrap()).toBe(42);
      });

      it('should return Err for thrown error', () => {
        const result = Result.tryCatch(
          () => {
            throw new Error('test error');
          },
          (e) => (e as Error).message,
        );
        expect(result.isErr()).toBe(true);
        expect(result.unwrapErr()).toBe('test error');
      });
    });
  });

  describe('instance methods', () => {
    describe('rMap', () => {
      it('should map Ok value', () => {
        const result = Result.ok<string, number>(42).rMap((x) => x * 2);
        expect(result.unwrap()).toBe(84);
      });

      it('should not map Err value', () => {
        const result = Result.err<string, number>('error').rMap((x) => x * 2);
        expect(result.unwrapErr()).toBe('error');
      });
    });

    describe('rMapErr', () => {
      it('should map Err value', () => {
        const result = Result.err<string, number>('error').rMapErr((e) =>
          e.toUpperCase(),
        );
        expect(result.unwrapErr()).toBe('ERROR');
      });

      it('should not map Ok value', () => {
        const result = Result.ok<string, number>(42).rMapErr((e) =>
          e.toUpperCase(),
        );
        expect(result.unwrap()).toBe(42);
      });
    });

    describe('chain', () => {
      it('should chain Ok values', () => {
        const result = Result.ok<string, number>(42).chain((x) =>
          Result.ok(x.toString()),
        );
        expect(result.unwrap()).toBe('42');
      });

      it('should not chain Err values', () => {
        const result = Result.err<string, number>('error').chain((x) =>
          Result.ok(x.toString()),
        );
        expect(result.unwrapErr()).toBe('error');
      });
    });

    describe('match', () => {
      it('should match Ok value', () => {
        const result = Result.ok<string, number>(42).match(
          (e) => e.length,
          (n) => n * 2,
        );
        expect(result).toBe(84);
      });

      it('should match Err value', () => {
        const result = Result.err<string, number>('error').match(
          (e) => e.length,
          (n) => n * 2,
        );
        expect(result).toBe(5);
      });
    });

    describe('unwrap', () => {
      it('should return value for Ok', () => {
        const result = Result.ok<string, number>(42);
        expect(result.unwrap()).toBe(42);
      });

      it('should throw for Err', () => {
        const result = Result.err<string, number>('error');
        expect(() => result.unwrap()).toThrowError();
      });
    });

    describe('unwrapOr', () => {
      it('should return value for Ok', () => {
        const result = Result.ok<string, number>(42);
        expect(result.unwrapOr(0)).toBe(42);
      });

      it('should return default for Err', () => {
        const result = Result.err<string, number>('error');
        expect(result.unwrapOr(0)).toBe(0);
      });
    });

    describe('unwrapErr', () => {
      it('should return error for Err', () => {
        const result = Result.err<string, number>('error');
        expect(result.unwrapErr()).toBe('error');
      });

      it('should throw for Ok', () => {
        const result = Result.ok<string, number>(42);
        expect(() => result.unwrapErr()).toThrowError();
      });
    });

    describe('toPromise', () => {
      it('should resolve for Ok', async () => {
        const result = Result.ok<string, number>(42);
        await expect(result.toPromise()).resolves.toBe(42);
      });

      it('should reject for Err', async () => {
        const result = Result.err<string, number>('error');
        await expect(result.toPromise()).rejects.toBe('error');
      });
    });

    describe('type guards', () => {
      it('isOk should work correctly', () => {
        const okResult = Result.ok<string, number>(42);
        const errResult = Result.err<string, number>('error');
        expect(okResult.isOk()).toBe(true);
        expect(errResult.isOk()).toBe(false);
      });

      it('isErr should work correctly', () => {
        const okResult = Result.ok<string, number>(42);
        const errResult = Result.err<string, number>('error');
        expect(okResult.isErr()).toBe(false);
        expect(errResult.isErr()).toBe(true);
      });
    });
  });
});
