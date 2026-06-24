const API_BASE = import.meta.env.VITE_API_URL ?? ''

export const backendApi = {
  baseUrl: API_BASE,
  authPath: (path: string) => `${API_BASE}/api/auth${path}`,
}
