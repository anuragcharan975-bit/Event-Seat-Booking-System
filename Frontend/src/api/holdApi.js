import api from './axios';

export const holdApi = {
  createHold: async (eventId, seatIds, options = {}) => {
    const response = await api.post(`/events/${eventId}/holds`, { seatIds, ...options });
    return response.data;
  },

  confirmHold: async (holdId) => {
    const response = await api.post(`/holds/${holdId}/confirm`);
    return response.data;
  },

  releaseHold: async (holdId) => {
    const response = await api.delete(`/holds/${holdId}`);
    return response.data;
  },

  getMyHold: async (eventId) => {
    const response = await api.get(`/events/${eventId}/my-hold`);
    return response.data;
  },

  getGlobalActiveHold: async () => {
    const response = await api.get('/holds/active');
    return response.data;
  }
};
