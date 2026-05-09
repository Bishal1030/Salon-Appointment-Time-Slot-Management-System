export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CUSTOMER';
  selectedTemplateId?: string;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password?: string; // Optional if you use other auth methods, but usually required
}

export interface RegisterDto {
  name: string;
  email: string;
  password?: string;
}
