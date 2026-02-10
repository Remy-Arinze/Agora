import { z } from 'zod';

// Validation schema for admin form
export const adminFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required').min(10, 'Phone number must be at least 10 characters'),
  role: z.string().min(1, 'Role is required').min(2, 'Role must be at least 2 characters').max(50, 'Role must be at most 50 characters'),
});

// Validation schema for update admin form (no email)
export const updateAdminFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(1, 'Phone number is required').min(10, 'Phone number must be at least 10 characters'),
  role: z.string().min(1, 'Role is required').min(2, 'Role must be at least 2 characters').max(50, 'Role must be at most 50 characters'),
});

// Validation schema for update principal form
export const updatePrincipalFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(1, 'Phone number is required').min(10, 'Phone number must be at least 10 characters'),
});

// Validation schema for update teacher form (no email)
export const updateTeacherFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  phone: z.string().min(1, 'Phone number is required').min(10, 'Phone number must be at least 10 characters'),
  subject: z.string().optional(),
  isTemporary: z.boolean().optional(),
});

// Validation schema for adding a teacher
export const addTeacherFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required').min(10, 'Phone number must be at least 10 characters'),
  subject: z.string().optional(),
  isTemporary: z.boolean().optional().default(false),
  employeeId: z.string().optional(),
});

// Validation schema for adding an admin (with custom role support)
export const addAdminFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(1, 'Last name is required').min(2, 'Last name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required').min(10, 'Phone number must be at least 10 characters'),
  role: z.string().min(1, 'Role is required').min(2, 'Role must be at least 2 characters').max(50, 'Role must be at most 50 characters'),
  employeeId: z.string().optional(),
});

// Validation schema for student admission with sanitization
export const studentAdmissionFormSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters')
    .transform((val) => sanitizeString(val, 50)),
  middleName: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val, 50) : undefined)),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters')
    .transform((val) => sanitizeString(val, 50)),
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .refine(
      (date) => {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) ? age - 1 : age;
        return actualAge >= 3 && actualAge <= 25;
      },
      { message: 'Student age must be between 3 and 25 years' }
    ),
  email: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() ? sanitizeEmail(val) : undefined))
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      { message: 'Invalid email address' }
    ),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .transform((val) => sanitizePhone(val))
    .refine(
      (val) => val.length >= 10,
      { message: 'Phone number must be at least 10 characters' }
    )
    .refine(
      (val) => /^\+?[1-9]\d{1,14}$/.test(val),
      { message: 'Invalid phone format' }
    ),
  address: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val, 500) : undefined)),
  classLevel: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val, 100) : undefined)),
  classArmId: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() ? val.trim() : undefined)),
  academicYear: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val, 50) : undefined)),
  // Parent/Guardian Information
  parentName: z
    .string()
    .min(1, 'Parent/Guardian name is required')
    .min(2, 'Parent/Guardian name must be at least 2 characters')
    .max(100, 'Parent/Guardian name must be at most 100 characters')
    .transform((val) => sanitizeString(val, 100)),
  parentPhone: z
    .string()
    .min(1, 'Parent/Guardian phone is required')
    .transform((val) => sanitizePhone(val))
    .refine(
      (val) => val.length >= 10,
      { message: 'Parent/Guardian phone must be at least 10 characters' }
    )
    .refine(
      (val) => /^\+?[1-9]\d{1,14}$/.test(val),
      { message: 'Invalid phone format' }
    ),
  parentEmail: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() ? sanitizeEmail(val) : undefined))
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      { message: 'Invalid email address' }
    ),
  parentRelationship: z
    .string()
    .min(1, 'Relationship is required')
    .transform((val) => sanitizeString(val, 50)),
  // Health Information (Optional)
  bloodGroup: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val, 20) : undefined)),
  allergies: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val, 500) : undefined)),
  medications: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val, 500) : undefined)),
  emergencyContact: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val, 100) : undefined)),
  emergencyContactPhone: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val.trim() === '') return undefined;
      const sanitized = sanitizePhone(val);
      return sanitized.length >= 10 ? sanitized : undefined;
    })
    .refine(
      (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val),
      { message: 'Emergency contact phone must be at least 10 characters if provided' }
    ),
  medicalNotes: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val, 1000) : undefined)),
}).refine(
  (data) => data.classArmId || data.classLevel,
  {
    message: 'Either Class Level or ClassArm must be selected',
    path: ['classLevel'], // Show error on classLevel field
  }
);

