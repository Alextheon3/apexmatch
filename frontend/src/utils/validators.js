// src/utils/validators.js - Comprehensive validation functions

/**
 * ApexMatch Validation System
 * Comprehensive validation functions for forms, data, and user input
 */

import { VALIDATION_RULES, TRUST_TIERS, SUBSCRIPTION_TIERS } from './constants';

// ========================================
// BASE VALIDATION FUNCTIONS
// ========================================

// Base validator class
class Validator {
  constructor() {
    this.errors = [];
  }
  
  // Add error to the list
  addError(field, message) {
    this.errors.push({ field, message });
    return this;
  }
  
  // Check if validation passed
  isValid() {
    return this.errors.length === 0;
  }
  
  // Get all errors
  getErrors() {
    return this.errors;
  }
  
  // Get errors for specific field
  getFieldErrors(field) {
    return this.errors.filter(error => error.field === field).map(error => error.message);
  }
  
  // Clear all errors
  clearErrors() {
    this.errors = [];
    return this;
  }
  
  // Clear errors for specific field
  clearFieldErrors(field) {
    this.errors = this.errors.filter(error => error.field !== field);
    return this;
  }
}

// ========================================
// AUTHENTICATION VALIDATORS
// ========================================

export const authValidators = {
  
  // Validate email
  email(email) {
    const validator = new Validator();
    
    if (!email) {
      validator.addError('email', 'Email is required');
      return validator;
    }
    
    if (typeof email !== 'string') {
      validator.addError('email', 'Email must be a string');
      return validator;
    }
    
    const trimmedEmail = email.trim().toLowerCase();
    
    if (trimmedEmail.length > VALIDATION_RULES.email.maxLength) {
      validator.addError('email', `Email must be less than ${VALIDATION_RULES.email.maxLength} characters`);
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      validator.addError('email', 'Please enter a valid email address');
    }
    
    // Check for blocked domains
    const domain = trimmedEmail.split('@')[1];
    if (VALIDATION_RULES.email.blockedDomains.includes(domain)) {
      validator.addError('email', 'This email domain is not allowed');
    }
    
    // Check for disposable email services
    const disposableDomains = [
      'tempmail.org', '10minutemail.com', 'guerrillamail.com',
      'mailinator.com', 'temp-mail.org', 'throwaway.email'
    ];
    if (disposableDomains.includes(domain)) {
      validator.addError('email', 'Please use a permanent email address');
    }
    
    return validator;
  },
  
  // Validate password
  password(password) {
    const validator = new Validator();
    const rules = VALIDATION_RULES.password;
    
    if (!password) {
      validator.addError('password', 'Password is required');
      return validator;
    }
    
    if (typeof password !== 'string') {
      validator.addError('password', 'Password must be a string');
      return validator;
    }
    
    if (password.length < rules.minLength) {
      validator.addError('password', `Password must be at least ${rules.minLength} characters long`);
    }
    
    if (password.length > rules.maxLength) {
      validator.addError('password', `Password must be less than ${rules.maxLength} characters long`);
    }
    
    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      validator.addError('password', 'Password must contain at least one uppercase letter');
    }
    
    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      validator.addError('password', 'Password must contain at least one lowercase letter');
    }
    
    if (rules.requireNumbers && !/\d/.test(password)) {
      validator.addError('password', 'Password must contain at least one number');
    }
    
    if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      validator.addError('password', 'Password must contain at least one special character');
    }
    
    // Check for common weak passwords
    if (rules.forbiddenPasswords.includes(password.toLowerCase())) {
      validator.addError('password', 'This password is too common and not secure');
    }
    
    // Check for repeated characters
    if (/^(.)\1{7,}$/.test(password)) {
      validator.addError('password', 'Password cannot be the same character repeated');
    }
    
    // Check for sequences
    const sequences = ['012345', '123456', '234567', '345678', '456789', 'abcdef', 'qwerty'];
    if (sequences.some(seq => password.toLowerCase().includes(seq))) {
      validator.addError('password', 'Password cannot contain common sequences');
    }
    
    return validator;
  },
  
  // Validate password confirmation
  confirmPassword(password, confirmPassword) {
    const validator = new Validator();
    
    if (!confirmPassword) {
      validator.addError('confirmPassword', 'Please confirm your password');
      return validator;
    }
    
    if (password !== confirmPassword) {
      validator.addError('confirmPassword', 'Passwords do not match');
    }
    
    return validator;
  },
  
  // Validate 2FA code
  twoFactorCode(code) {
    const validator = new Validator();
    
    if (!code) {
      validator.addError('twoFactorCode', '2FA code is required');
      return validator;
    }
    
    const cleanCode = code.replace(/\s/g, '');
    
    if (!/^\d{6}$/.test(cleanCode)) {
      validator.addError('twoFactorCode', '2FA code must be 6 digits');
    }
    
    return validator;
  }
};

