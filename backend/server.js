const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const path = require('path');
const db = require('./models/database');

const app = express();
const PORT = Number(process.env.PORT) || 3002;

app.disable('x-powered-by');

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }));
app.use(fileUpload({
  createParentPath: true,
  abortOnLimit: true,
  limits: { fileSize: 500 * 1024 * 1024 }
}));

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

const contentRoutes = require('./routes/content');
const categoryRoutes = require('./routes/category');
const settingsRoutes = require('./routes/settings');

app.use('/api/content', contentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/settings', settingsRoutes);

app.use('/streaming', express.static(path.join(__dirname, '../frontend/streaming'), { extensions: ['html'] }));
app.use('/admin', express.static(path.join(__dirname, '../frontend/admin'), { extensions: ['html'] }));

app.get('/', (req, res) => res.redirect('/streaming/'));
app.get('/api', (req, res) => res.json({ message: 'Rstream API', version: '1.0.0' }));

// Keep SPA/static paths predictable when users open the directories directly.
app.get('/streaming', (req, res) => res.sendFile(path.join(__dirname, '../frontend/streaming/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../frontend/admin/index.html')));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Route not found' });
  res.status(404).send('Page not found');
});

app.use((err, req, res, next) => {
  console.error(err.stack || err);
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large (maximum 500 MB).' });
  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

db.initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Streaming site: http://localhost:${PORT}/streaming/`);
      console.log(`Admin site: http://localhost:${PORT}/admin/`);
    });
  })
  .catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });

module.exports = app;
