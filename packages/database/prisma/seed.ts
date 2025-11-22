import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/**
 * Generate a unique school ID
 */
function generateSchoolId(): string {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  return `AG-SCH-${uuid}`;
}

/**
 * Generate a unique principal ID
 */
function generatePrincipalId(): string {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  return `AG-PR-${uuid}`;
}

/**
 * Generate a unique admin ID
 */
function generateAdminId(): string {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  return `AG-AD-${uuid}`;
}

/**
 * Generate a unique teacher ID
 */
function generateTeacherId(): string {
  const uuid = uuidv4().replace(/-/g, '').toUpperCase();
  return `AG-TE-${uuid}`;
}

/**
 * Generate a short alphanumeric string (6 characters)
 */
function generateShortId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars (0, O, I, 1)
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Shorten school name for public ID
 */
function shortenSchoolName(schoolName: string): string {
  const cleaned = schoolName
    .toUpperCase()
    .replace(/\b(SCHOOL|ACADEMY|COLLEGE|UNIVERSITY|INSTITUTE|SECONDARY|PRIMARY|HIGH)\b/gi, '')
    .replace(/[^A-Z0-9]/g, '')
    .substring(0, 4);
  
  if (cleaned.length < 3) {
    return schoolName
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .substring(0, 3)
      .padEnd(3, 'X');
  }
  
  return cleaned;
}

/**
 * Generate a unique public ID for admin/teacher
 * Format: AG-{schoolname shortened}-{short alphanumeric}
 */
