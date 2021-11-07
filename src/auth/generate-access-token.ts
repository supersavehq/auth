import nJwt from 'njwt';

export async function generateAccessToken(sub: string): Promise<string> {
  // TODO secret from config, and expiration
  const jwt = nJwt.create({ sub }, 'aaa', 'HS512');
  jwt.setExpiration(new Date().getTime() + 60 * 60 * 1000); // One hour from now
  return jwt.compact();
}
