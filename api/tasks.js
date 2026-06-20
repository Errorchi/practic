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

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
        res.status(400).json({ success: false, error: 'Invalid deadline format' });
        return;
    }

    // ✅ Функция для вычитания 3 часов (для Москвы)
    function adjustToUTC(date) {
        const adjusted = new Date(date);
        adjusted.setHours(adjusted.getHours() - 3); // Для Москвы UTC+3
        return adjusted;
    }

    const isSkillBoolean = is_skill ? true : false;
    const completedBoolean = completed ? true : false;
    const userIdInt = parseInt(userId);

    // 🆕 Если это навык, создаем задачи на несколько дней
    if (isSkillBoolean) {
        const duration = skill_duration || 7;
        const createdTasks = [];

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
            
            // ✅ ✅ ✅ ВЫЧИТАЕМ 3 ЧАСА ДЛЯ НАВЫКОВ
            const adjustedDate = adjustToUTC(taskDeadline);
            
            const result = await query(
                `INSERT INTO tasks (user_id, text, completed, deadline, priority, is_skill, skill_duration, original_deadline, parent_task_id, day_number)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id`,
                [
                    userIdInt,
                    `${text} (День ${day})`,
                    false,
                    adjustedDate.toISOString(), // ✅ Скорректированная дата
                    priority || 'medium',
                    true,
                    duration,
                    adjustToUTC(deadlineDate).toISOString(), // ✅ Скорректированная оригинальная дата
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
    // ✅ ✅ ✅ ВЫЧИТАЕМ 3 ЧАСА ДЛЯ ОБЫЧНОЙ ЗАДАЧИ
    const adjustedDate = adjustToUTC(deadlineDate);
    
    const result = await query(
        `INSERT INTO tasks (user_id, text, completed, deadline, priority, is_skill, skill_duration, original_deadline, parent_task_id, day_number)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
            userIdInt,
            text,
            completedBoolean,
            adjustedDate.toISOString(), // ✅ Скорректированная дата
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
  const levelTags = {
    1: ['Новичок'],
    2: ['Ученик'],
    3: ['Эксперт'],
    4: ['Мастер'],
    5: ['Легенда']
};

  if (!id) {
    res.status(400).json({ success: false, error: 'Task id is required' });
    return;
  }

  const userIdInt = parseInt(userId);

  // 1. Получаем задачу
  const taskResult = await query('SELECT * FROM tasks WHERE id = $1 AND user_id = $2', [id, userIdInt]);
  if (taskResult.rows.length === 0) {
    res.status(404).json({ success: false, error: 'Task not found' });
    return;
  }

  const task = taskResult.rows[0];

  // 2. Отмечаем задачу как выполненную
  await query('UPDATE tasks SET completed = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2', [id, userIdInt]);
  
  // 3. Начисляем валюту в зависимости от приоритета
  let currencyReward = 2; // По умолчанию для "low"
  if (task.priority === 'medium') currencyReward = 5;
  if (task.priority === 'high') currencyReward = 10;
  
  // Если это скилл-задача, добавляем бонус
  if (task.is_skill) {
    currencyReward += 1;
  }

  // Применяем начисление валюты
  await query(
    'UPDATE users SET currency = currency + $1, updated_at = NOW() WHERE id = $2',
    [currencyReward, userIdInt]
  );

  // 4. Рассчитываем награду за опыт
  const priorityMultiplier = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
  const baseXP = 10;
  const xpReward = baseXP * priorityMultiplier;

  // 5. Получаем текущие данные пользователя
  const userResult = await query('SELECT experience, level FROM users WHERE id = $1', [userIdInt]);
  const user = userResult.rows[0];
  let newExperience = user.experience + xpReward;
  let newLevel = user.level;
  let leveledUp = false;
  let levelUpReward = 0;

  // 6. Проверяем повышение уровня
  const xpForNextLevel = newLevel * 100;
  if (newExperience >= xpForNextLevel) {
    newExperience -= xpForNextLevel;
    newLevel += 1;
    leveledUp = true;

    // 🪙 Бонус за повышение уровня
    levelUpReward = newLevel * 50;
    await query(
      'UPDATE users SET experience = $1, level = $2, currency = currency + $3, updated_at = NOW() WHERE id = $4',
      [newExperience, newLevel, levelUpReward, userIdInt]
    );
  } else {
    await query(
      'UPDATE users SET experience = $1, updated_at = NOW() WHERE id = $2',
      [newExperience, userIdInt]
    );
  }
  await query(
    'UPDATE users SET tags = $1, updated_at = NOW() WHERE id = $2',
    [levelTags[newLevel] || ['Новичок'], userIdInt]
  );

  res.json({
    success: true,
    xpReward,                // Сколько опыта получено
    currencyReward,          // 🪙 Сколько валюты получено за задачу
    leveledUp,               // Было ли повышение уровня
    newLevel: leveledUp ? newLevel : undefined,
    levelUpReward: leveledUp ? levelUpReward : undefined, // 🪙 Бонус за уровень
    totalCurrency: user.currency + currencyReward + (leveledUp ? levelUpReward : 0) // Общая валюта
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