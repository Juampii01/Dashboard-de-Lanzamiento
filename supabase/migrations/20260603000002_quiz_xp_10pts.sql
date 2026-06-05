-- Update quiz XP reward from 5 to 10 points per correct answer.
UPDATE video_quizzes SET xp_reward = 10 WHERE xp_reward = 5;
