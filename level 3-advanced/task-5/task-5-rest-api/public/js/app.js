/**
 * TaskFlow Main Application Controller (ES Module)
 * 
 * Orchestrates API communication, UI rendering, event listeners,
 * state synchronization, and client-side validation.
 */

import * as api from './api.js';
import * as ui from './ui.js';

// Application State
const state = {
  tasks: [],
  pagination: {
    total: 0,
    page: 1,
    limit: 6,
    totalPages: 1
  },
  filters: {
    status: '',
    priority: '',
    search: '',
    sort: 'createdAt',
    order: 'desc',
    page: 1,
    limit: 6
  },
  editingTaskId: null,
  deletingTaskId: null
};

// DOM Elements
const addTaskForm = document.getElementById('addTaskForm');
const addTaskErrors = document.getElementById('addTaskErrors');

const editTaskForm = document.getElementById('editTaskForm');
const editTaskErrors = document.getElementById('editTaskErrors');
const editModal = document.getElementById('editModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');

const deleteModal = document.getElementById('deleteModal');
const closeDeleteModalBtn = document.getElementById('closeDeleteModalBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteTargetTitle = document.getElementById('deleteTargetTitle');

// Filter & Sort Controls
const filterStatus = document.getElementById('filterStatus');
const filterPriority = document.getElementById('filterPriority');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const sortField = document.getElementById('sortField');
const sortOrder = document.getElementById('sortOrder');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

/**
 * Client-Side Validation matching Server Rules
 */
function validateTaskInput(data, isReplacement = false) {
  const errors = [];
  const title = (data.title || '').trim();
  const desc = (data.description || '').trim();

  if (!title) {
    errors.push({ field: 'title', message: 'Title is required.' });
  } else if (title.length < 3 || title.length > 100) {
    errors.push({ field: 'title', message: 'Title must be between 3 and 100 characters long.' });
  }

  if (desc && desc.length > 500) {
    errors.push({ field: 'description', message: 'Description cannot exceed 500 characters.' });
  }

  if (isReplacement) {
    if (!data.status) {
      errors.push({ field: 'status', message: 'Status is required.' });
    }
    if (!data.priority) {
      errors.push({ field: 'priority', message: 'Priority is required.' });
    }
  }

  if (data.dueDate) {
    const timestamp = Date.parse(data.dueDate);
    if (isNaN(timestamp)) {
      errors.push({ field: 'dueDate', message: 'Due date must be a valid date.' });
    }
  }

  return errors;
}

/**
 * Load tasks and refresh stats from the API
 */
async function loadData() {
  ui.setLoading(true);
  ui.hideErrorBanner();

  try {
    const [tasksData, statsData] = await Promise.all([
      api.fetchTasks(state.filters),
      api.fetchTaskStats()
    ]);

    state.tasks = tasksData.tasks;
    state.pagination = tasksData.pagination;

    ui.renderStats(statsData);
    ui.renderTasks(state.tasks, {
      onStatusToggle: handleStatusToggle,
      onEditClick: handleOpenEditModal,
      onDeleteClick: handleOpenDeleteModal
    });
    ui.renderPagination(state.pagination, handlePageChange);
  } catch (error) {
    console.error('Failed to load data:', error);
    ui.showErrorBanner(
      error.isNetworkError
        ? 'Could not connect to the TaskFlow server. Ensure the backend is running.'
        : `Error loading tasks: ${error.message}`,
      () => loadData()
    );
    ui.showToast('Failed to sync tasks with server', 'error');
  } finally {
    ui.setLoading(false);
  }
}

/**
 * Handle Status Quick Toggle (PATCH)
 */
async function handleStatusToggle(taskId, newStatus) {
  try {
    ui.setLoading(true);
    await api.patchTask(taskId, { status: newStatus });
    ui.showToast(`Task status updated to "${newStatus}"`, 'success');
    await loadData();
  } catch (error) {
    console.error('Error updating status:', error);
    ui.showToast(error.message || 'Failed to update task status', 'error');
  } finally {
    ui.setLoading(false);
  }
}

/**
 * Handle Add Task Submission (POST)
 */
async function handleAddTask(event) {
  event.preventDefault();
  ui.displayFormErrors(addTaskErrors, []);

  const formData = new FormData(addTaskForm);
  const taskPayload = {
    title: formData.get('title'),
    description: formData.get('description'),
    status: formData.get('status') || 'pending',
    priority: formData.get('priority') || 'medium',
    dueDate: formData.get('dueDate') || null
  };

  // Client-side validation check
  const clientErrors = validateTaskInput(taskPayload, false);
  if (clientErrors.length > 0) {
    ui.displayFormErrors(addTaskErrors, clientErrors);
    ui.showToast('Please fix validation errors before submitting.', 'error');
    return;
  }

  try {
    ui.setLoading(true);
    await api.createTask(taskPayload);
    addTaskForm.reset();
    ui.showToast('New task created successfully!', 'success');
    // Reset to page 1 to see newly added task
    state.filters.page = 1;
    await loadData();
  } catch (error) {
    console.error('Error creating task:', error);
    if (error.errors && error.errors.length > 0) {
      ui.displayFormErrors(addTaskErrors, error.errors);
    }
    ui.showToast(error.message || 'Failed to create task.', 'error');
  } finally {
    ui.setLoading(false);
  }
}

/**
 * Open Edit Modal and populate fields (PUT)
 */
function handleOpenEditModal(task) {
  state.editingTaskId = task.id;
  ui.displayFormErrors(editTaskErrors, []);

  document.getElementById('editTaskId').value = task.id;
  document.getElementById('editTitle').value = task.title;
  document.getElementById('editDescription').value = task.description || '';
  document.getElementById('editStatus').value = task.status;
  document.getElementById('editPriority').value = task.priority;

  // Format dueDate for HTML datetime-local or date input (YYYY-MM-DD)
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    document.getElementById('editDueDate').value = `${yyyy}-${mm}-${dd}`;
  } else {
    document.getElementById('editDueDate').value = '';
  }

  ui.openModal(editModal);
}

