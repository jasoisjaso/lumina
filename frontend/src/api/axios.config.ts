import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/auth.store';

/**
 * Axios Configuration
 * Configured with base URL and JWT token interceptors
 */

// Use relative URL in production so nginx can proxy it
// Use localhost:3001 in development
const API_BASE_URL = process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api/v1' : 'http://localhost:3001/api/v1');

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers: { resolve: (token: string) => void; reject: (error: unknown) => void }[] = [];

// Add subscriber to wait for token refresh
const subscribeTokenRefresh = (resolve: (token: string) => void, reject: (error: unknown) => void) => {
  refreshSubscribers.push({ resolve, reject });
};

// Notify all subscribers when token is refreshed
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));
  refreshSubscribers = [];
};

// Fail all waiting requests when the refresh fails, so none hang forever
const onTokenRefreshFailed = (error: unknown) => {
  refreshSubscribers.forEach(({ reject }) => reject(error));
  refreshSubscribers = [];
};

// Send the user back to the app root, which shows the login screen
const redirectToLogin = () => {
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  }
};

// Request interceptor - Add JWT token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // A 401 from login/refresh/logout is a real answer (e.g. wrong password), not an expired token
    const isAuthRequest = ['/auth/login', '/auth/refresh', '/auth/logout'].includes(originalRequest.url ?? '');

    // If error is 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
      if (isRefreshing) {
        // Wait for token refresh to complete
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(apiClient(originalRequest));
          }, reject);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, updateAccessToken, clearAuth } = useAuthStore.getState();

      if (!refreshToken) {
        isRefreshing = false;
        onTokenRefreshFailed(error);
        clearAuth();
        redirectToLogin();
        return Promise.reject(error);
      }

      try {
        // Attempt to refresh the token
        const response = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const { accessToken: newAccessToken } = response.data.tokens;

        // Update token in store
        updateAccessToken(newAccessToken);

        // Notify all waiting requests
        onTokenRefreshed(newAccessToken);

        // Retry the original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        isRefreshing = false;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        isRefreshing = false;
        onTokenRefreshFailed(refreshError);
        clearAuth();
        redirectToLogin();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
