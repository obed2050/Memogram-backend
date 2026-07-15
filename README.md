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
