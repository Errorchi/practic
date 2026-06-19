const { query } = require('./db');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
        return await getTasks(req, res, userId);
      case 'POST':
        return await createTask(req, res, userId);
      case 'PUT':
        return await completeTask(req, res, userId);
      case 'DELETE':
        return await deleteTask(req, res, userId);
      default:
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Tasks error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

async function getTasks(req, res, userId) {
  const { date } = req.query;

  let sql = 'SELECT * FROM tasks WHERE user_id = $1';
  const params = [userId];

  if (date) {
    sql += ' AND DATE(deadline) = $2';
    params.push(date);
  }

  sql += ' ORDER BY deadline ASC';

  const result = await query(sql, params);
  const tasks = result.rows.map(task => ({
    id: task.id,
    user_id: task.user_id,
    text: task.text,
    completed: task.completed,
    deadline: task.deadline,
    priority: task.priority,
    is_skill: task.is_skill,
    skill_duration: task.skill_duration,
    original_deadline: task.original_deadline,
    parent_task_id: task.parent_task_id,
    day_number: task.day_number
  }));

  res.json(tasks);
}

async function createTask(req, res, userId) {
  const { text, completed, deadline, priority, is_skill, skill_duration, original_deadline, parent_task_id, day_number } = req.body;

  if (!text || !deadline) {
    res.status(400).json({ success: false, error: 'Text and deadline are required' });
    return;
  }

  const result = await query(
    `INSERT INTO tasks (user_id, text, completed, deadline, priority, is_skill, skill_duration, original_deadline, parent_task_id, day_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [userId, text, completed || false, deadline, priority || 'medium', is_skill || false, skill_duration || null, original_deadline || null, parent_task_id || null, day_number || 1]
  );

  res.status(201).json({ success: true, id: result.rows[0].id });
}

async function completeTask(req, res, userId) {
  const { id } = req.body;

  if (!id) {
    res.status(400).json({ success: false, error: 'Task id is required' });
    return;
  }

  // Get the task first
  const taskResult = await query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [id, userId]);
  if (taskResult.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }

  const task = taskResult.rows[0];

  // Mark task as completed
  await query('UPDATE tasks SET completed = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2', [id, userId]);

  // Calculate experience reward
  const priorityMultiplier = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
  const baseXP = 10;
  const xpReward = baseXP * priorityMultiplier;

  // Update user experience and check level up
  const userResult = await query('SELECT experience, level FROM users WHERE id = $1', [userId]);
  const user = userResult.rows[0];
  let newExperience = user.experience + xpReward;
  let newLevel = user.level;
  let leveledUp = false;

  // Level up logic: each level requires level * 100 XP
  const xpForNextLevel = newLevel * 100;
  if (newExperience >= xpForNextLevel) {
    newExperience -= xpForNextLevel;
    newLevel += 1;
    leveledUp = true;

    // Currency reward for leveling up
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
    xpReward,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    levelUpReward: leveledUp ? newLevel * 50 : undefined
  });
}

async function deleteTask(req, res, userId) {
  const { id } = req.query;

  if (!id) {
    res.status(400).json({ success: false, error: 'Task id is required' });
    return;
  }

  await query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, userId]);
  res.json({ success: true });
}