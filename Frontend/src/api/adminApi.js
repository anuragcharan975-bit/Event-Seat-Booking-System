import api from './axios';

export const adminApi = {
  // Get aggregated dashboard statistics
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Events management
  getAdminEvents: async () => {
    const response = await api.get('/admin/events');
    return response.data;
  },

  createEvent: async (eventData) => {
    const response = await api.post('/admin/events', eventData);
    return response.data;
  },

  updateEvent: async (eventId, eventData) => {
    const response = await api.put(`/admin/events/${eventId}`, eventData);
    return response.data;
  },

  updateEventStatus: async (eventId, status) => {
    const response = await api.patch(`/admin/events/${eventId}/status`, { status });
    return response.data;
  },

  deleteEvent: async (eventId) => {
    const response = await api.delete(`/admin/events/${eventId}`);
    return response.data;
  },

  // Users management
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },

  updateUserRole: async (userId, role) => {
    const response = await api.put(`/admin/users/${userId}/role`, { role });
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/admin/users/${userId}`);
    return response.data;
  },

  // Bookings management
  getBookings: async () => {
    const response = await api.get('/admin/bookings');
    return response.data;
  },

  cancelBooking: async (bookingId) => {
    const response = await api.post(`/admin/bookings/${bookingId}/cancel`);
    return response.data;
  }
};

export default adminApi;
