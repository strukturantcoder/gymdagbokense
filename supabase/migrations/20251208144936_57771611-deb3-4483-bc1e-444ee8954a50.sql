-- Drop existing triggers if they exist and recreate
DROP TRIGGER IF EXISTS update_challenge_progress_on_workout ON workout_logs;
DROP TRIGGER IF EXISTS update_challenge_progress_on_exercise ON exercise_logs;

-- Create trigger on workout_logs
CREATE TRIGGER update_challenge_progress_on_workout
AFTER INSERT OR UPDATE OR DELETE ON workout_logs
FOR EACH ROW
EXECUTE FUNCTION update_friend_challenge_progress();

-- Create trigger on exercise_logs for 'sets' challenges
CREATE TRIGGER update_challenge_progress_on_exercise
AFTER INSERT OR UPDATE OR DELETE ON exercise_logs
FOR EACH ROW
EXECUTE FUNCTION update_friend_challenge_progress();