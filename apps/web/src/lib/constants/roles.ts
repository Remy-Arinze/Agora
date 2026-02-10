/**
 * Roles that have permanent full access (cannot be edited)
 * This matches the backend PRINCIPAL_ROLES in permission.dto.ts
 * 
 * IMPORTANT: This is the single source of truth for principal roles on the frontend.
 * Always use isPrincipalRole() function instead of direct string comparison.
 * 
 * Role naming convention: Use underscores for multi-word roles (e.g., 'school_owner', 'head_teacher')
 */
export const PRINCIPAL_ROLES = [
  'principal',
  'school_principal',
  'head_teacher',
  'headmaster',
  'headmistress',
  'school_owner',
] as const;

export type PrincipalRole = typeof PRINCIPAL_ROLES[number];

/**
 * Check if a role is a principal role (case-insensitive)
 * 
 * This function normalizes the role string and checks against the PRINCIPAL_ROLES array.
 * It performs both exact match and substring match for flexibility.
 * 
 * @param role - The role string to check (can be null/undefined)
 * @returns true if the role is a principal role, false otherwise
 * 
 * @example
 * isPrincipalRole('Principal') // true
 * isPrincipalRole('school_owner') // true
 * isPrincipalRole('School Owner') // true (substring match)
 * isPrincipalRole('Bursar') // false
 */
export function isPrincipalRole(role: string | null | undefined): boolean {
  if (!role) return false;
  
  const normalizedRole = role.toLowerCase().trim();
  
  // First check for exact match (most common case, fastest)
  if (PRINCIPAL_ROLES.includes(normalizedRole as PrincipalRole)) {
    return true;
  }
  
  // Then check if any principal role is contained in the normalized role
  // This handles cases like "School Principal" matching "school_principal"
  return PRINCIPAL_ROLES.some(principalRole => 
    normalizedRole === principalRole || normalizedRole.includes(principalRole)
  );
}