/**
 * Handle Edit Form Submission (PUT)
 */
async function handleEditTask(event) {
  event.preventDefault();
  ui.displayFormErrors(editTaskErrors, []);

  const id = state.editingTaskId;
  const payload = {
    title: document.getElementById('editTitle').value,
    description: document.getElementById('editDescription').value,
    status: document.getElementById('editStatus').value,
    priority: document.getElementById('editPriority').value,
    dueDate: document.getElementById('editDueDate').value || null
  };

  // Client validation
  const clientErrors = validateTaskInput(payload, true);
  if (clientErrors.length > 0) {
    ui.displayFormErrors(editTaskErrors, clientErrors);
    return;
  }

  try {
    ui.setLoading(true);
    await api.replaceTask(id, payload);
    ui.closeModal(editModal);
    ui.showToast('Task updated successfully!', 'success');
    await loadData();
  } catch (error) {
    console.error('Error replacing task:', error);
    if (error.errors && error.errors.length > 0) {
      ui.displayFormErrors(editTaskErrors, error.errors);
    }
    ui.showToast(error.message || 'Failed to update task.', 'error');
  } finally {
    ui.setLoading(false);
  }
}

/**
 * Open Delete Confirmation Modal (DELETE)
 */
function handleOpenDeleteModal(task) {
  state.deletingTaskId = task.id;
  deleteTargetTitle.textContent = task.title;
  ui.openModal(deleteModal);
}

/**
 * Confirm and Execute Deletion (DELETE)
 */
async function handleConfirmDelete() {
  const id = state.deletingTaskId;
  if (!id) return;

  try {
    ui.setLoading(true);
    await api.deleteTask(id);
    ui.closeModal(deleteModal);
    ui.showToast('Task deleted successfully.', 'success');
    state.deletingTaskId = null;
    await loadData();
  } catch (error) {
    console.error('Error deleting task:', error);
    ui.showToast(error.message || 'Failed to delete task.', 'error');
  } finally {
    ui.setLoading(false);
  }
}

/**
 * Handle Pagination page click
 */
function handlePageChange(newPage) {
  state.filters.page = newPage;
  loadData();
  window.scrollTo({ top: 350, behavior: 'smooth' });
}

/**
 * Debounce helper for live search input
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Event Listeners Initialization
function initEventListeners() {
  // Add task form
  addTaskForm.addEventListener('submit', handleAddTask);

  // Edit task form
  editTaskForm.addEventListener('submit', handleEditTask);
  closeEditModalBtn.addEventListener('click', () => ui.closeModal(editModal));
  cancelEditBtn.addEventListener('click', () => ui.closeModal(editModal));

  // Delete modal
  closeDeleteModalBtn.addEventListener('click', () => ui.closeModal(deleteModal));
  cancelDeleteBtn.addEventListener('click', () => ui.closeModal(deleteModal));
  confirmDeleteBtn.addEventListener('click', handleConfirmDelete);

  // Filters & Search
  filterStatus.addEventListener('change', (e) => {
    state.filters.status = e.target.value;
    state.filters.page = 1;
    loadData();
  });

  filterPriority.addEventListener('change', (e) => {
    state.filters.priority = e.target.value;
    state.filters.page = 1;
    loadData();
  });

  const onSearchChange = debounce((val) => {
    state.filters.search = val;
    state.filters.page = 1;
    loadData();
  }, 300);

  searchInput.addEventListener('input', (e) => {
    onSearchChange(e.target.value);
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    state.filters.search = '';
    state.filters.page = 1;
    loadData();
  });

  sortField.addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    loadData();
  });

  sortOrder.addEventListener('change', (e) => {
    state.filters.order = e.target.value;
    loadData();
  });

  resetFiltersBtn.addEventListener('click', () => {
    filterStatus.value = '';
    filterPriority.value = '';
    searchInput.value = '';
    sortField.value = 'createdAt';
    sortOrder.value = 'desc';

    state.filters.status = '';
    state.filters.priority = '';
    state.filters.search = '';
    state.filters.sort = 'createdAt';
    state.filters.order = 'desc';
    state.filters.page = 1;

    loadData();
  });

  // Close modals on clicking backdrop
  window.addEventListener('click', (e) => {
    if (e.target === editModal) ui.closeModal(editModal);
    if (e.target === deleteModal) ui.closeModal(deleteModal);
  });

  // ESC key closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ui.closeModal(editModal);
      ui.closeModal(deleteModal);
    }
  });
}

// Bootstrap Application on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadData();
});

