/**
 * Dashboard Controller Module
 * Handles task fetching, filtering, CRUD operations, and safe DOM rendering.
 */
import { api } from './api.js';
import { checkAuth, logout } from './auth.js';
import { showToast, openModal, closeModal, formatDate } from './ui.js';

let currentUser = null;
let currentPage = 1;
let currentLimit = 9;
let currentTotalPages = 1;
let activeDeleteTaskId = null;

// DOM Elements Cache
const userDisplayName = document.getElementById('user-display-name');
const userRoleBadge = document.getElementById('user-role-badge');
const adminNavLink = document.getElementById('admin-nav-link');
const logoutBtn = document.getElementById('logout-btn');

const statTotal = document.getElementById('stat-total');
const statPending = document.getElementById('stat-pending');
const statInProgress = document.getElementById('stat-in-progress');
const statCompleted = document.getElementById('stat-completed');

const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');
const priorityFilter = document.getElementById('priority-filter');
const sortFilter = document.getElementById('sort-filter');
const tasksContainer = document.getElementById('tasks-container');

const paginationContainer = document.getElementById('pagination-container');
const prevPageBtn = document.getElementById('prev-page-btn');
const nextPageBtn = document.getElementById('next-page-btn');
const pageInfo = document.getElementById('page-info');

// Modal Elements
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const modalTitle = document.getElementById('modal-title');
const taskIdInput = document.getElementById('task-id');
const taskTitleInput = document.getElementById('task-title');
const taskDescInput = document.getElementById('task-description');
const taskStatusInput = document.getElementById('task-status');
const taskPriorityInput = document.getElementById('task-priority');
const taskDueDateInput = document.getElementById('task-due-date');
const taskTitleError = document.getElementById('task-title-error');
const taskDescError = document.getElementById('task-desc-error');

const addTaskBtn = document.getElementById('add-task-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTaskBtn = document.getElementById('cancel-task-btn');

const deleteModal = document.getElementById('delete-modal');
const deleteTaskTitle = document.getElementById('delete-task-title');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const closeDeleteModal = document.getElementById('close-delete-modal');

/**
 * Initialize Dashboard
 */
const init = async () => {
  currentUser = await checkAuth(true);
  if (!currentUser) return;

  // Set user profile info securely via textContent
  userDisplayName.textContent = currentUser.name;
  userRoleBadge.textContent = currentUser.role === 'admin' ? 'Admin' : 'User';
  userRoleBadge.className = `badge ${currentUser.role === 'admin' ? 'badge-admin' : 'badge-user'}`;

  // If user is admin, show navigation link to admin console
  if (currentUser.role === 'admin') {
    adminNavLink.style.display = 'inline-flex';
  }

  // Load stats and tasks
  await Promise.all([loadStats(), loadTasks()]);
};

/**
 * Fetch and display task statistics
 */
const loadStats = async () => {
  try {
    const res = await api.get('/tasks/stats');
    const { total, byStatus } = res.data.stats;
    statTotal.textContent = total || 0;
    statPending.textContent = byStatus?.pending || 0;
    statInProgress.textContent = byStatus?.['in-progress'] || 0;
    statCompleted.textContent = byStatus?.completed || 0;
  } catch (err) {
    console.error('Failed to load stats:', err.message);
  }
};

/**
 * Fetch tasks based on active filters and pagination
 */
const loadTasks = async () => {
  tasksContainer.innerHTML = '';
  
  // Show loading skeleton
  const loadingEl = document.createElement('div');
  loadingEl.className = 'empty-state';
  loadingEl.textContent = 'Loading your tasks...';
  tasksContainer.appendChild(loadingEl);

  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: currentLimit,
      sort: sortFilter.value,
    });

    if (statusFilter.value) params.append('status', statusFilter.value);
    if (priorityFilter.value) params.append('priority', priorityFilter.value);
    if (searchInput.value.trim()) params.append('search', searchInput.value.trim());

    const res = await api.get(`/tasks?${params.toString()}`);
    const { tasks, pagination } = res.data;

    renderTasks(tasks);
    updatePagination(pagination);
  } catch (err) {
    tasksContainer.innerHTML = '';
    const errEl = document.createElement('div');
    errEl.className = 'empty-state';
    errEl.textContent = `Error loading tasks: ${err.message}`;
    tasksContainer.appendChild(errEl);
    showToast(err.message, 'error');
  }
};

