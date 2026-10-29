import api from './axios';

export const ticketApi = {
  /**
   * Public verification of booking ticket details
   * @param {string} bookingReference
   * @returns {Promise<Object>}
   */
  verifyTicket: async (bookingReference) => {
    if (!bookingReference) {
      throw new Error('Booking reference is required');
    }
    const cleanRef = encodeURIComponent(bookingReference.trim().toUpperCase());
    const response = await api.get(`/tickets/verify/${cleanRef}`);
    return response.data;
  },

  /**
   * Atomic gatekeeper / event staff check-in
   * @param {string} bookingReference
   * @returns {Promise<Object>}
   */
  checkInTicket: async (bookingReference) => {
    if (!bookingReference) {
      throw new Error('Booking reference is required');
    }
    const cleanRef = encodeURIComponent(bookingReference.trim().toUpperCase());
    const response = await api.patch(`/tickets/${cleanRef}/check-in`);
    return response.data;
  }
};

export default ticketApi;
