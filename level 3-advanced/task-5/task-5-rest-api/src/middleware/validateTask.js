/**
 * Validation Middleware for Task Resources
 * 
 * Validates request payload and parameters before reaching controllers.
 * Ensures consistent 400 Bad Request responses with detailed field-level error messages.
 */

const ALLOWED_STATUSES = ['pending', 'in-progress', 'completed'];
const ALLOWED_PRIORITIES = ['low', 'medium', 'high'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validates whether a value is a valid date string.
 */
function isValidDate(dateValue) {
  if (dateValue === null || dateValue === '') return true;
  const timestamp = Date.parse(dateValue);
  return !isNaN(timestamp);
}

/**
 * Middleware to validate UUID format in req.params.id
 */
function validateTaskId(req, res, next) {
  const { id } = req.params;
  if (!id || !UUID_REGEX.test(id)) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Invalid task ID format. Must be a standard UUID (e.g. 11111111-1111-4111-8111-111111111111).',
      errors: [
        {
          field: 'id',
          message: 'Parameter :id must be a valid UUID string.'
        }
      ]
    });
  }
  next();
}

/**
 * Validation rules for creating a task (POST /api/tasks)
 */
function validateTaskCreate(req, res, next) {
  const errors = [];
  const { title, description, status, priority, dueDate } = req.body;

  // Title validation: required, 3-100 characters
  if (title === undefined || title === null || typeof title !== 'string' || title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required and cannot be empty.' });
  } else if (title.trim().length < 3 || title.trim().length > 100) {
    errors.push({ field: 'title', message: 'Title must be between 3 and 100 characters long.' });
  }

  // Description validation: optional, max 500 characters
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string.' });
    } else if (description.trim().length > 500) {
      errors.push({ field: 'description', message: 'Description cannot exceed 500 characters.' });
    }
  }

  // Status validation: optional, defaults to 'pending', must be one of allowed
  if (status !== undefined && status !== null) {
    if (!ALLOWED_STATUSES.includes(status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}.`
      });
    }
  }

  // Priority validation: optional, defaults to 'medium', must be one of allowed
  if (priority !== undefined && priority !== null) {
    if (!ALLOWED_PRIORITIES.includes(priority)) {
      errors.push({
        field: 'priority',
        message: `Priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}.`
      });
    }
  }

  // Due Date validation: optional, must be valid ISO date string
  if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
    if (!isValidDate(dueDate)) {
      errors.push({ field: 'dueDate', message: 'Due date must be a valid ISO date string.' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed for task creation.',
      errors
    });
  }

  next();
}

/**
 * Validation rules for replacing a task (PUT /api/tasks/:id)
 * In REST semantics, PUT is a complete replacement; key fields must be supplied.
 */
function validateTaskReplace(req, res, next) {
  const errors = [];
  const { title, description, status, priority, dueDate } = req.body;

  // Title: required, 3-100 chars
  if (title === undefined || title === null || typeof title !== 'string' || title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required for replacement.' });
  } else if (title.trim().length < 3 || title.trim().length > 100) {
    errors.push({ field: 'title', message: 'Title must be between 3 and 100 characters long.' });
  }

  // Status: required for PUT
  if (status === undefined || status === null) {
    errors.push({ field: 'status', message: `Status is required. Must be one of: ${ALLOWED_STATUSES.join(', ')}.` });
  } else if (!ALLOWED_STATUSES.includes(status)) {
    errors.push({ field: 'status', message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}.` });
  }

  // Priority: required for PUT
  if (priority === undefined || priority === null) {
    errors.push({ field: 'priority', message: `Priority is required. Must be one of: ${ALLOWED_PRIORITIES.join(', ')}.` });
  } else if (!ALLOWED_PRIORITIES.includes(priority)) {
    errors.push({ field: 'priority', message: `Priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}.` });
  }

  // Description: optional, max 500 chars
  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string.' });
    } else if (description.trim().length > 500) {
      errors.push({ field: 'description', message: 'Description cannot exceed 500 characters.' });
    }
  }

  // Due Date: optional / nullable
  if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
    if (!isValidDate(dueDate)) {
      errors.push({ field: 'dueDate', message: 'Due date must be a valid ISO date string.' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed for task replacement (PUT).',
      errors
    });
  }

  next();
}

/**
 * Validation rules for partially updating a task (PATCH /api/tasks/:id)
 */
function validateTaskPatch(req, res, next) {
  const errors = [];
  const { title, description, status, priority, dueDate } = req.body;

  const hasAnyField = [title, description, status, priority, dueDate].some(val => val !== undefined);
  if (!hasAnyField) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'At least one task field (title, description, status, priority, dueDate) must be provided for PATCH.',
      errors: [{ field: 'body', message: 'Request body cannot be empty.' }]
    });
  }

  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 100) {
      errors.push({ field: 'title', message: 'Title must be a string between 3 and 100 characters long.' });
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string.' });
    } else if (description.trim().length > 500) {
      errors.push({ field: 'description', message: 'Description cannot exceed 500 characters.' });
    }
  }

  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      errors.push({ field: 'status', message: `Status must be one of: ${ALLOWED_STATUSES.join(', ')}.` });
    }
  }

  if (priority !== undefined) {
    if (!ALLOWED_PRIORITIES.includes(priority)) {
      errors.push({ field: 'priority', message: `Priority must be one of: ${ALLOWED_PRIORITIES.join(', ')}.` });
    }
  }

  if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
    if (!isValidDate(dueDate)) {
      errors.push({ field: 'dueDate', message: 'Due date must be a valid ISO date string.' });
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      data: null,
      message: 'Validation failed for partial update (PATCH).',
      errors
    });
  }

  next();
}

module.exports = {
  validateTaskId,
  validateTaskCreate,
  validateTaskReplace,
  validateTaskPatch
};

