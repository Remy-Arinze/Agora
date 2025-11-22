'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { motion } from 'framer-motion';
import { UserPlus, Search, CheckCircle2, XCircle, Clock, Eye, Calendar, User, Phone, Mail, MapPin, Heart, AlertCircle, GraduationCap } from 'lucide-react';

// Mock data - will be replaced with API calls later
const mockAdmissions = [
  {
    id: '1',
    firstName: 'James',
    lastName: 'Wilson',
    email: 'james.w@example.com',
    phone: '+234 801 234 5678',
    classLevel: 'JSS1',
    applicationDate: '2024-03-01',
    status: 'pending' as const,
  },
  {
    id: '2',
    firstName: 'Sarah',
    lastName: 'Martinez',
    email: 'sarah.m@example.com',
    phone: '+234 802 345 6789',
    classLevel: 'SS1',
    applicationDate: '2024-03-05',
    status: 'approved' as const,
  },
  {
    id: '3',
    firstName: 'Robert',
    lastName: 'Taylor',
    email: 'robert.t@example.com',
    phone: '+234 803 456 7890',
    classLevel: 'JSS2',
    applicationDate: '2024-03-10',
    status: 'pending' as const,
  },
  {
    id: '4',
    firstName: 'Lisa',
    lastName: 'Anderson',
    email: 'lisa.a@example.com',
    phone: '+234 804 567 8901',
    classLevel: 'SS2',
    applicationDate: '2024-03-12',
    status: 'rejected' as const,
  },
];

function AdmissionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdmission, setSelectedAdmission] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [admissionToProcess, setAdmissionToProcess] = useState<string | null>(null);
  const [showNewApplicationForm, setShowNewApplicationForm] = useState(false);
  const [showTransferInfo, setShowTransferInfo] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    classLevel: '',
    // Parent/Guardian Information
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelationship: '',
    // Health Information
    bloodGroup: '',
    allergies: '',
    medications: '',
    emergencyContact: '',
    emergencyContactPhone: '',
    medicalNotes: '',
  });

  useEffect(() => {
    const newParam = searchParams.get('new');
    const fromTransfer = searchParams.get('fromTransfer');
    if (newParam === 'true') {
      if (fromTransfer) {
        setTransferId(fromTransfer);
        setShowTransferInfo(true);
        // TODO: Fetch transfer student data and pre-fill form
      } else {
        setShowNewApplicationForm(true);
      }
    }
  }, [searchParams]);

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return '';
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleDateOfBirthChange = (value: string) => {
    setFormData({ ...formData, dateOfBirth: value, age: calculateAge(value) });
  };

  const handleProceedFromTransfer = () => {
    setShowTransferInfo(false);
    setShowNewApplicationForm(true);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // TODO: API call to submit application
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowNewApplicationForm(false);
    setTransferId(null);
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      dateOfBirth: '',
      age: '',
      gender: '',
      email: '',
      phone: '',
      address: '',
      classLevel: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      parentRelationship: '',
      bloodGroup: '',
      allergies: '',
      medications: '',
      emergencyContact: '',
      emergencyContactPhone: '',
      medicalNotes: '',
    });
    router.push('/dashboard/school/admissions');
  };

  const filteredAdmissions = mockAdmissions.filter(
    (admission) =>
      admission.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admission.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admission.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApprove = (id: string) => {
    setAdmissionToProcess(id);
    setShowApproveModal(true);
  };

  const handleReject = (id: string) => {
    setAdmissionToProcess(id);
    setShowRejectModal(true);
  };

  const confirmApprove = () => {
    // TODO: API call to approve admission
    setShowApproveModal(false);
    setAdmissionToProcess(null);
  };

  const confirmReject = () => {
    // TODO: API call to reject admission
    setShowRejectModal(false);
    setAdmissionToProcess(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'rejected':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    }
  };

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                Admissions
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Review and process student admission applications
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => setShowNewApplicationForm(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              New Application
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Pending
                  </p>
                  <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mt-1">
                    {mockAdmissions.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Approved
                  </p>
                  <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mt-1">
                    {mockAdmissions.filter(a => a.status === 'approved').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    Rejected
                  </p>
                  <p className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary mt-1">
                    {mockAdmissions.filter(a => a.status === 'rejected').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Admissions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
              Applications ({filteredAdmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAdmissions.length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                  No admission applications found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-light-border dark:border-dark-border">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Applicant
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Contact
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Class Level
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Application Date
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAdmissions.map((admission, index) => (
                      <motion.tr
                        key={admission.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(admission.status)}
                            <div>
                              <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                {admission.firstName} {admission.lastName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          <p>{admission.email}</p>
                          <p className="text-xs">{admission.phone}</p>
                        </td>
                        <td className="py-4 px-4 text-sm text-light-text-primary dark:text-dark-text-primary font-medium">
                          {admission.classLevel}
                        </td>
                        <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                          {new Date(admission.applicationDate).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(admission.status)}`}
                          >
                            {admission.status}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedAdmission(admission.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {admission.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleApprove(admission.id)}
                                  className="text-green-600 dark:text-green-400"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleReject(admission.id)}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <ConfirmModal
          isOpen={showApproveModal}
          onClose={() => {
            setShowApproveModal(false);
            setAdmissionToProcess(null);
          }}
          onConfirm={confirmApprove}
          title="Approve Admission"
          message={`Are you sure you want to approve this admission application? The student will be enrolled in the school.`}
          confirmText="Approve"
          variant="warning"
        />

        <ConfirmModal
          isOpen={showRejectModal}
          onClose={() => {
            setShowRejectModal(false);
            setAdmissionToProcess(null);
          }}
          onConfirm={confirmReject}
          title="Reject Admission"
          message={`Are you sure you want to reject this admission application? This action cannot be undone.`}
          confirmText="Reject"
          variant="danger"
        />

        {/* Transfer Info Modal */}
        {showTransferInfo && (
          <Modal
            isOpen={showTransferInfo}
            onClose={() => {
              setShowTransferInfo(false);
              setTransferId(null);
              router.push('/dashboard/school/admissions');
            }}
            title="Transfer Student Application"
          >
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                      Student Transfer Verified
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                      This application is for a student transferring from another school. 
                      Their academic history has been verified and will be included in their profile.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowTransferInfo(false);
                    setTransferId(null);
                    router.push('/dashboard/school/admissions');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleProceedFromTransfer}
                >
                  Proceed to Application Form
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* New Application Form Modal */}
        {showNewApplicationForm && (
          <Modal
            isOpen={showNewApplicationForm}
            onClose={() => {
              setShowNewApplicationForm(false);
              setTransferId(null);
              setFormData({
                firstName: '',
                middleName: '',
                lastName: '',
                dateOfBirth: '',
                age: '',
                gender: '',
                email: '',
                phone: '',
                address: '',
                classLevel: '',
                parentName: '',
                parentPhone: '',
                parentEmail: '',
                parentRelationship: '',
                bloodGroup: '',
                allergies: '',
                medications: '',
                emergencyContact: '',
                emergencyContactPhone: '',
                medicalNotes: '',
              });
              router.push('/dashboard/school/admissions');
            }}
            title={transferId ? 'Complete Transfer Application' : 'New Admission Application'}
            size="xl"
          >
            <form onSubmit={handleSubmitApplication} className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                  />
                  <Input
                    label="Middle Name"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  />
                  <Input
                    label="Last Name *"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                  />
                  <Input
                    label="Date of Birth *"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleDateOfBirthChange(e.target.value)}
                    required
                  />
                  <Input
                    label="Age"
                    value={formData.age}
                    readOnly
                    helperText="Calculated from date of birth"
                  />
                  <div>
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Gender *
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                  <Input
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Input
                    label="Phone *"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                  <Input
                    label="Address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="md:col-span-2"
                  />
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Class Level *
                    </label>
                    <select
                      value={formData.classLevel}
                      onChange={(e) => setFormData({ ...formData, classLevel: e.target.value })}
                      className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select class level</option>
                      <option value="JSS1">JSS1</option>
                      <option value="JSS2">JSS2</option>
                      <option value="JSS3">JSS3</option>
                      <option value="SS1">SS1</option>
                      <option value="SS2">SS2</option>
                      <option value="SS3">SS3</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Parent/Guardian Information */}
              <div>
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Parent/Guardian Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Parent/Guardian Name *"
                    value={formData.parentName}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    required
                  />
                  <Input
                    label="Relationship *"
                    value={formData.parentRelationship}
                    onChange={(e) => setFormData({ ...formData, parentRelationship: e.target.value })}
                    placeholder="e.g., Father, Mother, Guardian"
                    required
                  />
                  <Input
                    label="Parent Phone *"
                    type="tel"
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                    required
                  />
                  <Input
                    label="Parent Email"
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                  />
                </div>
              </div>

              {/* Health Information */}
              <div>
                <h3 className="text-lg font-semibold text-light-text-primary dark:text-dark-text-primary mb-4 flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Health Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Blood Group
                    </label>
                    <select
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                      className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                  <Input
                    label="Allergies"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="e.g., Peanuts, Dust"
                    helperText="Separate multiple allergies with commas"
                  />
                  <Input
                    label="Medications"
                    value={formData.medications}
                    onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                    placeholder="e.g., Inhaler (as needed)"
                    helperText="List any current medications"
                  />
                  <Input
                    label="Emergency Contact Name"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  />
                  <Input
                    label="Emergency Contact Phone *"
                    type="tel"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    required
                  />
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">
                      Medical Notes
                    </label>
                    <textarea
                      value={formData.medicalNotes}
                      onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-card dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Any additional medical information or notes..."
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-light-border dark:border-dark-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowNewApplicationForm(false);
                    setTransferId(null);
                    setFormData({
                      firstName: '',
                      middleName: '',
                      lastName: '',
                      dateOfBirth: '',
                      age: '',
                      gender: '',
                      email: '',
                      phone: '',
                      address: '',
                      classLevel: '',
                      parentName: '',
                      parentPhone: '',
                      parentEmail: '',
                      parentRelationship: '',
                      bloodGroup: '',
                      allergies: '',
                      medications: '',
                      emergencyContact: '',
                      emergencyContactPhone: '',
                      medicalNotes: '',
                    });
                    router.push('/dashboard/school/admissions');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Submit Application
                </Button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function AdmissionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-light-text-secondary dark:text-dark-text-secondary">Loading...</div>
      </div>
    }>
      <AdmissionsPageContent />
    </Suspense>
  );
}

