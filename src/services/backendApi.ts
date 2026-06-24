const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const backendApi = {
  baseUrl: API_BASE,
  apiPath: (path: string) => `${API_BASE}/api${path}`,
  authPath: (path: string) => `${API_BASE}/api/auth${path}`,
}