// ========================================
// PROFILE VALIDATORS
// ========================================

export const profileValidators = {
  
  // Validate first name
  firstName(firstName) {
    const validator = new Validator();
    const rules = VALIDATION_RULES.profile.firstName;
    
  // Validate first name
  firstName(firstName) {
    const validator = new Validator();
    const rules = VALIDATION_RULES.profile.firstName;
    
    if (!firstName) {
      validator.addError('firstName', 'First name is required');
      return validator;
    }
    
    const trimmedName = firstName.trim();
    
    if (trimmedName.length < rules.minLength) {
      validator.addError('firstName', `First name must be at least ${rules.minLength} characters long`);
    }
    
    if (trimmedName.length > rules.maxLength) {
      validator.addError('firstName', `First name must be less than ${rules.maxLength} characters long`);
    }
    
    // Check for valid name characters (letters, spaces, hyphens, apostrophes)
    if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
      validator.addError('firstName', 'First name can only contain letters, spaces, hyphens, and apostrophes');
    }
    
    // Check for inappropriate content
    if (this.containsProfanity(trimmedName)) {
      validator.addError('firstName', 'First name contains inappropriate content');
    }
    
    return validator;
  },
  
  // Validate last name
  lastName(lastName) {
    const validator = new Validator();
    const rules = VALIDATION_RULES.profile.lastName;
    
    if (!lastName) {
      validator.addError('lastName', 'Last name is required');
      return validator;
    }
    
    const trimmedName = lastName.trim();
    
    if (trimmedName.length < rules.minLength) {
      validator.addError('lastName', `Last name must be at least ${rules.minLength} characters long`);
    }
    
    if (trimmedName.length > rules.maxLength) {
      validator.addError('lastName', `Last name must be less than ${rules.maxLength} characters long`);
    }
    
    if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
      validator.addError('lastName', 'Last name can only contain letters, spaces, hyphens, and apostrophes');
    }
    
    if (this.containsProfanity(trimmedName)) {
      validator.addError('lastName', 'Last name contains inappropriate content');
    }
    
    return validator;
  },
  
  // Validate date of birth
  dateOfBirth(dateOfBirth) {
    const validator = new Validator();
    
    if (!dateOfBirth) {
      validator.addError('dateOfBirth', 'Date of birth is required');
      return validator;
    }
    
    const birthDate = new Date(dateOfBirth);
    
    if (isNaN(birthDate.getTime())) {
      validator.addError('dateOfBirth', 'Please enter a valid date');
      return validator;
    }
    
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    let actualAge = age;
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      actualAge--;
    }
    
    if (actualAge < VALIDATION_RULES.age.min) {
      validator.addError('dateOfBirth', `You must be at least ${VALIDATION_RULES.age.min} years old to use ApexMatch`);
    }
    
    if (actualAge > VALIDATION_RULES.age.max) {
      validator.addError('dateOfBirth', 'Please enter a valid date of birth');
    }
    
    // Check if date is in the future
    if (birthDate > today) {
      validator.addError('dateOfBirth', 'Date of birth cannot be in the future');
    }
    
    return validator;
  },
  
  // Validate gender
  gender(gender) {
    const validator = new Validator();
    
    if (!gender) {
      validator.addError('gender', 'Gender is required');
      return validator;
    }
    
    const validGenders = ['male', 'female', 'non-binary', 'other'];
    if (!validGenders.includes(gender.toLowerCase())) {
      validator.addError('gender', 'Please select a valid gender option');
    }
    
    return validator;
  },
  
  // Validate bio
  bio(bio) {
    const validator = new Validator();
    const rules = VALIDATION_RULES.profile.bio;
    
    if (bio && bio.trim().length > rules.maxLength) {
      validator.addError('bio', `Bio must be less than ${rules.maxLength} characters`);
    }
    
    if (bio && this.containsProfanity(bio)) {
      validator.addError('bio', 'Bio contains inappropriate content');
    }
    
    // Check for contact information in bio
    const contactRegex = /(\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|@\w+|www\.\w+|\w+\.(com|org|net))/i;
    if (bio && contactRegex.test(bio)) {
      validator.addError('bio', 'Bio cannot contain contact information or external links');
    }
    
    return validator;
  },
  
  // Validate interests
  interests(interests) {
    const validator = new Validator();
    const rules = VALIDATION_RULES.profile.interests;
    
    if (!Array.isArray(interests)) {
      validator.addError('interests', 'Interests must be provided as a list');
      return validator;
    }
    
    if (interests.length > rules.max) {
      validator.addError('interests', `You can select up to ${rules.max} interests`);
    }
    
    interests.forEach((interest, index) => {
      if (typeof interest !== 'string') {
        validator.addError('interests', `Interest ${index + 1} must be text`);
        return;
      }
      
      const trimmedInterest = interest.trim();
      
      if (trimmedInterest.length < rules.minLength) {
        validator.addError('interests', `Interest "${trimmedInterest}" is too short`);
      }
      
      if (trimmedInterest.length > rules.maxLength) {
        validator.addError('interests', `Interest "${trimmedInterest}" is too long`);
      }
      
      if (this.containsProfanity(trimmedInterest)) {
        validator.addError('interests', `Interest "${trimmedInterest}" contains inappropriate content`);
      }
    });
    
    // Check for duplicates
    const uniqueInterests = [...new Set(interests.map(i => i.toLowerCase().trim()))];
    if (uniqueInterests.length !== interests.length) {
      validator.addError('interests', 'Please remove duplicate interests');
    }
    
    return validator;
  },
  
  // Validate location
  location(location) {
    const validator = new Validator();
    
    if (!location) {
      validator.addError('location', 'Location is required');
      return validator;
    }
    
    if (!location.lat || !location.lng) {
      validator.addError('location', 'Invalid location coordinates');
    }
    
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      validator.addError('location', 'Location coordinates must be numbers');
    }
    
    if (location.lat < -90 || location.lat > 90) {
      validator.addError('location', 'Invalid latitude');
    }
    
    if (location.lng < -180 || location.lng > 180) {
      validator.addError('location', 'Invalid longitude');
    }
    
    return validator;
  },
  
  // Helper function to check for profanity
  containsProfanity(text) {
    if (!text) return false;
    
    // This is a basic implementation - in production, use a more comprehensive service
    const profanityList = [
      'damn', 'shit', 'fuck', 'bitch', 'asshole', 'bastard',
      'crap', 'piss', 'hell', 'slutty', 'whore', 'sex',
      'porn', 'nude', 'naked', 'escort', 'hookup'
    ];
    
    const cleanText = text.toLowerCase().replace(/[^a-z\s]/g, '');
    const words = cleanText.split(/\s+/);
    
    return words.some(word => 
      profanityList.some(profane => 
        word.includes(profane) || 
        this.levenshteinDistance(word, profane) <= 1
      )
    );
  },
  
  // Calculate edit distance for fuzzy matching
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
};

