import { isEndpointSecured } from '../../../src/utils';
import { getConfig } from '../../utils/config';

describe('no configuration', () => {
  it('secures when no specific configuration is provided.', () => {
    const result = isEndpointSecured(getConfig(), '/hello');
    expect(result).toBe(true);
  });
});

describe('secureEndpoints configuration', () => {
  const config = getConfig({ securedEndpoints: [/^\/auth\/.*/] });

  it.each([
    ['/', false],
    ['/standard-endpoint', false],
    ['/auth/login', true],
  ])('tests %s', (path: string, expected: boolean) => {
    const result = isEndpointSecured(config, path);
    expect(result).toBe(expected);
  });
});

describe('notSecuredEndpoints configuration', () => {
  const config = getConfig({ notSecuredEndpoints: [/^\/no-auth\/.*/] });

  it.each([
    ['/', true],
    ['/standard-endpoint', true],
    ['/auth/login', true],
    ['/no-auth/link', false],
  ])('tests %s', (path: string, expected: boolean) => {
    const result = isEndpointSecured(config, path);
    expect(result).toBe(expected);
  });
});
