const path = require('path');
const express = require('express');
const tasksRouter = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

// Built-in Express middleware that parses incoming JSON request bodies
// so we can read them via req.body in POST/PATCH routes.
app.use(express.json());

// Serve static frontend files (HTML, CSS, browser JS) from the public/ folder.
app.use(express.static(path.join(__dirname, 'public')));

// Health-check route to verify the Express server is alive and responding.
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Student Task Manager server is running!',
  });
});

// Mount all /api/tasks routes from routes/tasks.js
app.use('/api/tasks', tasksRouter);

// Central error-handling middleware (4 parameters tells Express this catches errors)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