// ========================================
// PHOTO VALIDATORS
// ========================================

export const photoValidators = {
  
  // Validate photo file
  photo(file) {
    const validator = new Validator();
    const rules = VALIDATION_RULES.profile.photos;
    
    if (!file) {
      validator.addError('photo', 'Photo is required');
      return validator;
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      validator.addError('photo', 'Photo must be JPEG, PNG, or WebP format');
    }
    
    // Check file size
    if (file.size < rules.minSize) {
      validator.addError('photo', 'Photo file is too small');
    }
    
    if (file.size > rules.maxSize) {
      const maxSizeMB = rules.maxSize / (1024 * 1024);
      validator.addError('photo', `Photo must be less than ${maxSizeMB}MB`);
    }
    
    return validator;
  },
  
  // Validate photo collection
  photos(photos) {
    const validator = new Validator();
    const rules = VALIDATION_RULES.profile.photos;
    
    if (!Array.isArray(photos)) {
      validator.addError('photos', 'Photos must be provided as a list');
      return validator;
    }
    
    if (photos.length === 0) {
      validator.addError('photos', 'At least one photo is required');
    }
    
    if (photos.length > rules.max) {
      validator.addError('photos', `You can upload up to ${rules.max} photos`);
    }
    
    photos.forEach((photo, index) => {
      const photoValidator = this.photo(photo);
      if (!photoValidator.isValid()) {
        photoValidator.getErrors().forEach(error => {
          validator.addError('photos', `Photo ${index + 1}: ${error.message}`);
        });
      }
    });
    
    return validator;
  }
};

