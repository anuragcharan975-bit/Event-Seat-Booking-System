import api from './axios';

const ADMIN_BASE_PATH = '/system-console-r6t8';

export const adminApi = {
  // Get aggregated dashboard statistics
  getStats: async () => {
    const response = await api.get(`${ADMIN_BASE_PATH}/stats`);
    return response.data;
  },

  // Events management
  getAdminEvents: async () => {
    const response = await api.get(`${ADMIN_BASE_PATH}/events`);
    return response.data;
  },

  createEvent: async (eventData) => {
    const response = await api.post(`${ADMIN_BASE_PATH}/events`, eventData);
    return response.data;
  },

  updateEvent: async (eventId, eventData) => {
    const response = await api.put(`${ADMIN_BASE_PATH}/events/${eventId}`, eventData);
    return response.data;
  },

  updateEventStatus: async (eventId, status) => {
    const response = await api.patch(`${ADMIN_BASE_PATH}/events/${eventId}/status`, { status });
    return response.data;
  },

  deleteEvent: async (eventId) => {
    const response = await api.delete(`${ADMIN_BASE_PATH}/events/${eventId}`);
    return response.data;
  },

  // Users management
  getUsers: async () => {
    const response = await api.get(`${ADMIN_BASE_PATH}/users`);
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    const response = await api.put(`${ADMIN_BASE_PATH}/users/${userId}/role`, { role });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`${ADMIN_BASE_PATH}/users/${userId}`);
    return response.data;
  },

  // Bookings management
  getBookings: async () => {
    const response = await api.get(`${ADMIN_BASE_PATH}/bookings`);
    return response.data;
  },

  cancelBooking: async (bookingId) => {
    const response = await api.post(`${ADMIN_BASE_PATH}/bookings/${bookingId}/cancel`);
    return response.data;
  },

  // Reviews management
  getReviews: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${ADMIN_BASE_PATH}/reviews?${query}` : `${ADMIN_BASE_PATH}/reviews`;
    const response = await api.get(url);
    return response.data;
  },

  deleteReview: async (reviewId) => {
    const response = await api.delete(`${ADMIN_BASE_PATH}/reviews/${reviewId}`);
    return response.data;
  }
};

export default adminApi;
