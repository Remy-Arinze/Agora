'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2, Shield, CheckCircle2, XCircle } from 'lucide-react';
import {
  useGetAllPermissionsQuery,
  useGetAdminPermissionsQuery,
  useAssignPermissionsMutation,
  Permission,
  PermissionResource,
  PermissionType,
} from '@/lib/store/api/schoolAdminApi';
import { useGetMySchoolQuery } from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';

interface PermissionAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminId: string;
  adminName: string;
  adminRole: string;
}

const RESOURCE_LABELS: Record<PermissionResource, string> = {
  OVERVIEW: 'Dashboard Overview',
  ANALYTICS: 'Analytics',
  SUBSCRIPTIONS: 'Subscriptions',
  STUDENTS: 'Students',
  STAFF: 'Staff',
  CLASSES: 'Classes',
  SUBJECTS: 'Subjects',
  TIMETABLES: 'Timetables',
  CALENDAR: 'Calendar',
  ADMISSIONS: 'Admissions',
  SESSIONS: 'Sessions',
  EVENTS: 'Events',
};

const TYPE_LABELS: Record<PermissionType, string> = {
  READ: 'Read',
  WRITE: 'Write',
  ADMIN: 'Admin (Full Access)',
};

export function PermissionAssignmentModal({
  isOpen,
  onClose,
  adminId,
  adminName,
  adminRole,
}: PermissionAssignmentModalProps) {
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  // Get all available permissions
  const { data: allPermissionsResponse, isLoading: isLoadingAll } = useGetAllPermissionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId || !isOpen }
  );

  // Get current admin permissions
  const { data: adminPermissionsResponse, isLoading: isLoadingAdmin } = useGetAdminPermissionsQuery(
    { schoolId: schoolId!, adminId },
    { skip: !schoolId || !adminId || !isOpen }
  );

  const [assignPermissions, { isLoading: isAssigning }] = useAssignPermissionsMutation();

  const allPermissions = allPermissionsResponse?.data || [];
  const currentPermissions = adminPermissionsResponse?.data?.permissions || [];

  // Initialize selected permissions from current permissions
  useEffect(() => {
    if (currentPermissions.length > 0) {
      setSelectedPermissions(new Set(currentPermissions.map((p) => p.id)));
    }
  }, [currentPermissions]);

  // Group permissions by resource
  const permissionsByResource = allPermissions.reduce((acc, perm) => {
    if (!acc[perm.resource]) {
      acc[perm.resource] = [];
    }
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<PermissionResource, Permission[]>);

  const handleTogglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSelectAllForResource = (resource: PermissionResource) => {
    const resourcePerms = permissionsByResource[resource] || [];
    const newSelected = new Set(selectedPermissions);
    
    // Check if all are selected
    const allSelected = resourcePerms.every((p) => newSelected.has(p.id));
    
    if (allSelected) {
      // Deselect all
      resourcePerms.forEach((p) => newSelected.delete(p.id));
    } else {
      // Select all
      resourcePerms.forEach((p) => newSelected.add(p.id));
    }
    
    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    if (!schoolId) return;

    try {
      await assignPermissions({
        schoolId,
        adminId,
        permissionIds: Array.from(selectedPermissions),
      }).unwrap();

      toast.success('Permissions assigned successfully');
      onClose();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to assign permissions');
    }
  };

  const isLoading = isLoadingAll || isLoadingAdmin;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Permissions" size="xl">
      <div className="space-y-">
        {/* Admin Info */}
        <div className="bg-[var(--light-bg)] dark:bg-dark-surface rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-semibold text-light-text-primary dark:text-dark-text-primary">
                {adminName}
              </p>
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Role: {adminRole}
              </p>
            </div>
          </div>
        </div>

        {/* Permissions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto">
            {Object.entries(permissionsByResource).map(([resource, permissions]) => (
              <Card key={resource}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary">
                      {RESOURCE_LABELS[resource as PermissionResource]}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAllForResource(resource as PermissionResource)}
                    >
                      {permissions.every((p) => selectedPermissions.has(p.id))
                        ? 'Deselect All'
                        : 'Select All'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {permissions.map((permission) => {
                      const isSelected = selectedPermissions.has(permission.id);
                      const isAdmin = permission.type === PermissionType.ADMIN;
                      
                      return (
                        <label
                          key={permission.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-blue-500 bg-light-surface dark:bg-dark-surface'
                              : 'border-light-border dark:border-dark-border hover:bg-light-bg dark:hover:bg-dark-bg'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTogglePermission(permission.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                {TYPE_LABELS[permission.type]}
                              </span>
                              {isAdmin && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                  Full Access
                                </span>
                              )}
                            </div>
                            {permission.description && (
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">
                                {permission.description}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
          <Button variant="ghost" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={isAssigning || isLoading}>
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Permissions'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

