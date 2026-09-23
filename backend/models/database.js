const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Keep the database alongside package.json so the project is portable when moved.
const DB_PATH = path.join(__dirname, '../../rstream.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

db.configure('busyTimeout', 5000);

db.run('PRAGMA foreign_keys = ON');

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function onRun(err) {
    if (err) return reject(err);
    resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) return reject(err);
    resolve(row);
  });
});

const initializeDatabase = async () => {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        color TEXT DEFAULT '#FF5733',
        icon TEXT DEFAULT 'film',
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS content (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        category_id INTEGER,
        video_url TEXT NOT NULL,
        thumbnail_url TEXT,
        duration TEXT,
        quality TEXT DEFAULT 'HD',
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        tags TEXT,
        release_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        site_name TEXT DEFAULT 'Rstream',
        site_description TEXT DEFAULT 'Plateforme de streaming de qualité',
        logo_url TEXT,
        favicon_url TEXT,
        primary_color TEXT DEFAULT '#FF5733',
        secondary_color TEXT DEFAULT '#33FF57',
        background_color TEXT DEFAULT '#1a1a1a',
        text_color TEXT DEFAULT '#ffffff',
        featured_content_limit INTEGER DEFAULT 6,
        recent_content_limit INTEGER DEFAULT 12,
        auto_play BOOLEAN DEFAULT 0,
        show_related BOOLEAN DEFAULT 1,
        maintenance_mode BOOLEAN DEFAULT 0,
        maintenance_message TEXT DEFAULT 'Site en maintenance, merci de revenir plus tard.'
      )
    `);

    const settingsCount = await get('SELECT COUNT(*) AS count FROM settings');
    if (!settingsCount.count) {
      await run(`
        INSERT INTO settings (
          site_name, site_description, primary_color, secondary_color,
          background_color, text_color, featured_content_limit,
          recent_content_limit, auto_play, show_related, maintenance_mode,
          maintenance_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Rstream',
        'Votre plateforme de streaming préférée',
        '#FF5733',
        '#33FF57',
        '#1a1a1a',
        '#ffffff',
        6,
        12,
        0,
        1,
        0,
        'Site en maintenance, merci de revenir plus tard.'
      ]);
    }

    const categoriesCount = await get('SELECT COUNT(*) AS count FROM categories');
    if (!categoriesCount.count) {
      const defaultCategories = [
        { name: 'Films', description: 'Longs métrages et films', color: '#FF5733', icon: 'film', order_index: 1 },
        { name: 'Séries', description: 'Séries télévisées', color: '#33FF57', icon: 'tv', order_index: 2 },
        { name: 'Documentaires', description: 'Documentaires éducatifs', color: '#3357FF', icon: 'book', order_index: 3 },
        { name: 'Animations', description: 'Dessins animés et anime', color: '#F3FF33', icon: 'film', order_index: 4 },
        { name: 'Musique', description: 'Clips musicaux et concerts', color: '#FF33F3', icon: 'music', order_index: 5 }
      ];

      for (const category of defaultCategories) {
        await run(`
          INSERT INTO categories (name, description, color, icon, order_index)
          VALUES (?, ?, ?, ?, ?)
        `, [category.name, category.description, category.color, category.icon, category.order_index]);
      }
    }
  } catch (err) {
    console.error('Database initialization error:', err.message);
    throw err;
  }
};

const getDb = () => db;

module.exports = {
  initializeDatabase,
  getDb
};
