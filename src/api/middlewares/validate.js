// ============================================================================
// FILE: middlewares/validate.js
// ============================================================================

import { ValidationError } from '../utils/AppError.js';

/**
 * Validation Middleware Factory
 * Creates middleware for request validation using validation schemas
 */

/**
 * Main validation middleware
 * @param {Object} schema - Validation schema with body, params, query validators
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const errors = [];

      // Validate request body
      if (schema.body) {
        const bodyErrors = await validateObject(req.body, schema.body, 'body');
        errors.push(...bodyErrors);
      }

      // Validate request params
      if (schema.params) {
        const paramErrors = await validateObject(req.params, schema.params, 'params');
        errors.push(...paramErrors);
      }

      // Validate query parameters
      if (schema.query) {
        const queryErrors = await validateObject(req.query, schema.query, 'query');
        errors.push(...queryErrors);
      }

      // If there are validation errors, throw ValidationError
      if (errors.length > 0) {
        throw new ValidationError(formatErrors(errors));
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate object against schema
 */
async function validateObject(data, rules, source) {
  const errors = [];

  for (const [field, validators] of Object.entries(rules)) {
    const value = data[field];

    for (const validator of validators) {
      const error = await validator(value, field, data);
      if (error) {
        errors.push({
          field,
          source,
          message: error,
          value,
        });
      }
    }
  }

  return errors;
}

/**
 * Format validation errors
 */
function formatErrors(errors) {
  return errors.map((err) => `${err.field}: ${err.message}`).join('; ');
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * Required field validator
 */
export const required = (message = 'This field is required') => {
  return (value) => {
    if (value === undefined || value === null || value === '') {
      return message;
    }
    return null;
  };
};

/**
 * String validator
 */
export const isString = (message = 'Must be a string') => {
  return (value) => {
    if (value !== undefined && typeof value !== 'string') {
      return message;
    }
    return null;
  };
};

/**
 * Number validator
 */
export const isNumber = (message = 'Must be a number') => {
  return (value) => {
    if (value !== undefined && (typeof value !== 'number' || isNaN(value))) {
      return message;
    }
    return null;
  };
};

/**
 * Email validator
 */
export const isEmail = (message = 'Must be a valid email') => {
  return (value) => {
    if (value !== undefined) {
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(value)) {
        return message;
      }
    }
    return null;
  };
};

/**
 * Phone number validator (10 digits)
 */
export const isPhone = (message = 'Must be a valid 10-digit phone number') => {
  return (value) => {
    if (value !== undefined) {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(value)) {
        return message;
      }
    }
    return null;
  };
};

/**
 * GST number validator
 */
export const isGST = (message = 'Must be a valid GST number') => {
  return (value) => {
    if (value !== undefined) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(value)) {
        return message;
      }
    }
    return null;
  };
};

/**
 * PAN number validator
 */
export const isPAN = (message = 'Must be a valid PAN number') => {
  return (value) => {
    if (value !== undefined) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(value)) {
        return message;
      }
    }
    return null;
  };
};

/**
 * MongoDB ObjectId validator
 */
export const isMongoId = (message = 'Must be a valid ID') => {
  return (value) => {
    if (value !== undefined) {
      const objectIdRegex = /^[0-9a-fA-F]{24}$/;
      if (!objectIdRegex.test(value)) {
        return message;
      }
    }
    return null;
  };
};

/**
 * Minimum length validator
 */
export const minLength = (min, message) => {
  return (value) => {
    if (value !== undefined && value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
    return null;
  };
};

/**
 * Maximum length validator
 */
export const maxLength = (max, message) => {
  return (value) => {
    if (value !== undefined && value.length > max) {
      return message || `Must not exceed ${max} characters`;
    }
    return null;
  };
};

/**
 * Minimum value validator
 */
export const minValue = (min, message) => {
  return (value) => {
    if (value !== undefined && value < min) {
      return message || `Must be at least ${min}`;
    }
    return null;
  };
};

/**
 * Maximum value validator
 */
export const maxValue = (max, message) => {
  return (value) => {
    if (value !== undefined && value > max) {
      return message || `Must not exceed ${max}`;
    }
    return null;
  };
};

/**
 * Enum validator
 */
export const isIn = (values, message) => {
  return (value) => {
    if (value !== undefined && !values.includes(value)) {
      return message || `Must be one of: ${values.join(', ')}`;
    }
    return null;
  };
};

/**
 * Boolean validator
 */
export const isBoolean = (message = 'Must be true or false') => {
  return (value) => {
    if (value !== undefined && typeof value !== 'boolean') {
      return message;
    }
    return null;
  };
};

/**
 * Array validator
 */
export const isArray = (message = 'Must be an array') => {
  return (value) => {
    if (value !== undefined && !Array.isArray(value)) {
      return message;
    }
    return null;
  };
};

/**
 * URL validator
 */
export const isURL = (message = 'Must be a valid URL') => {
  return (value) => {
    if (value !== undefined) {
      const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!urlRegex.test(value)) {
        return message;
      }
    }
    return null;
  };
};

/**
 * Date validator
 */
export const isDate = (message = 'Must be a valid date') => {
  return (value) => {
    if (value !== undefined) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return message;
      }
    }
    return null;
  };
};

/**
 * Password strength validator
 */
export const isStrongPassword = (message = 'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character') => {
  return (value) => {
    if (value !== undefined) {
      const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!strongPasswordRegex.test(value)) {
        return message;
      }
    }
    return null;
  };
};

/**
 * Match field validator (for password confirmation)
 */
export const matchField = (fieldName, message) => {
  return (value, field, data) => {
    if (value !== undefined && value !== data[fieldName]) {
      return message || `${field} must match ${fieldName}`;
    }
    return null;
  };
};

/**
 * Custom validator
 */
export const custom = (validatorFn, message) => {
  return async (value, field, data) => {
    const isValid = await validatorFn(value, field, data);
    if (!isValid) {
      return message || 'Validation failed';
    }
    return null;
  };
};
