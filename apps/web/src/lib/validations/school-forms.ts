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