function generatePublicId(schoolName: string): string {
  const schoolShort = shortenSchoolName(schoolName);
  const shortId = generateShortId();
  return `AG-${schoolShort}-${shortId}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Hash password for all test users
  const hashedPassword = await bcrypt.hash('Test1234!', 10);

  // Create Super Admin
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@agora.com' },
    update: {},
    create: {
      email: 'superadmin@agora.com',
      phone: '+2348000000001',
      passwordHash: hashedPassword,
      accountStatus: 'ACTIVE',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✅ Created Super Admin:', superAdmin.email);

  // Create School Admin
  const schoolAdmin = await prisma.user.upsert({
    where: { email: 'admin@school.com' },
    update: {},
    create: {
      email: 'admin@school.com',
      phone: '+2348000000002',
      passwordHash: hashedPassword,
      accountStatus: 'ACTIVE',
      role: 'SCHOOL_ADMIN',
    },
  });

  // Create a School
  const schoolId = generateSchoolId();
  const school = await prisma.school.upsert({
    where: { id: 'test-school-1' },
    update: {
      schoolId: schoolId,
    },
    create: {
      id: 'test-school-1',
      schoolId: schoolId,
      name: 'Test Academy',
      subdomain: 'testacademy',
      address: '123 Education Street',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      phone: '+2348000000100',
      email: 'info@testacademy.com',
    },
  });

  // Link School Admin to School (as Principal)
  const principalId = generatePrincipalId();
  const principalPublicId = generatePublicId(school.name);
  await prisma.schoolAdmin.upsert({
    where: {
      userId_schoolId: {
        userId: schoolAdmin.id,
        schoolId: school.id,
      },
    },
    update: {
      adminId: principalId,
      publicId: principalPublicId,
      role: 'Principal',
    },
    create: {
      adminId: principalId,
      publicId: principalPublicId,
      userId: schoolAdmin.id,
      schoolId: school.id,
      firstName: 'School',
      lastName: 'Administrator',
      phone: '+2348000000002',
      email: 'admin@school.com',
      role: 'Principal',
    },
  });
  console.log('✅ Created School Admin:', schoolAdmin.email);

  // Create Teacher
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@school.com' },
    update: {},
    create: {
      email: 'teacher@school.com',
      phone: '+2348000000003',
      passwordHash: hashedPassword,
      accountStatus: 'ACTIVE',
      role: 'TEACHER',
    },
  });

  const teacherId = generateTeacherId();
  const teacherPublicId = generatePublicId(school.name);
  await prisma.teacher.upsert({
    where: {
      userId_schoolId: {
        userId: teacher.id,
        schoolId: school.id,
      },
    },
    update: {
      teacherId: teacherId,
      publicId: teacherPublicId,
    },
    create: {
      teacherId: teacherId,
      publicId: teacherPublicId,
      userId: teacher.id,
      schoolId: school.id,
      firstName: 'John',
      lastName: 'Teacher',
      phone: '+2348000000003',
      email: 'teacher@school.com',
      employeeId: 'TCH-001',
    },
  });
  console.log('✅ Created Teacher:', teacher.email);

  // Create Parent
  const parent = await prisma.user.upsert({
    where: { email: 'parent@example.com' },
    update: {},
    create: {
      email: 'parent@example.com',
      phone: '+2348000000004',
      passwordHash: hashedPassword,
      accountStatus: 'ACTIVE',
      role: 'PARENT',
    },
  });

  await prisma.parent.upsert({
    where: { userId: parent.id },
    update: {},
    create: {
      userId: parent.id,
      firstName: 'Jane',
      lastName: 'Parent',
      phone: '+2348000000004',
      email: 'parent@example.com',
    },
  });
  console.log('✅ Created Parent:', parent.email);

  // Create Student
  const student = await prisma.user.upsert({
    where: { email: 'student@example.com' },
    update: {},
    create: {
      email: 'student@example.com',
      phone: '+2348000000005',
      passwordHash: hashedPassword,
      accountStatus: 'ACTIVE',
      role: 'STUDENT',
    },
  });

  const studentProfile = await prisma.student.upsert({
    where: { userId: student.id },
    update: {},
    create: {
      userId: student.id,
      uid: 'AGO-LAG-2025-0001',
      firstName: 'Alice',
      lastName: 'Student',
      dateOfBirth: new Date('2010-05-15'),
      profileLocked: false,
    },
  });

  // Link Parent to Student
  const parentProfile = await prisma.parent.findUnique({ where: { userId: parent.id } });
  if (parentProfile) {
    // Check if relationship already exists
    const existingGuardian = await prisma.studentGuardian.findFirst({
      where: {
        studentId: studentProfile.id,
        parentId: parentProfile.id,
      },
    });

    if (!existingGuardian) {
      await prisma.studentGuardian.create({
        data: {
          studentId: studentProfile.id,
          parentId: parentProfile.id,
          relationship: 'Mother',
          isPrimary: true,
        },
      });
    }
  }

  // Create Enrollment
  await prisma.enrollment.upsert({
    where: {
      studentId_schoolId_academicYear: {
        studentId: studentProfile.id,
        schoolId: school.id,
        academicYear: '2024-2025',
      },
    },
    update: {},
    create: {
      studentId: studentProfile.id,
      schoolId: school.id,
      classLevel: 'Grade 5',
      academicYear: '2024-2025',
      enrollmentDate: new Date(),
      isActive: true,
    },
  });
  console.log('✅ Created Student:', student.email);

  // Fetch the created records to get public IDs for display
  const createdPrincipal = await prisma.schoolAdmin.findFirst({
    where: {
      userId: schoolAdmin.id,
      schoolId: school.id,
    },
  });
  
  const createdTeacher = await prisma.teacher.findFirst({
    where: {
      userId: teacher.id,
      schoolId: school.id,
    },
  });

  console.log('\n🎉 Seeding completed!\n');
  console.log('📋 Test Login Credentials:\n');
  console.log('Super Admin:');
  console.log('  Email: superadmin@agora.com');
  console.log('  Password: Test1234!\n');
  console.log('School Admin (Principal):');
  console.log('  Email: admin@school.com (for email login - super admin only)');
  console.log(`  Public ID: ${createdPrincipal?.publicId || 'N/A'} (for public ID login)`);
  console.log('  Password: Test1234!\n');
  console.log('Teacher:');
  console.log('  Email: teacher@school.com (for email login - super admin only)');
  console.log(`  Public ID: ${createdTeacher?.publicId || 'N/A'} (for public ID login)`);
  console.log('  Password: Test1234!\n');
  console.log('Parent:');
  console.log('  Email: parent@example.com');
  console.log('  Password: Test1234!\n');
  console.log('Student:');
  console.log('  Email: student@example.com');
  console.log('  Password: Test1234!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