/**
 * Render task cards safely into DOM using textContent
 * @param {Array} tasks
 */
const renderTasks = (tasks) => {
  tasksContainer.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';

    const icon = document.createElement('div');
    icon.className = 'empty-icon';
    icon.textContent = '📝';

    const heading = document.createElement('h3');
    heading.textContent = 'No tasks found';

    const msg = document.createElement('p');
    msg.textContent = 'Create your first task or adjust your search and filters.';

    emptyState.appendChild(icon);
    emptyState.appendChild(heading);
    emptyState.appendChild(msg);
    tasksContainer.appendChild(emptyState);
    return;
  }

  tasks.forEach((task) => {
    /**
     * SECURITY NOTE: XSS DEFENSE MECHANISM.
     * Every user-provided property (task.title, task.description, dates) is inserted
     * strictly via document.createElement() and .textContent.
     * We avoid innerHTML so malicious scripts or HTML injections cannot execute.
     */
    const card = document.createElement('div');
    card.className = `task-card ${task.status}`;

    // Header: Title and Badges
    const header = document.createElement('div');
    header.className = 'task-header';

    const title = document.createElement('h4');
    title.className = 'task-title';
    title.textContent = task.title;

    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'task-badges';

    const statusBadge = document.createElement('span');
    statusBadge.className = `badge badge-${task.status}`;
    statusBadge.textContent = task.status;

    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge badge-${task.priority}`;
    priorityBadge.textContent = task.priority;

    badgesContainer.appendChild(statusBadge);
    badgesContainer.appendChild(priorityBadge);
    header.appendChild(title);
    header.appendChild(badgesContainer);

    // Description
    const desc = document.createElement('p');
    desc.className = 'task-description';
    desc.textContent = task.description || 'No description provided.';

    // Meta (Due Date)
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.textContent = `📅 ${formatDate(task.dueDate)}`;

    // Actions
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    // Quick status toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-secondary btn-sm';
    toggleBtn.textContent =
      task.status === 'completed'
        ? '↩ Mark Pending'
        : task.status === 'pending'
        ? '▶ Start'
        : '✓ Complete';
    toggleBtn.addEventListener('click', () => handleToggleStatus(task));

    // Edit and Delete button group
    const btnGroup = document.createElement('div');
    btnGroup.className = 'action-buttons';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-secondary btn-sm';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openEditModal(task));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => openDeleteConfirmation(task));

    btnGroup.appendChild(editBtn);
    btnGroup.appendChild(deleteBtn);

    actions.appendChild(toggleBtn);
    actions.appendChild(btnGroup);

    card.appendChild(header);
    card.appendChild(desc);
    card.appendChild(meta);
    card.appendChild(actions);

    tasksContainer.appendChild(card);
  });
};

/**
 * Handle quick status progression
 */
const handleToggleStatus = async (task) => {
  let nextStatus = 'pending';
  if (task.status === 'pending') nextStatus = 'in-progress';
  else if (task.status === 'in-progress') nextStatus = 'completed';
  else if (task.status === 'completed') nextStatus = 'pending';

  try {
    await api.patch(`/tasks/${task._id}`, { status: nextStatus });
    showToast(`Task status updated to "${nextStatus}"`, 'success');
    await Promise.all([loadStats(), loadTasks()]);
  } catch (err) {
    showToast(`Failed to update status: ${err.message}`, 'error');
  }
};

/**
 * Update pagination UI state
 */
const updatePagination = (pagination) => {
  if (!pagination || pagination.totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }

  paginationContainer.style.display = 'flex';
  currentPage = pagination.page;
  currentTotalPages = pagination.totalPages;

  pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= currentTotalPages;
};

/**
 * Open Modal to Add a New Task
 */
const openAddModal = () => {
  modalTitle.textContent = 'Create New Task';
  taskIdInput.value = '';
  taskTitleInput.value = '';
  taskDescInput.value = '';
  taskStatusInput.value = 'pending';
  taskPriorityInput.value = 'medium';
  taskDueDateInput.value = '';

  clearModalErrors();
  openModal('task-modal');
  taskTitleInput.focus();
};

/**
 * Open Modal to Edit an Existing Task
 */
const openEditModal = (task) => {
  modalTitle.textContent = 'Edit Task';
  taskIdInput.value = task._id;
  taskTitleInput.value = task.title;
  taskDescInput.value = task.description || '';
  taskStatusInput.value = task.status;
  taskPriorityInput.value = task.priority;

  if (task.dueDate) {
    taskDueDateInput.value = new Date(task.dueDate).toISOString().split('T')[0];
  } else {
    taskDueDateInput.value = '';
  }

  clearModalErrors();
  openModal('task-modal');
  taskTitleInput.focus();
};

const clearModalErrors = () => {
  taskTitleInput.classList.remove('error');
  taskDescInput.classList.remove('error');
  taskTitleError.classList.remove('active');
  taskDescError.classList.remove('active');
  taskTitleError.textContent = '';
  taskDescError.textContent = '';
};

/**
 * Save Task (Create or Update)
 */
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearModalErrors();

  const title = taskTitleInput.value.trim();
  const description = taskDescInput.value.trim();
  const status = taskStatusInput.value;
  const priority = taskPriorityInput.value;
  const dueDate = taskDueDateInput.value ? new Date(taskDueDateInput.value).toISOString() : null;
  const taskId = taskIdInput.value;

  let hasError = false;

  if (!title || title.length < 3 || title.length > 100) {
    taskTitleInput.classList.add('error');
    taskTitleError.textContent = 'Title must be between 3 and 100 characters.';
    taskTitleError.classList.add('active');
    hasError = true;
  }

  if (description.length > 500) {
    taskDescInput.classList.add('error');
    taskDescError.textContent = 'Description cannot exceed 500 characters.';
    taskDescError.classList.add('active');
    hasError = true;
  }

  if (hasError) return;

  const payload = { title, description, status, priority, dueDate };

  try {
    if (taskId) {
      await api.put(`/tasks/${taskId}`, payload);
      showToast('Task updated successfully!', 'success');
    } else {
      await api.post('/tasks', payload);
      showToast('Task created successfully!', 'success');
    }

    closeModal('task-modal');
    await Promise.all([loadStats(), loadTasks()]);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/**
 * Open Delete Confirmation
 */
const openDeleteConfirmation = (task) => {
  activeDeleteTaskId = task._id;
  deleteTaskTitle.textContent = `"${task.title}"`;
  openModal('delete-modal');
};

/**
 * Confirm Delete Task
 */
confirmDeleteBtn.addEventListener('click', async () => {
  if (!activeDeleteTaskId) return;

  try {
    await api.delete(`/tasks/${activeDeleteTaskId}`);
    showToast('Task deleted successfully', 'success');
    closeModal('delete-modal');
    activeDeleteTaskId = null;
    await Promise.all([loadStats(), loadTasks()]);
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'error');
  }
});

// Event Listeners for Filters and Toolbar
let searchDebounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    currentPage = 1;
    loadTasks();
  }, 350);
});

statusFilter.addEventListener('change', () => {
  currentPage = 1;
  loadTasks();
});

priorityFilter.addEventListener('change', () => {
  currentPage = 1;
  loadTasks();
});

sortFilter.addEventListener('change', () => {
  currentPage = 1;
  loadTasks();
});

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadTasks();
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < currentTotalPages) {
    currentPage++;
    loadTasks();
  }
});

addTaskBtn.addEventListener('click', openAddModal);
closeModalBtn.addEventListener('click', () => closeModal('task-modal'));
cancelTaskBtn.addEventListener('click', () => closeModal('task-modal'));

cancelDeleteBtn.addEventListener('click', () => closeModal('delete-modal'));
closeDeleteModal.addEventListener('click', () => closeModal('delete-modal'));

logoutBtn.addEventListener('click', logout);

// Initialize application
init();
