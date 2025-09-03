# Stream-House 🏠 - Creator Collaboration Platform

A modern Next.js platform helping streamers and content creators organize into houses, collaborate on content, and find roommates for shared streaming spaces.

## 🚀 Features

### Core Features
- **Dashboard-First Experience** - Post-login landing with house management
- **Message Board** - Real-time communication within houses
- **Profile Management** - Comprehensive creator profiles with validation
- **Find Roommates** - Advanced filtering system for finding collaborators
- **Authentication** - Persistent session management with HttpOnly cookies
- **House Management** - Create and manage streaming houses

### Latest Updates (v2.0)
- ✅ **Persistent Authentication** - No more logout on browser back/refresh
- ✅ **Profile Validation** - Requires at least one field before completion
- ✅ **Dashboard Landing** - Clean post-login experience with message board
- ✅ **Enhanced Find Roommates** - Location, budget, and interests filtering
- ✅ **Mobile Responsive** - Works perfectly on all devices

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes with catch-all routing
- **Database**: MongoDB with in-memory repositories
- **Authentication**: JWT tokens with HttpOnly cookies
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with responsive design

## 📦 Local Development Setup

### Prerequisites
- Node.js 18+ 
- MongoDB (local or cloud)
- Yarn package manager

### Quick Start
1. **Clone and install dependencies**:
```bash
git clone <your-repo>
cd stream-house
yarn install
```

2. **Environment setup**:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```bash
# Required
MONGO_URL=mongodb://localhost:27017
DB_NAME=streamer_house
JWT_SECRET=your-super-secret-jwt-key-here
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Optional - customize as needed
CSQ_TIMEZONE=America/New_York
CSQ_ENGAGE_DEDUP_HOURS=24
```

3. **Start development server**:
```bash
yarn dev
```

