# TurfConnect Backend API

**Connecting Players. Filling Turfs. Making Sports Happen.**

TurfConnect is a hyperlocal multi-sport matchmaking and turf booking platform for Indian urban cities.

## 🚀 Features

### For Players
- Real-time turf booking
- Matchmaking system (host & join matches)
- Player profiles & verification
- Wallet & secure payments
- Booking history
- Match notifications

### For Turf Owners
- Dashboard for managing turfs
- Slot management system
- Booking analytics
- Revenue tracking
- Automated notifications

### For Admins
- User & turf verification
- Platform analytics
- Support ticket management
- Transaction monitoring

## 🛠️ Tech Stack

- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** JWT (Access + Refresh tokens)
- **Caching:** Redis (optional)
- **Payment:** Razorpay integration
- **File Storage:** AWS S3

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Setup

1. Clone the repository
```bash
git clone https://github.com/hitarthdoshi47-rgb/turfconnect-backend.git
cd turfconnect-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up database
```bash
# Run Prisma migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# (Optional) Seed database
npx prisma db seed
```

5. Start development server
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## 🔧 Environment Variables

See `.env.example` for all required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for access tokens
- `JWT_REFRESH_SECRET` - Secret for refresh tokens
- `RAZORPAY_KEY_ID` - Razorpay API key
- `RAZORPAY_KEY_SECRET` - Razorpay secret
- `AWS_ACCESS_KEY_ID` - AWS S3 access key
- `AWS_SECRET_ACCESS_KEY` - AWS S3 secret
- And more...

## 📚 API Documentation

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login with phone/password
- `POST /api/v1/auth/send-otp` - Send OTP for verification
- `POST /api/v1/auth/verify-otp` - Verify OTP
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Turfs
- `GET /api/v1/turfs` - List all turfs (with filters)
- `GET /api/v1/turfs/:id` - Get turf details
- `POST /api/v1/turfs` - Create turf (owner only)
- `PUT /api/v1/turfs/:id` - Update turf
- `DELETE /api/v1/turfs/:id` - Delete turf
- `GET /api/v1/turfs/:id/slots` - Get available slots
- `POST /api/v1/turfs/:id/slots` - Create slot

### Bookings
- `POST /api/v1/bookings` - Create booking
- `GET /api/v1/bookings` - List user bookings
- `GET /api/v1/bookings/:id` - Get booking details
- `PUT /api/v1/bookings/:id/cancel` - Cancel booking

### Matches (Matchmaking)
- `POST /api/v1/matches` - Create match (host)
- `GET /api/v1/matches` - List available matches
- `GET /api/v1/matches/:id` - Get match details
- `POST /api/v1/matches/:id/join` - Join match
- `DELETE /api/v1/matches/:id/leave` - Leave match
- `PUT /api/v1/matches/:id/cancel` - Cancel match

## 🗄️ Database Schema

The database includes the following main tables:
- `users` - User accounts
- `sports` - Available sports
- `turfs` - Turf venues
- `turf_slots` - Available time slots
- `bookings` - Turf bookings
- `matches` - Matchmaking sessions
- `match_participants` - Match participants
- `transactions` - Payment transactions
- `reviews` - Turf reviews
- `leaderboards` - Player rankings
- `notifications` - User notifications

See `prisma/schema.prisma` for complete schema.

## 🚀 Deployment

### Railway (Recommended for MVP)

1. Install Railway CLI
```bash
npm install -g @railway/cli
```

2. Login and deploy
```bash
railway login
railway init
railway up
```

3. Add PostgreSQL database
```bash
railway add postgresql
```

4. Set environment variables in Railway dashboard

### Docker (Alternative)

```bash
# Build image
docker build -t turfconnect-backend .

# Run container
docker run -p 5000:5000 --env-file .env turfconnect-backend
```

## 📝 Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio

## 🧪 Testing

```bash
# Run tests (to be implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## 📄 License

MIT License - see LICENSE file for details

## 👥 Team

Built with ❤️ by the TurfConnect team

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

## 📞 Support

For support, email support@turfconnect.in or join our Slack channel.

---

**TurfConnect** - Making sports accessible for everyone! 🏏⚽🏸