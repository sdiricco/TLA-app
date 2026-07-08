import axios, { AxiosError, AxiosHeaders } from 'axios';
import { clearAuthToken, getAuthToken, getGuestToken } from './token';
import { apiBaseUrl } from '@/constants';

/**
 * Constants
 */

/**
 * Axios client for application APIs
 */
export const apiClient = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Middleware: Inject the bearer token for secured app endpoints
 */
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  const guestToken = getGuestToken();
  if (!token && !guestToken) return config;

  config.headers = AxiosHeaders.from(config.headers);
  config.headers.set('Authorization', `Bearer ${guestToken ? 'tla_guest_token' : token}`);
  const organizationId = localStorage.getItem('tla_organization_id');
  if (organizationId) config.headers.set('X-Organization-Id', organizationId);
  return config;
});

/**
 * Middleware: Clear invalid tokens when the backend answers with 401
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401 && getAuthToken()) {
      clearAuthToken();
    }
    return Promise.reject(error);
  }
);
