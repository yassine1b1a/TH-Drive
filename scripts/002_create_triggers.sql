-- Triggers for TH-Drive

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update user rating after new rating is added
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_avg DECIMAL(3,2);
BEGIN
  SELECT COALESCE(AVG(rating), 5.00) INTO new_avg
  FROM ratings
  WHERE rated_id = NEW.rated_id;
  
  UPDATE profiles SET rating = new_avg WHERE id = NEW.rated_id;
  
  -- Auto-alert if rating drops to 2 or below
  IF new_avg <= 2.0 THEN
    INSERT INTO moderation_alerts (user_id, alert_type, description)
    VALUES (NEW.rated_id, 'low_rating', 'User rating dropped to ' || new_avg || ' stars');
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_rating_added ON ratings;
CREATE TRIGGER on_rating_added
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_rating();

-- Update ride count after completion
CREATE OR REPLACE FUNCTION update_ride_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE profiles SET total_rides = total_rides + 1 WHERE id = NEW.user_id;
    UPDATE profiles SET total_rides = total_rides + 1 WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_ride_completed ON rides;
CREATE TRIGGER on_ride_completed
  AFTER UPDATE ON rides
  FOR EACH ROW
  EXECUTE FUNCTION update_ride_counts();

-- Auto-ban after 3 successive violations
CREATE OR REPLACE FUNCTION check_violation_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  violation_count INTEGER;
BEGIN
  IF NEW.status = 'warning_issued' THEN
    UPDATE profiles SET warnings_count = warnings_count + 1 WHERE id = NEW.user_id;
    
    SELECT warnings_count INTO violation_count FROM profiles WHERE id = NEW.user_id;
    
    IF violation_count >= 3 THEN
      UPDATE profiles SET is_banned = TRUE, ban_reason = 'Exceeded violation limit (3 warnings)' WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_violation_updated ON violations;
CREATE TRIGGER on_violation_updated
  AFTER UPDATE ON violations
  FOR EACH ROW
  EXECUTE FUNCTION check_violation_count();
