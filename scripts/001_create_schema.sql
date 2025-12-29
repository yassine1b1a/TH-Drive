-- TH-Drive Database Schema
-- Users, Drivers, Rides, Ratings, Payments, Violations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'driver', 'admin', 'moderator')),
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  warnings_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_rides INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Driver details (for users with role='driver')
CREATE TABLE IF NOT EXISTS driver_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  license_number TEXT NOT NULL,
  vehicle_make TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_year INTEGER NOT NULL,
  vehicle_color TEXT NOT NULL,
  vehicle_plate TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  is_online BOOLEAN DEFAULT FALSE,
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Rides table
CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  driver_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  pickup_lat DECIMAL(10,8) NOT NULL,
  pickup_lng DECIMAL(11,8) NOT NULL,
  pickup_address TEXT,
  dropoff_lat DECIMAL(10,8) NOT NULL,
  dropoff_lng DECIMAL(11,8) NOT NULL,
  dropoff_address TEXT,
  distance_km DECIMAL(10,2),
  estimated_duration_min INTEGER,
  fare DECIMAL(10,2),
  payment_method TEXT CHECK (payment_method IN ('card', 'qr_code', 'cash')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Ratings table (bidirectional: user rates driver, driver rates user)
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES profiles(id),
  rated_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_hidden BOOLEAN DEFAULT FALSE, -- For driver's secret rating of user
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ride_id, rater_id)
);

-- Violations tracking
CREATE TABLE IF NOT EXISTS violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  ride_id UUID REFERENCES rides(id),
  reported_by UUID REFERENCES profiles(id),
  violation_type TEXT NOT NULL CHECK (violation_type IN ('late_arrival', 'wrong_location', 'misconduct', 'unsafe_driving', 'cancellation', 'other')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'warning_issued', 'ban_issued', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation alerts (auto-generated when rating drops below 2 stars)
CREATE TABLE IF NOT EXISTS moderation_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_rating', 'multiple_violations', 'user_report')),
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned')),
  reviewed_by UUID REFERENCES profiles(id),
  action_taken TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Chat messages for support
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT NOT NULL,
  is_from_user BOOLEAN DEFAULT TRUE,
  is_ai_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Driver details policies
CREATE POLICY "Users can view their own driver details" ON driver_details FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert their own driver details" ON driver_details FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own driver details" ON driver_details FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Public can view online drivers" ON driver_details FOR SELECT USING (is_online = TRUE AND is_verified = TRUE);

-- Rides policies
CREATE POLICY "Users can view their own rides" ON rides FOR SELECT USING (user_id = auth.uid() OR driver_id = auth.uid());
CREATE POLICY "Users can insert rides" ON rides FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Participants can update rides" ON rides FOR UPDATE USING (user_id = auth.uid() OR driver_id = auth.uid());
CREATE POLICY "Drivers can view pending rides" ON rides FOR SELECT USING (
  status = 'pending' AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'driver')
);

-- Ratings policies
CREATE POLICY "Users can view non-hidden ratings" ON ratings FOR SELECT USING (is_hidden = FALSE OR rater_id = auth.uid());
CREATE POLICY "Users can insert ratings" ON ratings FOR INSERT WITH CHECK (rater_id = auth.uid());

-- Violations policies
CREATE POLICY "Users can view their own violations" ON violations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Moderators can view all violations" ON violations FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Moderators can update violations" ON violations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Users can report violations" ON violations FOR INSERT WITH CHECK (reported_by = auth.uid());

-- Moderation alerts policies
CREATE POLICY "Moderators can view alerts" ON moderation_alerts FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Moderators can update alerts" ON moderation_alerts FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Support messages policies
CREATE POLICY "Users can view their own messages" ON support_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert messages" ON support_messages FOR INSERT WITH CHECK (user_id = auth.uid());