4. **Access the application**:
   - Open [http://localhost:3000](http://localhost:3000)
   - Create an account or sign in
   - You'll be redirected to the dashboard

## 🚀 Vercel Deployment

### Deploy to Vercel

1. **Connect your repository** to Vercel
2. **Add environment variables** in Vercel dashboard:
   ```
   MONGO_URL=your-mongodb-atlas-url
   DB_NAME=streamer_house_prod
   JWT_SECRET=your-production-jwt-secret
   NEXT_PUBLIC_BASE_URL=https://your-app.vercel.app
   ```

3. **MongoDB Atlas Setup** (recommended):
   - Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Get your connection string
   - Add your Vercel IP to the allowlist (or use 0.0.0.0/0 for development)

4. **Deploy** - Vercel will automatically deploy on push to main branch

## 🎮 How to Use

### 1. Sign Up & Complete Profile
- Create account with email/password and enhanced profile fields
- Add platforms, niches, games, location, and streaming schedule
- **Must fill at least one profile field** to complete setup

### 2. Dashboard Experience
- After login, land directly on your **Dashboard**
- View your houses in the sidebar
- Access the **Message Board** for active house communication

### 3. House Management
- Create your first house (streaming/content house)
- Invite other creators to join
- Use the message board to coordinate and communicate

### 4. Find Roommates
- Navigate to "Find Roommates" from dashboard
- Filter by **location**, **budget range**, and **interests**
- Message potential roommates or send house invitations

### 5. Profile & Settings
- Update your profile information anytime
- Toggle roommate search visibility
- Manage account settings and preferences

## 🏗 Architecture

### Database Schema
```javascript
// Users Collection
{
  id: "uuid",
  email: "user@example.com",
  displayName: "Creator Name",
  password: "hashed_password",
  credits: 0,
  createdAt: Date
}

// Squads Collection  
{
  id: "uuid",
  name: "Squad Name",
  ownerId: "user_uuid",
  members: ["user_uuid_1", "user_uuid_2"],
  memberCount: 2,
  visibility: "private"
}

// Posts Collection
{
  id: "uuid", 
  url: "https://tiktok.com/@user/video/123",
  title: "My Amazing Video",
  platform: "TikTok",
  thumbnail: "https://...",
  squadId: "squad_uuid",
  userId: "user_uuid",
  authorName: "Creator Name"
}

// Engagements Collection
{
  id: "uuid",
  postId: "post_uuid", 
  userId: "user_uuid",
  type: "like|comment|share",
  createdAt: Date
}
```

### API Endpoints
```
Authentication:
POST /api/auth/signup     - Create new user account
POST /api/auth/login      - Login existing user  
GET  /api/auth/me         - Get current user info

Squad Management:
POST /api/squads                    - Create new squad
GET  /api/squads/user/{userId}      - Get user's squad

Content Sharing:
POST /api/posts                     - Share new post
GET  /api/posts/squad/{squadId}     - Get squad's posts

Engagement System:
POST /api/engagements               - Record engagement
GET  /api/credits/{userId}          - Get user credits
```

## 🧪 Testing

### Backend API Testing
All endpoints are thoroughly tested:
- ✅ User signup/login with JWT authentication
- ✅ Squad creation and member management
- ✅ Post sharing with URL metadata fetching
- ✅ Engagement tracking with credit calculation
- ✅ Error handling and validation

### Frontend Testing
Complete user journey tested:
- ✅ Account creation and authentication
- ✅ Squad creation workflow
- ✅ Post sharing functionality
- ✅ Engagement interaction system
- ✅ Real-time updates and notifications

## 🚧 Future Enhancements (V2 Roadmap)

### Advanced Features
- **Collab Matching Algorithm** - AI-powered creator matching
- **Challenge System** - Squad challenges and competitions  
- **Streak Tracking** - Post and engagement streaks
- **OBS/TikTok Overlay** - Live streaming widgets
- **Payment Integration** - Pro plans with Stripe
- **Admin CMS** - Platform management dashboard

### Platform Integrations
- **Deep Link Support** - Direct app opening
- **API Integrations** - Platform-specific APIs for verification
- **Notification System** - Email and push notifications
- **Calendar Integration** - Collab scheduling

### Social Features
- **Public Squad Directory** - Discoverable communities
- **Member Profiles** - Extended creator profiles
- **Achievement System** - Badges and rewards
- **Leaderboards** - Top supporters and creators

## 🔒 Security & Performance

### Security Features
- JWT token authentication with secure secrets
- Password hashing with bcrypt (10 rounds)
- Input validation and sanitization
- CORS configuration for secure API access
- Rate limiting ready for production

### Performance Optimizations
- MongoDB connection pooling
- Efficient database queries with indexes
- Optimistic UI updates for real-time feel
- Image optimization for thumbnails
- Lazy loading for content feeds

## 📱 Mobile Responsive

The entire application is fully responsive and works perfectly on:
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Mobile devices (iOS Safari, Chrome Mobile)
- Tablet devices with touch-friendly interfaces

## 🌟 Key Features & Benefits

### 🔐 Persistent Authentication
- **HttpOnly cookie** sessions prevent logout on browser back/refresh
- **Middleware protection** for authenticated routes
- **Seamless experience** across all pages

### 🏠 Dashboard-First Design
- **Post-login landing** on dashboard instead of create house
- **Message board** for real-time house communication
- **House management** from centralized location

### 👥 Enhanced Roommate Finder
- **Location-based filtering** for local collaborations
- **Budget range filters** for compatible living situations
- **Interest matching** for like-minded creators
- **Clean, usable interface** with structured results

### ✅ Profile Validation
- **Required fields** ensure complete profiles
- **At least one field** must be filled to complete setup
- **Better matching** through comprehensive profiles

## 🛡️ Security & Performance

- **HttpOnly cookies** for secure authentication
- **JWT token validation** with proper middleware
- **Input validation** and sanitization
- **MongoDB integration** with proper connection handling
- **Responsive design** optimized for all devices

## 📞 Support & Documentation

For questions, feature requests, or bug reports:
- Check the comprehensive setup instructions above
- Review the API endpoints in the code
- Test locally with the provided development setup

## 📄 License

MIT License - free to use for your streaming/creator platform projects!

---

**Stream-House** - *Building the future of creator collaboration* 🏠✨