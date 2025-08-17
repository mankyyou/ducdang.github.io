export interface User {
  id: string;
  username: string;
  password: string;
}

export interface AuthResponse {
  token?: string;
  message?: string;
}