/**
 * Tasks Data Service Layer
 * 
 * Responsible for all file-based persistence operations on data/tasks.json.
 * Uses fs/promises for asynchronous non-blocking file I/O.
 */

const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_FILE_PATH = path.resolve(__dirname, '../../data/tasks.json');

// Default initial tasks to seed when file is missing or corrupted
const SEED_TASKS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Design RESTful API Schema",
    description: "Define endpoints, query parameters, and JSON response models for the task management service.",
    status: "completed",
    priority: "high",
    dueDate: "2026-11-10T17:00:00.000Z",
    createdAt: "2026-11-01T09:00:00.000Z",
    updatedAt: "2026-11-02T14:30:00.000Z"
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Implement Frontend Task Dashboard",
    description: "Build responsive task cards, filter controls, modal dialogs, and toast notifications using vanilla JS.",
    status: "in-progress",
    priority: "high",
    dueDate: "2026-11-18T18:00:00.000Z",
    createdAt: "2026-11-05T10:15:00.000Z",
    updatedAt: "2026-11-12T11:20:00.000Z"
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "Write Automated API Test Suite",
    description: "Test all CRUD operations, filtering, sorting, pagination, and validation errors with node:test.",
    status: "pending",
    priority: "medium",
    dueDate: "2026-11-15T12:00:00.000Z",
    createdAt: "2026-11-08T08:30:00.000Z",
    updatedAt: "2026-11-08T08:30:00.000Z"
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    title: "Review Security and Input Sanitization",
    description: "Ensure textContent is used to render user strings to prevent XSS and test bad payload handling.",
    status: "pending",
    priority: "high",
    dueDate: "2026-11-11T20:00:00.000Z",
    createdAt: "2026-11-09T13:45:00.000Z",
    updatedAt: "2026-11-09T13:45:00.000Z"
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    title: "Compile Task 5 Technical Documentation",
    description: "Document architectural layers, API reference, curl commands, and REST principles in README.md.",
    status: "pending",
    priority: "low",
    dueDate: "2026-11-25T23:59:59.000Z",
    createdAt: "2026-11-10T16:00:00.000Z",
    updatedAt: "2026-11-10T16:00:00.000Z"
  }
];

/**
 * CONCURRENCY SERIALIZATION QUEUE
 * 
 * Why serialization is critical:
 * Node.js handles I/O asynchronously via its event loop. When two or more HTTP requests
 * arrive almost simultaneously (e.g. rapid POST or PUT operations), multiple asynchronous
 * read-modify-write cycles could overlap.
 * 
 * Without synchronization:
 * 1. Request A reads tasks from disk.
 * 2. Request B reads the same tasks from disk before Request A finishes writing.
 * 3. Request A appends a task and writes to disk.
 * 4. Request B appends another task to the stale data it read in step 2 and overwrites the file.
 * Outcome: Request A's change is lost (lost update anomaly), or overlapping writes produce
 * truncated/corrupted JSON on disk.
 * 
 * By serializing mutating file operations through a sequential Promise queue, we guarantee
 * that each write operation waits for the previous write to fully settle before executing,
 * maintaining atomic file integrity and eliminating race conditions.
 */
let writeQueue = Promise.resolve();

function enqueueWrite(operation) {
  const result = writeQueue.then(operation);
  // Keep the queue alive even if a previous operation fails
  writeQueue = result.catch(() => {});
  return result;
}

/**
 * Safely reads tasks from data/tasks.json.
 * If file does not exist or contains corrupted JSON, recreates it with default seed data.
 */
async function readTasksFromFile() {
  try {
    const rawData = await fs.readFile(DATA_FILE_PATH, 'utf-8');
    const tasks = JSON.parse(rawData);
    if (!Array.isArray(tasks)) {
      throw new Error('Tasks file does not contain a JSON array.');
    }
    return tasks;
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      console.warn(`[TasksService] data/tasks.json missing or corrupted (${error.message}). Reinitializing seed data...`);
      // Ensure parent directory exists
      await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
      await fs.writeFile(DATA_FILE_PATH, JSON.stringify(SEED_TASKS, null, 2), 'utf-8');
      return [...SEED_TASKS];
    }
    throw error;
  }
}

/**
 * Writes an array of tasks to data/tasks.json with pretty formatting.
 */
async function writeTasksToFile(tasks) {
  await fs.mkdir(path.dirname(DATA_FILE_PATH), { recursive: true });
  // Write to temporary file first then atomic rename or direct write
  const jsonContent = JSON.stringify(tasks, null, 2);
  await fs.writeFile(DATA_FILE_PATH, jsonContent, 'utf-8');
}

/**
 * Retrieve all tasks.
 */
async function getAllTasks() {
  return await readTasksFromFile();
}

/**
 * Retrieve tasks with filtering, search, sorting, and pagination.
 */
