# Memogram Backend

REST API + WebSocket server for the Memogram school memories social platform.

## Tech Stack

- **Runtime**: Node.js + Express
- **Database**: PostgreSQL (Sequelize ORM)
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Storage**: Cloudinary (images, video, voice messages)
- **Auth**: JWT (HTTP-only cookies + Bearer tokens)

## Setup

```bash
npm install
cp .env.example .env   # fill in your values
npm run db:migrate
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | Token expiry (default: 30d) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `FRONTEND_URL` | Frontend origin for CORS |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon |
| `npm start` | Production start |
| `npm run db:migrate` | Run Sequelize migrations |

## Project Structure

```
src/
├── config/          # Database, Redis, Cloudinary setup
├── controllers/     # Route handlers
├── middlewares/      # Auth, upload, rate-limiting, validation
├── models/          # Sequelize models
├── routes/          # Express routes
├── services/        # Redis, achievements, badges
├── socket/          # Socket.IO event handlers
├── utils/           # Response helpers, pagination
└── validations/     # Joi validation schemas
```

## API Routes

- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Current user
- `GET /api/posts/feed` — Home feed
- `POST /api/posts` — Create post
- `GET /api/chat/conversations` — List conversations
- `POST /api/chat/upload` — Upload media (image/video/audio)
- `GET /api/users/search` — Search users
- `POST /api/communities` — Create community
- ...and 50+ more endpoints

## Deploy to Render

1. Push this repo to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
3. Connect your GitHub repo and select this `backend/` directory
4. Render reads `render.yaml` and creates:
   - **Web Service** (Node.js)
   - **PostgreSQL** database (free tier)
   - **Redis** instance (free tier)
5. Set the remaining env vars in the Render dashboard:
   - `FRONTEND_URL` → your frontend Render URL (e.g. `https://memogram-frontend.onrender.com`)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
6. Deploy — Render runs `npm install` then `node src/index.js`

Your backend URL will be something like `https://memogram-backend.onrender.com`
