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
import shopRoutes from '../api/shops/shop.routes.js';
import logger from '../utils/logger.js';
import customerRoutes from '../api/customer/customer.routes.js';
import supplierRoutes from '../api/supplier/supplier.routes.js';
import purchaseRoutes from '../api/purchase/purchase.routes.js';
import productRoutes from '../api/products/product.routes.js';
import categoryRoutes from '../api/category/category.routes.js';
import paymentRoutes from '../api/payment/payment.routes.js';
import metalRoutes from '../api/metal-rates/metalRate.routes.js'
import salesRoutes from '../api/sales/sales.routes.js'
import orgRoutes from '../api/organization/organization.routes.js';
import schemeRouter from '../api/scheme/scheme.routes.js';
const loadExpressApp = app => {
  app.set('trust proxy', 1);


  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  const corsOptions = {
    origin(origin, callback) {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://192.168.1.36:3000',
        'http://192.168.1.43:3000',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log('Allowed Origins:', allowedOrigins);
        console.log('Incoming Origin:', origin);

        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
  app.use(cors(corsOptions));
  app.use((req, res, next) => {
    const clean = obj => {
      if (!obj) return;
      for (const key in obj) {
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

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', limiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(compression());

  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }
  app.use(requestLogger);

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to Jewelry ERP API',
      endpoints: {
        health: '/health',
        api: '/api',
      },
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
  app.get('/api', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Jewelry ERP API',
      version: '1.0.0',
      docs: '/api/docs',
    });
  });
  app.use('/api/v1' ,metalRoutes)
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/shops', paymentRoutes);
  app.use('/api/v1/shops', shopRoutes);
  app.use('api/v1/shops', schemeRouter); 
  app.use('/api/v1/shops/:shopId/customers', customerRoutes);
  app.use('/api/v1/suppliers', supplierRoutes);
  app.use('/api/v1/shops/:shopId/purchases', purchaseRoutes);
  app.use('/api/v1/shops/:shopId/product', productRoutes);
  app.use('/api/v1/shops/:shopId/sales', salesRoutes); 
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/organizations', orgRoutes);

  app.use(notFound);
  app.use(errorLogger);

  app.use(errorHandler);

  logger.info('  Express app configured successfully');
};

export default loadExpressApp;
