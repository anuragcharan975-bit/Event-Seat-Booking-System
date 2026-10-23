import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reviewApi } from '../api/reviewApi';
import {
  Star,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  User,
  Sparkles,
  ShieldCheck,
  Send,
  X
} from 'lucide-react';

const RATING_LABELS = {
  1: 'Poor (1/5)',
  2: 'Fair (2/5)',
  3: 'Good (3/5)',
  4: 'Very Good (4/5)',
  5: 'Excellent! (5/5)'
};

const EventReviews = ({ eventId, eventTitle }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingBreakdown, setRatingBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  // Fetch reviews for this event
  const fetchReviews = useCallback(async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const res = await reviewApi.getEventReviews(eventId);
      if (res.success && res.data) {
        setReviews(res.data.reviews || []);
        setAverageRating(res.data.averageRating || 0);
        setTotalReviews(res.data.totalReviews || 0);
        setRatingBreakdown(res.data.ratingBreakdown || []);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Check if current logged-in user already wrote a review
  const myReview = reviews.find(
    (r) => user && (r.userId === user._id || r.userId?._id === user._id)
  );

  // Pre-fill form when user edits their review
  const handleStartEdit = () => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment);
    }
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setFormError('');
    setFormSuccess('');
  };

  // Submit new review or update existing
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!rating || rating < 1 || rating > 5) {
      setFormError('Please select a rating between 1 and 5 stars.');
      return;
    }

    if (!comment || comment.trim().length < 2) {
      setFormError('Please enter a review comment (minimum 2 characters).');
      return;
    }

    try {
      setSubmitting(true);
      const res = await reviewApi.submitReview(eventId, {
        rating,
        comment: comment.trim()
      });

      if (res.success) {
        setFormSuccess(res.message || 'Review submitted successfully!');
        setComment('');
        setRating(5);
        await fetchReviews();
        setTimeout(() => {
          setShowForm(false);
          setFormSuccess('');
        }, 1800);
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message || 'Failed to submit review. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete review
  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;

    try {
      setDeletingId(reviewId);
      const res = await reviewApi.deleteReview(reviewId);
      if (res.success) {
        await fetchReviews();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete review');
    } finally {
      setDeletingId(null);
    }
  };

  const currentDisplayRating = hoverRating || rating;

  return (
    <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8 animate-fadeIn">
      {/* Header & Overall Rating Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 shadow-xs">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Customer Reviews & Ratings
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Read real feedback from verified attendees or share your own experience
          </p>
        </div>

        {/* Action Button: Write or Edit Review */}
        <div>
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                if (myReview) {
                  handleStartEdit();
                } else {
                  setRating(5);
                  setComment('');
                  setShowForm(!showForm);
                }
              }}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 active:scale-98"
            >
              {myReview ? (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>Edit My Review</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>{showForm ? 'Close Form' : 'Write a Review'}</span>
                </>
              )}
            </button>
          ) : (
            <Link
              to="/login"
              state={{ from: location }}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-all flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              <span>Sign In to Review</span>
            </Link>
          )}
        </div>
      </div>

      {/* Rating Summary Card & Percentage Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50/80 rounded-2xl p-6 border border-slate-200/80">
        {/* Left: Overall Score */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-5xl font-black text-slate-900 tracking-tight">
            {totalReviews > 0 ? averageRating.toFixed(1) : '0.0'}
          </span>
          <div className="flex items-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((starIdx) => (
              <Star
                key={starIdx}
                className={`w-5 h-5 ${
                  starIdx <= Math.round(averageRating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-slate-200 text-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-slate-600">
            Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </span>
          {totalReviews === 0 && (
            <span className="text-[11px] text-slate-400 mt-1">
              Be the first to review this event!
            </span>
          )}
        </div>

        {/* Right: Star Distribution Bars */}
        <div className="md:col-span-8 flex flex-col justify-center space-y-2">
          {[5, 4, 3, 2, 1].map((starNum) => {
            const starData = ratingBreakdown.find((b) => b.stars === starNum) || {
              count: 0,
              percentage: 0
            };
            return (
              <div key={starNum} className="flex items-center gap-3 text-xs">
                <span className="w-12 font-semibold text-slate-700 flex items-center gap-1 shrink-0">
                  <span>{starNum}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${starData.percentage}%` }}
                  />
                </div>
                <span className="w-10 text-right text-slate-500 font-mono font-medium shrink-0">
                  {starData.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Review Submission Form Modal / Accordion */}
      {showForm && (
        <form
          onSubmit={handleSubmitReview}
          className="p-6 bg-slate-50 border border-sky-200 rounded-2xl space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>{myReview ? 'Edit Your Review' : 'Write a Review'}</span>
            </h4>
            <button
              type="button"
              onClick={handleCancelForm}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {/* Interactive Star Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Your Rating
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((starIdx) => (
                  <button
                    key={starIdx}
                    type="button"
                    onClick={() => setRating(starIdx)}
                    onMouseEnter={() => setHoverRating(starIdx)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 rounded-lg hover:scale-110 transition-transform focus:outline-none"
                    title={`${starIdx} Stars`}
                  >
                    <Star
                      className={`w-7 h-7 cursor-pointer transition-colors ${
                        starIdx <= currentDisplayRating
                          ? 'fill-amber-400 text-amber-400'
                          : 'fill-slate-200 text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg ml-2">
                {RATING_LABELS[currentDisplayRating] || `${currentDisplayRating} Stars`}
              </span>
            </div>
          </div>

          {/* Comment Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Your Feedback & Experience
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {comment.length} / 1000 characters
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did you think of the venue, sound quality, seat view, or organization?"
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition shadow-xs"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancelForm}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-sky-600 hover:bg-sky-500 shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{myReview ? 'Update Review' : 'Submit Review'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Customer Reviews List */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
          All Reviews ({reviews.length})
        </h4>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            <span className="inline-block w-5 h-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mb-2" />
            <p>Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="py-10 px-4 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h5 className="font-bold text-slate-800 text-sm">No reviews yet</h5>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Have you booked or attended this event? Be the first to share your rating and review!
            </p>
            {isAuthenticated && !showForm && (
              <button
                type="button"
                onClick={() => {
                  setRating(5);
                  setComment('');
                  setShowForm(true);
                }}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition"
              >
                Write First Review
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => {
              const isOwner =
                user && (rev.userId === user._id || rev.userId?._id === user._id);
              const canDelete = isOwner || isAdmin;
              const dateFormatted = rev.createdAt
                ? new Date(rev.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Recent';

              const initial = (rev.userName || 'U')[0].toUpperCase();

              return (
                <div
                  key={rev._id}
                  className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3 transition-all hover:border-slate-300"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                        {initial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {rev.userName}
                          </span>
                          {isOwner && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                              You
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Verified Attendee</span>
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Reviewed on {dateFormatted}
                        </span>
                      </div>
                    </div>

                    {/* Star Rating & Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((starIdx) => (
                          <Star
                            key={starIdx}
                            className={`w-4 h-4 ${
                              starIdx <= rev.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'fill-slate-200 text-slate-200'
                            }`}
                          />
                        ))}
                      </div>

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDeleteReview(rev._id)}
                          disabled={deletingId === rev._id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
                          title="Delete review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comment */}
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed pl-13">
                    {rev.comment}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default EventReviews;
