import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  PlusCircle,
  Trash2,
  ExternalLink,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Image as ImageIcon,
  MapPin,
  Clock,
  DollarSign,
  Layers,
  Search,
  RefreshCw,
  Tag,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  Check,
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  LogOut,
  Gamepad2,
  BookmarkCheck,
  UserCheck,
  XCircle,
  CreditCard,
  Edit3,
  UploadCloud,
  Camera,
  FolderPlus,
  ArrowLeft,
  Filter,
  Star,
  MessageSquare,
  Car,
  Heart
} from 'lucide-react';
import adminApi from '../api/adminApi';
import Loading from '../components/Loading';
import ConfirmDialog from '../components/ConfirmDialog';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate } from '../utils/formatDate';
import { useAuth } from '../context/AuthContext';

// Category presets with matched high-quality Unsplash image suggestions & default timings
const CATEGORY_DEFINITIONS = [
  {
    name: 'Car',
    aliases: ['Car Event', 'Car Events', 'Cars', 'Automotive', 'Auto Show', 'Motorsport', 'Racing', 'Supercar'],
    keywords: ['car', 'cars', 'supercar', 'racing', 'f1', 'formula 1', 'formula', 'drift', 'drag', 'auto expo', 'motorsport', 'rally', 'vehicle', 'automotive', 'auto show'],
    defaultImage: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80',
    color: 'bg-red-50 text-red-700 border-red-200',
    defaultStartTime: '10:00',
    defaultEndTime: '18:00',
    timingLabel: '10:00 AM – 06:00 PM'
  },
  {
    name: 'Spa',
    keywords: ['spa', 'wellness', 'massage', 'retreat', 'ayurvedic', 'ayurveda', 'detox', 'herbal', 'aromatherapy', 'therapy', 'sauna', 'rejuvenation'],
    defaultImage: 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=800&q=80',
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    defaultStartTime: '10:00',
    defaultEndTime: '20:00',
    timingLabel: '10:00 AM – 08:00 PM'
  },
  {
    name: 'Game',
    keywords: ['game', 'gaming', 'pubg', 'bgmi', 'coc', 'clash of clans', 'esports', 'tournament', 'battlegrounds', 'playstation', 'xbox'],
    defaultImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
    color: 'bg-violet-50 text-violet-700 border-violet-200',
    defaultStartTime: '10:00',
    defaultEndTime: '18:00',
    timingLabel: '10:00 AM – 06:00 PM'
  },
  {
    name: 'Dance',
    keywords: ['dance', 'ballet', 'salsa', 'bachata', 'hip hop', 'choreo', 'waltz', 'tango', 'garba', 'folk dance', 'breakdance'],
    defaultImage: 'https://images.unsplash.com/photo-1547153760-18fc86324498?auto=format&fit=crop&w=800&q=80',
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    defaultStartTime: '17:00',
    defaultEndTime: '21:00',
    timingLabel: '05:00 PM – 09:00 PM'
  },
  {
    name: 'Music',
    keywords: ['music', 'rock', 'concert', 'symphony', 'orchestra', 'band', 'jazz', 'acoustic', 'dj', 'vocal', 'song', 'singer', 'guitar', 'pop'],
    defaultImage: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultStartTime: '18:00',
    defaultEndTime: '22:00',
    timingLabel: '06:00 PM – 10:00 PM'
  },
  {
    name: 'Comedy',
    keywords: ['comedy', 'stand-up', 'standup', 'comic', 'roast', 'laughter', 'joke', 'humor', 'open mic', 'improv'],
    defaultImage: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=800&q=80',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    defaultStartTime: '19:00',
    defaultEndTime: '21:00',
    timingLabel: '07:00 PM – 09:00 PM'
  },
  {
    name: 'Theater',
    aliases: ['Theatre', 'theatre', 'theater'],
    keywords: ['theatre', 'theater', 'drama', 'broadway', 'play', 'stage', 'musical', 'acting', 'shakespeare'],
    defaultImage: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    defaultStartTime: '18:00',
    defaultEndTime: '21:00',
    timingLabel: '06:00 PM – 09:00 PM'
  },
  {
    name: 'Sports',
    keywords: ['sports', 'cricket', 'football', 'match', 'championship', 'tournament', 'boxing', 'mma', 'badminton', 'tennis', 'racing', 'athletics'],
    defaultImage: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=800&q=80',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    defaultStartTime: '09:00',
    defaultEndTime: '18:00',
    timingLabel: '09:00 AM – 06:00 PM'
  },
  {
    name: 'Workspace',
    aliases: ['Workshops', 'workshops', 'workspace', 'workspaces'],
    keywords: ['workshop', 'workshops', 'workspace', 'workspaces', 'masterclass', 'hackathon', 'tech', 'ai', 'cloud', 'coding', 'seminar', 'bootcamp', 'architecture', 'summit', 'conference'],
    defaultImage: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    defaultStartTime: '09:00',
    defaultEndTime: '18:00',
    timingLabel: '09:00 AM – 06:00 PM'
  },
  {
    name: 'Other',
    keywords: ['culinary', 'expo', 'exhibition', 'food', 'fair', 'festival', 'tasting', 'artisan', 'coffee'],
    defaultImage: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
    color: 'bg-slate-50 text-slate-700 border-slate-200',
    defaultStartTime: '10:00',
    defaultEndTime: '20:00',
    timingLabel: '10:00 AM – 08:00 PM'
  }
];

// Helper to get category definition safely
const getCategoryDefinition = (catName) => {
  if (!catName || typeof catName !== 'string') {
    return CATEGORY_DEFINITIONS[CATEGORY_DEFINITIONS.length - 1]; // Other
  }
  const clean = catName.trim().toLowerCase();
  const direct = CATEGORY_DEFINITIONS.find(
    (c) => c.name.toLowerCase() === clean || (c.aliases && c.aliases.some((a) => a.toLowerCase() === clean))
  );
  if (direct) return direct;
  if (clean.includes('spa')) return CATEGORY_DEFINITIONS.find((c) => c.name === 'Spa');
  if (clean.includes('car') || clean.includes('auto') || clean.includes('racing') || clean.includes('drift')) return CATEGORY_DEFINITIONS.find((c) => c.name === 'Car');
  if (clean.includes('game')) return CATEGORY_DEFINITIONS.find((c) => c.name === 'Game');
  if (clean.includes('dance')) return CATEGORY_DEFINITIONS.find((c) => c.name === 'Dance');
  if (clean.includes('music')) return CATEGORY_DEFINITIONS.find((c) => c.name === 'Music');
  if (clean.includes('comedy')) return CATEGORY_DEFINITIONS.find((c) => c.name === 'Comedy');
  if (clean.includes('theat')) return CATEGORY_DEFINITIONS.find((c) => c.name === 'Theater');
  if (clean.includes('sport')) return CATEGORY_DEFINITIONS.find((c) => c.name === 'Sports');
  if (clean.includes('work')) return CATEGORY_DEFINITIONS.find((c) => c.name === 'Workspace');
  return CATEGORY_DEFINITIONS.find((c) => c.name === 'Other') || CATEGORY_DEFINITIONS[CATEGORY_DEFINITIONS.length - 1];
};

// Helper to get category timing definition
const getCategoryTiming = (catName) => {
  const def = getCategoryDefinition(catName);
  return {
    start: def.defaultStartTime,
    end: def.defaultEndTime,
    label: def.timingLabel
  };
};

// Helper to check if category matches a definition (including aliases)
const isCategoryMatch = (catDef, selectedCat) => {
  if (!selectedCat || !catDef) return false;
  const sel = selectedCat.trim().toLowerCase();
  return (
    catDef.name.toLowerCase() === sel ||
    (catDef.aliases && catDef.aliases.some((a) => a.toLowerCase() === sel))
  );
};

// Generates YYYY-MM-DDTHH:mm string for a given baseDate and timeStr
const formatDateTimeValue = (baseDateStr, timeStr) => {
  let datePart = baseDateStr;
  if (!datePart) {
    const d = new Date();
    d.setDate(d.getDate() + 1); // tomorrow by default
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    datePart = `${year}-${month}-${day}`;
  } else if (datePart.includes('T')) {
    datePart = datePart.split('T')[0];
  }
  return `${datePart}T${timeStr}`;
};

