import { describe, it, expect } from 'vitest';
import { Result } from '../index';
import type { ResultData } from '../types';

describe('exports', () => {
  it('should export Result correctly', () => {
    const result = Result.ok(42);
    expect(result.unwrap()).toBe(42);
  });

  it('should handle ResultData type', () => {
    const okData: ResultData<string, number> = { _tag: 'Ok', value: 42 };
    const errData: ResultData<string, number> = { _tag: 'Err', error: 'error' };
    
    expect(okData._tag).toBe('Ok');
    expect(errData._tag).toBe('Err');
  });
});
