import api from './axios';

export const eventApi = {
  getEvents: async (page = 1, limit = 20) => {
    const response = await api.get(`/events?page=${page}&limit=${limit}`);
    return response.data;
  },

  getEventSeats: async (eventId) => {
    const response = await api.get(`/events/${eventId}/seats`);
    return response.data;
  }
};
