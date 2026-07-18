require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { createServer } = require('http');

const { initializeSocket } = require('./socket');
const { sequelize } = require('./models');
const { redis } = require('./config/redis');
const routes = require('./routes');
const { errorHandler, notFound } = require('./middlewares/errorHandler');

const app = express();
const httpServer = createServer(app);

// Socket.IO
const io = initializeSocket(httpServer);
app.set('io', io);

const allowedOrigins = [
  'https://memogram-frontend.onrender.com',
  'http://localhost:5173',
].filter(Boolean);

if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

// ======================
// Middleware
// ======================

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
  })
);

app.use(morgan('dev'));

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, origin);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api', routes);

// Health Check
app.get('/api/health', async (req, res) => {
  const redisStatus = redis.isOpen ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redisStatus,
  });
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// ======================
// Start Server
// ======================

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    await sequelize.sync({
      alter: process.env.NODE_ENV === 'development',
    });

    console.log('✅ Models synchronized.');

    try {
      await redis.connect();
      console.log('✅ Redis connected.');
    } catch (err) {
      if (err.message.includes('ECONNREFUSED')) {
        console.warn('⚠️ Redis not available — running without cache');
      } else {
        console.warn('⚠️ Redis connection failed:', err.message);
      }
    }

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// ======================
// Graceful Shutdown
// ======================

const shutdown = async () => {
  console.log('\n🛑 Shutting down...');

  try {
    if (redis.isOpen) {
      await redis.quit();
      console.log('✅ Redis disconnected.');
    }
  } catch (err) {
    console.error(err);
  }

  try {
    await sequelize.close();
    console.log('✅ Database disconnected.');
  } catch (err) {
    console.error(err);
  }

  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();