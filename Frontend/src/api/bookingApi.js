import api from './axios';

export const bookingApi = {
  getMyBookings: async () => {
    const response = await api.get('/bookings/my');
    return response.data;
  },

  cancelBooking: async (bookingId) => {
    const response = await api.patch(`/bookings/${bookingId}/cancel`);
    return response.data;
  },

  createBooking: async (eventId, seatIds, options = {}) => {
    const response = await api.post('/bookings', { eventId, seatIds, ...options });
    return response.data;
  }
};
