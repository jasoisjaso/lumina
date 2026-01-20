# HomeGlow Chores Widget - Implementation Spec

## Overview

The Chores Widget is a gamified task management system designed to encourage family participation in household responsibilities. It combines visual appeal, simple interactions, and positive reinforcement.

## Core Mechanics (Based on User Description)

### 1. **User Assignment**
- Each chore is assigned to a specific family member
- Color-coded by user (matching their calendar color)
- Visual indicators show who's responsible
- Multiple users can be assigned to collaborative tasks

### 2. **Swipe-to-Complete Interaction**
- Primary interaction: Swipe right to mark complete
- Swipe left to skip/postpone (optional)
- Tap to see details/edit
- Visual feedback: Satisfying animation on completion
- Haptic feedback on mobile devices

### 3. **Reward System**
- Points awarded for completing chores
- Streak bonuses for consecutive days
- Family leaderboard (optional, toggleable)
- Achievement badges (e.g., "7-day streak," "100 tasks")
- Visual celebrations (confetti, animations)

## Lumina-Specific Implementation

### Database Schema

```sql
-- Chores table
CREATE TABLE chores (
  id INTEGER PRIMARY KEY,
  family_id INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_to INTEGER, -- user_id
  frequency VARCHAR(50), -- 'daily', 'weekly', 'custom'
  frequency_data JSON, -- { days: ['mon', 'wed'], time: '09:00' }
  points INTEGER DEFAULT 10,
  icon VARCHAR(50), -- 'trash', 'dishes', 'laundry', etc.
  color VARCHAR(7), -- hex color
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  FOREIGN KEY (family_id) REFERENCES families(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Chore completions
CREATE TABLE chore_completions (
  id INTEGER PRIMARY KEY,
  chore_id INTEGER NOT NULL,
  completed_by INTEGER NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  points_awarded INTEGER,
  notes TEXT,
  FOREIGN KEY (chore_id) REFERENCES chores(id),
  FOREIGN KEY (completed_by) REFERENCES users(id)
);

-- User stats
CREATE TABLE user_chore_stats (
  user_id INTEGER PRIMARY KEY,
  total_points INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_completion_date DATE,
  badges JSON, -- ['streak_7', 'tasks_100', etc.]
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### UI Components

#### 1. **ChoresWidget.tsx** - Main Widget
- Displays today's chores in a card grid
- Shows assigned user with avatar/color
- Swipe gesture handlers
- Real-time updates when completed
- "Add Chore" quick action button

#### 2. **ChoreCard.tsx** - Individual Chore
```typescript
interface ChoreCardProps {
  chore: Chore;
  onComplete: (choreId: number) => void;
  onSkip?: (choreId: number) => void;
  onEdit?: (choreId: number) => void;
}
```

Features:
- Color-coded border (user color)
- Icon + Title + Points
- Assigned user indicator
- Swipe-to-complete gesture
- Completion animation
- Frequency indicator (daily/weekly badge)

#### 3. **ChoresModal.tsx** - Full Chores View
- List/Grid toggle
- Filter by user
- Filter by frequency
- Calendar integration (show on calendar)
- Add/Edit/Delete chores
- View completion history

#### 4. **ChoreStats.tsx** - Leaderboard/Stats
- Family points leaderboard
- Individual user stats
- Streak indicators
- Achievement badges display
- Weekly/Monthly completion charts

### Key Features

#### Gamification Elements
1. **Points System**
   - Base points per chore (customizable)
   - Bonus multipliers for streaks
   - Weekly family goal (cooperative)
   - Monthly challenges

2. **Visual Feedback**
   - Completion confetti animation
   - Progress circles/bars
   - Streak flame icon 🔥
   - Level-up celebrations

3. **Notifications**
   - Morning reminder: "You have 3 chores today!"
   - Completion praise: "Great job! +10 points"
   - Streak warnings: "Complete a chore to keep your 7-day streak!"
   - Family milestone: "Family completed 100 chores this month! 🎉"

#### Skylight Design Language

**Colors:**
- Chore cards: White with colored left border
- Points badge: Emerald gradient
- Streak indicator: Orange/Red gradient
- Completion state: Emerald background

**Typography:**
- Title: 16px, font-semibold
- Points: 12px, font-medium, emerald
- Assigned to: 10px, font-medium, slate-500

**Spacing:**
- Card padding: 4 (16px)
- Gap between cards: 3 (12px)
- Border radius: 2xl (16px)

**Animations:**
- Swipe threshold: 60% of card width
- Completion: Scale + fade + confetti
- Entrance: Staggered fade-in with slight slide
- Point counter: Count-up animation

### API Endpoints

```
GET    /api/v1/chores                    List all chores
POST   /api/v1/chores                    Create new chore
GET    /api/v1/chores/:id                Get chore details
PUT    /api/v1/chores/:id                Update chore
DELETE /api/v1/chores/:id                Delete chore

GET    /api/v1/chores/today              Get today's chores
POST   /api/v1/chores/:id/complete       Mark chore complete
POST   /api/v1/chores/:id/skip           Skip chore for today

GET    /api/v1/chores/stats              Get family stats
GET    /api/v1/chores/stats/:userId      Get user stats
GET    /api/v1/chores/leaderboard        Get family leaderboard
GET    /api/v1/chores/history            Get completion history
```

### Settings Integration

In Settings Panel → Features tab:

```typescript
{
  chores: {
    enabled: boolean,
    showLeaderboard: boolean,
    requirePhotos: boolean, // Proof of completion
    streakReminders: boolean,
    weeklyGoal: number, // Family target
    pointsMultiplier: number, // 1.0 default
  }
}
```

### Mobile Optimizations

- Touch gestures: Swipe with momentum
- Haptic feedback on completion
- Large tap targets (min 44px)
- Bottom sheet for quick actions
- Pull-to-refresh for updates

### Accessibility

- Keyboard navigation (Space to complete)
- Screen reader announcements
- High contrast mode support
- Reduced motion alternative (fade instead of swipe)
- ARIA labels for all interactive elements

## Implementation Phases

### Phase 1: Basic CRUD
- Database tables and migrations
- API endpoints for chores
- Simple list view (no gamification)
- Add/Edit/Delete functionality

### Phase 2: Completion & Stats
- Completion tracking
- Points system
- Basic stats display
- User assignment

### Phase 3: Gamification
- Streak tracking
- Badges and achievements
- Leaderboard
- Visual celebrations

### Phase 4: Advanced Features
- Recurring chore templates
- Photo proof requirement
- Integration with calendar
- Push notifications

## Success Metrics

- Daily active users completing chores
- Average chores completed per family per week
- Streak retention rate
- User satisfaction (in-app feedback)
- Feature engagement (what % use leaderboard, badges, etc.)

## Future Enhancements

- AI chore suggestions based on patterns
- Voice commands ("Hey Lumina, mark dishes as done")
- Shared shopping lists tied to chores
- Chore marketplace (trade chores with siblings)
- Integration with allowance/payment systems
- Time tracking for timed chores
- Before/after photos for visual proof
