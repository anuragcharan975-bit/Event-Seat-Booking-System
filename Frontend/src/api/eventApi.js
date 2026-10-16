import api from './axios';

export const eventApi = {
  getEvents: async ({ page = 1, limit = 20, search = '', category = '', date = '' } = {}) => {
    const params = new URLSearchParams();
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (search && search.trim()) params.append('search', search.trim());
    if (category && category !== 'all') params.append('category', category.trim());
    if (date && date.trim()) params.append('date', date.trim());

    const queryString = params.toString();
    const url = queryString ? `/events?${queryString}` : '/events';
    const response = await api.get(url);
    return response.data;
  },

  getEventSeats: async (eventId) => {
    const response = await api.get(`/events/${eventId}/seats`);
    return response.data;
  },

  getEventBySlug: async (category, slug) => {
    const response = await api.get(`/events/${encodeURIComponent(category)}/${encodeURIComponent(slug)}`);
    return response.data;
  }
};
