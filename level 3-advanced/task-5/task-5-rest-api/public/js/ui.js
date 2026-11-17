/**
 * TaskFlow UI Module (ES Module)
 * 
 * Handles DOM rendering, UI component interactions, modal state,
 * and toast notifications.
 * 
 * CRITICAL SECURITY PRINCIPLE:
 * All user-supplied text (title, description, dates, error messages) is strictly
 * assigned using DOM property `node.textContent` or `document.createTextNode()`,
 * NEVER raw `innerHTML`. If an attacker submits a malicious title containing
 * `<script>` tags, event handlers (`onerror=...`), or iframe vectors, using
 * `textContent` instructs the browser engine to treat the string purely as
 * literal text rather than executable markup, completely neutralizing Cross-Site
 * Scripting (XSS) vulnerabilities.
 */

// DOM Element References
const taskListElement = document.getElementById('taskList');
const emptyStateElement = document.getElementById('emptyState');
const loadingSpinner = document.getElementById('loadingSpinner');
const errorBanner = document.getElementById('errorBanner');
const errorMessageText = document.getElementById('errorMessageText');
const retryButton = document.getElementById('retryButton');
const toastContainer = document.getElementById('toastContainer');

// Stats Elements
const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statInProgress = document.getElementById('statInProgress');
const statCompleted = document.getElementById('statCompleted');
const statOverdue = document.getElementById('statOverdue');

// Pagination Elements
const paginationContainer = document.getElementById('paginationContainer');
const pageInfo = document.getElementById('pageInfo');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');

// Modals
const editModal = document.getElementById('editModal');
const deleteModal = document.getElementById('deleteModal');

/**
 * Format ISO date string into readable local representation
 */
