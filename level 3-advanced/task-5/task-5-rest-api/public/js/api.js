/**
 * TaskFlow API Service Module (ES Module)
 * 
 * Centralizes all HTTP communication with the Express REST API.
 * Encapsulates fetch logic, JSON parsing, query parameter serialization,
 * and robust error normalization.
 */

const BASE_URL = '/api/tasks';

/**
 * Universal HTTP request wrapper.
 * Handles headers, JSON serialization/deserialization, and error extraction.
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {})
    }
  };

  try {
    const response = await fetch(url, config);

    // Parse JSON payload if present
    let jsonResult = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      jsonResult = await response.json();
    }

    if (!response.ok) {
      // Build descriptive error object with server-provided validation errors
      const message = (jsonResult && jsonResult.message) || `HTTP error ${response.status}: ${response.statusText}`;
      const err = new Error(message);
      err.status = response.status;
      err.errors = (jsonResult && jsonResult.errors) || [];
      err.data = jsonResult;
      throw err;
    }

    return jsonResult;
  } catch (error) {
    // If the error was already structured by our response check, rethrow it
    if (error.status) {
      throw error;
    }

    // Otherwise, it was a network drop / connection refused
    const networkError = new Error('Network error: Unable to connect to the TaskFlow server. Please check your connection.');
    networkError.status = 0;
    networkError.isNetworkError = true;
    networkError.errors = [];
    throw networkError;
  }
}

/**
 * Fetch tasks with optional filters, search, sort, and pagination
 */
export async function fetchTasks(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });

  const queryString = query.toString();
  const endpoint = queryString ? `?${queryString}` : '';
  const result = await request(endpoint, { method: 'GET' });
  return result.data; // { tasks: [...], pagination: { total, page, limit, totalPages } }
}

/**
 * Fetch real-time task metrics and counts
 */
export async function fetchTaskStats() {
  const result = await request('/stats', { method: 'GET' });
  return result.data; // { total, pending, in-progress, completed, overdue }
}

/**
 * Fetch a single task by UUID
 */
export async function fetchTaskById(id) {
  const result = await request(`/${encodeURIComponent(id)}`, { method: 'GET' });
  return result.data;
}

/**
 * Create a new task (POST)
 */
export async function createTask(taskData) {
  const result = await request('', {
    method: 'POST',
    body: JSON.stringify(taskData)
  });
  return result.data;
}

/**
 * Full replacement update of a task (PUT)
 */
export async function replaceTask(id, taskData) {
  const result = await request(`/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(taskData)
  });
  return result.data;
}

/**
 * Partial update of a task (PATCH) (e.g., status toggle)
 */
export async function patchTask(id, partialData) {
  const result = await request(`/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(partialData)
  });
  return result.data;
}

/**
 * Delete a task (DELETE)
 */
export async function deleteTask(id) {
  const result = await request(`/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return result;
}