// Calculate human-friendly duration string
const calculateDurationLabel = (startStr, endStr) => {
  if (!startStr || !endStr) return '';
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return '';
  const diffMs = e.getTime() - s.getTime();
  if (diffMs <= 0) return '';
  const totalMins = Math.round(diffMs / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins} mins`;
  if (mins === 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  return `${hrs} hr${hrs > 1 ? 's' : ''} ${mins} min${mins > 1 ? 's' : ''}`;
};

// Adjust end time by adding or subtracting hours (duration modification)
const adjustEndTimeDuration = (currentStart, currentEnd, deltaHours) => {
  if (!currentStart) return currentEnd;
  const start = new Date(currentStart);
  if (isNaN(start.getTime())) return currentEnd;

  let end = currentEnd ? new Date(currentEnd) : new Date(start.getTime() + 2 * 3600000);
  if (isNaN(end.getTime()) || end <= start) {
    end = new Date(start.getTime() + 2 * 3600000);
  }

  const newEnd = new Date(end.getTime() + deltaHours * 3600000);
  if (newEnd > start) {
    return toDateTimeLocalValue(newEnd);
  }
  return currentEnd;
};

// Helper to auto-detect category from text
const detectCategoryFromText = (text) => {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase();

  for (const cat of CATEGORY_DEFINITIONS) {
    for (const kw of cat.keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(lower)) {
        return cat.name;
      }
    }
  }
  return null;
};

// Client-side image compression: converts high-res gallery images to optimized WebP/JPEG data URLs
const compressImageFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1200;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Converts ISO date strings to YYYY-MM-DDTHH:mm format for datetime-local input fields
const toDateTimeLocalValue = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const AdminDashboard = () => {
  const { user, isAuthenticated, isAdmin, login, logout, loading: authLoading } = useAuth();

  // Admin Login state for direct authentication on /admin
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Active Tab: 'overview' | 'events' | 'users' | 'bookings' | 'reviews'
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [bookingsList, setBookingsList] = useState([]);
  const [reviewsList, setReviewsList] = useState([]);

  // Loading states
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Reviews search/filter states
  const [selectedReviewEventId, setSelectedReviewEventId] = useState('all');
  const [reviewRatingFilter, setReviewRatingFilter] = useState('all');
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewToDelete, setReviewToDelete] = useState(null);

  // Search/Filter states
  const [eventSearch, setEventSearch] = useState('');
  const [selectedEventCategory, setSelectedEventCategory] = useState('all');
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');

  // Event creation form state
  const fileInputRef = useRef(null);
  const [photoSourceMode, setPhotoSourceMode] = useState('gallery'); // 'gallery' | 'url'
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');

  // Edit Event state
  const editFileInputRef = useRef(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    category: 'Game',
    status: 'Pending',
    description: '',
    venue: '',
    startTime: '',
    endTime: '',
    pricePerSeat: '',
    imageUrl: ''
  });
  const [editPhotoSourceMode, setEditPhotoSourceMode] = useState('gallery');
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormError, setEditFormError] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const [formData, setFormData] = useState(() => {
    const timing = getCategoryTiming('Game');
    return {
      title: '',
      category: 'Game',
      status: 'Pending',
      description: '',
      venue: '',
      startTime: formatDateTimeValue(null, timing.start),
      endTime: formatDateTimeValue(null, timing.end),
      pricePerSeat: '499',
      totalSeats: '40',
      imageUrl: CATEGORY_DEFINITIONS.find((c) => c.name === 'Game')?.defaultImage || '',
      isGroupBookingEnabled: true,
      groupMinSeats: '10',
      groupDiscountPercentage: '10',
      isCoupleTicketEnabled: true,
      coupleDiscountPercentage: '40'
    };
  });
  const [matchedSource, setMatchedSource] = useState(null);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [eventFormError, setEventFormError] = useState('');
  const [eventFormSuccess, setEventFormSuccess] = useState('');

  // Confirmation dialogs state
  const [eventToDelete, setEventToDelete] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(false);

  // Load Dashboard Data
  const loadDashboardData = async () => {
    try {
      setLoadingStats(true);
      const res = await adminApi.getStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoadingStats(false);
    }

    try {
      setLoadingEvents(true);
      const res = await adminApi.getAdminEvents();
      if (res.success) {
        setEvents(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoadingEvents(false);
    }

    try {
      setLoadingUsers(true);
      const res = await adminApi.getUsers();
      if (res.success) {
        setUsersList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }

    try {
      setLoadingBookings(true);
      const res = await adminApi.getBookings();
      if (res.success) {
        setBookingsList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    } finally {
      setLoadingBookings(false);
    }

    try {
      setLoadingReviews(true);
      const res = await adminApi.getReviews();
      if (res.success) {
        setReviewsList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Helper to load reviews specifically
  const loadReviewsData = async (params = {}) => {
    try {
      setLoadingReviews(true);
      const res = await adminApi.getReviews(params);
      if (res.success) {
        setReviewsList(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Helper to jump to Reviews tab pre-filtered for a specific event
  const handleViewEventReviews = (eventId) => {
    setSelectedReviewEventId(eventId || 'all');
    setReviewSearch('');
    setReviewRatingFilter('all');
    setActiveTab('reviews');
  };

  // Delete a review as admin
  const handleConfirmDeleteReview = async () => {
    if (!reviewToDelete) return;
    try {
      setActionProcessing(true);
      const res = await adminApi.deleteReview(reviewToDelete._id);
      if (res.success) {
        setReviewsList((prev) => prev.filter((r) => r._id !== reviewToDelete._id));
        setReviewToDelete(null);

        // Refresh stats and events in background to keep counts up to date
        const [statsRes, eventsRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.getAdminEvents()
        ]);
        if (statsRes.success) setStats(statsRes.stats);
        if (eventsRes.success) setEvents(eventsRes.data || []);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete review');
    } finally {
      setActionProcessing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin]);

  // Handle direct Admin Sign-In on /system-console-r6t8
  const handleAdminLogin = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');
    setLoggingIn(true);

    try {
      const res = await login(adminEmail, adminPassword);
      if (res.success) {
        if (res.user?.role !== 'admin') {
          logout();
          setLoginError('Access denied. This account does not have administrator privileges. Only admin accounts are authorized to log in here.');
        } else {
          setLoginError('');
        }
      } else {
        setLoginError(res.message || 'Invalid administrator email or password.');
      }
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Authentication failed. Please check administrator credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  // Handle picking/catching photo from local gallery
  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose a valid image file (JPG, PNG, WEBP, GIF) from your gallery.');
      return;
    }

    try {
      setUploadingPhoto(true);
      const optimizedDataUrl = await compressImageFile(file);
      setFormData((prev) => ({
        ...prev,
        imageUrl: optimizedDataUrl
      }));
      setUploadedFileName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
    } catch (err) {
      console.error('Gallery image upload error:', err);
      alert('Could not process the selected photo from gallery. Please try another image.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Title change with Category Auto-Matching
  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    const detected = detectCategoryFromText(newTitle);

    setFormData((prev) => {
      const updated = { ...prev, title: newTitle };
      if (detected && detected !== prev.category) {
        updated.category = detected;
        const matchedDef = getCategoryDefinition(detected);
        if (matchedDef) {
          updated.imageUrl = matchedDef.defaultImage;
        }
        const timing = getCategoryTiming(detected);
        updated.startTime = formatDateTimeValue(prev.startTime, timing.start);
        updated.endTime = formatDateTimeValue(prev.endTime || prev.startTime, timing.end);
        setMatchedSource('title');
      }
      return updated;
    });
  };

  // Manual Category Select
  const handleCategorySelect = (categoryName) => {
    const matchedDef = getCategoryDefinition(categoryName);
    const timing = getCategoryTiming(categoryName);
    setFormData((prev) => ({
      ...prev,
      category: categoryName,
      imageUrl: matchedDef ? matchedDef.defaultImage : prev.imageUrl,
      startTime: formatDateTimeValue(prev.startTime, timing.start),
      endTime: formatDateTimeValue(prev.endTime || prev.startTime, timing.end)
    }));
    setMatchedSource('manual');
  };

  // Apply default category timing to Create form
  const handleApplyDefaultTimingToCreate = () => {
    const timing = getCategoryTiming(formData.category);
    setFormData((prev) => ({
      ...prev,
      startTime: formatDateTimeValue(prev.startTime, timing.start),
      endTime: formatDateTimeValue(prev.endTime || prev.startTime, timing.end)
    }));
  };

  // Apply default category timing to Edit form
  const handleApplyDefaultTimingToEdit = () => {
    const timing = getCategoryTiming(editFormData.category);
    setEditFormData((prev) => ({
      ...prev,
      startTime: formatDateTimeValue(prev.startTime, timing.start),
      endTime: formatDateTimeValue(prev.endTime || prev.startTime, timing.end)
    }));
  };

  // Duration adjustment handlers (freely extend or reduce duration)
  const handleAdjustCreateDuration = (deltaHours) => {
    setFormData((prev) => ({
      ...prev,
      endTime: adjustEndTimeDuration(prev.startTime, prev.endTime, deltaHours)
    }));
  };

  const handleAdjustEditDuration = (deltaHours) => {
    setEditFormData((prev) => ({
      ...prev,
      endTime: adjustEndTimeDuration(prev.startTime, prev.endTime, deltaHours)
    }));
  };

  // Handle Create Event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setEventFormError('');
    setEventFormSuccess('');

    if (!formData.title.trim()) {
      setEventFormError('Please enter an event title.');
      return;
    }
    if (!formData.venue.trim()) {
      setEventFormError('Please specify the venue location.');
      return;
    }
    if (!formData.startTime) {
      setEventFormError('Please select start date and time.');
      return;
    }
    if (!formData.endTime) {
      setEventFormError('Please select end date and time.');
      return;
    }
    if (new Date(formData.endTime) <= new Date(formData.startTime)) {
      setEventFormError('End time must be after the start time.');
      return;
    }
    if (!formData.pricePerSeat || Number(formData.pricePerSeat) < 0) {
      setEventFormError('Please enter a valid seat price.');
      return;
    }
    if (!formData.description.trim()) {
      setEventFormError('Please provide a short description for attendees.');
      return;
    }

    try {
      setSubmittingEvent(true);
      const res = await adminApi.createEvent({
        ...formData,
        pricePerSeat: Number(formData.pricePerSeat),
        totalSeats: Number(formData.totalSeats) || 40,
        isGroupBookingEnabled: Boolean(formData.isGroupBookingEnabled),
        groupMinSeats: Number(formData.groupMinSeats) || 10,
        groupDiscountPercentage: Number(formData.groupDiscountPercentage) || 10,
        isCoupleTicketEnabled: Boolean(formData.isCoupleTicketEnabled),
        coupleDiscountPercentage: Number(formData.coupleDiscountPercentage) || 10
      });

      if (res.success) {
        setEventFormSuccess(`Event "${formData.title}" created successfully with 40 seats!`);
        const resetTiming = getCategoryTiming('Game');
        setFormData({
          title: '',
          category: 'Game',
          status: 'Pending',
          description: '',
          venue: '',
          startTime: formatDateTimeValue(null, resetTiming.start),
          endTime: formatDateTimeValue(null, resetTiming.end),
          pricePerSeat: '499',
          totalSeats: '40',
          imageUrl: CATEGORY_DEFINITIONS.find((c) => c.name === 'Game')?.defaultImage || ''
        });
        setMatchedSource(null);
        setEventFormSuccess('Event created successfully! Added to events catalog.');
        setShowAddEventForm(false);
        loadDashboardData();
      }
    } catch (err) {
      setEventFormError(err.response?.data?.message || 'Failed to create event. Please try again.');
    } finally {
      setSubmittingEvent(false);
    }
  };

  // Handle Event Deletion
  const handleConfirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      setActionProcessing(true);
      const res = await adminApi.deleteEvent(eventToDelete._id);
      if (res.success) {
        setEvents((prev) => prev.filter((e) => e._id !== eventToDelete._id));
        setEventToDelete(null);
        loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete event');
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Opening Edit Modal
  const handleOpenEditModal = (ev) => {
    setEditingEvent(ev);
    setEditFormData({
      title: ev.title || '',
      category: ev.category || 'Other',
      status: ev.status || 'Pending',
      description: ev.description || '',
      venue: ev.venue || '',
      startTime: toDateTimeLocalValue(ev.startTime),
      endTime: toDateTimeLocalValue(ev.endTime),
      pricePerSeat: String(ev.pricePerSeat || ''),
      imageUrl: ev.imageUrl || '',
      isGroupBookingEnabled: ev.isGroupBookingEnabled !== false,
      groupMinSeats: String(ev.groupMinSeats || 10),
      groupDiscountPercentage: String(ev.groupDiscountPercentage || 10),
      isCoupleTicketEnabled: ev.isCoupleTicketEnabled !== false,
      coupleDiscountPercentage: String(ev.coupleDiscountPercentage != null ? ev.coupleDiscountPercentage : 40)
    });
    setEditPhotoSourceMode(ev.imageUrl?.startsWith('data:') ? 'gallery' : 'url');
    setEditFormError('');
  };

  // Handle Quick Status Change from the Events Manager table dropdown
  const handleStatusChange = async (eventId, newStatus) => {
    try {
      setUpdatingStatusId(eventId);
      const res = await adminApi.updateEventStatus(eventId, newStatus);
      if (res.success) {
        setEvents((prev) =>
          prev.map((e) => (e._id === eventId ? { ...e, status: newStatus } : e))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update event status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Handle Picking photo from gallery during event edit
  const handleEditGalleryUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose a valid image file (JPG, PNG, WEBP, GIF) from your gallery.');
      return;
    }

    try {
      setUploadingEditPhoto(true);
      const optimizedDataUrl = await compressImageFile(file);
      setEditFormData((prev) => ({
        ...prev,
        imageUrl: optimizedDataUrl
      }));
    } catch (err) {
      console.error('Edit gallery image error:', err);
      alert('Failed to process photo from gallery.');
    } finally {
      setUploadingEditPhoto(false);
    }
  };

  // Handle Save Event Changes
  const handleSaveEditEvent = async (e) => {
    e.preventDefault();
    setEditFormError('');

    if (!editFormData.title.trim()) {
      setEditFormError('Event title is required.');
      return;
    }
    if (!editFormData.venue.trim()) {
      setEditFormError('Venue location is required.');
      return;
    }
    if (!editFormData.startTime) {
      setEditFormError('Start date & time is required.');
      return;
    }
    if (!editFormData.endTime) {
      setEditFormError('End date & time is required.');
      return;
    }
    if (new Date(editFormData.endTime) <= new Date(editFormData.startTime)) {
      setEditFormError('End time must be after the start time.');
      return;
    }
    if (!editFormData.pricePerSeat || Number(editFormData.pricePerSeat) < 0) {
      setEditFormError('Please enter a valid price per seat.');
      return;
    }

    try {
      setSavingEdit(true);
      const res = await adminApi.updateEvent(editingEvent._id, {
        ...editFormData,
        pricePerSeat: Number(editFormData.pricePerSeat),
        isGroupBookingEnabled: Boolean(editFormData.isGroupBookingEnabled),
        groupMinSeats: Number(editFormData.groupMinSeats) || 10,
        groupDiscountPercentage: Number(editFormData.groupDiscountPercentage) || 10,
        isCoupleTicketEnabled: Boolean(editFormData.isCoupleTicketEnabled),
        coupleDiscountPercentage: Number(editFormData.coupleDiscountPercentage) || 10
      });

      if (res.success) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev._id === editingEvent._id ? { ...ev, ...res.data } : ev
          )
        );
        setEditingEvent(null);
        loadDashboardData();
      }
    } catch (err) {
      setEditFormError(err.response?.data?.message || 'Failed to update event details.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle User Role Toggle
  const handleToggleUserRole = async (targetUser) => {
    const nextRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = `Are you sure you want to change ${targetUser.name}'s role to "${nextRole}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await adminApi.updateUserRole(targetUser._id, nextRole);
      if (res.success) {
        setUsersList((prev) =>
          prev.map((u) => (u._id === targetUser._id ? { ...u, role: nextRole } : u))
        );
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user role');
    }
  };

  // Handle User Deletion
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setActionProcessing(true);
      const res = await adminApi.deleteUser(userToDelete._id);
      if (res.success) {
        setUsersList((prev) => prev.filter((u) => u._id !== userToDelete._id));
        setUserToDelete(null);
        loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    } finally {
      setActionProcessing(false);
    }
  };

  // Handle Booking Cancellation by Admin
  const handleConfirmCancelBooking = async () => {
    if (!bookingToCancel) return;
    try {
      setActionProcessing(true);
      const res = await adminApi.cancelBooking(bookingToCancel._id);
      if (res.success) {
        setBookingsList((prev) =>
          prev.map((b) =>
            b._id === bookingToCancel._id ? { ...b, status: 'CANCELLED' } : b
          )
        );
        setBookingToCancel(null);
        loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setActionProcessing(false);
    }
  };

  // Helper to count events per category
  const getCategoryEventCount = (catName) => {
    if (catName === 'all') return events.length;
    const catDef = CATEGORY_DEFINITIONS.find((c) => c.name.toLowerCase() === catName.toLowerCase());
    return events.filter((ev) => {
      if (!ev.category) return catName.toLowerCase() === 'other';
      if (catDef) return isCategoryMatch(catDef, ev.category);
      return ev.category.toLowerCase() === catName.toLowerCase();
    }).length;
  };

  // Filtered lists
  const filteredEvents = events.filter((ev) => {
    // 1. Category Filter
    if (selectedEventCategory !== 'all') {
      const catDef = CATEGORY_DEFINITIONS.find(
        (c) => c.name.toLowerCase() === selectedEventCategory.toLowerCase()
      );
      const matchesCategory = catDef
        ? isCategoryMatch(catDef, ev.category)
        : (ev.category?.toLowerCase() === selectedEventCategory.toLowerCase());
      if (!matchesCategory) return false;
    }

    // 2. Search Text Query
    if (!eventSearch.trim()) return true;
    const q = eventSearch.toLowerCase();
    return (
      ev.title?.toLowerCase().includes(q) ||
      ev.category?.toLowerCase().includes(q) ||
      ev.venue?.toLowerCase().includes(q)
    );
  });

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const filteredBookings = bookingsList.filter((b) => {
    if (bookingStatusFilter !== 'all' && b.status?.toLowerCase() !== bookingStatusFilter.toLowerCase()) {
      return false;
    }
    if (!bookingSearch.trim()) return true;
    const q = bookingSearch.toLowerCase();
    return (
      b.bookingReference?.toLowerCase().includes(q) ||
      b.user?.name?.toLowerCase().includes(q) ||
      b.user?.email?.toLowerCase().includes(q) ||
      b.event?.title?.toLowerCase().includes(q)
    );
  });

  // Filter reviews calculation
  const getEventReviewCount = (evId) => {
    return reviewsList.filter((r) => String(r.eventId?._id || r.eventId) === String(evId)).length;
  };

  const filteredReviews = reviewsList.filter((r) => {
    if (selectedReviewEventId !== 'all') {
      const revEventId = r.eventId?._id || r.eventId;
      if (String(revEventId) !== String(selectedReviewEventId)) return false;
    }
    if (reviewRatingFilter !== 'all') {
      const targetRating = parseInt(reviewRatingFilter, 10);
      if (r.rating !== targetRating) return false;
    }
    if (reviewSearch && reviewSearch.trim()) {
      const q = reviewSearch.toLowerCase().trim();
      const name = (r.userName || '').toLowerCase();
      const email = (r.userEmail || '').toLowerCase();
      const comment = (r.comment || '').toLowerCase();
      const eventTitle = (r.eventId?.title || '').toLowerCase();
      return name.includes(q) || email.includes(q) || comment.includes(q) || eventTitle.includes(q);
    }
    return true;
  });

  const totalReviewsCount = reviewsList.length;
  const avgPlatformRating =
    totalReviewsCount > 0
      ? (reviewsList.reduce((acc, r) => acc + (r.rating || 0), 0) / totalReviewsCount).toFixed(1)
      : '0.0';
  const fiveStarReviewsCount = reviewsList.filter((r) => r.rating === 5).length;

  // Session resolving state
  if (authLoading) {
    return <Loading message="Checking administrator privileges..." />;
  }

  // =========================================================================
  // VIEW 1A: ACCESS DENIED (User is logged in, but role is NOT admin)
  // =========================================================================
  if (isAuthenticated && !isAdmin) {
    return (
      <div
        className="min-h-screen relative flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=2000&q=80')`
        }}
      >
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs" />

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-rose-500/30 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 mx-auto flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-400 block mb-1">
                HTTP 403 • Forbidden
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Administrator Access Required
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                You are currently signed in as <span className="font-semibold text-white">{user?.email}</span> (Role: <span className="font-mono text-amber-300 uppercase font-bold">{user?.role || 'user'}</span>). This system console is strictly restricted to accounts with administrator privileges.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  logout();
                  setLoginError('');
                  setAdminEmail('');
                  setAdminPassword('');
                }}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign In with Admin Account</span>
              </button>

              <Link
                to="/"
                className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Home Page</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 1B: DIRECT ADMIN LOGIN PORTAL (Displayed when user is not signed in)
  // =========================================================================
  if (!isAdmin) {
    return (
      <div
        className="min-h-screen relative flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=2000&q=80')`
        }}
      >
        {/* Dark atmospheric backdrop overlay */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs" />

        {/* Minimal Admin Login Card */}
        <div className="relative z-10 w-full max-w-sm">
          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-5">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto mb-2 shadow-inner">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">System Console</h2>
              <p className="text-xs text-slate-400">Authorized Administrator Access Only</p>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-medium leading-relaxed">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="Administrator Email"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  required
                />
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loggingIn ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Authenticate Console</span>
                )}
              </button>
            </form>

            <div className="pt-2 border-t border-white/10 text-center">
              <Link
                to="/"
                className="text-xs text-slate-400 hover:text-sky-400 transition inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Public Site</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATED COMPLETE ADMIN DASHBOARD (5 MANAGEMENT TABS)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>System Console ({user?.email}) • Role: ADMIN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Event & Reservation Command Center
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Centralized administrative hub to create & manage events, supervise user accounts, and track all seat reservations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadDashboardData}
              title="Refresh Data"
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
       
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title="Sign Out of Admin"
              className="p-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 border border-rose-500/30 text-white transition flex items-center gap-1.5 text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* 4 Main Management Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('events');
              setShowAddEventForm(false);
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 ${
              activeTab === 'events'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Events Manager ({events.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Users Manager ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 ${
              activeTab === 'bookings'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            <span>All Bookings ({bookingsList.length})</span>
          </button>

          <button
            onClick={() => {
              setSelectedReviewEventId('all');
              setActiveTab('reviews');
            }}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-2 ${
              activeTab === 'reviews'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>Customer Reviews ({reviewsList.length})</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* TAB 1: OVERVIEW & SYSTEM METRICS */}
        {/* =================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Events</span>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-slate-900">
                    {loadingStats ? '...' : stats?.totalEvents ?? events.length}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Catalog events</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Seats</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-slate-900">
                    {loadingStats ? '...' : stats?.totalSeats ?? (events.length * 40)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Seat inventory</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bookings</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <BookmarkCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-slate-900">
                    {loadingStats ? '...' : stats?.totalBookings ?? 0}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Confirmed tickets</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Revenue</span>
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-slate-900">
                    {loadingStats ? '...' : formatCurrency(stats?.totalRevenue ?? 0)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Total booked value</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Users</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-slate-900">
                    {loadingStats ? '...' : stats?.totalUsers ?? usersList.length}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Accounts in MongoDB</span>
                </div>
              </div>

              <div
                onClick={() => {
                  setSelectedReviewEventId('all');
                  setActiveTab('reviews');
                }}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group col-span-2 sm:col-span-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-amber-700">Reviews</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition">
                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black text-slate-900 group-hover:text-amber-700 transition">
                    {loadingStats ? '...' : (stats?.totalReviews ?? reviewsList.length)}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Customer feedback</span>
                </div>
              </div>
            </div>

            {/* Recent Tables Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Bookings */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <BookmarkCheck className="w-4 h-4 text-purple-600" />
                    <span>Recent Reservations</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('bookings')}
                    className="text-xs font-bold text-purple-600 hover:text-purple-800"
                  >
                    View All →
                  </button>
                </div>

                <div className="space-y-3">
                  {(stats?.recentBookings || bookingsList.slice(0, 5)).map((b) => (
                    <div
                      key={b._id}
                      className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-800 block">
                          {b.bookingReference}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {b.user?.name || b.user?.email || 'Customer'} • {b.event?.title}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">
                          {formatCurrency(b.amount || 0)}
                        </span>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          b.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {bookingsList.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center">No bookings recorded yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Users */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Recent Registered Users</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('users')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Manage Users →
                  </button>
                </div>

                <div className="space-y-3">
                  {(stats?.recentUsers || usersList.slice(0, 5)).map((u) => (
                    <div
                      key={u._id}
                      className="p-3 rounded-2xl bg-slate-50/70 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                          {(u.name || u.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 block">{u.name}</span>
                          <span className="text-[11px] text-slate-400">{u.email}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {u.role || 'user'}
                      </span>
                    </div>
                  ))}
                  {usersList.length === 0 && (
                    <p className="text-xs text-slate-400 py-4 text-center">No users recorded yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: EVENTS MANAGER & ADD EVENT FORM */}
        {/* =================================================================== */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            {showAddEventForm ? (
              /* CREATE EVENT VIEW */
              <div className="space-y-6 animate-fadeIn">
                {/* Back to Events Catalog Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAddEventForm(false)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-2 font-bold text-xs"
                      title="Back to Events Catalog"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Back to Events Catalog ({events.length})</span>
                    </button>
                    <div className="border-l border-slate-200 pl-3">
                      <h2 className="text-base font-black text-slate-900">
                        Create New Event
                      </h2>
                      <p className="text-xs text-slate-500">
                        Publish a new live event with category presets & seat layout
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3.5 py-1.5 rounded-xl border border-purple-200 self-start sm:self-center">
                    Active Catalog: {events.length} Events
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <span>Create Event with Auto Category Matching</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Type your event title. As you type keywords (PUBG, CoC, Symphony, Salsa, Comedy, Boxing, Spa), the system automatically detects and matches the category and suggests high-definition imagery!
                  </p>
                </div>

                {eventFormSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="font-semibold">{eventFormSuccess}</span>
                  </div>
                )}

                {eventFormError && (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span className="font-semibold">{eventFormError}</span>
                  </div>
                )}

                <form onSubmit={handleCreateEvent} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Event Title *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleTitleChange}
                        placeholder="e.g. PUBG Mobile Pro League Finals or Grand Symphony Concert"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium"
                        required
                      />
                      {matchedSource === 'title' && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 animate-pulse">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          Matched {formData.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Category Selector Pills */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Matched Category *
                      </label>
                      <span className="text-[11px] text-purple-600 font-semibold flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        Current: <strong className="font-black underline">{formData.category}</strong>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {CATEGORY_DEFINITIONS.map((cat) => {
                        const isSelected = isCategoryMatch(cat, formData.category);
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => handleCategorySelect(cat.name)}
                            className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            <span>{cat.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Venue and Price */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Venue Location *
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          name="venue"
                          value={formData.venue}
                          onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                          placeholder="e.g. Apex Esports Arena, Main Stage"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Price Per Seat (₹) *
                      </label>
                      <div className="relative">
                        <DollarSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          name="pricePerSeat"
                          min="0"
                          step="50"
                          value={formData.pricePerSeat}
                          onChange={(e) => setFormData({ ...formData, pricePerSeat: e.target.value })}
                          placeholder="499"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Group Booking & Discount Offer Configuration */}
                  <div className="p-4 bg-gradient-to-r from-amber-50/70 to-emerald-50/70 rounded-2xl border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                          Group Booking Discount (Min 10 People)
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isGroupBookingEnabled}
                          onChange={(e) => setFormData({ ...formData, isGroupBookingEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {formData.isGroupBookingEnabled && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Min People for Discount
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="30"
                            value={formData.groupMinSeats}
                            onChange={(e) => setFormData({ ...formData, groupMinSeats: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Group Discount Percentage (% OFF)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.groupDiscountPercentage}
                            onChange={(e) => setFormData({ ...formData, groupDiscountPercentage: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-emerald-700 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Couple Ticket Configuration */}
                  <div className="p-4 bg-gradient-to-r from-rose-50/70 to-pink-50/70 rounded-2xl border border-rose-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                        <span className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                          Couple Ticket Option (1 Boy + 1 Girl Required)
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.isCoupleTicketEnabled}
                          onChange={(e) => setFormData({ ...formData, isCoupleTicketEnabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                      </label>
                    </div>

                    {formData.isCoupleTicketEnabled && (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Couple Ticket Discount (% OFF)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={formData.coupleDiscountPercentage}
                            onChange={(e) => setFormData({ ...formData, coupleDiscountPercentage: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-rose-700 bg-white"
                          />
                        </div>
                        <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
                          ⚠️ Strict Policy: Customers must reach the gate with a female companion. If no girl is standing with them, entry is denied without refund.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Category Default Timings Banner & 1-Click Action */}
                  <div className="p-3.5 bg-purple-50/90 rounded-2xl border border-purple-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-purple-950">
                            Default Suggested Timing for {formData.category}:
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-200/70 text-purple-900 font-extrabold text-[11px]">
                            {getCategoryTiming(formData.category).label}
                          </span>
                        </div>
                        <p className="text-purple-700 font-medium text-[11px] mt-0.5">
                          Suggestions only — customize date, start/end time, or duration freely below.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyDefaultTimingToCreate}
                      title="Reset start and end time to category default"
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Reset to Default</span>
                    </button>
                  </div>

                  {/* Start Time and End Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Start Date & Time *
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="datetime-local"
                          name="startTime"
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        End Date & Time *
                      </label>
                      <div className="relative">
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="datetime-local"
                          name="endTime"
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Duration Quick Helpers & Live Validation */}
                  <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-600 font-semibold">Duration:</span>
                      {calculateDurationLabel(formData.startTime, formData.endTime) ? (
                        <span className="font-black text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-lg border border-purple-200">
                          {calculateDurationLabel(formData.startTime, formData.endTime)}
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                          ⚠️ End time must be later than start time
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500 text-[11px] font-medium mr-1">Modify Duration:</span>
                      <button
                        type="button"
                        onClick={() => handleAdjustCreateDuration(-1)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[11px] transition active:scale-95 shadow-2xs"
                        title="Reduce event duration by 1 hour"
                      >
                        -1 Hr
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustCreateDuration(1)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[11px] transition active:scale-95 shadow-2xs"
                        title="Extend event duration by 1 hour"
                      >
                        +1 Hr
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustCreateDuration(2)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold text-[11px] transition active:scale-95 shadow-2xs"
                        title="Extend event duration by 2 hours"
                      >
                        +2 Hrs
                      </button>
                    </div>
                  </div>

                  {/* Total Seats */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Seat Grid Generation (Default: 40 Seats, Rows A1–D10)
                    </label>
                    <div className="relative">
                      <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        name="totalSeats"
                        min="1"
                        max="100"
                        value={formData.totalSeats}
                        onChange={(e) => setFormData({ ...formData, totalSeats: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                      />
                    </div>
                  </div>

                  {/* Photo Selection: Pick from Gallery or Enter URL */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Event Photo / Cover Image *
                      </label>
                      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setPhotoSourceMode('gallery')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            photoSourceMode === 'gallery'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>From Gallery</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoSourceMode('url')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            photoSourceMode === 'url'
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Image URL</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode 1: Gallery / Device File Picker */}
                    {photoSourceMode === 'gallery' && (
                      <div className="space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleGalleryUpload}
                          className="hidden"
                        />

                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl p-5 text-center cursor-pointer bg-purple-50/40 hover:bg-purple-50/70 transition group"
                        >
                          {uploadingPhoto ? (
                            <div className="flex flex-col items-center justify-center gap-2 py-3">
                              <RefreshCw className="w-6 h-6 text-purple-600 animate-spin" />
                              <span className="text-xs font-bold text-purple-700">Loading & optimizing photo from gallery...</span>
                            </div>
                          ) : formData.imageUrl && formData.imageUrl.startsWith('data:') ? (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={formData.imageUrl}
                                  alt="Gallery Preview"
                                  className="w-16 h-16 rounded-xl object-cover border-2 border-purple-400 shadow-sm shrink-0"
                                />
                                <div className="text-left">
                                  <span className="text-xs font-bold text-slate-800 block line-clamp-1">
                                    {uploadedFileName || 'Photo Selected from Gallery'}
                                  </span>
                                  <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Gallery photo loaded & ready
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fileInputRef.current?.click();
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-xs whitespace-nowrap"
                              >
                                Change Gallery Photo
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-3">
                              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                                <UploadCloud className="w-6 h-6" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-purple-900 block">
                                  Click to select a photo from your Gallery or Device
                                </span>
                                <span className="text-[11px] text-slate-500 block mt-0.5">
                                  Supports JPG, PNG, WEBP • Automatically compressed for crisp quality & fast seat reservation
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Mode 2: Online Image URL input */}
                    {photoSourceMode === 'url' && (
                      <div className="space-y-2">
                        <div className="relative">
                          <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            name="imageUrl"
                            value={formData.imageUrl}
                            onChange={(e) => {
                              setFormData({ ...formData, imageUrl: e.target.value });
                              setUploadedFileName('');
                            }}
                            placeholder="https://images.unsplash.com/..."
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Quick Preset:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const def = CATEGORY_DEFINITIONS.find((c) => c.name === formData.category);
                              if (def) {
                                setFormData((prev) => ({ ...prev, imageUrl: def.defaultImage }));
                                setUploadedFileName('');
                              }
                            }}
                            className="text-xs font-bold text-purple-600 hover:text-purple-800 underline flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3" />
                            Apply Recommended {formData.category} Preset
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Event Description *
                    </label>
                    <textarea
                      name="description"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Provide event overview, featured artists/players, and seat reservation instructions..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                      required
                    ></textarea>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submittingEvent}
                      className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-purple-600/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submittingEvent ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Creating Event & Generating Seat Grid...</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="w-4 h-4" />
                          <span>Publish Event to Catalog</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddEventForm(false)}
                      className="py-3.5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
                    >
                      Cancel & Return
                    </button>
                  </div>
                </form>
              </div>

              {/* Live Preview Card */}
              <div className="space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-3">
                    Live Public Card Preview
                  </span>

                  <div className="rounded-2xl overflow-hidden border border-slate-100 shadow-md bg-white">
                    <div className="relative aspect-video bg-slate-100 overflow-hidden">
                      <img
                        src={formData.imageUrl || CATEGORY_DEFINITIONS[0].defaultImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = CATEGORY_DEFINITIONS[0].defaultImage;
                        }}
                      />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-md text-purple-700 shadow-xs border border-white">
                          {formData.category}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                          Available
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                        {formData.title || 'Your Event Title Here'}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {formData.description || 'Event description and highlights will appear here as you type.'}
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Price</span>
                          <span className="font-black text-slate-900 text-sm">
                            {formatCurrency(Number(formData.pricePerSeat) || 0)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-bold uppercase">Capacity</span>
                          <span className="font-bold text-purple-600">
                            {formData.totalSeats || 40} Seats
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
              /* EVENTS CATALOG TABLE VIEW */
              <div className="space-y-6 animate-fadeIn">
                {/* Event Form Success notification when newly added */}
                {eventFormSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span className="font-bold">{eventFormSuccess}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEventFormSuccess('')}
                      className="text-emerald-700 hover:text-emerald-900 text-xs font-bold p-1"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Catalog Events Table Container */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
                  {/* Top Bar: Title, Search, Category Selector, Add Event Button */}
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl shadow-xs">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                            Events Manager ({events.length})
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                            Manage, edit, filter, and track all live events in MongoDB.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Search Bar */}
                      <div className="relative w-full sm:w-60">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={eventSearch}
                          onChange={(e) => setEventSearch(e.target.value)}
                          placeholder="Search title, venue..."
                          className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                        />
                        {eventSearch && (
                          <button
                            onClick={() => setEventSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Quick Select Dropdown */}
                      <div className="relative">
                        <select
                          value={selectedEventCategory}
                          onChange={(e) => setSelectedEventCategory(e.target.value)}
                          className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 cursor-pointer shadow-xs"
                          title="Filter by category"
                        >
                          <option value="all">All Categories ({events.length})</option>
                          {CATEGORY_DEFINITIONS.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({getCategoryEventCount(c.name)})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* ADD EVENT BUTTON */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddEventForm(true);
                          setEventFormSuccess('');
                          setEventFormError('');
                        }}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-purple-600/25 transition-all flex items-center gap-2 active:scale-98"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>+ Add Event</span>
                      </button>

                      {/* Reload Button */}
                      <button
                        type="button"
                        onClick={() => loadDashboardData()}
                        title="Reload events from database"
                        className="p-2.5 rounded-xl text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Category Filter Pills & Live Event Counts Bar */}
                  <div className="space-y-3 bg-slate-50/70 p-4 sm:p-5 rounded-2xl border border-slate-200/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-purple-600" />
                        <span>Filter by Category & Live Event Counts</span>
                      </span>

                      {selectedEventCategory !== 'all' && (
                        <button
                          type="button"
                          onClick={() => setSelectedEventCategory('all')}
                          className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 self-start sm:self-auto"
                        >
                          <X className="w-3 h-3" />
                          <span>Show All Categories ({events.length})</span>
                        </button>
                      )}
                    </div>

                    {/* Category Pills List */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedEventCategory('all')}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          selectedEventCategory === 'all'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span>All Events</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                            selectedEventCategory === 'all'
                              ? 'bg-purple-800/60 text-white'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {events.length}
                        </span>
                      </button>

                      {CATEGORY_DEFINITIONS.map((cat) => {
                        const count = getCategoryEventCount(cat.name);
                        const isSelected = selectedEventCategory.toLowerCase() === cat.name.toLowerCase();
                        return (
                          <button
                            key={cat.name}
                            type="button"
                            onClick={() => setSelectedEventCategory(cat.name)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            <span>{cat.name}</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                                isSelected
                                  ? 'bg-purple-800/60 text-white'
                                  : count > 0
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active Selected Category Highlight Banner */}
                  {selectedEventCategory !== 'all' && (
                    <div className="bg-purple-50/90 border border-purple-200 text-purple-950 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                          <Tag className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-purple-950">
                              Category: <span className="underline decoration-purple-400">{selectedEventCategory}</span>
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-200 text-purple-900 border border-purple-300">
                              {getCategoryEventCount(selectedEventCategory)} Event{getCategoryEventCount(selectedEventCategory) === 1 ? '' : 's'}
                            </span>
                          </div>
                          <p className="text-xs text-purple-800 mt-0.5">
                            Displaying <strong>{filteredEvents.length}</strong> event{filteredEvents.length === 1 ? '' : 's'} in {selectedEventCategory} (Total catalog: {events.length} events).
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              category: selectedEventCategory,
                              imageUrl: CATEGORY_DEFINITIONS.find((c) => c.name.toLowerCase() === selectedEventCategory.toLowerCase())?.defaultImage || prev.imageUrl
                            }));
                            setShowAddEventForm(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ Add {selectedEventCategory} Event</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedEventCategory('all')}
                          className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-purple-200 transition flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5 text-slate-500" />
                          <span>Clear</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Table Content */}
                  {loadingEvents ? (
                    <Loading message="Fetching events from database..." />
                  ) : filteredEvents.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-sm space-y-3">
                      <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl mx-auto flex items-center justify-center">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">No Events Found</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          {selectedEventCategory !== 'all'
                            ? `There are currently 0 events in the "${selectedEventCategory}" category.`
                            : 'No events found matching your filter criteria.'}
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        {selectedEventCategory !== 'all' && (
                          <button
                            type="button"
                            onClick={() => setSelectedEventCategory('all')}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
                          >
                            View All Events ({events.length})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedEventCategory !== 'all') {
                              setFormData((prev) => ({
                                ...prev,
                                category: selectedEventCategory,
                                imageUrl: CATEGORY_DEFINITIONS.find((c) => c.name.toLowerCase() === selectedEventCategory.toLowerCase())?.defaultImage || prev.imageUrl
                              }));
                            }
                            setShowAddEventForm(true);
                          }}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition flex items-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>+ Add Event</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                            <th className="py-3 px-4">Event</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Venue</th>
                            <th className="py-3 px-4">Price</th>
                            <th className="py-3 px-4">Available Seats</th>
                            <th className="py-3 px-4">Rating & Reviews</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredEvents.map((ev) => (
                            <tr key={ev._id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={ev.imageUrl || CATEGORY_DEFINITIONS[0].defaultImage}
                                    alt={ev.title}
                                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                                  />
                                  <div>
                                    <span className="font-bold text-slate-900 block text-sm line-clamp-1">
                                      {ev.title}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      {formatDate(ev.startTime)}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3 px-4">
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                                  {ev.category || 'Other'}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <div className="relative inline-flex items-center">
                                  {(() => {
                                    const isTimeOver = ev.endTime ? new Date() >= new Date(ev.endTime) : false;
                                    const currentEvStatus = isTimeOver || ev.status === 'Completed' ? 'Completed' : (ev.status || 'Pending');
                                    return (
                                      <select
                                        value={currentEvStatus}
                                        onChange={(e) => handleStatusChange(ev._id, e.target.value)}
                                        disabled={updatingStatusId === ev._id}
                                        title={isTimeOver ? 'Event timing is over (Automatically marked as Completed)' : 'Change event status'}
                                        className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50 ${
                                          currentEvStatus === 'Completed'
                                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                            : currentEvStatus === 'In Progress'
                                            ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                        }`}
                                      >
                                        <option value="Pending" className="bg-white text-slate-800 font-medium">⏳ Pending</option>
                                        <option value="In Progress" className="bg-white text-slate-800 font-medium">⚡ In Progress</option>
                                        <option value="Completed" className="bg-white text-slate-800 font-medium">
                                          {isTimeOver ? '✓ Completed (Time Ended)' : '✓ Completed'}
                                        </option>
                                      </select>
                                    );
                                  })()}
                                  {updatingStatusId === ev._id && (
                                    <span className="ml-1.5 w-3 h-3 border-2 border-purple-600 border-t-transparent rounded-full animate-spin shrink-0" />
                                  )}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-slate-600 max-w-[150px] truncate">
                                {ev.venue}
                              </td>

                              <td className="py-3 px-4 font-bold text-slate-900">
                                {formatCurrency(ev.pricePerSeat)}
                              </td>

                              <td className="py-3 px-4">
                                <span className="text-slate-700 font-semibold">
                                  {ev.availableSeats ?? ev.totalSeats ?? 40} / {ev.totalSeats || 40}
                                </span>
                              </td>

                              <td className="py-3 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleViewEventReviews(ev._id)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-all group"
                                  title={`Click to view reviews for "${ev.title}"`}
                                >
                                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                                  <span>{ev.averageRating > 0 ? ev.averageRating.toFixed(1) : '0.0'}</span>
                                  <span className="text-[10px] text-amber-700 font-semibold group-hover:underline">
                                    ({ev.totalReviews || 0} reviews)
                                  </span>
                                </button>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleViewEventReviews(ev._id)}
                                    title="View customer reviews for this event"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                                  >
                                    <MessageSquare className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditModal(ev)}
                                    title="Edit event details"
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEventToDelete(ev)}
                                    title="Delete event"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: USERS MANAGER */}
        {/* =================================================================== */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  User Management ({usersList.length})
                </h2>
                <p className="text-xs text-slate-500">
                  View registered accounts, toggle administrator roles, and monitor reservation activity.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by name, email, or role..."
                  className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
                {userSearch && (
                  <button
                    onClick={() => setUserSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {loadingUsers ? (
              <Loading message="Fetching registered users..." />
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No users found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4">Confirmed Bookings</th>
                      <th className="py-3 px-4">Total Spent</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const isSelf = user?._id === u._id;
                      return (
                        <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                                {(u.name || u.email || 'U')[0].toUpperCase()}
                              </div>
                              <div>
                                <span className="block font-bold">{u.name}</span>
                                {isSelf && (
                                  <span className="text-[10px] text-purple-600 font-semibold block">
                                    (Your Account)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-medium text-slate-700">
                            {u.email}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {u.role || 'user'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500">
                            {formatDate(u.createdAt)}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-800">
                            {u.bookingsCount ?? 0}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {formatCurrency(u.totalSpent || 0)}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!isSelf && (
                                <>
                                  <button
                                    onClick={() => handleToggleUserRole(u)}
                                    title={`Toggle role to ${u.role === 'admin' ? 'user' : 'admin'}`}
                                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-slate-200 hover:bg-slate-100 text-slate-700 transition"
                                  >
                                    {u.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                                  </button>

                                  <button
                                    onClick={() => setUserToDelete(u)}
                                    title="Delete user"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

    
        {/* =================================================================== */}
        {/* TAB 4: ALL BOOKINGS MANAGER */}
        {/* =================================================================== */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  All System Reservations ({bookingsList.length})
                </h2>
                <p className="text-xs text-slate-500">
                  Comprehensive log of all seat bookings across all users.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter */}
                <select
                  value={bookingStatusFilter}
                  onChange={(e) => setBookingStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">All Statuses</option>
                  <option value="confirmed">Confirmed Only</option>
                  <option value="cancelled">Cancelled Only</option>
                </select>

                {/* Search */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bookingSearch}
                    onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search ref, user, event..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                  {bookingSearch && (
                    <button
                      onClick={() => setBookingSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {loadingBookings ? (
              <Loading message="Fetching all system bookings..." />
            ) : filteredBookings.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No bookings found matching your filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Booking Ref</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Seats</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBookings.map((b) => (
                      <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {b.bookingReference}
                        </td>

                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{b.user?.name || 'Unknown'}</span>
                          <span className="text-[11px] text-slate-400">{b.user?.email || 'N/A'}</span>
                        </td>

                        <td className="py-3 px-4 text-slate-800 font-medium max-w-[180px] truncate">
                          {b.event?.title || 'Unknown Event'}
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(b.seats || []).map((s) => (
                              <span
                                key={s._id}
                                className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] font-bold text-slate-800"
                              >
                                {s.seatNumber}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3 px-4 font-bold text-slate-900">
                          {formatCurrency(b.amount || 0)}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            b.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {b.status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {formatDate(b.createdAt)}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {b.status === 'CONFIRMED' && (
                            <button
                              onClick={() => setBookingToCancel(b)}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 transition"
                            >
                              Cancel & Release
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 5: CUSTOMER REVIEWS & FEEDBACK MANAGER */}
        {/* =================================================================== */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            {/* Header & Filter Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                    <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Event Reviews & Feedback ({filteredReviews.length})
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Manage customer feedback and ratings filtered by event, stars, or reviewer.
                </p>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Event Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 hidden sm:inline">Event:</span>
                  <select
                    value={selectedReviewEventId}
                    onChange={(e) => setSelectedReviewEventId(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 max-w-xs truncate"
                  >
                    <option value="all">🎪 All Events ({reviewsList.length} reviews)</option>
                    {events.map((ev) => {
                      const count = getEventReviewCount(ev._id);
                      return (
                        <option key={ev._id} value={ev._id}>
                          {ev.title} ({count} review{count === 1 ? '' : 's'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Rating Filter */}
                <select
                  value={reviewRatingFilter}
                  onChange={(e) => setReviewRatingFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">⭐ All Ratings</option>
                  <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                  <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                  <option value="3">⭐⭐⭐ 3 Stars</option>
                  <option value="2">⭐⭐ 2 Stars</option>
                  <option value="1">⭐ 1 Star</option>
                </select>

                {/* Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={reviewSearch}
                    onChange={(e) => setReviewSearch(e.target.value)}
                    placeholder="Search reviewer or text..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                </div>

                {(selectedReviewEventId !== 'all' || reviewRatingFilter !== 'all' || reviewSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReviewEventId('all');
                      setReviewRatingFilter('all');
                      setReviewSearch('');
                    }}
                    className="p-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                    title="Reset all filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Selected Event Context Banner (when filtering by a specific event) */}
            {selectedReviewEventId !== 'all' && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-purple-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                    <Star className="w-4 h-4 fill-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-amber-900">Filtered by Event:</span>
                      <span className="text-xs font-black text-slate-900">
                        {events.find((e) => e._id === selectedReviewEventId)?.title || 'Selected Event'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-purple-700 border border-purple-200">
                        {events.find((e) => e._id === selectedReviewEventId)?.category || 'Other'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Showing {filteredReviews.length} customer review{filteredReviews.length === 1 ? '' : 's'} for this event.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedReviewEventId('all')}
                  className="self-start sm:self-center px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-xs transition"
                >
                  View All Events ({reviewsList.length})
                </button>
              </div>
            )}

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="text-center p-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Reviews</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">{reviewsList.length}</span>
              </div>
              <div className="text-center p-2 border-l border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Average Rating</span>
                <span className="text-xl font-black text-amber-600 mt-0.5 flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>{avgPlatformRating} / 5</span>
                </span>
              </div>
              <div className="text-center p-2 border-l border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">5-Star Reviews</span>
                <span className="text-xl font-black text-emerald-600 mt-0.5 block">{fiveStarReviewsCount}</span>
              </div>
              <div className="text-center p-2 border-l border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Events with Reviews</span>
                <span className="text-xl font-black text-purple-600 mt-0.5 block">
                  {new Set(reviewsList.map((r) => String(r.eventId?._id || r.eventId))).size}
                </span>
              </div>
            </div>

            {/* Reviews List / Content */}
            {loadingReviews ? (
              <Loading message="Fetching customer reviews..." />
            ) : filteredReviews.length === 0 ? (
              <div className="py-14 text-center text-slate-500 text-sm space-y-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-12 h-12 bg-white text-slate-400 rounded-2xl mx-auto flex items-center justify-center shadow-xs border border-slate-200">
                  <Star className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">No Reviews Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {selectedReviewEventId !== 'all'
                      ? 'This event currently has no reviews submitted by customers.'
                      : 'No customer reviews match your search or filter criteria.'}
                  </p>
                </div>
                {(selectedReviewEventId !== 'all' || reviewRatingFilter !== 'all' || reviewSearch) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReviewEventId('all');
                      setReviewRatingFilter('all');
                      setReviewSearch('');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredReviews.map((rev) => {
                  const ev = rev.eventId || {};
                  const eventTitle = ev.title || 'Event Details';
                  const eventCategory = ev.category || 'General';
                  const dateStr = rev.createdAt
                    ? new Date(rev.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'Recent';

                  const initial = (rev.userName || 'U')[0].toUpperCase();

                  return (
                    <div
                      key={rev._id}
                      className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3.5 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Event Associated & Delete Button */}
                        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2.5">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                              Event
                            </span>
                            <span className="text-xs font-bold text-purple-800 line-clamp-1">
                              {eventTitle}
                            </span>
                            <span className="inline-block mt-0.5 text-[9px] font-bold px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {eventCategory}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setReviewToDelete(rev)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0"
                            title="Delete this review"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Reviewer & Star Rating */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {initial}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-xs block">
                                {rev.userName}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[160px]">
                                {rev.userEmail || 'Registered Customer'}
                              </span>
                            </div>
                          </div>

                          {/* Star Rating Badge */}
                          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-xl shrink-0">
                            <div className="flex items-center">
                              {[1, 2, 3, 4, 5].map((starIdx) => (
                                <Star
                                  key={starIdx}
                                  className={`w-3 h-3 ${
                                    starIdx <= rev.rating
                                      ? 'fill-amber-400 text-amber-400'
                                      : 'fill-slate-200 text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[11px] font-black text-amber-800 ml-1">
                              {rev.rating}.0
                            </span>
                          </div>
                        </div>

                        {/* Review Comment Text */}
                        <p className="text-xs text-slate-800 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                          {rev.comment}
                        </p>
                      </div>

                      {/* Footer: Date */}
                      <div className="text-[10px] font-medium text-slate-400 pt-1 border-t border-slate-50 flex items-center justify-between">
                        <span>Submitted: {dateStr}</span>
                        <span className="text-emerald-700 font-semibold">Verified Review</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-xl">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Event Details</h3>
                  <p className="text-xs text-slate-500">Update event details, category, pricing, venue, and cover photo.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editFormError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-semibold">{editFormError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium"
                  required
                />
              </div>

              {/* Category Pills in Edit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Category: <span className="text-purple-600 font-bold">{editFormData.category}</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {CATEGORY_DEFINITIONS.map((cat) => {
                    const isSelected = editFormData.category.toLowerCase() === cat.name.toLowerCase();
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => {
                          const newCat = cat.name;
                          const timing = getCategoryTiming(newCat);
                          setEditFormData((prev) => ({
                            ...prev,
                            category: newCat,
                            startTime: formatDateTimeValue(prev.startTime, timing.start),
                            endTime: formatDateTimeValue(prev.endTime || prev.startTime, timing.end)
                          }));
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Event Status Selector in Edit */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Event Status: <span className="text-purple-600 font-bold">{editFormData.status || 'Pending'}</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'Pending', label: '⏳ Pending', activeStyle: 'bg-amber-100 text-amber-900 border-amber-400 ring-2 ring-amber-400' },
                    { val: 'In Progress', label: '⚡ In Progress', activeStyle: 'bg-blue-100 text-blue-900 border-blue-400 ring-2 ring-blue-400' },
                    { val: 'Completed', label: '✓ Completed', activeStyle: 'bg-emerald-100 text-emerald-900 border-emerald-400 ring-2 ring-emerald-400' }
                  ].map((st) => (
                    <button
                      key={st.val}
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, status: st.val })}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition text-center ${
                        editFormData.status === st.val
                          ? st.activeStyle
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Venue and Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Venue Location *
                  </label>
                  <input
                    type="text"
                    value={editFormData.venue}
                    onChange={(e) => setEditFormData({ ...editFormData, venue: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Price Per Seat (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={editFormData.pricePerSeat}
                    onChange={(e) => setEditFormData({ ...editFormData, pricePerSeat: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Group Booking & Discount Configuration in Edit Modal */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50/80 to-emerald-50/80 rounded-2xl border border-amber-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                      Group Booking Discount (Min 10 People)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isGroupBookingEnabled}
                      onChange={(e) => setEditFormData({ ...editFormData, isGroupBookingEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {editFormData.isGroupBookingEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Min People for Discount
                      </label>
                      <input
                        type="number"
                        min="2"
                        max="30"
                        value={editFormData.groupMinSeats}
                        onChange={(e) => setEditFormData({ ...editFormData, groupMinSeats: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Group Discount (% OFF)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editFormData.groupDiscountPercentage}
                        onChange={(e) => setEditFormData({ ...editFormData, groupDiscountPercentage: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-emerald-700 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Couple Ticket Configuration in Edit Modal */}
              <div className="p-4 bg-gradient-to-r from-rose-50/70 to-pink-50/70 rounded-2xl border border-rose-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                    <span className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                      Couple Ticket Option (1 Boy + 1 Girl Mandatory)
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isCoupleTicketEnabled}
                      onChange={(e) => setEditFormData({ ...editFormData, isCoupleTicketEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                {editFormData.isCoupleTicketEnabled && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Couple Ticket Discount (% OFF)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editFormData.coupleDiscountPercentage}
                        onChange={(e) => setEditFormData({ ...editFormData, coupleDiscountPercentage: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-rose-700 bg-white"
                      />
                    </div>
                    <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
                      ⚠️ Strict Policy: Customers must arrive with a female companion. If no girl is present at the gate, admission is denied without refund.
                    </p>
                  </div>
                )}
              </div>

              {/* Category Default Timings Banner in Edit Modal */}
              <div className="p-3 bg-purple-50/80 rounded-2xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-purple-900 block">
                      Default Timing for {editFormData.category}:
                    </span>
                    <span className="text-purple-700 font-medium text-[11px]">
                      {getCategoryTiming(editFormData.category).label} (Auto-suggested)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleApplyDefaultTimingToEdit}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 self-start sm:self-center"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Apply Default Timing</span>
                </button>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Start Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.startTime}
                    onChange={(e) => setEditFormData({ ...editFormData, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    End Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={editFormData.endTime}
                    onChange={(e) => setEditFormData({ ...editFormData, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                    required
                  />
                </div>
              </div>

              {/* Cover Photo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Cover Photo
                  </label>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setEditPhotoSourceMode('gallery')}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        editPhotoSourceMode === 'gallery' ? 'bg-purple-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Gallery
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditPhotoSourceMode('url')}
                      className={`px-2 py-0.5 rounded-md font-bold transition ${
                        editPhotoSourceMode === 'url' ? 'bg-purple-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      URL
                    </button>
                  </div>
                </div>

                {editPhotoSourceMode === 'gallery' ? (
                  <div>
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/*"
                      onChange={handleEditGalleryUpload}
                      className="hidden"
                    />
                    <div
                      onClick={() => editFileInputRef.current?.click()}
                      className="p-3 border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl flex items-center justify-between gap-3 cursor-pointer bg-purple-50/40"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={editFormData.imageUrl || CATEGORY_DEFINITIONS[0].defaultImage}
                          alt="Cover"
                          className="w-12 h-12 rounded-lg object-cover border border-purple-200"
                        />
                        <div className="text-left text-xs">
                          <span className="font-bold text-slate-800 block">
                            {uploadingEditPhoto ? 'Uploading photo...' : 'Click to choose new photo from gallery'}
                          </span>
                          <span className="text-[11px] text-slate-400">JPG, PNG, WEBP</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-bold">
                        Browse
                      </span>
                    </div>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={editFormData.imageUrl}
                    onChange={(e) => setEditFormData({ ...editFormData, imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description *
                </label>
                <textarea
                  rows="3"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                  required
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm shadow-md shadow-purple-600/30 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Are you sure you want to logout?"
        message="You will be logged out of the admin panel."
        confirmText="Yes, Logout"
        cancelText="Cancel"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          logout();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        title="Delete Event & Seats"
        message={`Are you sure you want to permanently delete "${eventToDelete?.title}"? All associated seats (${eventToDelete?.totalSeats || 40}) and reservation history will be removed from MongoDB.`}
        confirmText={actionProcessing ? 'Deleting...' : 'Delete Event'}
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDeleteEvent}
        onCancel={() => setEventToDelete(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(userToDelete)}
        title="Delete User Account"
        message={`Are you sure you want to delete user account "${userToDelete?.email}"? This action cannot be undone.`}
        confirmText={actionProcessing ? 'Deleting...' : 'Delete User'}
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDeleteUser}
        onCancel={() => setUserToDelete(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(bookingToCancel)}
        title="Cancel Booking & Release Seats"
        message={`Are you sure you want to cancel booking "${bookingToCancel?.bookingReference}" for customer "${bookingToCancel?.user?.name}"? All booked seats will immediately be released back to AVAILABLE status.`}
        confirmText={actionProcessing ? 'Cancelling...' : 'Cancel Reservation'}
        cancelText="Back"
        isDestructive={true}
        onConfirm={handleConfirmCancelBooking}
        onCancel={() => setBookingToCancel(null)}
      />

      <ConfirmDialog
        isOpen={Boolean(reviewToDelete)}
        title="Delete Customer Review"
        message={`Are you sure you want to permanently delete the review from "${reviewToDelete?.userName}" (${reviewToDelete?.rating} Stars)? Associated event rating statistics will be automatically updated.`}
        confirmText={actionProcessing ? 'Deleting...' : 'Delete Review'}
        cancelText="Cancel"
        isDestructive={true}
        onConfirm={handleConfirmDeleteReview}
        onCancel={() => setReviewToDelete(null)}
      />
    </div>
  );
};

export default AdminDashboard;
