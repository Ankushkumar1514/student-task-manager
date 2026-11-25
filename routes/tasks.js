const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const router = express.Router();

// Store tasks in data/tasks.json relative to the project root.
const DATA_FILE = path.join(__dirname, '..', 'data', 'tasks.json');
const VALID_PRIORITIES = new Set(['low', 'medium', 'high']);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function parseValidPriority(value) {
  const normalized = String(value).toLowerCase();
  return VALID_PRIORITIES.has(normalized) ? normalized : null;
}

function parseValidDueDate(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return '';
  return DATE_PATTERN.test(trimmed) ? trimmed : null;
}

/**
 * Read all tasks from the JSON file.
 * Returns an empty array if the file does not exist yet.
 */
async function readTasks() {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Persist the full tasks array back to disk as formatted JSON.
 */
async function writeTasks(tasks) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf8');
}

// GET /api/tasks - Fetch all tasks (supports optional ?status=pending|completed and ?subject=...)
router.get('/', async (req, res) => {
  let tasks = await readTasks();
  const { status, subject } = req.query;

  if (status === 'pending') {
    tasks = tasks.filter((task) => !task.completed);
  } else if (status === 'completed') {
    tasks = tasks.filter((task) => task.completed);
  }

  if (typeof subject === 'string' && subject.trim() && subject !== 'all') {
    const target = subject.trim().toLowerCase();
    tasks = tasks.filter((task) => task.subject.toLowerCase() === target);
  }

  res.json(tasks);
});

// POST /api/tasks - Create a new task
router.post('/', async (req, res) => {
  const { title, subject, dueDate = '', priority = 'medium' } = req.body || {};

  if (typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required.' });
  }
  if (typeof subject !== 'string' || !subject.trim()) {
    return res.status(400).json({ error: 'Subject is required.' });
  }

  const normalizedPriority = parseValidPriority(priority);
  if (!normalizedPriority) {
    return res
      .status(400)
      .json({ error: 'Priority must be low, medium, or high.' });
  }

  const parsedDueDate = parseValidDueDate(dueDate);
  if (parsedDueDate === null) {
    return res
      .status(400)
      .json({ error: 'Due date must be in YYYY-MM-DD format.' });
  }

  const newTask = {
    id: crypto.randomUUID(),
    title: title.trim(),
    subject: subject.trim(),
    dueDate: parsedDueDate,
    priority: normalizedPriority,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  const tasks = await readTasks();
  tasks.push(newTask);
  await writeTasks(tasks);

  res.status(201).json(newTask);
});

// PATCH /api/tasks/:id - Update fields on an existing task (e.g., completed status)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const tasks = await readTasks();
  const task = tasks.find((item) => item.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const { title, subject, dueDate, priority, completed } = req.body || {};

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Task title cannot be empty.' });
    }
    task.title = title.trim();
  }

  if (subject !== undefined) {
    if (typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ error: 'Subject cannot be empty.' });
    }
    task.subject = subject.trim();
  }

  if (dueDate !== undefined) {
    const parsedDueDate = parseValidDueDate(dueDate);
    if (parsedDueDate === null) {
      return res
        .status(400)
        .json({ error: 'Due date must be in YYYY-MM-DD format.' });
    }
    task.dueDate = parsedDueDate;
  }

  if (priority !== undefined) {
    const normalizedPriority = parseValidPriority(priority);
    if (!normalizedPriority) {
      return res
        .status(400)
        .json({ error: 'Priority must be low, medium, or high.' });
    }
    task.priority = normalizedPriority;
  }

  if (completed !== undefined) {
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'Completed must be true or false.' });
    }
    task.completed = completed;
  }

  await writeTasks(tasks);
  res.json(task);
});

// DELETE /api/tasks/:id - Delete a task by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const tasks = await readTasks();
  const index = tasks.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  tasks.splice(index, 1);
  await writeTasks(tasks);

  res.json({ message: 'Task deleted.', id });
});

module.exports = router;
