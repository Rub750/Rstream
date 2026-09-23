const db = require('./database').getDb();

const ACTIVE = 'c.is_active = 1';
const CATEGORY_JOIN = 'LEFT JOIN categories cat ON c.category_id = cat.id';
const SELECT = `
  SELECT c.*, cat.name as category_name, cat.color as category_color, cat.icon as category_icon
  FROM content c
  ${CATEGORY_JOIN}
`;

const normalizeLimit = (limit, fallback = 12, max = 200) => {
  const parsed = Number.parseInt(limit, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
};

class Content {
  static getAll(includeInactive = false) {
    return new Promise((resolve, reject) => {
      const where = includeInactive ? '' : `WHERE ${ACTIVE}`;
      db.all(`${SELECT} ${where} ORDER BY c.created_at DESC`, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getFeatured(limit = 6) {
    return new Promise((resolve, reject) => {
      const safeLimit = normalizeLimit(limit, 6, 50);
      db.all(`
        ${SELECT}
        WHERE ${ACTIVE} AND c.is_featured = 1
        ORDER BY c.created_at DESC
        LIMIT ?
      `, [safeLimit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getByCategory(categoryId) {
    return new Promise((resolve, reject) => {
      db.all(`
        ${SELECT}
        WHERE ${ACTIVE} AND c.category_id = ?
        ORDER BY c.created_at DESC
      `, [categoryId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getById(id, includeInactive = false) {
    return new Promise((resolve, reject) => {
      const where = includeInactive ? '' : `AND ${ACTIVE}`;
      db.get(`
        ${SELECT}
        WHERE c.id = ? ${where}
      `, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static getRecent(limit = 12) {
    return new Promise((resolve, reject) => {
      const safeLimit = normalizeLimit(limit, 12);
      db.all(`
        ${SELECT}
        WHERE ${ACTIVE}
        ORDER BY c.created_at DESC
        LIMIT ?
      `, [safeLimit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getPopular(limit = 12) {
    return new Promise((resolve, reject) => {
      const safeLimit = normalizeLimit(limit, 12);
      db.all(`
        ${SELECT}
        WHERE ${ACTIVE}
        ORDER BY c.views DESC, c.created_at DESC
        LIMIT ?
      `, [safeLimit], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static create(content) {
    return new Promise((resolve, reject) => {
      const {
        title, description, category_id, video_url, thumbnail_url,
        duration, quality, is_featured, is_active, tags, release_date
      } = content;

      db.run(`
        INSERT INTO content (
          title, description, category_id, video_url, thumbnail_url,
          duration, quality, is_featured, is_active, tags, release_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        title,
        description || '',
        category_id === '' || category_id === undefined ? null : category_id,
        video_url,
        thumbnail_url || null,
        duration || null,
        quality || 'HD',
        Boolean(is_featured),
        is_active === undefined ? true : Boolean(is_active),
        tags || '',
        release_date || null
      ], function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...content });
      });
    });
  }

  static update(id, content) {
    return new Promise((resolve, reject) => {
      const {
        title, description, category_id, video_url, thumbnail_url,
        duration, quality, is_featured, is_active, tags, release_date
      } = content;

      db.run(`
        UPDATE content
        SET title = ?, description = ?, category_id = ?, video_url = ?, thumbnail_url = ?,
            duration = ?, quality = ?, is_featured = ?, is_active = ?, tags = ?, release_date = ?
        WHERE id = ?
      `, [
        title,
        description || '',
        category_id === '' || category_id === undefined ? null : category_id,
        video_url,
        thumbnail_url || null,
        duration || null,
        quality || 'HD',
        Boolean(is_featured),
        is_active === undefined ? true : Boolean(is_active),
        tags || '',
        release_date || null,
        id
      ], function(err) {
        if (err) return reject(err);
        resolve({ id: Number(id), ...content });
      });
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE content SET is_active = 0 WHERE id = ?`, [id], function(err) {
        if (err) return reject(err);
        resolve({ id: Number(id), deleted: true });
      });
    });
  }

  static incrementViews(id) {
    return new Promise((resolve, reject) => {
      db.run(`UPDATE content SET views = COALESCE(views, 0) + 1 WHERE id = ? AND is_active = 1`, [id], function(err) {
        if (err) return reject(err);
        resolve({ id: Number(id), views_incremented: this.changes > 0 });
      });
    });
  }

  static search(query) {
    return new Promise((resolve, reject) => {
      const term = String(query || '').trim();
      if (!term) return resolve([]);
      const searchTerm = `%${term}%`;
      db.all(`
        ${SELECT}
        WHERE ${ACTIVE} AND (
          c.title LIKE ? COLLATE NOCASE
          OR c.description LIKE ? COLLATE NOCASE
          OR c.tags LIKE ? COLLATE NOCASE
        )
        ORDER BY c.created_at DESC
      `, [searchTerm, searchTerm, searchTerm], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getStats() {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT
          COUNT(*) as total_content,
          COALESCE(SUM(views), 0) as total_views,
          COALESCE(SUM(likes), 0) as total_likes,
          COUNT(DISTINCT category_id) as total_categories,
          COALESCE(SUM(CASE WHEN is_featured = 1 THEN 1 ELSE 0 END), 0) as featured_content,
          COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) as active_content
        FROM content
        WHERE is_active = 1
      `, (err, row) => {
        if (err) return reject(err);
        resolve(row || {
          total_content: 0,
          total_views: 0,
          total_likes: 0,
          total_categories: 0,
          featured_content: 0,
          active_content: 0
        });
      });
    });
  }
}

module.exports = Content;