// ========================================
// MATCHING VALIDATORS
// ========================================

export const matchingValidators = {
  
  // Validate match preferences
  preferences(preferences) {
    const validator = new Validator();
    
    if (!preferences) {
      validator.addError('preferences', 'Preferences are required');
      return validator;
    }
    
    // Validate age range
    if (preferences.ageRange) {
      const { min, max } = preferences.ageRange;
      
      if (typeof min !== 'number' || typeof max !== 'number') {
        validator.addError('preferences', 'Age range must be numbers');
      } else {
        if (min < VALIDATION_RULES.age.min || min > VALIDATION_RULES.age.max) {
          validator.addError('preferences', `Minimum age must be between ${VALIDATION_RULES.age.min} and ${VALIDATION_RULES.age.max}`);
        }
        
        if (max < VALIDATION_RULES.age.min || max > VALIDATION_RULES.age.max) {
          validator.addError('preferences', `Maximum age must be between ${VALIDATION_RULES.age.min} and ${VALIDATION_RULES.age.max}`);
        }
        
        if (min >= max) {
          validator.addError('preferences', 'Minimum age must be less than maximum age');
        }
        
        if (max - min > 50) {
          validator.addError('preferences', 'Age range cannot exceed 50 years');
        }
      }
    }
    
    // Validate distance
    if (preferences.maxDistance !== undefined) {
      if (typeof preferences.maxDistance !== 'number') {
        validator.addError('preferences', 'Distance must be a number');
      } else if (preferences.maxDistance < 1 || preferences.maxDistance > VALIDATION_RULES.location.maxDistance) {
        validator.addError('preferences', `Distance must be between 1 and ${VALIDATION_RULES.location.maxDistance} km`);
      }
    }
    
    // Validate gender preferences
    if (preferences.interestedIn) {
      const validGenders = ['male', 'female', 'non-binary', 'all'];
      if (!validGenders.includes(preferences.interestedIn)) {
        validator.addError('preferences', 'Please select a valid gender preference');
      }
    }
    
    return validator;
  },
  
  // Validate swipe action
  swipeAction(action) {
    const validator = new Validator();
    
    if (!action) {
      validator.addError('swipeAction', 'Swipe action is required');
      return validator;
    }
    
    const validActions = ['like', 'pass', 'super_like'];
    if (!validActions.includes(action)) {
      validator.addError('swipeAction', 'Invalid swipe action');
    }
    
    return validator;
  }
};

// ========================================
// MESSAGE VALIDATORS
// ========================================

