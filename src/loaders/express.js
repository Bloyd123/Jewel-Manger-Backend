import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import requestLogger from '../api/middlewares/requestLogger.js';
import errorLogger from '../api/middlewares/errorLogger.js';
import { notFound } from '../api/middlewares/errorHandler.js';
import errorHandler from '../api/middlewares/errorHandler.js';
import authRoutes from '../api/auth/auth.routes.js';
import logger from '../utils/logger.js';

/**
 * Express App Configuration Loader
 */
const loadExpressApp = app => {
  // Trust proxy (for production behind reverse proxy)
  app.set('trust proxy', 1);

  // =====================================
  // SECURITY MIDDLEWARES
  // =====================================

  // Helmet - Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  const corsOptions = {
    origin: function (origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
  app.use(cors(corsOptions));

  // Prevent MongoDB injection attacks
// Simple protection from MongoDB injection
app.use((req, res, next) => {
  const clean = obj => {
    if (!obj) return;
    for (let key in obj) {
      if (key.startsWith('$') || key.includes('.')) {
        delete obj[key];
      }
    }
  };

  clean(req.body);
  clean(req.query);
  clean(req.params);

  next();
});


  // Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  // =====================================
  // REQUEST PARSING MIDDLEWARES
  // =====================================

  // Body parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression
  app.use(compression());

  // =====================================
  // LOGGING MIDDLEWARES
  // =====================================

  // Morgan - HTTP request logger (development)
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  // Custom request logger
  app.use(requestLogger);

  // =====================================
  // HEALTH CHECK ROUTE
  // =====================================
  app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Jewelry ERP API',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});


  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
    });
  });

  // API Info Route
  app.get('/api', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Jewelry ERP API',
      version: '1.0.0',
      docs: '/api/docs',
    });
  });

  // =====================================
  // API ROUTES (will be added later)
  // =====================================

  // Import and use routes here
  app.use('/api/v1/auth', authRoutes);
  // app.use('/api/v1/users', userRoutes);
  // app.use('/api/v1/shops', shopRoutes);
  // ... more routes

  // =====================================
  // ERROR HANDLING
  // =====================================

  // 404 Handler
  app.use(notFound);

  // Error Logger
  app.use(errorLogger);

  // Global Error Handler
  app.use(errorHandler);

  logger.info('✅ Express app configured successfully');
};

export default loadExpressApp;