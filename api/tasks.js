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

// ✅ Функция для получения текущей даты в Москве (UTC+3)
function getMoscowDate() {
  const now = new Date();
  const moscowOffset = 3 * 60 * 60 * 1000;
  const moscowTime = new Date(now.getTime() + moscowOffset);
  return moscowTime;
}

// ✅ Функция для проверки, является ли дата прошедшей
function isPastDate(dateToCheck) {
  const now = getMoscowDate();
  const checkDate = new Date(dateToCheck);
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
  
  return targetDate < today;
}

// ✅ Функция для проверки, является ли время прошедшим (для сегодняшнего дня)
function isPastTime(dateToCheck) {
  const now = getMoscowDate();
  const checkDate = new Date(dateToCheck);
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
  
  if (targetDate.getTime() !== today.getTime()) {
    return false;
  }
  
  return checkDate.getTime() < now.getTime();
}

// ✅ Функция для форматирования даты (ДОБАВЛЕНА!)
function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function adjustToUTC(date) {
  const adjusted = new Date(date);
  adjusted.setHours(adjusted.getHours() - 3);
  return adjusted;
}

async function createTask(req, res, userId) {
    const { text, completed, deadline, priority, is_skill, skill_duration, original_deadline, parent_task_id, day_number } = req.body;

    if (!text || !deadline) {
        res.status(400).json({ success: false, error: 'Text and deadline are required' });
        return;
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
        res.status(400).json({ success: false, error: 'Invalid deadline format' });
        return;
    }

    // ✅ Проверка: нельзя создавать задачи в прошлом
    if (isPastDate(deadlineDate)) {
        return res.status(400).json({
            success: false,
            error: 'Невозможно создать задачу',
            details: 'Нельзя создавать задачи на прошедшие даты',
            message: `Вы пытаетесь создать задачу на ${formatDate(deadlineDate)}, но сегодня ${formatDate(getMoscowDate())}. Пожалуйста, выберите сегодняшнюю или будущую дату.`
        });
    }

    // ✅ Проверка: если задача на сегодня, проверяем время
    if (isPastTime(deadlineDate)) {
        return res.status(400).json({
            success: false,
            error: 'Невозможно создать задачу',
            details: 'Время задачи уже прошло сегодня',
            message: `Вы пытаетесь создать задачу на ${formatDate(deadlineDate)}, но сейчас ${formatDate(getMoscowDate())}. Пожалуйста, выберите будущее время.`
        });
    }

    const isSkillBoolean = is_skill ? true : false;
    const completedBoolean = completed ? true : false;
    const userIdInt = parseInt(userId);

    // 🆕 Если это навык, создаем задачи на несколько дней
    if (isSkillBoolean) {
        const duration = skill_duration || 7;
        const createdTasks = [];

        // ✅ Для навыков проверяем первый день
        const firstDayDeadline = new Date(deadlineDate);
        if (isPastDate(firstDayDeadline)) {
            return res.status(400).json({
                success: false,
                error: 'Невозможно создать навык',
                details: 'Первый день навыка не может быть в прошлом',
                message: `Вы пытаетесь начать навык ${formatDate(firstDayDeadline)}, но сегодня ${formatDate(getMoscowDate())}. Пожалуйста, выберите сегодняшнюю или будущую дату.`
            });
        }

        if (isPastTime(firstDayDeadline)) {
            return res.status(400).json({
                success: false,
                error: 'Невозможно создать навык',
                details: 'Время начала навыка уже прошло сегодня',
                message: `Вы пытаетесь начать навык в ${formatDate(firstDayDeadline)}, но сейчас ${formatDate(getMoscowDate())}. Пожалуйста, выберите будущее время.`
            });
        }

        const existingSkills = await query(
            `SELECT MAX(day_number) as max_day 
             FROM tasks 
             WHERE user_id = $1 
             AND is_skill = true 
             AND text LIKE $2`,
            [userIdInt, `${text}%`]
        );
        
        let startDay = 0;
        if (existingSkills.rows[0].max_day !== null) {
            startDay = parseInt(existingSkills.rows[0].max_day);
        }
        
        console.log('📊 Start day for this skill:', startDay);
        console.log('📊 Duration:', duration);

        for (let i = 1; i <= duration; i++) {
            const day = startDay + i;
            const taskDeadline = new Date(deadlineDate);
            taskDeadline.setDate(taskDeadline.getDate() + (i - 1));
            
            if (isNaN(taskDeadline.getTime())) {
                console.error('❌ Invalid task deadline for day:', day);
                continue;
            }
            
            const existingTask = await query(
                `SELECT id FROM tasks 
                 WHERE user_id = $1 
                 AND is_skill = true 
                 AND text LIKE $2 
                 AND day_number = $3`,
                [userIdInt, `${text}%`, day]
            );
            
            if (existingTask.rows.length > 0) {
                console.log(`⚠️ Task for day ${day} already exists, skipping...`);
                continue;
            }
            
            const adjustedDate = adjustToUTC(taskDeadline);
            
            const result = await query(
                `INSERT INTO tasks (user_id, text, completed, deadline, priority, is_skill, skill_duration, original_deadline, parent_task_id, day_number)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id`,
                [
                    userIdInt,
                    `${text} (День ${day})`,
                    false,
                    adjustedDate.toISOString(),
                    priority || 'medium',
                    true,
                    duration,
                    adjustToUTC(deadlineDate).toISOString(),
                    null,
                    day
                ]
            );
            createdTasks.push({
                id: result.rows[0].id,
                day: day,
                deadline: adjustedDate.toISOString()
            });
        }

        if (createdTasks.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Все дни для этого навыка уже созданы',
                max_day: startDay
            });
        }

        res.status(201).json({
            success: true,
            message: `Создано ${createdTasks.length} задач для навыка "${text}" (дни ${createdTasks[0].day} - ${createdTasks[createdTasks.length - 1].day})`,
            tasks: createdTasks,
            total_days: duration,
            start_day: startDay
        });
        return;
    }

    // 🔹 Обычная задача (не навык)
    const adjustedDate = adjustToUTC(deadlineDate);
    
    const result = await query(
        `INSERT INTO tasks (user_id, text, completed, deadline, priority, is_skill, skill_duration, original_deadline, parent_task_id, day_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
            userIdInt,
            text,
            completedBoolean,
            adjustedDate.toISOString(),
            priority || 'medium',
            false,
            null,
            null,
            null,
            1
        ]
    );

    res.status(201).json({ success: true, id: result.rows[0].id });
}

async function completeTask(req, res, userId) {
  const { id } = req.body;

  if (!id) {
    res.status(400).json({ success: false, error: 'Task id is required' });
    return;
  }

  const userIdInt = parseInt(userId);

  const taskResult = await query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [id, userIdInt]);
  if (taskResult.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }

  const task = taskResult.rows[0];

  await query('UPDATE tasks SET completed = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2', [id, userIdInt]);
  
  let currencyReward = 2;
  if (task.priority === 'medium') currencyReward = 5;
  if (task.priority === 'high') currencyReward = 10;
  
  if (task.is_skill) {
    currencyReward += 1;
  }

  await query(
    'UPDATE users SET currency = currency + $1, updated_at = NOW() WHERE id = $2',
    [currencyReward, userIdInt]
  );

  const priorityMultiplier = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
  const baseXP = 10;
  const xpReward = baseXP * priorityMultiplier;

  const userResult = await query('SELECT experience, level FROM users WHERE id = $1', [userIdInt]);
  const user = userResult.rows[0];
  let newExperience = user.experience + xpReward;
  let newLevel = user.level;
  let leveledUp = false;
  let levelUpReward = 0;

  const xpForNextLevel = newLevel * 100;
  if (newExperience >= xpForNextLevel) {
    newExperience -= xpForNextLevel;
    newLevel += 1;
    leveledUp = true;

    levelUpReward = newLevel * 50;
    await query(
      'UPDATE users SET experience = $1, level = $2, currency = currency + $3, updated_at = NOW() WHERE id = $4',
      [newExperience, newLevel, levelUpReward, userIdInt]
    );
    
    const newTags = levelTags[newLevel] || levelTags[5];
    await query(
        'UPDATE users SET tags = $1, updated_at = NOW() WHERE id = $2',
        [newTags, userIdInt]
    );
  } else {
    await query(
      'UPDATE users SET experience = $1, updated_at = NOW() WHERE id = $2',
      [newExperience, userIdInt]
    );
  }

  res.json({
    success: true,
    xpReward,
    currencyReward,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    levelUpReward: leveledUp ? levelUpReward : undefined,
    totalCurrency: user.currency + currencyReward + (leveledUp ? levelUpReward : 0)
  });
}

async function deleteTask(req, res, userId) {
  const { id } = req.query;

  if (!id) {
    res.status(400).json({ success: false, error: 'Task id is required' });
    return;
  }

  const userIdInt = parseInt(userId);
  await query('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [id, userIdInt]);
  res.json({ success: true });
}