require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
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
// CORS (manual — cors package produces '*' on Express 5 with credentials)
// ======================

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
// Debug: Print all registered routes
// ======================

function printAllRegisteredRoutes(app) {
  console.log('\n========================================');
  console.log('   REGISTERED EXPRESS ROUTES');
  console.log('========================================');

  const output = [];

  function walkStack(stack, prefix) {
    stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
        output.push(`  ${methods.padEnd(8)} ${prefix}${layer.route.path}`);
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        const reStr = layer.regexp.toString();
        let mountPath = prefix;
        const match = reStr.match(/\/\^\\?\/(.*?)\\?\//);
        if (match) {
          mountPath = prefix + '/' + match[1].replace(/\\\//g, '/');
        }
        walkStack(layer.handle.stack, mountPath);
      }
    });
  }

  if (app._router && app._router.stack) {
    walkStack(app._router.stack, '');
  }

  output.forEach((r) => console.log(r));
  console.log('========================================\n');
}

// Debug endpoint - returns all registered routes as JSON
app.get('/api/debug/routes', (req, res) => {
  const routes = [];

  function walkStack(stack, prefix) {
    stack.forEach((layer) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        methods.forEach((m) => {
          routes.push({ method: m.toUpperCase(), path: prefix + layer.route.path });
        });
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        const reStr = layer.regexp.toString();
        let mountPath = prefix;
        const match = reStr.match(/\/\^\\?\/(.*?)\\?\//);
        if (match) {
          mountPath = prefix + '/' + match[1].replace(/\\\//g, '/');
        }
        walkStack(layer.handle.stack, mountPath);
      }
    });
  }

  if (app._router && app._router.stack) {
    walkStack(app._router.stack, '');
  }

  res.json({ totalRoutes: routes.length, routes });
});

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
      printAllRegisteredRoutes(app);
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