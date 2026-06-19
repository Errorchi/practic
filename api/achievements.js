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
        return await getAchievements(req, res, userId);
      case 'POST':
        return await handleAchievementAction(req, res, userId);
      default:
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Achievements error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

async function getAchievements(req, res, userId) {
  // Get all achievements with unlock status for user
  const result = await query(
    `SELECT a.*, ua.unlocked_at IS NOT NULL as unlocked, ua.unlocked_at
     FROM achievements a
     LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
     ORDER BY a.id`,
    [userId]
  );

  const all = result.rows.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    icon: a.icon,
    reward: a.reward,
    unlocked: a.unlocked,
    unlocked_at: a.unlocked_at
  }));

  const unlocked = all.filter(a => a.unlocked);
  const locked = all.filter(a => !a.unlocked);

  res.json({ success: true, all, unlocked, locked });
}

async function handleAchievementAction(req, res, userId) {
  const { action, achievement_id } = req.body;

  if (action === 'unlock' && achievement_id) {
    // Check if already unlocked
    const existing = await query(
      'SELECT * FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
      [userId, achievement_id]
    );

    if (existing.rows.length > 0) {
      res.json({ success: true, alreadyUnlocked: true });
      return;
    }

    // Get achievement reward
    const achievementResult = await query('SELECT * FROM achievements WHERE id = $1', [achievement_id]);
    if (achievementResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Achievement not found' });
      return;
    }

    const achievement = achievementResult.rows[0];

    // Unlock achievement and give reward
    await query(
      'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
      [userId, achievement_id]
    );

    // Give currency reward
    if (achievement.reward > 0) {
      await query(
        'UPDATE users SET currency = currency + $1, updated_at = NOW() WHERE id = $2',
        [achievement.reward, userId]
      );
    }

    res.json({ success: true, reward: achievement.reward, alreadyUnlocked: false });
  } else if (action === 'check_all') {
    // Check all achievements and unlock any that are earned
    const newlyUnlocked = await checkAllAchievements(userId);
    res.json({ success: true, newlyUnlocked });
  } else {
    res.status(400).json({ success: false, error: 'Invalid action' });
  }
}

async function checkAllAchievements(userId) {
  const newlyUnlocked = [];

  // Get user data
  const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  if (!user) return [];

  // Get completed tasks count
  const tasksResult = await query(
    'SELECT COUNT(*) as count FROM tasks WHERE user_id = $1 AND completed = TRUE',
    [userId]
  );
  const completedTasks = parseInt(tasksResult.rows[0].count) || 0;

  // Get streak
  const streakResult = await query('SELECT * FROM daily_streaks WHERE user_id = $1', [userId]);
  const streak = streakResult.rows[0];
  const currentStreak = streak ? streak.current_streak : 0;

  // Get already unlocked achievements
  const unlockedResult = await query(
    'SELECT achievement_id FROM user_achievements WHERE user_id = $1',
    [userId]
  );
  const unlockedIds = new Set(unlockedResult.rows.map(r => r.achievement_id));

  // Check conditions
  const checks = [
    { id: 'first_task', condition: completedTasks >= 1 },
    { id: 'ten_tasks', condition: completedTasks >= 10 },
    { id: 'fifty_tasks', condition: completedTasks >= 50 },
    { id: 'hundred_tasks', condition: completedTasks >= 100 },
    { id: 'week_streak', condition: currentStreak >= 7 },
    { id: 'month_streak', condition: currentStreak >= 30 },
    { id: 'level_5', condition: user.level >= 5 },
    { id: 'level_10', condition: user.level >= 10 },
    { id: 'level_20', condition: user.level >= 20 }
  ];

  for (const check of checks) {
    if (check.condition && !unlockedIds.has(check.id)) {
      // Unlock it
      const achievementResult = await query('SELECT * FROM achievements WHERE id = $1', [check.id]);
      if (achievementResult.rows.length > 0) {
        const achievement = achievementResult.rows[0];
        await query(
          'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
          [userId, check.id]
        );
        if (achievement.reward > 0) {
          await query(
            'UPDATE users SET currency = currency + $1, updated_at = NOW() WHERE id = $2',
            [achievement.reward, userId]
          );
        }
        newlyUnlocked.push({
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          reward: achievement.reward
        });
      }
    }
  }

  // Check "all_achievements" - after unlocking others, check if all are now unlocked
  const totalAchievements = await query('SELECT COUNT(*) as count FROM achievements');
  const totalUnlocked = await query(
    'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = $1',
    [userId]
  );
  const totalAchievementsCount = parseInt(totalAchievements.rows[0].count);
  const totalUnlockedCount = parseInt(totalUnlocked.rows[0].count);

  if (totalUnlockedCount >= totalAchievementsCount && !unlockedIds.has('all_achievements')) {
    const achievementResult = await query('SELECT * FROM achievements WHERE id = $1', ['all_achievements']);
    if (achievementResult.rows.length > 0) {
      const achievement = achievementResult.rows[0];
      await query(
        'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
        [userId, 'all_achievements']
      );
      if (achievement.reward > 0) {
        await query(
          'UPDATE users SET currency = currency + $1, updated_at = NOW() WHERE id = $2',
          [achievement.reward, userId]
        );
      }
      newlyUnlocked.push({
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: achievement.icon,
        reward: achievement.reward
      });
    }
  }

  return newlyUnlocked;
}