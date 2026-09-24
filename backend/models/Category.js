const db = require('./database').getDb();

class Category {
  static getAll(includeInactive = false) {
    return new Promise((resolve, reject) => {
      const activeClause = includeInactive ? '' : 'WHERE is_active = 1';
      db.all(`
        SELECT * FROM categories
        ${activeClause}
        ORDER BY order_index ASC, name ASC
      `, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  static getById(id, includeInactive = false) {
    return new Promise((resolve, reject) => {
      const activeClause = includeInactive ? '' : 'AND is_active = 1';
      db.get(`
        SELECT * FROM categories
        WHERE id = ? ${activeClause}
      `, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static getByName(name, includeInactive = false) {
    return new Promise((resolve, reject) => {
      const activeClause = includeInactive ? '' : 'AND is_active = 1';
      db.get(`
        SELECT * FROM categories
        WHERE name = ? ${activeClause}
      `, [name], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  static create(category) {
    return new Promise((resolve, reject) => {
      const { name, description, color, icon, order_index } = category;
      db.run(`
        INSERT INTO categories (name, description, color, icon, order_index)
        VALUES (?, ?, ?, ?, ?)
      `, [name, description || '', color || '#FF5733', icon || 'film', Number.isFinite(Number(order_index)) ? Number(order_index) : 0], function(err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...category });
      });
    });
  }

  static update(id, category) {
    return new Promise((resolve, reject) => {
      const { name, description, color, icon, order_index, is_active } = category;
      db.run(`
        UPDATE categories
        SET name = ?, description = ?, color = ?, icon = ?, order_index = ?, is_active = ?
        WHERE id = ?
      `, [name, description, color, icon, order_index, is_active, id], function(err) {
        if (err) return reject(err);
        resolve({ id: Number(id), ...category });
      });
    });
  }

  static delete(id) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', beginErr => {
          if (beginErr) return reject(beginErr);

          db.run('UPDATE content SET category_id = NULL WHERE category_id = ?', [id], detachErr => {
            if (detachErr) return db.run('ROLLBACK', () => reject(detachErr));

            db.run('DELETE FROM categories WHERE id = ?', [id], function(deleteErr) {
              if (deleteErr) return db.run('ROLLBACK', () => reject(deleteErr));
              if (this.changes === 0) return db.run('ROLLBACK', () => reject(new Error('Category not found')));

              db.run('COMMIT', commitErr => {
                if (commitErr) return db.run('ROLLBACK', () => reject(commitErr));
                resolve({ id: Number(id), deleted: true });
              });
            });
          });
        });
      });
    });
  }

  static reorder(categories) {
    return new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION', (beginErr) => {
          if (beginErr) return reject(beginErr);
          const stmt = db.prepare('UPDATE categories SET order_index = ? WHERE id = ?');
          let pending = categories.length;

          if (pending === 0) {
            stmt.finalize(() => db.run('COMMIT', (commitErr) => commitErr ? reject(commitErr) : resolve({ success: true, message: 'Categories reordered' })));
            return;
          }

          let failed = false;
          categories.forEach((cat, index) => {
            stmt.run([index, cat.id], (err) => {
              if (failed) return;
              if (err) {
                failed = true;
                stmt.finalize(() => db.run('ROLLBACK', () => reject(err)));
                return;
              }
              pending -= 1;
              if (pending === 0) {
                stmt.finalize((finalizeErr) => {
                  if (finalizeErr) return db.run('ROLLBACK', () => reject(finalizeErr));
                  db.run('COMMIT', (commitErr) => {
                    if (commitErr) return db.run('ROLLBACK', () => reject(commitErr));
                    resolve({ success: true, message: 'Categories reordered' });
                  });
                });
              }
            });
          });
        });
      });
    });
  }

  static getContentCount(categoryId) {
    return new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as count FROM content
        WHERE category_id = ? AND is_active = 1
      `, [categoryId], (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.count : 0);
      });
    });
  }
}

module.exports = Category;