export function formatDate(isoString) {
  if (!isoString) return 'No due date';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Determine if a task is overdue
 */
export function isOverdue(task) {
  if (!task.dueDate || task.status === 'completed') return false;
  const due = new Date(task.dueDate);
  return due < new Date();
}

/**
 * Show / Hide the loading spinner
 */
export function setLoading(isLoading) {
  if (isLoading) {
    loadingSpinner.classList.remove('hidden');
  } else {
    loadingSpinner.classList.add('hidden');
  }
}

/**
 * Show error banner with retry option (for connection drops)
 */
export function showErrorBanner(message, onRetry) {
  errorMessageText.textContent = message;
  errorBanner.classList.remove('hidden');

  retryButton.onclick = () => {
    errorBanner.classList.add('hidden');
    if (typeof onRetry === 'function') {
      onRetry();
    }
  };
}

/**
 * Hide the error banner
 */
export function hideErrorBanner() {
  errorBanner.classList.add('hidden');
}

/**
 * Display toast notification
 */
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconSpan = document.createElement('span');
  iconSpan.className = 'toast-icon';
  if (type === 'success') iconSpan.textContent = '✓';
  else if (type === 'error') iconSpan.textContent = '✕';
  else iconSpan.textContent = 'ℹ';

  const textSpan = document.createElement('span');
  // textContent prevents XSS in toast notifications
  textSpan.textContent = message;

  toast.appendChild(iconSpan);
  toast.appendChild(textSpan);
  toastContainer.appendChild(toast);

  // Animate in and auto dismiss
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

/**
 * Update the Top Statistics Dashboard Bar
 */
export function renderStats(stats) {
  if (!stats) return;
  statTotal.textContent = stats.total ?? 0;
  statPending.textContent = stats.pending ?? 0;
  statInProgress.textContent = stats["in-progress"] ?? 0;
  statCompleted.textContent = stats.completed ?? 0;
  statOverdue.textContent = stats.overdue ?? 0;
}

/**
 * Render the Task Cards List securely using pure DOM construction
 */
export function renderTasks(tasks, handlers) {
  taskListElement.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    emptyStateElement.classList.remove('hidden');
    taskListElement.classList.add('hidden');
    return;
  }

  emptyStateElement.classList.add('hidden');
  taskListElement.classList.remove('hidden');

  tasks.forEach(task => {
    const card = document.createElement('article');
    const overdue = isOverdue(task);
    card.className = `task-card status-${task.status} priority-${task.priority} ${overdue ? 'is-overdue' : ''}`;
    card.dataset.id = task.id;

    // Card Header: Badges & Due Date
    const cardHeader = document.createElement('div');
    cardHeader.className = 'task-header';

    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'badges-container';

    // Status Badge
    const statusBadge = document.createElement('span');
    statusBadge.className = `badge badge-status badge-${task.status}`;
    // textContent for safe text insertion
    statusBadge.textContent = task.status;
    badgesContainer.appendChild(statusBadge);

    // Priority Badge
    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge badge-priority badge-${task.priority}`;
    priorityBadge.textContent = `${task.priority.toUpperCase()} PRIORITY`;
    badgesContainer.appendChild(priorityBadge);

    cardHeader.appendChild(badgesContainer);

    // Due Date Label
    const dueDateLabel = document.createElement('div');
    dueDateLabel.className = `due-date ${overdue ? 'due-overdue' : ''}`;
    dueDateLabel.textContent = overdue ? `⚠️ Overdue (${formatDate(task.dueDate)})` : `📅 Due: ${formatDate(task.dueDate)}`;
    cardHeader.appendChild(dueDateLabel);

    // Card Body: Title and Description
    const cardBody = document.createElement('div');
    cardBody.className = 'task-body';

    const titleEl = document.createElement('h3');
    titleEl.className = 'task-title';
    // textContent strictly used to render title safely
    titleEl.textContent = task.title;

    const descEl = document.createElement('p');
    descEl.className = 'task-desc';
    // textContent strictly used to render description safely
    descEl.textContent = task.description || 'No description provided.';

    cardBody.appendChild(titleEl);
    cardBody.appendChild(descEl);

    // Card Footer: Action Buttons
    const cardFooter = document.createElement('div');
    cardFooter.className = 'task-footer';

    // Status Toggle Button (PATCH)
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-sm btn-outline-status';
    toggleBtn.title = 'Cycle Status: pending ➜ in-progress ➜ completed';
    
    let nextStatus = 'in-progress';
    let toggleLabel = 'Start Progress';
    if (task.status === 'pending') {
      nextStatus = 'in-progress';
      toggleLabel = '▶ Start';
    } else if (task.status === 'in-progress') {
      nextStatus = 'completed';
      toggleLabel = '✓ Mark Done';
    } else {
      nextStatus = 'pending';
      toggleLabel = '↺ Reopen';
    }
    toggleBtn.textContent = toggleLabel;
    toggleBtn.addEventListener('click', () => handlers.onStatusToggle(task.id, nextStatus));

    // Edit Button (PUT Modal)
    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-sm btn-secondary';
    editBtn.textContent = '✎ Edit';
    editBtn.addEventListener('click', () => handlers.onEditClick(task));

    // Delete Button (DELETE Modal)
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
    deleteBtn.textContent = '🗑 Delete';
    deleteBtn.addEventListener('click', () => handlers.onDeleteClick(task));

    const actionsGroup = document.createElement('div');
    actionsGroup.className = 'actions-group';
    actionsGroup.appendChild(editBtn);
    actionsGroup.appendChild(deleteBtn);

    cardFooter.appendChild(toggleBtn);
    cardFooter.appendChild(actionsGroup);

    // Assemble Card
    card.appendChild(cardHeader);
    card.appendChild(cardBody);
    card.appendChild(cardFooter);

    taskListElement.appendChild(card);
  });
}

/**
 * Render pagination controls
 */
export function renderPagination(pagination, onPageChange) {
  if (!pagination || pagination.totalPages <= 1) {
    paginationContainer.classList.add('hidden');
    return;
  }

  paginationContainer.classList.remove('hidden');
  pageInfo.textContent = `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)`;

  prevPageBtn.disabled = pagination.page <= 1;
  nextPageBtn.disabled = pagination.page >= pagination.totalPages;

  prevPageBtn.onclick = () => onPageChange(pagination.page - 1);
  nextPageBtn.onclick = () => onPageChange(pagination.page + 1);
}

/**
 * Display field-level validation errors inside a target container
 */
export function displayFormErrors(errorContainer, errors = []) {
  errorContainer.innerHTML = '';
  if (!errors || errors.length === 0) {
    errorContainer.classList.add('hidden');
    return;
  }

  errorContainer.classList.remove('hidden');
  const list = document.createElement('ul');
  list.className = 'error-list';

  errors.forEach(err => {
    const item = document.createElement('li');
    // textContent safely renders error message text
    item.textContent = err.message || `${err.field}: invalid value`;
    list.appendChild(item);
  });

  errorContainer.appendChild(list);
}

/**
 * Open and close modal helpers
 */
export function openModal(modalEl) {
  modalEl.classList.remove('hidden');
  document.body.classList.add('modal-open');
}

export function closeModal(modalEl) {
  modalEl.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

