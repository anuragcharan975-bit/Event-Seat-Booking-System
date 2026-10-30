import axios from 'axios';

// Normalize API base URL: ensure it always points to the backend /api prefix without trailing slashes
const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    const rawUrl = import.meta.env.VITE_API_URL.trim().replace(/\/+$/, '');
    return rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;
  }

  // In production (e.g. deployed on Vercel) or when accessing outside localhost, default to Render backend
  if (
    import.meta.env.PROD ||
    (typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1')
  ) {
    return 'https://event-seat-booking-backend.onrender.com/api';
  }

  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor: Attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized/expired token, clear stored session
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export default api;
