const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Content = require('../models/Content');

const includeInactive = (req) => req.query.includeInactive === '1' || req.query.includeInactive === 'true';

// Fixed routes come before /:id so they are not swallowed by the param route.
router.post('/reorder', async (req, res) => {
  try {
    const { categories } = req.body;
    if (!Array.isArray(categories)) {
      return res.status(400).json({ error: 'Categories array is required' });
    }
    res.json(await Category.reorder(categories));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/content', async (req, res) => {
  try {
    const category = await Category.getById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const content = await Content.getByCategory(req.params.id);
    res.json({ category, content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const categories = await Category.getAll(includeInactive(req));
    const withCounts = await Promise.all(categories.map(async category => ({
      ...category,
      content_count: await Category.getContentCount(category.id)
    })));
    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const category = await Category.getById(req.params.id, includeInactive(req));
    if (!category) return res.status(404).json({ error: 'Category not found' });
    const contentCount = await Category.getContentCount(req.params.id);
    res.json({ ...category, content_count: contentCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, color, icon, order_index } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Category name is required' });

    const newCategory = await Category.create({
      name: name.trim(),
      description: description || '',
      color: color || '#FF5733',
      icon: icon || 'film',
      order_index: Number.isFinite(Number(order_index)) ? Number(order_index) : 0
    });

    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Category creation error:', err);
    const status = /UNIQUE constraint failed/i.test(err.message || '') ? 409 : 500;
    res.status(status).json({ error: status === 409 ? 'A category with this name already exists.' : (err.message || 'Failed to create category') });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const current = await Category.getById(id, true);
    if (!current) return res.status(404).json({ error: 'Category not found' });

    const result = await Category.update(id, {
      name: req.body.name !== undefined ? String(req.body.name).trim() : current.name,
      description: req.body.description !== undefined ? req.body.description : current.description,
      color: req.body.color !== undefined ? req.body.color : current.color,
      icon: req.body.icon !== undefined ? req.body.icon : current.icon,
      order_index: req.body.order_index !== undefined ? Number(req.body.order_index) : current.order_index,
      is_active: req.body.is_active !== undefined ? (req.body.is_active === true || req.body.is_active === 1 || req.body.is_active === '1' || req.body.is_active === 'true') : Boolean(current.is_active)
    });
    res.json(result);
  } catch (err) {
    const status = /UNIQUE constraint failed/i.test(err.message || '') ? 409 : 500;
    res.status(status).json({ error: status === 409 ? 'A category with this name already exists.' : err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.getById(req.params.id, true);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    res.json(await Category.delete(req.params.id));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