// Helper functions for sanitization transforms
const sanitizeString = (str: string, maxLength: number = 1000): string => {
  return str
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim()
    .substring(0, maxLength);
};

const sanitizeEmail = (email: string): string => {
  return email.trim().toLowerCase();
};

const sanitizePhone = (phone: string): string => {
  return phone.replace(/[^\d+]/g, '');
};

const sanitizeSubdomain = (subdomain: string): string => {
  return subdomain
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Create School Form Schema with sanitization
export const createSchoolFormSchema = z.object({
  name: z
    .string()
    .min(1, 'School name is required')
    .min(2, 'School name must be at least 2 characters')
    .max(200, 'School name must be at most 200 characters')
    .transform((val) => sanitizeString(val, 200)),
  subdomain: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeSubdomain(val) : undefined))
    .refine(
      (val) => !val || (val.length >= 3 && val.length <= 50),
      { message: 'Subdomain must be between 3 and 50 characters' }
    ),
  domain: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeString(val, 255) : undefined)),
  address: z
    .string()
    .min(1, 'Address is required')
    .max(500, 'Address must be at most 500 characters')
    .transform((val) => sanitizeString(val, 500)),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must be at most 100 characters')
    .transform((val) => sanitizeString(val, 100)),
  state: z
    .string()
    .min(1, 'State is required')
    .max(100, 'State must be at most 100 characters')
    .transform((val) => sanitizeString(val, 100)),
  country: z
    .string()
    .optional()
    .default('Nigeria')
    .transform((val) => sanitizeString(val || 'Nigeria', 100)),
  phone: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizePhone(val) : undefined))
    .refine(
      (val) => !val || /^\+?[1-9]\d{1,14}$/.test(val),
      { message: 'Invalid phone format' }
    ),
  email: z
    .string()
    .optional()
    .transform((val) => (val ? sanitizeEmail(val) : undefined))
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      { message: 'Invalid email format' }
    ),
  levels: z.object({
    primary: z.boolean().optional().default(false),
    secondary: z.boolean().optional().default(false),
    tertiary: z.boolean().optional().default(false),
  }).refine(
    (data) => data.primary || data.secondary || data.tertiary,
    { message: 'At least one school level must be selected' }
  ),
  principal: z.object({
    firstName: z
      .string()
      .min(2, 'First name must be at least 2 characters')
      .max(50, 'First name must be at most 50 characters')
      .transform((val) => sanitizeString(val, 50)),
    lastName: z
      .string()
      .min(2, 'Last name must be at least 2 characters')
      .max(50, 'Last name must be at most 50 characters')
      .transform((val) => sanitizeString(val, 50)),
    email: z
      .string()
      .email('Invalid email address')
      .transform((val) => sanitizeEmail(val)),
    phone: z
      .string()
      .min(10, 'Phone number must be at least 10 characters')
      .transform((val) => sanitizePhone(val))
      .refine(
        (val) => /^\+?[1-9]\d{1,14}$/.test(val),
        { message: 'Invalid phone format' }
      ),
  }).optional(),
  admins: z.array(
    z.object({
      firstName: z
        .string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be at most 50 characters')
        .transform((val) => sanitizeString(val, 50)),
      lastName: z
        .string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be at most 50 characters')
        .transform((val) => sanitizeString(val, 50)),
      email: z
        .string()
        .email('Invalid email address')
        .transform((val) => sanitizeEmail(val)),
      phone: z
        .string()
        .min(10, 'Phone number must be at least 10 characters')
        .transform((val) => sanitizePhone(val))
        .refine(
          (val) => /^\+?[1-9]\d{1,14}$/.test(val),
          { message: 'Invalid phone format' }
        ),
      role: z
        .string()
        .min(2, 'Role must be at least 2 characters')
        .max(50, 'Role must be at most 50 characters')
        .transform((val) => sanitizeString(val, 50)),
    })
  ).optional(),
});
