import api from './axios';

export const reviewApi = {
  /**
   * Get all reviews and rating breakdown for an event
   * @param {string} eventId - MongoDB ObjectId or event slug
   */
  getEventReviews: async (eventId) => {
    const response = await api.get(`/events/${eventId}/reviews`);
    return response.data;
  },

  /**
   * Submit or update a review for an event
   * @param {string} eventId
   * @param {{ rating: number, comment: string }} reviewData
   */
  submitReview: async (eventId, { rating, comment }) => {
    const response = await api.post(`/events/${eventId}/reviews`, {
      rating,
      comment
    });
    return response.data;
  },

  /**
   * Delete a review
   * @param {string} reviewId
   */
  deleteReview: async (reviewId) => {
    const response = await api.delete(`/reviews/${reviewId}`);
    return response.data;
  }
};
