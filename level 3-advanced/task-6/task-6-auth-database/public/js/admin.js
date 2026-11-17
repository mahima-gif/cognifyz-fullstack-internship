/**
 * Admin Console Controller Module
 * Handles administrative overview, user management, and global tasks audit.
 */
import { api } from './api.js';
import { checkAuth, logout } from './auth.js';
import { showToast, openModal, closeModal, formatDate } from './ui.js';

let currentAdmin = null;
let activeDeleteUserId = null;

// DOM Elements
const adminDisplayName = document.getElementById('admin-display-name');
const logoutBtn = document.getElementById('logout-btn');

const statTotalUsers = document.getElementById('stat-total-users');
const statTotalAdmins = document.getElementById('stat-total-admins');
const statTotalTasks = document.getElementById('stat-total-tasks');

const usersTableBody = document.getElementById('users-table-body');
const tasksTableBody = document.getElementById('tasks-table-body');
const refreshUsersBtn = document.getElementById('refresh-users-btn');
const refreshTasksBtn = document.getElementById('refresh-tasks-btn');

// Delete User Modal Elements
const deleteUserModal = document.getElementById('delete-user-modal');
const deleteUserInfo = document.getElementById('delete-user-info');
const confirmDeleteUserBtn = document.getElementById('confirm-delete-user-btn');
const cancelDeleteUserBtn = document.getElementById('cancel-delete-user-btn');
const closeDeleteUserModal = document.getElementById('close-delete-user-modal');

/**
 * Initialize Admin Console
 */
const init = async () => {
  currentAdmin = await checkAuth(true);
  if (!currentAdmin) return;

  // Enforce client-side role check: redirect normal users back to dashboard
  if (currentAdmin.role !== 'admin') {
    showToast('Access denied: Administrator privileges required', 'error');
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1000);
    return;
  }

  adminDisplayName.textContent = currentAdmin.name;

  await loadAdminData();
};

/**
 * Load both users and global tasks
 */
const loadAdminData = async () => {
  await Promise.all([loadUsers(), loadAllTasks()]);
};

/**
 * Fetch and render all users
 */
const loadUsers = async () => {
  usersTableBody.innerHTML = '';
  
  const loadingRow = document.createElement('tr');
  const loadingCell = document.createElement('td');
  loadingCell.colSpan = 6;
  loadingCell.className = 'text-center text-muted';
  loadingCell.textContent = 'Loading user registry...';
  loadingRow.appendChild(loadingCell);
  usersTableBody.appendChild(loadingRow);

  try {
    const res = await api.get('/admin/users');
    const { users } = res.data;

    renderUsers(users);

    // Update User Stats
    statTotalUsers.textContent = users.length;
    const adminCount = users.filter((u) => u.role === 'admin').length;
    statTotalAdmins.textContent = adminCount;
  } catch (err) {
    usersTableBody.innerHTML = '';
    const errRow = document.createElement('tr');
    const errCell = document.createElement('td');
    errCell.colSpan = 6;
    errCell.className = 'text-center';
    errCell.style.color = 'var(--danger)';
    errCell.textContent = `Failed to load users: ${err.message}`;
    errRow.appendChild(errCell);
    usersTableBody.appendChild(errRow);
    showToast(err.message, 'error');
  }
};

/**
 * Render users securely into table
 * @param {Array} users
 */
const renderUsers = (users) => {
  usersTableBody.innerHTML = '';

  if (!users || users.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 6;
    emptyCell.className = 'text-center text-muted';
    emptyCell.textContent = 'No registered users found.';
    emptyRow.appendChild(emptyCell);
    usersTableBody.appendChild(emptyRow);
    return;
  }

  users.forEach((user) => {
    /**
     * SECURITY NOTE: Preventing XSS in User Tables.
     * All user properties (user.name, user.email, etc.) are strictly set via textContent.
     * Direct innerHTML insertion is avoided to protect against malicious script injections.
     */
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.className = 'font-semibold';
    nameCell.textContent = user.name;

    const emailCell = document.createElement('td');
    emailCell.textContent = user.email;

    const roleCell = document.createElement('td');
    const roleBadge = document.createElement('span');
    roleBadge.className = `badge badge-${user.role}`;
    roleBadge.textContent = user.role;
    roleCell.appendChild(roleBadge);

    const countCell = document.createElement('td');
    countCell.textContent = `${user.taskCount || 0} task(s)`;

    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(user.createdAt);

    const actionsCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-sm';
    deleteBtn.textContent = 'Delete User';

    // Prevent deleting one's own account
    if (user._id === currentAdmin._id) {
      deleteBtn.disabled = true;
      deleteBtn.title = 'You cannot delete your own active administrator account';
      deleteBtn.textContent = 'Self (Active)';
      deleteBtn.classList.remove('btn-danger');
      deleteBtn.classList.add('btn-secondary');
    } else {
      deleteBtn.addEventListener('click', () => openDeleteUserConfirmation(user));
    }

    actionsCell.appendChild(deleteBtn);

    row.appendChild(nameCell);
    row.appendChild(emailCell);
    row.appendChild(roleCell);
    row.appendChild(countCell);
    row.appendChild(dateCell);
    row.appendChild(actionsCell);

    usersTableBody.appendChild(row);
  });
};

