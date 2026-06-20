const { query } = require('./db');

function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    if (email.length > 254) return false;
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;
    
    const parts = email.split('@');
    if (parts.length !== 2) return false;
    
    const [localPart, domain] = parts;
    if (localPart.length === 0 || localPart.length > 64) return false;
    if (domain.length === 0 || domain.length > 255) return false;
    if (/[\s]/.test(email)) return false;
    
    return true;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
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
        return await getProfile(req, res, userId);
      case 'PUT':
        return await updateProfile(req, res, userId);
      default:
        res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

async function getProfile(req, res, userId) {
  const result = await query(
    `SELECT id, name, email, currency, character_icon, background_style, experience, level, tags, purchased_icons, purchased_backgrounds
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ success: false, error: 'User not found' });
    return;
  }

  const user = result.rows[0];

  // Get completed tasks count
  const tasksResult = await query(
    'SELECT COUNT(*) as completed_tasks FROM tasks WHERE user_id = $1 AND completed = TRUE',
    [userId]
  );

  // Get achievements count
  const achievementsResult = await query(
    'SELECT COUNT(*) as unlocked_count FROM user_achievements WHERE user_id = $1',
    [userId]
  );

  // Get total achievements available
  const totalAchievementsResult = await query('SELECT COUNT(*) as total FROM achievements');

  res.json({
    success: true,
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      currency: user.currency,
      characterIcon: user.character_icon,
      backgroundStyle: user.background_style,
      experience: user.experience,
      level: user.level,
      tags: user.tags,
      purchasedIcons: user.purchased_icons || [],
      purchasedBackgrounds: user.purchased_backgrounds || [],
      completedTasks: parseInt(tasksResult.rows[0].completed_tasks) || 0,
      unlockedAchievements: parseInt(achievementsResult.rows[0].unlocked_count) || 0,
      totalAchievements: parseInt(totalAchievementsResult.rows[0].total) || 0
    }
  });
}

async function updateProfile(req, res, userId) {
  const { name, email, characterIcon, backgroundStyle, experience, level, currency, tags, purchasedBackgrounds, purchasedIcons } = req.body;

  if (email !== undefined) {
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid email format',
        details: 'Please enter a valid email address (e.g., user@example.com)'
      });
    }

    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email.toLowerCase(), userId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        error: 'Email already in use',
        details: 'This email is already registered by another user'
      });
    }
  }

  const updates = [];
  const params = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    params.push(name);
  }
  if (email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    params.push(email.toLowerCase());
  }
  if (characterIcon !== undefined) {
    updates.push(`character_icon = $${paramIndex++}`);
    params.push(characterIcon);
  }
  if (backgroundStyle !== undefined) {
    updates.push(`background_style = $${paramIndex++}`);
    params.push(backgroundStyle);
  }
  if (experience !== undefined) {
    updates.push(`experience = $${paramIndex++}`);
    params.push(experience);
  }
  if (level !== undefined) {
    updates.push(`level = $${paramIndex++}`);
    params.push(level);
  }
  if (currency !== undefined) {
    updates.push(`currency = $${paramIndex++}`);
    params.push(currency);
  }
  if (tags !== undefined) {
    updates.push(`tags = $${paramIndex++}`);
    params.push(tags);
  }
  if (purchasedBackgrounds !== undefined) {
    updates.push(`purchased_backgrounds = $${paramIndex++}`);
    params.push(purchasedBackgrounds);
  }
  if (purchasedIcons !== undefined) {
    updates.push(`purchased_icons = $${paramIndex++}`);
    params.push(purchasedIcons);
  }

  if (updates.length === 0) {
    res.status(400).json({ success: false, error: 'No fields to update' });
    return;
  }

  updates.push(`updated_at = NOW()`);
  params.push(userId);

  await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    params
  );

  const updatedUser = await query(
    'SELECT id, name, email, currency, character_icon, background_style, experience, level, tags, purchased_icons, purchased_backgrounds FROM users WHERE id = $1',
    [userId]
  );

  res.json({ success: true,
    profile: updatedUser.rows[0] });
}