async function queryTasks({ status, priority, search, sort = 'createdAt', order = 'desc', page = 1, limit = 10 }) {
  const tasks = await readTasksFromFile();
  let filtered = [...tasks];

  // Filter by status if provided
  if (status) {
    filtered = filtered.filter(t => t.status.toLowerCase() === status.toLowerCase());
  }

  // Filter by priority if provided
  if (priority) {
    filtered = filtered.filter(t => t.priority.toLowerCase() === priority.toLowerCase());
  }

  // Search in title or description (case-insensitive)
  if (search && search.trim() !== '') {
    const query = search.trim().toLowerCase();
    filtered = filtered.filter(t => 
      (t.title && t.title.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  }

  // Sorting
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  const sortDirection = order.toLowerCase() === 'asc' ? 1 : -1;

  filtered.sort((a, b) => {
    let valA = a[sort];
    let valB = b[sort];

    if (sort === 'priority') {
      valA = priorityWeight[a.priority] || 0;
      valB = priorityWeight[b.priority] || 0;
      return (valA - valB) * sortDirection;
    }

    if (sort === 'dueDate') {
      const timeA = a.dueDate ? new Date(a.dueDate).getTime() : (sortDirection === 1 ? Infinity : -Infinity);
      const timeB = b.dueDate ? new Date(b.dueDate).getTime() : (sortDirection === 1 ? Infinity : -Infinity);
      return (timeA - timeB) * sortDirection;
    }

    if (sort === 'createdAt' || sort === 'updatedAt') {
      const timeA = new Date(a[sort]).getTime() || 0;
      const timeB = new Date(b[sort]).getTime() || 0;
      return (timeA - timeB) * sortDirection;
    }

    // Default string comparison (e.g. title)
    valA = (valA || '').toString().toLowerCase();
    valB = (valB || '').toString().toLowerCase();
    return valA.localeCompare(valB) * sortDirection;
  });

  // Pagination calculations
  const total = filtered.length;
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 10);
  const totalPages = Math.ceil(total / parsedLimit) || 1;
  const startIndex = (parsedPage - 1) * parsedLimit;
  const paginatedTasks = filtered.slice(startIndex, startIndex + parsedLimit);

  return {
    tasks: paginatedTasks,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages
    }
  };
}

/**
 * Retrieve one task by ID.
 */
async function getTaskById(id) {
  const tasks = await readTasksFromFile();
  return tasks.find(t => t.id === id) || null;
}

/**
 * Create a new task (serialized write).
 */
async function createTask({ title, description = '', status = 'pending', priority = 'medium', dueDate = null }) {
  return enqueueWrite(async () => {
    const tasks = await readTasksFromFile();
    const now = new Date().toISOString();

    const newTask = {
      id: uuidv4(),
      title: title.trim(),
      description: (description || '').trim(),
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      createdAt: now,
      updatedAt: now
    };

    tasks.push(newTask);
    await writeTasksToFile(tasks);
    return newTask;
  });
}

/**
 * Replace an existing task fully (PUT) (serialized write).
 */
async function updateTask(id, { title, description = '', status, priority, dueDate = null }) {
  return enqueueWrite(async () => {
    const tasks = await readTasksFromFile();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return null;
    }

    const existing = tasks[index];
    const now = new Date().toISOString();

    const updatedTask = {
      id: existing.id,
      title: title.trim(),
      description: (description || '').trim(),
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      createdAt: existing.createdAt,
      updatedAt: now
    };

    tasks[index] = updatedTask;
    await writeTasksToFile(tasks);
    return updatedTask;
  });
}

/**
 * Partially update a task (PATCH) (serialized write).
 */
async function patchTask(id, partialData) {
  return enqueueWrite(async () => {
    const tasks = await readTasksFromFile();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return null;
    }

    const existing = tasks[index];
    const now = new Date().toISOString();

    const updatedTask = {
      ...existing,
      ...(partialData.title !== undefined && { title: partialData.title.trim() }),
      ...(partialData.description !== undefined && { description: (partialData.description || '').trim() }),
      ...(partialData.status !== undefined && { status: partialData.status }),
      ...(partialData.priority !== undefined && { priority: partialData.priority }),
      ...(partialData.dueDate !== undefined && {
        dueDate: partialData.dueDate ? new Date(partialData.dueDate).toISOString() : null
      }),
      updatedAt: now
    };

    tasks[index] = updatedTask;
    await writeTasksToFile(tasks);
    return updatedTask;
  });
}

/**
 * Delete a task by ID (serialized write).
 */
async function deleteTask(id) {
  return enqueueWrite(async () => {
    const tasks = await readTasksFromFile();
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return false;
    }

    tasks.splice(index, 1);
    await writeTasksToFile(tasks);
    return true;
  });
}

/**
 * Calculate task statistics.
 * Overdue: dueDate < current time AND status !== 'completed'
 */
async function getTaskStats() {
  const tasks = await readTasksFromFile();
  const now = new Date();

  const stats = {
    total: tasks.length,
    pending: 0,
    "in-progress": 0,
    completed: 0,
    overdue: 0
  };

  for (const task of tasks) {
    if (task.status === 'pending') stats.pending += 1;
    if (task.status === 'in-progress') stats["in-progress"] += 1;
    if (task.status === 'completed') stats.completed += 1;

    if (task.dueDate && task.status !== 'completed') {
      const due = new Date(task.dueDate);
      if (due < now) {
        stats.overdue += 1;
      }
    }
  }

  return stats;
}

module.exports = {
  getAllTasks,
  queryTasks,
  getTaskById,
  createTask,
  updateTask,
  patchTask,
  deleteTask,
  getTaskStats
};

