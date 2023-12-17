import { anonymizeString } from '../../../src/utils';

describe('anonymizeString', () => {
  it('should return xxx if its length is less than twice the visibleLength', () => {
    expect(anonymizeString('abc', 'xxx', 2)).toBe('xxx');
  });

  it('should return the fallback string if the input length is greater than or equal to twice the visibleLength', () => {
    expect(anonymizeString('abcdef', 'xxx', 3)).toBe('xxx');
  });

  it('should anonymize the middle part of the string, leaving visibleLength characters visible at the start and end', () => {
    expect(anonymizeString('abcdef', 'xxx', 1)).toBe('a****f');
  });

  it('should anonymize less characters if requested', () => {
    expect(anonymizeString('abcdef', 'xxx', 2)).toBe('ab**ef');
  });
});
