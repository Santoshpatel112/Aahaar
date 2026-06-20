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
    if (error.response?.status === 401) {
      // Clear any stored auth state on 401 and notify the app to logout
      localStorage.removeItem('aahaar_user');
      try {
        window.dispatchEvent(new CustomEvent('auth-unauthorized', { detail: { status: 401 } }));
      } catch (e) {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

export default api;