export const messageValidators = {
  
  // Validate message content
  content(content) {
    const validator = new Validator();
    
    if (!content) {
      validator.addError('content', 'Message cannot be empty');
      return validator;
    }
    
    const trimmedContent = content.trim();
    
    if (trimmedContent.length === 0) {
      validator.addError('content', 'Message cannot be empty');
      return validator;
    }
    
    if (trimmedContent.length > 1000) {
      validator.addError('content', 'Message must be less than 1000 characters');
    }
    
    // Check for inappropriate content
    if (profileValidators.containsProfanity(trimmedContent)) {
      validator.addError('content', 'Message contains inappropriate content');
    }
    
    // Check for contact information
    const contactRegex = /(\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|@\w+(?:\.\w+)*|(?:https?:\/\/)?(?:www\.)?[\w.-]+\.\w+)/i;
    if (contactRegex.test(trimmedContent)) {
      validator.addError('content', 'Messages cannot contain contact information or external links');
    }
    
    // Check for spam patterns
    if (this.isSpam(trimmedContent)) {
      validator.addError('content', 'Message appears to be spam');
    }
    
    return validator;
  },
  
  // Check if message is spam
  isSpam(content) {
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /[A-Z]{5,}/, // Excessive caps
      /!!{3,}/, // Excessive exclamation marks
      /\${2,}/, // Multiple dollar signs
      /buy now/i,
      /click here/i,
      /limited time/i,
      /act now/i,
      /free money/i
    ];
    
    return spamPatterns.some(pattern => pattern.test(content));
  }
};

// ========================================
// SUBSCRIPTION VALIDATORS
// ========================================

export const subscriptionValidators = {
  
  // Validate subscription plan
  plan(planId) {
    const validator = new Validator();
    
    if (!planId) {
      validator.addError('plan', 'Subscription plan is required');
      return validator;
    }
    
    const validPlans = Object.keys(SUBSCRIPTION_TIERS).map(key => key.toLowerCase());
    if (!validPlans.includes(planId.toLowerCase())) {
      validator.addError('plan', 'Invalid subscription plan');
    }
    
    return validator;
  },
  
  // Validate payment method
  paymentMethod(paymentMethod) {
    const validator = new Validator();
    
    if (!paymentMethod) {
      validator.addError('paymentMethod', 'Payment method is required');
      return validator;
    }
    
    if (!paymentMethod.id) {
      validator.addError('paymentMethod', 'Payment method ID is required');
    }
    
    return validator;
  },
  
  // Validate promo code
  promoCode(code) {
    const validator = new Validator();
    
    if (code) {
      const trimmedCode = code.trim().toUpperCase();
      
      if (!/^[A-Z0-9]{3,20}$/.test(trimmedCode)) {
        validator.addError('promoCode', 'Invalid promo code format');
      }
    }
    
    return validator;
  }
};

// ========================================
// COMPOSITE VALIDATORS
// ========================================

