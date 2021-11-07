import nJwt from 'njwt';

export async function verifyAccessToken(token: string): Promise<nJwt.Jwt> {
  const jwtToken = new nJwt.Verifier()
    .setSigningAlgorithm('HS512')
    .setSigningKey('aaa')
    .verify(token);
  return jwtToken;
}
