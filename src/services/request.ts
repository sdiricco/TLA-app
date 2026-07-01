import type { AxiosInstance, AxiosRequestConfig } from 'axios'

/**
 * Function: Execute a typed request and normalize empty responses
 */
export async function apiRequest<T>(client: AxiosInstance, config: AxiosRequestConfig): Promise<T> {
  const response = await client.request<T>(config)
  if (response.status === 204 || response.data === '' || response.data === undefined) {
    return null as T
  }
  return response.data
}

