import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';
    const isPublicAuthRequest =
      requestUrl.includes('/users/auth') ||
      requestUrl.includes('/users/register');

    if (status === 401 && !isPublicAuthRequest && localStorage.getItem('aahaar_user')) {
      localStorage.removeItem('aahaar_user');
      try {
        const reason = requestUrl.includes('/users/profile') ? 'account_removed' : 'session_expired';
        window.dispatchEvent(new CustomEvent('auth-unauthorized', { detail: { status: 401, reason } }));
      } catch {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

export default api;
