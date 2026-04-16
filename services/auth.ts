import api from "@/lib/api";
import { setToken, removeToken } from "@/lib/api";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  User,
} from "@/types";

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/login", data);
  setToken(response.data.token);
  return response.data;
}

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/register", data);
  setToken(response.data.token);
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await api.get<{ data: User }>("/me");
  return response.data.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/logout");
  } finally {
    removeToken();
  }
}

export async function refreshToken(): Promise<string> {
  const response = await api.post<TokenResponse>("/refresh");
  setToken(response.data.token);
  return response.data.token;
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await api.get(`/users/verify-token/${token}`);
    return true;
  } catch {
    return false;
  }
}

export async function updateProfile(data: {
  name?: string;
  first_name?: string | null;
  last_name?: string | null;
  specialty?: string | null;
}): Promise<User> {
  const response = await api.put<{ data: User }>("/me", data);
  return response.data.data;
}

export async function changePassword(data: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await api.put("/me/password", data);
}

export async function activateAccount(data: {
  token: string;
  password: string;
}): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/users/activate", data);
  setToken(response.data.token);
  return response.data;
}
