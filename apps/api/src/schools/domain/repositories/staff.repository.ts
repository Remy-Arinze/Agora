import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { SchoolAdmin, Teacher, Prisma } from '@prisma/client';

@Injectable()
export class StaffRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Admin methods
  async findAdminById(adminId: string): Promise<SchoolAdmin | null> {
    return this.prisma.schoolAdmin.findUnique({
      where: { id: adminId },
      include: { user: true, school: true },
    });
  }

  async findAdminByPublicId(publicId: string): Promise<SchoolAdmin | null> {
    return this.prisma.schoolAdmin.findUnique({
      where: { publicId },
      include: { user: true, school: true },
    });
  }

  async findAdminsBySchool(schoolId: string): Promise<SchoolAdmin[]> {
    return this.prisma.schoolAdmin.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAdmin(data: Prisma.SchoolAdminCreateInput): Promise<SchoolAdmin> {
    return this.prisma.schoolAdmin.create({
      data,
      include: { user: true, school: true },
    });
  }

  async updateAdmin(
    id: string,
    data: Prisma.SchoolAdminUpdateInput
  ): Promise<SchoolAdmin> {
    return this.prisma.schoolAdmin.update({
      where: { id },
      data,
      include: { user: true, school: true },
    });
  }

  async deleteAdmin(id: string): Promise<SchoolAdmin> {
    return this.prisma.schoolAdmin.delete({
      where: { id },
    });
  }

  // Teacher methods
  async findTeacherById(teacherId: string): Promise<Teacher | null> {
    return this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true, school: true },
    });
  }

  async findTeacherByPublicId(publicId: string): Promise<Teacher | null> {
    return this.prisma.teacher.findUnique({
      where: { publicId },
      include: { user: true, school: true },
    });
  }

  async findTeacherByTeacherId(teacherId: string): Promise<Teacher | null> {
    return this.prisma.teacher.findUnique({
      where: { teacherId },
      include: { user: true, school: true },
    });
  }

  async findTeachersBySchool(schoolId: string): Promise<Teacher[]> {
    return this.prisma.teacher.findMany({
      where: { schoolId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTeacher(data: Prisma.TeacherCreateInput): Promise<Teacher> {
    return this.prisma.teacher.create({
      data,
      include: { user: true, school: true },
    });
  }

  async updateTeacher(
    id: string,
    data: Prisma.TeacherUpdateInput
  ): Promise<Teacher> {
    return this.prisma.teacher.update({
      where: { id },
      data,
      include: { user: true, school: true },
    });
  }

  async deleteTeacher(id: string): Promise<Teacher> {
    return this.prisma.teacher.delete({
      where: { id },
    });
  }

  // Check for existing staff
  async findAdminByEmailInSchool(
    email: string,
    schoolId: string
  ): Promise<SchoolAdmin | null> {
    return this.prisma.schoolAdmin.findFirst({
      where: { email, schoolId },
    });
  }

  async findTeacherByEmailInSchool(
    email: string,
    schoolId: string
  ): Promise<Teacher | null> {
    return this.prisma.teacher.findFirst({
      where: { email, schoolId },
    });
  }

  async findAdminByPhoneInSchool(
    phone: string,
    schoolId: string
  ): Promise<SchoolAdmin | null> {
    return this.prisma.schoolAdmin.findFirst({
      where: { phone, schoolId },
    });
  }

  async findTeacherByPhoneInSchool(
    phone: string,
    schoolId: string
  ): Promise<Teacher | null> {
    return this.prisma.teacher.findFirst({
      where: { phone, schoolId },
    });
  }
}

