import { Injectable, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { EmailService } from '../../../email/email.service';
import { PermissionDto, PermissionResource, PermissionType, StaffPermissionsDto } from '../../dto/permission.dto';

@Injectable()
export class PermissionService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService
  ) {}

  async onModuleInit() {
    // Initialize default permissions on module startup
    await this.initializeDefaultPermissions();
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<PermissionDto[]> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { type: 'asc' }],
    });

    return permissions.map((p) => ({
      id: p.id,
      resource: p.resource as PermissionResource,
      type: p.type as PermissionType,
      description: p.description || undefined,
    }));
  }

  /**
   * Get permissions for a specific admin
   */
  async getAdminPermissions(schoolId: string, adminId: string): Promise<StaffPermissionsDto> {
    const admin = await this.prisma.schoolAdmin.findFirst({
      where: {
        id: adminId,
        schoolId: schoolId,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    return {
      adminId: admin.id,
      adminName: `${admin.firstName} ${admin.lastName}`,
      role: admin.role,
      permissions: admin.permissions.map((sp) => ({
        id: sp.permission.id,
        resource: sp.permission.resource as PermissionResource,
        type: sp.permission.type as PermissionType,
        description: sp.permission.description || undefined,
      })),
    };
  }

  /**
   * Assign permissions to an admin
   */
  async assignPermissions(
    schoolId: string,
    adminId: string,
    permissionIds: string[]
  ): Promise<StaffPermissionsDto> {
    // Verify admin exists
    const admin = await this.prisma.schoolAdmin.findFirst({
      where: {
        id: adminId,
        schoolId: schoolId,
      },
    });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: { in: permissionIds },
      },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('One or more permissions not found');
    }

    // Get school name for email
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { name: true },
    });

    // Remove existing permissions and assign new ones
    await this.prisma.$transaction(async (tx) => {
      // Delete existing permissions
      await tx.staffPermission.deleteMany({
        where: {
          adminId: adminId,
        },
      });

      // Create new permissions
      if (permissionIds.length > 0) {
        await tx.staffPermission.createMany({
          data: permissionIds.map((permId) => ({
            adminId: adminId,
            permissionId: permId,
          })),
        });
      }
    });

    // Get updated permissions with details
    const updatedPermissions = await this.getAdminPermissions(schoolId, adminId);

    // Send email to admin if email exists
    if (admin.email && school && updatedPermissions.permissions.length > 0) {
      try {
        await this.emailService.sendPermissionAssignmentEmail(
          admin.email,
          `${admin.firstName} ${admin.lastName}`,
          updatedPermissions.permissions.map((p) => ({
            resource: p.resource,
            type: p.type,
            description: p.description,
          })),
          school.name
        );
      } catch (error) {
        // Log error but don't fail the request
        console.error('Failed to send permission assignment email:', error);
      }
    }

    return updatedPermissions;
  }

  /**
   * Check if admin has a specific permission
   */
  async hasPermission(
    adminId: string,
    resource: PermissionResource,
    type: PermissionType
  ): Promise<boolean> {
    // Check if admin has ADMIN permission (full access)
    const hasAdmin = await this.prisma.staffPermission.findFirst({
      where: {
        adminId: adminId,
        permission: {
          resource: resource,
          type: PermissionType.ADMIN,
        },
      },
    });

    if (hasAdmin) {
      return true; // ADMIN permission grants all access
    }

    // Check for specific permission
    const permission = await this.prisma.staffPermission.findFirst({
      where: {
        adminId: adminId,
        permission: {
          resource: resource,
          type: type,
        },
      },
    });

    return !!permission;
  }

  /**
   * Check if admin has admin permission (full access like principal)
   */
  async hasAdminPermission(adminId: string, resource: PermissionResource): Promise<boolean> {
    return this.hasPermission(adminId, resource, PermissionType.ADMIN);
  }

  /**
   * Initialize default permissions in the database
   * This should be called during app startup or migration
   */
  async initializeDefaultPermissions(): Promise<void> {
    const resources = Object.values(PermissionResource);
    const types = Object.values(PermissionType);

    for (const resource of resources) {
      for (const type of types) {
        await this.prisma.permission.upsert({
          where: {
            resource_type: {
              resource: resource,
              type: type,
            },
          },
          create: {
            resource: resource,
            type: type,
            description: this.getPermissionDescription(resource, type),
          },
          update: {},
        });
      }
    }
  }

  private getPermissionDescription(resource: PermissionResource, type: PermissionType): string {
    const resourceNames: Record<PermissionResource, string> = {
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

    const typeNames: Record<PermissionType, string> = {
      READ: 'Read',
      WRITE: 'Write',
      ADMIN: 'Admin',
    };

    return `${typeNames[type]} access to ${resourceNames[resource]}`;
  }
}

