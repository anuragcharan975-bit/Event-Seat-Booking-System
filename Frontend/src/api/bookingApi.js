import api from './axios';

export const bookingApi = {
  getMyBookings: async () => {
    const response = await api.get('/bookings/me');
    return response.data;
  }
};
