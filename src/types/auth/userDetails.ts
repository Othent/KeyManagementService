export interface UserDetailsReturnProps {
  authSystem?: string;
  walletAddress: string;
  owner: string;
  given_name: string;
  family_name: string;
  nickname: string;
  name: string;
  picture: string;
  locale: string;
  updated_at?: string;
  email: string;
  email_verified: boolean;
  sub: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  sid?: string;
  nonce?: string;
  data?: any;
}
