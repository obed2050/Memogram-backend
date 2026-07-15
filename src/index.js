require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
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

// Middleware
app.use(helmet());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api', routes);

// Health check
app.get('/api/health', async (req, res) => {
  const redisStatus = redis.status === 'ready' ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: redisStatus,
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected.');
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('Models synchronized.');

    try {
      await redis.connect();
      console.log('Redis connected.');
    } catch (err) {
      if (err.message.includes('ECONNREFUSED')) {
        console.warn('Redis not available — running without cache');
      } else {
        console.warn('Redis connection failed:', err.message);
      }
    }

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('\nShutting down...');
  try {
    if (redis.status === 'ready') {
      await redis.quit();
      console.log('Redis disconnected.');
    }
  } catch {}
  try {
    await sequelize.close();
    console.log('Database disconnected.');
  } catch {}
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
