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

// Application state
let tasks = [];
let statusFilter = 'all';
let selectedSubject = 'all';

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
    tasks = await apiRequest('/api/tasks');
    render();
  } catch (err) {
    taskList.innerHTML = '';
    const errorItem = document.createElement('li');
    errorItem.className = 'empty-state';
    errorItem.textContent = `Could not load tasks: ${err.message}`;
    taskList.appendChild(errorItem);
  }
}

async function toggleTask(id, completed) {
  try {
    const updated = await apiRequest(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    });
    tasks = tasks.map((task) => (task.id === id ? updated : task));
    render();
  } catch (err) {
    showError(err.message);
    render();
  }
}

async function deleteTask(id) {
  try {
    await apiRequest(`/api/tasks/${id}`, { method: 'DELETE' });
    tasks = tasks.filter((task) => task.id !== id);
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
    const created = await apiRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, subject, dueDate, priority }),
    });
    tasks.push(created);
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
