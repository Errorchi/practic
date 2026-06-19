const { query } = require('./db');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// POST /api/auth - login or register
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { action, email, password, name } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    if (action === 'register') {
      // Check if user already exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        res.status(409).json({ success: false, error: 'User with this email already exists' });
        return;
      }

      // Create user
      const hashedPassword = hashPassword(password);
      const result = await query(
        `INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, currency, character_icon, background_style, experience, level, tags, purchased_icons, purchased_backgrounds`,
        [name || 'User', email, hashedPassword]
      );
      const user = result.rows[0];

      // Create initial streak record
      await query(
        'INSERT INTO daily_streaks (user_id) VALUES ($1)',
        [user.id]
      );

      res.status(201).json({
        success: true,
        userId: user.id,
        user: {
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
          purchasedBackgrounds: user.purchased_backgrounds || []
        }
      });
    } else if (action === 'login') {
      const hashedPassword = hashPassword(password);
      const result = await query(
        `SELECT id, name, email, currency, character_icon, background_style, experience, level, tags, purchased_icons, purchased_backgrounds FROM users WHERE email = $1 AND password = $2`,
        [email, hashedPassword]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      const user = result.rows[0];
      res.json({
        success: true,
        userId: user.id,
        user: {
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
          purchasedBackgrounds: user.purchased_backgrounds || []
        }
      });
    } else {
      res.status(400).json({ success: false, error: 'Invalid action. Use "login" or "register"' });
    }
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};