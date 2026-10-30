const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const eventRoutes = require('./routes/eventRoutes');
const holdRoutes = require('./routes/holdRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

// Parse and normalize allowed frontend origins (supporting comma-separated list and trailing slash removal)
const parseAllowedOrigins = () => {
  const envOrigins = [process.env.FRONTEND_URL, process.env.CLIENT_URL]
    .filter(Boolean)
    .flatMap((val) => val.split(','))
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const localDefaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://localhost:4173'
  ];

  return Array.from(new Set([...envOrigins, ...localDefaults]));
};

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, postman, health checks)
      if (!origin) {
        return callback(null, true);
      }

      const cleanOrigin = origin.trim().replace(/\/+$/, '');
      const lowerOrigin = cleanOrigin.toLowerCase();
      const allowedList = parseAllowedOrigins().map((o) => o.toLowerCase());

      // Check explicit allowed origin list or if development mode
      if (allowedList.includes(lowerOrigin) || process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // Automatically allow all Vercel domains (production, custom preview deployments, and branches)
      if (lowerOrigin.endsWith('.vercel.app') || lowerOrigin.includes('.vercel.app')) {
        return callback(null, true);
      }

      // Also allow onrender.com domains
      if (lowerOrigin.endsWith('.onrender.com')) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for unauthorized origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Event Seat Booking Backend'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/holds', holdRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/system-console-r6t8', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/tickets', ticketRoutes);

// 404 Handler
app.use(notFoundHandler);

// Centralized Error Handling
app.use(errorHandler);

module.exports = app;
