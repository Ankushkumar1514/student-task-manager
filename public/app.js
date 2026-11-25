const taskForm = document.getElementById('task-form');
const titleInput = document.getElementById('title');
const subjectInput = document.getElementById('subject');
const dueDateInput = document.getElementById('dueDate');
const prioritySelect = document.getElementById('priority');
const submitBtn = taskForm.querySelector('button[type="submit"]');
const formError = document.getElementById('form-error');
const taskList = document.getElementById('task-list');
const taskStats = document.getElementById('task-stats');
const filterButtons = document.querySelectorAll('.filter-btn');
const subjectFilter = document.getElementById('subject-filter');

const LOCAL_STORAGE_KEY = 'student_task_manager_tasks_v1';
const SAMPLE_TASKS = [
  {
    id: 'sample-1',
    title: 'Finish Calculus Problem Set 3',
    subject: 'Mathematics',
    dueDate: '2026-11-28',
    priority: 'high',
    completed: false,
    createdAt: '2026-11-26T00:55:00.000Z',
  },
  {
    id: 'sample-2',
    title: 'Read Chapter 4: Cell Structure',
    subject: 'Biology',
    dueDate: '2026-11-30',
    priority: 'medium',
    completed: false,
    createdAt: '2026-11-26T00:56:00.000Z',
  },
];

// Application state
let tasks = [];
let statusFilter = 'all';
let selectedSubject = 'all';
// Uses 'api' when Express is available, or 'local' on static hosts like GitHub Pages.
let storageMode = 'api';

/**
 * Shared fetch helper so every API call handles JSON and errors consistently.
 */
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

function readLocalTasks() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved === null) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SAMPLE_TASKS));
    return SAMPLE_TASKS.map((task) => ({ ...task }));
  }
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalTasks(nextTasks) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextTasks));
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function clearError() {
  formError.textContent = '';
  formError.hidden = true;
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function updateStats() {
  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = tasks.length - completedCount;
  taskStats.textContent = `${pendingCount} pending · ${completedCount} done`;
}

function updateSubjectOptions() {
  const subjects = Array.from(new Set(tasks.map((task) => task.subject))).sort(
    (a, b) => a.localeCompare(b)
  );

  if (selectedSubject !== 'all' && !subjects.includes(selectedSubject)) {
    selectedSubject = 'all';
  }

  subjectFilter.innerHTML = '<option value="all">All Subjects</option>';
  for (const subject of subjects) {
    const option = document.createElement('option');
    option.value = subject;
    option.textContent = subject;
    subjectFilter.appendChild(option);
  }
  subjectFilter.value = selectedSubject;
}

function getVisibleTasks() {
  return tasks
    .filter((task) => {
      if (statusFilter === 'pending' && task.completed) return false;
      if (statusFilter === 'completed' && !task.completed) return false;
      if (selectedSubject !== 'all' && task.subject !== selectedSubject) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
}

function createTaskElement(task, today) {
  const li = document.createElement('li');
  li.className = `task-item${task.completed ? ' completed' : ''}`;

  const left = document.createElement('div');
  left.className = 'task-left';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'task-checkbox';
  checkbox.checked = task.completed;
  checkbox.setAttribute('aria-label', `Mark "${task.title}" as completed`);
  checkbox.addEventListener('change', () => {
    toggleTask(task.id, checkbox.checked);
  });

  const details = document.createElement('div');

  const title = document.createElement('div');
  title.className = 'task-title';
  title.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'task-meta';

  const subjectBadge = document.createElement('span');
  subjectBadge.className = 'badge badge-subject';
  subjectBadge.textContent = task.subject;
  meta.appendChild(subjectBadge);

  const priorityBadge = document.createElement('span');
  priorityBadge.className = `badge badge-${task.priority}`;
  priorityBadge.textContent = `${task.priority} priority`;
  meta.appendChild(priorityBadge);

  if (task.dueDate) {
    const dueSpan = document.createElement('span');
    if (!task.completed && task.dueDate < today) {
      dueSpan.className = 'due-overdue';
      dueSpan.textContent = `Due: ${task.dueDate} (Overdue)`;
    } else if (!task.completed && task.dueDate === today) {
      dueSpan.className = 'due-today';
      dueSpan.textContent = `Due: ${task.dueDate} (Today)`;
    } else {
      dueSpan.textContent = `Due: ${task.dueDate}`;
    }
    meta.appendChild(dueSpan);
  }

  details.append(title, meta);
  left.append(checkbox, details);

  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn-delete';
  deleteBtn.textContent = 'Delete';
  deleteBtn.addEventListener('click', () => {
    deleteTask(task.id);
  });

  li.append(left, deleteBtn);
  return li;
}

function render() {
  updateStats();
  updateSubjectOptions();

  const visibleTasks = getVisibleTasks();
  const today = getTodayString();
  taskList.innerHTML = '';

  if (tasks.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'No tasks yet. Add your first task above!';
    taskList.appendChild(empty);
    return;
  }

  if (visibleTasks.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'No tasks match the selected filters.';
    taskList.appendChild(empty);
    return;
  }

  for (const task of visibleTasks) {
    taskList.appendChild(createTaskElement(task, today));
  }
}

async function loadTasks() {
  try {
    const response = await fetch('api/tasks');
    const contentType = response.headers.get('content-type') || '';
    if (response.ok && contentType.includes('application/json')) {
      storageMode = 'api';
      tasks = await response.json();
      render();
      return;
    }
  } catch {
    // Fall back to localStorage when no Express backend is reachable.
  }

  storageMode = 'local';
  tasks = readLocalTasks();
  render();
}

async function toggleTask(id, completed) {
  try {
    if (storageMode === 'api') {
      const updated = await apiRequest(`api/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed }),
      });
      tasks = tasks.map((task) => (task.id === id ? updated : task));
    } else {
      tasks = tasks.map((task) =>
        task.id === id ? { ...task, completed } : task
      );
      writeLocalTasks(tasks);
    }
    render();
  } catch (err) {
    showError(err.message);
    render();
  }
}

async function deleteTask(id) {
  try {
    if (storageMode === 'api') {
      await apiRequest(`api/tasks/${id}`, { method: 'DELETE' });
    }
    tasks = tasks.filter((task) => task.id !== id);
    if (storageMode === 'local') {
      writeLocalTasks(tasks);
    }
    render();
  } catch (err) {
    showError(err.message);
  }
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    statusFilter = button.dataset.filter;
    filterButtons.forEach((btn) =>
      btn.classList.toggle('active', btn === button)
    );
    render();
  });
});

subjectFilter.addEventListener('change', () => {
  selectedSubject = subjectFilter.value;
  render();
});

[titleInput, subjectInput, dueDateInput].forEach((input) => {
  input.addEventListener('input', clearError);
});

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();

  const title = titleInput.value.trim();
  const subject = subjectInput.value.trim();
  const dueDate = dueDateInput.value;
  const priority = prioritySelect.value;

  if (!title || !subject) {
    showError('Please enter both a task title and a subject.');
    return;
  }

  submitBtn.disabled = true;
  try {
    if (storageMode === 'api') {
      const created = await apiRequest('api/tasks', {
        method: 'POST',
        body: JSON.stringify({ title, subject, dueDate, priority }),
      });
      tasks.push(created);
    } else {
      const created = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `task-${Date.now()}`,
        title,
        subject,
        dueDate,
        priority,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      tasks.push(created);
      writeLocalTasks(tasks);
    }
    taskForm.reset();
    render();
    titleInput.focus();
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

loadTasks();
