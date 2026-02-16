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
