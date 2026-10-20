import api from './axios';

export const authApi = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const response = await api.put('/auth/profile', data);
    return response.data;
  },

  sendOtp: async (data) => {
    const response = await api.post('/auth/send-otp', data);
    return response.data;
  },

  verifyOtp: async (data) => {
    const response = await api.post('/auth/verify-otp', data);
    return response.data;
  },

  changePassword: async (data) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },

  // Protected Email OTP Password Change APIs (/api/users/password-otp)
  sendPasswordOtp: async (data) => {
    const response = await api.post('/users/password-otp/send', data);
    return response.data;
  },

  verifyPasswordOtp: async (data) => {
    const response = await api.post('/users/password-otp/verify', data);
    return response.data;
  }
};