/**
 * Fetch and render all global system tasks
 */
const loadAllTasks = async () => {
  tasksTableBody.innerHTML = '';
  
  const loadingRow = document.createElement('tr');
  const loadingCell = document.createElement('td');
  loadingCell.colSpan = 5;
  loadingCell.className = 'text-center text-muted';
  loadingCell.textContent = 'Loading global tasks...';
  loadingRow.appendChild(loadingCell);
  tasksTableBody.appendChild(loadingRow);

  try {
    const res = await api.get('/admin/tasks');
    const { tasks, total } = res.data;

    renderAllTasks(tasks);
    statTotalTasks.textContent = total || 0;
  } catch (err) {
    tasksTableBody.innerHTML = '';
    const errRow = document.createElement('tr');
    const errCell = document.createElement('td');
    errCell.colSpan = 5;
    errCell.className = 'text-center';
    errCell.style.color = 'var(--danger)';
    errCell.textContent = `Failed to load tasks: ${err.message}`;
    errRow.appendChild(errCell);
    tasksTableBody.appendChild(errRow);
  }
};

/**
 * Render all tasks securely into table
 * @param {Array} tasks
 */
const renderAllTasks = (tasks) => {
  tasksTableBody.innerHTML = '';

  if (!tasks || tasks.length === 0) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 5;
    emptyCell.className = 'text-center text-muted';
    emptyCell.textContent = 'No tasks exist in the system yet.';
    emptyRow.appendChild(emptyCell);
    tasksTableBody.appendChild(emptyRow);
    return;
  }

  tasks.forEach((task) => {
    /**
     * SECURITY NOTE: Safe textContent insertion for global task lists
     */
    const row = document.createElement('tr');

    const titleCell = document.createElement('td');
    titleCell.className = 'font-semibold';
    titleCell.textContent = task.title;

    const ownerCell = document.createElement('td');
    if (task.owner) {
      ownerCell.textContent = `${task.owner.name} (${task.owner.email})`;
    } else {
      ownerCell.textContent = 'Unknown (Orphaned)';
    }

    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = `badge badge-${task.status}`;
    statusBadge.textContent = task.status;
    statusCell.appendChild(statusBadge);

    const priorityCell = document.createElement('td');
    const priorityBadge = document.createElement('span');
    priorityBadge.className = `badge badge-${task.priority}`;
    priorityBadge.textContent = task.priority;
    priorityCell.appendChild(priorityBadge);

    const dateCell = document.createElement('td');
    dateCell.textContent = formatDate(task.dueDate);

    row.appendChild(titleCell);
    row.appendChild(ownerCell);
    row.appendChild(statusCell);
    row.appendChild(priorityCell);
    row.appendChild(dateCell);

    tasksTableBody.appendChild(row);
  });
};

/**
 * Open confirmation modal to delete a user
 */
const openDeleteUserConfirmation = (user) => {
  activeDeleteUserId = user._id;
  deleteUserInfo.textContent = `${user.name} (${user.email}) - ${user.taskCount || 0} associated tasks`;
  openModal('delete-user-modal');
};

/**
 * Confirm user deletion
 */
confirmDeleteUserBtn.addEventListener('click', async () => {
  if (!activeDeleteUserId) return;

  try {
    const res = await api.delete(`/admin/users/${activeDeleteUserId}`);
    showToast(res.message, 'success');
    closeModal('delete-user-modal');
    activeDeleteUserId = null;
    await loadAdminData();
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'error');
  }
});

// Event Listeners
refreshUsersBtn.addEventListener('click', loadUsers);
refreshTasksBtn.addEventListener('click', loadAllTasks);

cancelDeleteUserBtn.addEventListener('click', () => closeModal('delete-user-modal'));
closeDeleteUserModal.addEventListener('click', () => closeModal('delete-user-modal'));

logoutBtn.addEventListener('click', logout);

// Bootstrap admin application
init();
