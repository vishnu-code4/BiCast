// ============================================================
// API client — base HTTP client using Axios
// All backend requests go through this client.
// The Vite proxy forwards /api/* to localhost:3001
// ============================================================
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

const BASE_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL || '/api';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token when available
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('bicast_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — normalize errors
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (axios.isAxiosError(error)) {
      const message =
        (error.response?.data as { error?: { message?: string } })?.error?.message
        ?? error.message
        ?? 'An unknown error occurred';
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  },
);

export const apiClient = {
  get: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.get(url, config) as unknown as Promise<T>,

  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.post(url, data, config) as unknown as Promise<T>,

  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.put(url, data, config) as unknown as Promise<T>,

  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.patch(url, data, config) as unknown as Promise<T>,

  delete: <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    axiosInstance.delete(url, config) as unknown as Promise<T>,
};
