import { body, param } from 'express-validator';

import { customValidators } from '../middlewares/validator.middleware.js';

const passwordRule = (field = 'password') => body(field)
    .notEmpty()
    .withMessage(`${field} is required`)
    .isLength({ min: 8 })
    .withMessage(`${field} must be at least 8 characters`)
    .custom((value) => {
        if (!customValidators.strongPassword(value)) {
            throw new Error(
                `${field} must contain at least one uppercase letter, one lowercase letter, and one number`
            );
        }
        return true;
    });

export const registerValidator = [
    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .trim(),
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    passwordRule('password'),
];

export const loginValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
];

export const googleLoginValidator = [
    body('idToken').notEmpty().withMessage('Google idToken is required'),
    body('businessName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters')
        .trim(),
];

export const verifyOtpValidator = [
    body('userId').isMongoId().withMessage('Valid userId is required'),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits')
        .isNumeric()
        .withMessage('OTP must be numeric'),
];

export const resendOtpValidator = [
    body('userId').isMongoId().withMessage('Valid userId is required'),
];

export const forgotPasswordValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
];

export const resetPasswordValidator = [
    body('userId').isMongoId().withMessage('Valid userId is required'),
    body('otp')
        .isLength({ min: 6, max: 6 })
        .withMessage('OTP must be 6 digits')
        .isNumeric()
        .withMessage('OTP must be numeric'),
    passwordRule('newPassword'),
];

export const createBusinessValidator = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters')
        .trim(),
    body('businessName')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters')
        .trim(),
    body('industry')
        .optional()
        .isLength({ max: 80 })
        .withMessage('Industry must be 80 characters or fewer')
        .trim(),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description must be 500 characters or fewer')
        .trim(),
    body()
        .custom((value) => {
            if (!value.name && !value.businessName) {
                throw new Error('Business name is required');
            }
            return true;
        }),
];

export const updateBusinessValidator = [
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters')
        .trim(),
    body('industry')
        .optional()
        .isLength({ max: 80 })
        .withMessage('Industry must be 80 characters or fewer')
        .trim(),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description must be 500 characters or fewer')
        .trim(),
    body('settings')
        .optional()
        .isObject()
        .withMessage('Settings must be an object'),
    body('settings.chatWidgetEnabled')
        .optional()
        .isBoolean()
        .withMessage('chatWidgetEnabled must be boolean'),
    body('settings.autoReplyEnabled')
        .optional()
        .isBoolean()
        .withMessage('autoReplyEnabled must be boolean'),
];

export const createAgentValidator = [
    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .trim(),
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    passwordRule('password'),
];

export const updateAgentValidator = [
    param('id').isMongoId().withMessage('Valid agent id is required'),
    body('isActive').isBoolean().withMessage('isActive must be boolean'),
];

export const identifyCustomerValidator = [
    body('businessId').isMongoId().withMessage('Valid businessId is required'),
    body('name')
        .optional()
        .isLength({ min: 1, max: 80 })
        .withMessage('Name must be 80 characters or fewer')
        .trim(),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('phone')
        .optional()
        .isLength({ max: 30 })
        .withMessage('Phone must be 30 characters or fewer')
        .trim(),
];

export const mongoIdParamValidator = [
    param('id').isMongoId().withMessage('Valid id is required'),
];

export const updateUserRoleValidator = [
    param('id').isMongoId().withMessage('Valid user id is required'),
    body('role')
        .isIn(['customer', 'agent', 'admin', 'superadmin'])
        .withMessage('Invalid role'),
    body('businessId')
        .optional({ nullable: true })
        .isMongoId()
        .withMessage('Valid businessId is required'),
];

export const businessStatusValidator = [
    param('id').isMongoId().withMessage('Valid business id is required'),
    body('isActive').isBoolean().withMessage('isActive must be boolean'),
    body('reason')
        .optional()
        .isLength({ max: 300 })
        .withMessage('Reason must be 300 characters or fewer')
        .trim(),
];

export const businessPlanValidator = [
    param('id').isMongoId().withMessage('Valid business id is required'),
    body('plan')
        .isIn(['free', 'pro'])
        .withMessage('Plan must be either free or pro'),
];

export const bootstrapSuperAdminValidator = [
    body('name')
        .notEmpty()
        .withMessage('Name is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Name must be between 2 and 50 characters')
        .trim(),
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    passwordRule('password'),
];