export const compositeValidators = {
  
  // Validate complete registration data
  registration(data) {
    const validator = new Validator();
    
    // Validate individual fields
    const emailValidator = authValidators.email(data.email);
    const passwordValidator = authValidators.password(data.password);
    const confirmPasswordValidator = authValidators.confirmPassword(data.password, data.confirmPassword);
    const firstNameValidator = profileValidators.firstName(data.firstName);
    const lastNameValidator = profileValidators.lastName(data.lastName);
    const dateOfBirthValidator = profileValidators.dateOfBirth(data.dateOfBirth);
    const genderValidator = profileValidators.gender(data.gender);
    
    // Collect all errors
    [emailValidator, passwordValidator, confirmPasswordValidator, firstNameValidator, 
     lastNameValidator, dateOfBirthValidator, genderValidator].forEach(v => {
      validator.errors.push(...v.getErrors());
    });
    
    // Additional cross-field validations
    if (data.firstName && data.lastName) {
      const fullName = `${data.firstName} ${data.lastName}`.toLowerCase();
      if (data.password && data.password.toLowerCase().includes(fullName)) {
        validator.addError('password', 'Password cannot contain your name');
      }
    }
    
    return validator;
  },
  
  // Validate complete profile data
  completeProfile(data) {
    const validator = new Validator();
    
    // Required fields
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'gender', 'location'];
    requiredFields.forEach(field => {
      if (!data[field]) {
        validator.addError(field, `${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
      }
    });
    
    // Validate individual components
    if (data.firstName) {
      const firstNameValidator = profileValidators.firstName(data.firstName);
      validator.errors.push(...firstNameValidator.getErrors());
    }
    
    if (data.lastName) {
      const lastNameValidator = profileValidators.lastName(data.lastName);
      validator.errors.push(...lastNameValidator.getErrors());
    }
    
    if (data.dateOfBirth) {
      const dateOfBirthValidator = profileValidators.dateOfBirth(data.dateOfBirth);
      validator.errors.push(...dateOfBirthValidator.getErrors());
    }
    
    if (data.gender) {
      const genderValidator = profileValidators.gender(data.gender);
      validator.errors.push(...genderValidator.getErrors());
    }
    
    if (data.bio) {
      const bioValidator = profileValidators.bio(data.bio);
      validator.errors.push(...bioValidator.getErrors());
    }
    
    if (data.interests) {
      const interestsValidator = profileValidators.interests(data.interests);
      validator.errors.push(...interestsValidator.getErrors());
    }
    
    if (data.location) {
      const locationValidator = profileValidators.location(data.location);
      validator.errors.push(...locationValidator.getErrors());
    }
    
    if (data.photos) {
      const photosValidator = photoValidators.photos(data.photos);
      validator.errors.push(...photosValidator.getErrors());
    }
    
    return validator;
  },
  
  // Validate message with context
  messageWithContext(content, user, conversation) {
    const validator = new Validator();
    
    // Basic content validation
    const contentValidator = messageValidators.content(content);
    validator.errors.push(...contentValidator.getErrors());
    
    // Context-based validations
    if (user && user.trustScore < 30) {
      // More strict validation for low trust users
      if (content && content.length > 500) {
        validator.addError('content', 'Message length restricted due to trust score');
      }
    }
    
    if (conversation && conversation.status === 'blocked') {
      validator.addError('content', 'Cannot send messages to blocked conversations');
    }
    
    // Rate limiting check (would need to be implemented with backend)
    if (user && this.isRateLimited(user.id)) {
      validator.addError('content', 'You are sending messages too quickly');
    }
    
    return validator;
  },
  
  // Placeholder for rate limiting check
  isRateLimited(userId) {
    // This would check against a rate limiting service
    // For now, return false
    return false;
  }
};

// ========================================
// FORM VALIDATION HELPERS
// ========================================

export const formValidationHelpers = {
  
  // Validate entire form
  validateForm(formData, validationRules) {
    const validator = new Validator();
    
    Object.entries(validationRules).forEach(([field, rules]) => {
      const value = formData[field];
      
      // Check required fields
      if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
        validator.addError(field, `${this.fieldDisplayName(field)} is required`);
        return;
      }
      
      // Skip validation if field is empty and not required
      if (!value && !rules.required) return;
      
      // Apply field-specific validations
      if (rules.validator && typeof rules.validator === 'function') {
        const fieldValidator = rules.validator(value);
        validator.errors.push(...fieldValidator.getErrors());
      }
    });
    
    return validator;
  },
  
  // Convert field name to display name
  fieldDisplayName(fieldName) {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  },
  
  // Get validation state for field
  getFieldValidationState(errors, fieldName) {
    const fieldErrors = errors.filter(error => error.field === fieldName);
    
    return {
      isValid: fieldErrors.length === 0,
      isInvalid: fieldErrors.length > 0,
      errors: fieldErrors.map(error => error.message),
      firstError: fieldErrors.length > 0 ? fieldErrors[0].message : null
    };
  }
};

// ========================================
// EXPORT ALL VALIDATORS
// ========================================

export default {
  Validator,
  authValidators,
  profileValidators,
  photoValidators,
  matchingValidators,
  messageValidators,
  subscriptionValidators,
  compositeValidators,
  formValidationHelpers
};