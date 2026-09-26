const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.detail ?? "Request failed");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export interface AuthResponse {
  token: string;
  username: string;
}

export interface DiaryEntry {
  _id: string;
  user_id: string;
  title: string;
  content: string;
  ai_access: boolean;
  mood: string | null;
  mood_confidence: number | null;
  date: string;
}

export interface CitedEntry {
  entry_id: string;
  title: string;
  date: string;
}

export interface ChatResponse {
  response: string;
  cited_entries: CitedEntry[];
}

export interface ChatHistoryMessage {
  _id: string;
  role: "user" | "assistant";
  content: string;
  cited_entries: CitedEntry[];
  created_at: string;
}

export interface SuggestedUser {
  user_id: string;
  username: string;
  shared_moods: string[];
  commonality: string;
  last_active: string | null;
  request_sent: boolean;
}

export interface IncomingConnectionRequest {
  from_user_id: string;
  from_username: string;
  created_at: string;
}

export const api = {
  signup: (username: string, password: string) =>
    request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  listDiaryEntries: (token: string) =>
    request<DiaryEntry[]>("/diary", { token }),

  createDiaryEntry: (
    token: string,
    entry: { title: string; content: string; ai_access?: boolean }
  ) =>
    request<DiaryEntry>("/diary", {
      method: "POST",
      token,
      body: JSON.stringify(entry),
    }),

  sendChatMessage: (token: string, content: string) =>
    request<ChatResponse>("/chat", {
      method: "POST",
      token,
      body: JSON.stringify({ content }),
    }),

  getChatHistory: (token: string) =>
    request<ChatHistoryMessage[]>("/chat/history", { token }),

  getConnectSuggestions: (token: string) =>
    request<SuggestedUser[]>("/connect/suggestions", { token }),

  sendConnectionRequest: (token: string, targetUserId: string) =>
    request<void>(`/connect/request/${targetUserId}`, { method: "POST", token }),

  getIncomingRequests: (token: string) =>
    request<IncomingConnectionRequest[]>("/connect/requests", { token }),
};
