import { body, query } from 'express-validator';
import { customValidators } from '../middlewares/validator.middleware.js';

export const registerValidator = [
    body('username')
        .notEmpty()
        .withMessage('Username is required')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores')
        .trim()
        .escape(),
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
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .custom((value) => {
            if (!customValidators.strongPassword(value)) {
                throw new Error(
                    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                );
            }
            return true;
        }),
    body('role')
        .custom((value, { req }) => {
            if (Object.prototype.hasOwnProperty.call(req.body, 'role')) {
                throw new Error('Role cannot be set during registration');
            }
            return true;
        }),
];

export const loginValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters'),
];

export const verifyEmailValidator = [
    body('email')
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Please provide a valid email')
        .normalizeEmail(),
];

export const verifyEmailTokenValidator = [
    query('token').notEmpty().withMessage('Token is required'),
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
    body('businessName')
        .notEmpty()
        .withMessage('Business name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Business name must be between 2 and 100 characters')
        .trim(),
    body('industry')
        .optional()
        .isLength({ max: 80 })
        .withMessage('Industry must be 80 characters or fewer')
        .trim(),
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
    body('password')
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .custom((value) => {
            if (!customValidators.strongPassword(value)) {
                throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
            }
            return true;
        }),
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
