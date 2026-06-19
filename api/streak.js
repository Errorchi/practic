const { query } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const userId = req.query.user_id || (req.body && req.body.user_id);

    if (!userId) {
      res.status(400).json({ success: false, error: 'user_id is required' });
      return;
    }

    switch (req.method) {
      case 'GET':
        return await getStreak(req, res, userId);
      case 'POST':
        return await checkDailyCompletion(req, res, userId);
      default:
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Streak error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

async function getStreak(req, res, userId) {
  let result = await query(
    'SELECT * FROM daily_streaks WHERE user_id = $1',
    [userId]
  );

  // Create streak record if it doesn't exist
  if (result.rows.length === 0) {
    result = await query(
      'INSERT INTO daily_streaks (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
  }

  const streak = result.rows[0];
  res.json({
    user_id: streak.user_id,
    current_streak: streak.current_streak,
    streak_multiplier: parseFloat(streak.streak_multiplier),
    last_completed_date: streak.last_completed_date,
    base_experience: streak.base_experience
  });
}

async function checkDailyCompletion(req, res, userId) {
  // Get current streak
  let streakResult = await query(
    'SELECT * FROM daily_streaks WHERE user_id = $1',
    [userId]
  );

  if (streakResult.rows.length === 0) {
    streakResult = await query(
      'INSERT INTO daily_streaks (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
  }

  const streak = streakResult.rows[0];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const lastCompletedStr = streak.last_completed_date
    ? new Date(streak.last_completed_date).toISOString().split('T')[0]
    : null;

  // Check if already completed today
  if (lastCompletedStr === todayStr) {
    res.json({
      success: true,
      alreadyCompleted: true,
      current_streak: streak.current_streak,
      streak_multiplier: parseFloat(streak.streak_multiplier)
    });
    return;
  }

  // Calculate if streak continues
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = 1;
  let newMultiplier = 1.0;

  if (lastCompletedStr === yesterdayStr) {
    // Streak continues
    newStreak = streak.current_streak + 1;
    newMultiplier = Math.min(1.0 + (newStreak - 1) * 0.1, 3.0);
  }

  // Update streak
  await query(
    'UPDATE daily_streaks SET current_streak = $1, streak_multiplier = $2, last_completed_date = $3, updated_at = NOW() WHERE user_id = $4',
    [newStreak, newMultiplier, todayStr, userId]
  );

  // Reward experience with multiplier
  const baseXP = streak.base_experience;
  const xpReward = Math.round(baseXP * newMultiplier);

  // Update user experience
  const userResult = await query('SELECT experience, level FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  let newExperience = user.experience + xpReward;
  let newLevel = user.level;
  let leveledUp = false;

  const xpForNextLevel = newLevel * 100;
  if (newExperience >= xpForNextLevel) {
    newExperience -= xpForNextLevel;
    newLevel += 1;
    leveledUp = true;
    const levelUpReward = newLevel * 50;
    await query(
      'UPDATE users SET experience = $1, level = $2, currency = currency + $3, updated_at = NOW() WHERE id = $4',
      [newExperience, newLevel, levelUpReward, userId]
    );
  } else {
    await query(
      'UPDATE users SET experience = $1, updated_at = NOW() WHERE id = $2',
      [newExperience, userId]
    );
  }

  res.json({
    success: true,
    alreadyCompleted: false,
    current_streak: newStreak,
    streak_multiplier: newMultiplier,
    xpReward,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    levelUpReward: leveledUp ? newLevel * 50 : undefined
  });
}