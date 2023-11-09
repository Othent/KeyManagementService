export interface UserDetailsReturnProps {
  wallet_address?: string;
  given_name: string;
  family_name: string;
  nickname: string;
  name: string;
  picture: string;
  locale: string;
  updated_at?: string;
  email: string;
  email_verified: string;
  sub: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  sid?: string;
  nonce?: string;
  data?: any;
}
