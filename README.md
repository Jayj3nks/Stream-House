# CreatorSquad - Creator Support & Collab Platform

A comprehensive platform helping creators organize into squads, boost each other's posts, maintain accountability, and find collaboration opportunities.

## 🚀 Features

### Core Features Implemented (MVP)
- **Authentication System** - Simple email/password signup and login
- **Squad Management** - Create and join creator squads
- **Post Sharing** - Share content URLs with automatic metadata fetching
- **Engagement Tracking** - Like, comment, and share tracking with credit rewards
- **Credits System** - Earn credits for supporting squad members
- **Real-time Updates** - Live engagement tracking and notifications
- **Accountability Dashboard** - Track daily goals and engagement progress

### Platform Support
- **TikTok** - Automatic platform detection and metadata extraction
- **YouTube** - Video metadata and thumbnail fetching
- **Instagram** - Post recognition and metadata
- **Twitch** - Stream and clip support
- **Twitter/X** - Tweet metadata extraction
- **Generic URLs** - Fallback for other platforms

## 🎯 The "Aha Moment"

CreatorSquad solves the core problem of **creator isolation** by providing:
1. **Mutual Support System** - Squad members boost each other's content
2. **Accountability Tracking** - Never miss supporting your teammates
3. **Credit Rewards** - Gamified engagement system (👍=1, 💬=2, 🔄=3 credits)
4. **Progress Visualization** - See team engagement progress in real-time

## 🛠 Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Node.js
- **Database**: MongoDB with connection pooling
- **Authentication**: JWT tokens with bcrypt password hashing
- **UI Components**: Radix UI primitives with shadcn/ui
- **Styling**: Tailwind CSS with custom design system

## 📦 Installation & Setup

1. **Install dependencies**:
```bash
yarn install
```

2. **Environment variables** (already configured):
```bash
MONGO_URL=mongodb://localhost:27017
DB_NAME=creator_squad
NEXT_PUBLIC_BASE_URL=https://contentcrew.preview.emergentagent.com
```

3. **Run the development server**:
```bash
yarn dev
```

4. **Access the application**:
   - Local: http://localhost:3000
   - Production: https://contentcrew.preview.emergentagent.com

## 🎮 How to Use

### 1. Sign Up & Create Squad
- Create account with email/password
- Set display name for your creator profile
- Create your first squad (e.g., "Fitness Creators", "Gaming Squad")

### 2. Share Your Content
- Click "Share Your Content" button
- Paste URL from TikTok, YouTube, Instagram, etc.
- App automatically fetches title, thumbnail, and detects platform

### 3. Support Squad Members
- View posts from squad members in the main feed
- Click 👍 (1 credit), 💬 (2 credits), or 🔄 (3 credits) to engage
- Watch progress bars fill as team supports each post

### 4. Track Progress
- Monitor your credit balance in the sidebar
- Check daily engagement goals (5 engagements/day)
- View squad statistics and team performance

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

## 🌟 Key Value Propositions

1. **Solve Creator Isolation** - Build supportive communities
2. **Increase Engagement** - Systematic support from squad members  
3. **Accountability System** - Never let teammates down
4. **Gamified Experience** - Credits and progress tracking
5. **Platform Agnostic** - Works with all major social platforms
6. **Easy to Use** - Simple URL sharing, no complex setup

## 📞 Support & Documentation

For questions, feature requests, or bug reports:
- Create an issue in the repository
- Check the API documentation in the code comments
- Review the comprehensive test suite for usage examples

## 📄 License

MIT License - feel free to use this code for your own creator platform projects!

---

**CreatorSquad** - *Empowering creators through community support and collaboration* 🚀