'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { motion } from 'framer-motion';
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Plus,
  Copy,
  Key,
  ArrowDown,
  ArrowUp,
  Loader2,
  GraduationCap,
  Trash2,
  X,
} from 'lucide-react';
import {
  useGetMySchoolQuery,
  useGetStudentsQuery,
  useGenerateTacMutation,
  useGetOutgoingTransfersQuery,
  useRevokeTacMutation,
  useInitiateTransferMutation,
  useGetIncomingTransfersQuery,
  useCompleteTransferMutation,
  useRejectTransferMutation,
  useGetClassesQuery,
} from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';

export default function TransfersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [showIncomingForm, setShowIncomingForm] = useState(false);
  const [showGenerateTacModal, setShowGenerateTacModal] = useState(false);
  const [showTacDisplayModal, setShowTacDisplayModal] = useState<{
    tac: string;
    studentId: string;
    studentName: string;
    expiresAt: string;
  } | null>(null);
  const [showTransferPreview, setShowTransferPreview] = useState<any>(null);
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [tacFormData, setTacFormData] = useState({ tac: '', studentId: '' });
  const [completeFormData, setCompleteFormData] = useState({
    targetClassLevel: '',
    academicYear: '',
    classId: '',
    classArmId: '',
  });

  // Get school ID
  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  // Get students for TAC generation
  const { data: studentsResponse } = useGetStudentsQuery(
    { schoolId: schoolId!, page: 1, limit: 100 },
    { skip: !schoolId }
  );
  const students = studentsResponse?.data?.items || [];

  // Get classes for transfer completion
  const { data: classesResponse } = useGetClassesQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );
  const classes = classesResponse?.data || [];

  // Outgoing transfers
  const { data: outgoingResponse, refetch: refetchOutgoing } = useGetOutgoingTransfersQuery(
    { schoolId: schoolId!, page: 1, limit: 50 },
    { skip: !schoolId }
  );
  const outgoingTransfers = outgoingResponse?.data?.transfers || [];

  // Incoming transfers
  const { data: incomingResponse, refetch: refetchIncoming } = useGetIncomingTransfersQuery(
    { schoolId: schoolId!, page: 1, limit: 50 },
    { skip: !schoolId }
  );
  const incomingTransfers = incomingResponse?.data?.transfers || [];

  // Mutations
  const [generateTac, { isLoading: isGeneratingTac }] = useGenerateTacMutation();
  const [revokeTac, { isLoading: isRevoking }] = useRevokeTacMutation();
  const [initiateTransfer, { isLoading: isInitiating }] = useInitiateTransferMutation();
  const [completeTransfer, { isLoading: isCompleting }] = useCompleteTransferMutation();
  const [rejectTransfer, { isLoading: isRejecting }] = useRejectTransferMutation();

  // Filter students for TAC generation
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery) return students;
    const query = studentSearchQuery.toLowerCase();
    return students.filter(
      (s: any) =>
        s.firstName?.toLowerCase().includes(query) ||
        s.lastName?.toLowerCase().includes(query) ||
        s.uid?.toLowerCase().includes(query) ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(query)
    );
  }, [students, studentSearchQuery]);

  // Filter transfers
  const filteredOutgoing = useMemo(() => {
    if (!searchQuery) return outgoingTransfers;
    const query = searchQuery.toLowerCase();
    return outgoingTransfers.filter(
      (t: any) =>
        t.student?.firstName?.toLowerCase().includes(query) ||
        t.student?.lastName?.toLowerCase().includes(query) ||
        t.student?.uid?.toLowerCase().includes(query) ||
        t.tac?.toLowerCase().includes(query)
    );
  }, [outgoingTransfers, searchQuery]);

  const filteredIncoming = useMemo(() => {
    if (!searchQuery) return incomingTransfers;
    const query = searchQuery.toLowerCase();
    return incomingTransfers.filter(
      (t: any) =>
        t.student?.firstName?.toLowerCase().includes(query) ||
        t.student?.lastName?.toLowerCase().includes(query) ||
        t.student?.uid?.toLowerCase().includes(query) ||
        t.tac?.toLowerCase().includes(query)
    );
  }, [incomingTransfers, searchQuery]);

  const handleGenerateTac = async () => {
    if (!selectedStudentId) {
      toast.error('Please select a student');
      return;
    }

    try {
      const result = await generateTac({
        schoolId: schoolId!,
        studentId: selectedStudentId,
      }).unwrap();

      if (result.data) {
        setShowTacDisplayModal({
          tac: result.data.tac,
          studentId: result.data.studentId,
          studentName: result.data.studentName,
          expiresAt: result.data.expiresAt,
        });
        setShowGenerateTacModal(false);
        setSelectedStudentId('');
        refetchOutgoing();
        toast.success('TAC generated successfully');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to generate TAC');
    }
  };

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tacFormData.tac || !tacFormData.studentId) {
      toast.error('Please enter both TAC and Student ID');
      return;
    }

    try {
      const result = await initiateTransfer({
        schoolId: schoolId!,
        tac: tacFormData.tac,
        studentId: tacFormData.studentId,
      }).unwrap();

      if (result.data) {
        setShowTransferPreview(result.data);
        setShowIncomingForm(false);
        setTacFormData({ tac: '', studentId: '' });
        refetchIncoming();
        toast.success('Transfer initiated successfully');
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to initiate transfer');
    }
  };

  const handleCompleteTransfer = async () => {
    if (!showCompleteModal || !completeFormData.targetClassLevel || !completeFormData.academicYear) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await completeTransfer({
        schoolId: schoolId!,
        transferId: showCompleteModal,
        ...completeFormData,
      }).unwrap();

      setShowCompleteModal(null);
      setShowTransferPreview(null);
      setCompleteFormData({ targetClassLevel: '', academicYear: '', classId: '', classArmId: '' });
      refetchIncoming();
      toast.success('Transfer completed successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to complete transfer');
    }
  };

  const handleRejectTransfer = async (transferId: string) => {
    if (!confirm('Are you sure you want to reject this transfer?')) return;

    try {
      await rejectTransfer({
        schoolId: schoolId!,
        transferId,
        reason: 'Rejected by admin',
      }).unwrap();

      refetchIncoming();
      toast.success('Transfer rejected');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to reject transfer');
    }
  };

  const handleRevokeTac = async (transferId: string) => {
    if (!confirm('Are you sure you want to revoke this TAC? It cannot be used after revocation.')) return;

    try {
      await revokeTac({ schoolId: schoolId!, transferId }).unwrap();
      refetchOutgoing();
      toast.success('TAC revoked successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to revoke TAC');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'PENDING':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0) + status.slice(1).toLowerCase();
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
                Student Transfers
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Manage incoming and outgoing student transfers
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 border-b border-light-border dark:border-dark-border">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('incoming')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'incoming'
                  ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
              }`}
            >
              <ArrowDown className="h-4 w-4" />
              Incoming Transfers
            </button>
            <button
              onClick={() => setActiveTab('outgoing')}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'outgoing'
                  ? 'border-b-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary'
              }`}
            >
              <ArrowUp className="h-4 w-4" />
              Outgoing Transfers
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'incoming' && (
            <div className="space-y-6">
              {/* Incoming Transfer Form */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                      <ArrowDown className="h-5 w-5" />
                      Process Incoming Transfer
                    </CardTitle>
                    {!showIncomingForm && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowIncomingForm(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New Transfer
                      </Button>
                    )}
                  </div>
                </CardHeader>
                {showIncomingForm && (
                  <CardContent>
                    <form onSubmit={handleInitiateTransfer} className="space-y-4">
                      <div>
                        <Input
                          label="Transfer Access Code (TAC)"
                          placeholder="Enter TAC from source school (e.g., TAC-ABC123-XYZ)"
                          value={tacFormData.tac}
                          onChange={(e) =>
                            setTacFormData({ ...tacFormData, tac: e.target.value.toUpperCase() })
                          }
                          required
                          helperText="Get this TAC from the school the student is transferring from"
                        />
                      </div>

                      <div>
                        <Input
                          label="Student ID"
                          placeholder="Enter student ID"
                          value={tacFormData.studentId}
                          onChange={(e) =>
                            setTacFormData({ ...tacFormData, studentId: e.target.value })
                          }
                          required
                          helperText="The student's ID (must match the TAC)"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="submit"
                          variant="primary"
                          isLoading={isInitiating}
                          disabled={!tacFormData.tac || !tacFormData.studentId}
                        >
                          Initiate Transfer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowIncomingForm(false);
                            setTacFormData({ tac: '', studentId: '' });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                )}
              </Card>

              {/* Incoming Transfers List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      Incoming Transfer Requests ({filteredIncoming.length})
                    </CardTitle>
                    <div className="flex-1 max-w-md ml-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                        <Input
                          placeholder="Search by student name or ID..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredIncoming.length === 0 ? (
                    <div className="text-center py-12">
                      <ArrowDown className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No incoming transfer requests.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-light-border dark:border-dark-border">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Student
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              From School
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Status
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Created
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredIncoming.map((transfer: any, index: number) => (
                            <motion.tr
                              key={transfer.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                  {transfer.student?.firstName} {transfer.student?.lastName}
                                </p>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  {transfer.student?.uid}
                                </p>
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {transfer.fromSchool?.name || 'N/A'}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                    transfer.status
                                  )}`}
                                >
                                  {formatStatus(transfer.status)}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {new Date(transfer.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  {transfer.status === 'APPROVED' && (
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      onClick={() => setShowCompleteModal(transfer.id)}
                                    >
                                      Complete
                                    </Button>
                                  )}
                                  {transfer.status === 'PENDING' && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleRejectTransfer(transfer.id)}
                                        disabled={isRejecting}
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
            </div>
          )}

          {activeTab === 'outgoing' && (
            <div className="space-y-6">
              {/* Outgoing Transfers List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      Outgoing Transfers ({filteredOutgoing.length})
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-md">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                          <Input
                            placeholder="Search by student name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowGenerateTacModal(true)}
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Generate TAC
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredOutgoing.length === 0 ? (
                    <div className="text-center py-12">
                      <ArrowUp className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No outgoing transfers. Generate a TAC for a student to initiate a transfer.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-light-border dark:border-dark-border">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Student
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              TAC
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              To School
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Generated
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Expires
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
                          {filteredOutgoing.map((transfer: any, index: number) => (
                            <motion.tr
                              key={transfer.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                  {transfer.student?.firstName} {transfer.student?.lastName}
                                </p>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  {transfer.student?.uid}
                                </p>
                              </td>
                              <td className="py-4 px-4">
                                {transfer.tac ? (
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs bg-gray-100 dark:bg-dark-surface px-2 py-1 rounded font-mono text-light-text-primary dark:text-dark-text-primary">
                                      {transfer.tac}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(transfer.tac)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm text-light-text-muted dark:text-dark-text-muted">
                                    No TAC
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {transfer.toSchool?.name || 'Not specified'}
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {transfer.tacGeneratedAt
                                  ? new Date(transfer.tacGeneratedAt).toLocaleDateString()
                                  : 'N/A'}
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {transfer.tacExpiresAt ? (
                                  <span
                                    className={
                                      new Date(transfer.tacExpiresAt) < new Date()
                                        ? 'text-red-600 dark:text-red-400'
                                        : ''
                                    }
                                  >
                                    {new Date(transfer.tacExpiresAt).toLocaleDateString()}
                                  </span>
                                ) : (
                                  'N/A'
                                )}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                    transfer.status
                                  )}`}
                                >
                                  {formatStatus(transfer.status)}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                {transfer.tac && !transfer.tacUsedAt && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRevokeTac(transfer.id)}
                                    disabled={isRevoking}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Revoke
                                  </Button>
                                )}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>

        {/* Generate TAC Modal */}
        {showGenerateTacModal && (
          <Modal
            isOpen={showGenerateTacModal}
            onClose={() => {
              setShowGenerateTacModal(false);
              setSelectedStudentId('');
              setStudentSearchQuery('');
            }}
            title="Generate Transfer Access Code (TAC)"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Search and select a student to generate a TAC. Share this TAC with the receiving school along with the student's ID.
              </p>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Search Student
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-light-text-muted dark:text-dark-text-muted" />
                  <Input
                    placeholder="Search by name or student ID..."
                    value={studentSearchQuery}
                    onChange={(e) => {
                      setStudentSearchQuery(e.target.value);
                      setSelectedStudentId(''); // Clear selection when searching
                    }}
                    className="pl-10"
                  />
                </div>
              </div>
              {studentSearchQuery && !selectedStudentId && (
                <div className="max-h-60 overflow-y-auto border border-light-border dark:border-dark-border rounded-lg">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      No students found matching "{studentSearchQuery}"
                    </div>
                  ) : (
                    <div className="divide-y divide-light-border dark:divide-dark-border">
                      {filteredStudents.map((student: any) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(student.id);
                            setStudentSearchQuery(''); // Clear search to hide results
                          }}
                          className="w-full text-left p-3 hover:bg-light-hover dark:hover:bg-dark-hover transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                {student.firstName} {student.lastName}
                              </p>
                              <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                {student.uid} • {student.enrollment?.classLevel || 'N/A'}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {selectedStudentId && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">Selected Student:</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {students.find((s: any) => s.id === selectedStudentId)?.firstName}{' '}
                        {students.find((s: any) => s.id === selectedStudentId)?.lastName} (
                        {students.find((s: any) => s.id === selectedStudentId)?.uid})
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStudentId('');
                        setStudentSearchQuery('');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleGenerateTac}
                  isLoading={isGeneratingTac}
                  disabled={!selectedStudentId}
                >
                  Generate TAC
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowGenerateTacModal(false);
                    setSelectedStudentId('');
                    setStudentSearchQuery('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* TAC Display Modal */}
        {showTacDisplayModal && (
          <Modal
            isOpen={!!showTacDisplayModal}
            onClose={() => setShowTacDisplayModal(null)}
            title="TAC Generated Successfully"
            size="md"
          >
            <div className="space-y-4">
              <Alert variant="success">
                TAC has been generated successfully. Share this TAC and the Student ID with the receiving school.
              </Alert>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Transfer Access Code (TAC)
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-dark-surface px-4 py-3 rounded font-mono text-sm text-light-text-primary dark:text-dark-text-primary">
                    {showTacDisplayModal.tac}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(showTacDisplayModal.tac)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Student ID
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-dark-surface px-4 py-3 rounded font-mono text-sm text-light-text-primary dark:text-dark-text-primary">
                    {showTacDisplayModal.studentId}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(showTacDisplayModal.studentId)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                <p>
                  <strong>Student:</strong> {showTacDisplayModal.studentName}
                </p>
                <p>
                  <strong>Expires:</strong> {new Date(showTacDisplayModal.expiresAt).toLocaleString()}
                </p>
              </div>
              <Button variant="primary" className="w-full" onClick={() => setShowTacDisplayModal(null)}>
                Close
              </Button>
            </div>
          </Modal>
        )}

        {/* Transfer Preview Modal */}
        {showTransferPreview && (
          <Modal
            isOpen={!!showTransferPreview}
            onClose={() => setShowTransferPreview(null)}
            title="Transfer Preview"
            size="lg"
          >
            <div className="space-y-4">
              <Alert variant="info">
                Review the student data below. You can complete or reject this transfer.
              </Alert>
              <div>
                <h3 className="font-semibold text-lg mb-2">Student Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">Name:</p>
                    <p className="font-medium">
                      {showTransferPreview.studentData?.student?.firstName}{' '}
                      {showTransferPreview.studentData?.student?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">Student ID:</p>
                    <p className="font-medium">{showTransferPreview.studentData?.student?.uid}</p>
                  </div>
                  <div>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">From School:</p>
                    <p className="font-medium">{showTransferPreview.studentData?.fromSchool?.name}</p>
                  </div>
                  <div>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">Current Class:</p>
                    <p className="font-medium">
                      {showTransferPreview.studentData?.enrollment?.classLevel} (
                      {showTransferPreview.studentData?.enrollment?.academicYear})
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">
                  Grades ({showTransferPreview.studentData?.grades?.length || 0} records)
                </h3>
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Subject</th>
                        <th className="text-left py-2">Score</th>
                        <th className="text-left py-2">Term</th>
                        <th className="text-left py-2">Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showTransferPreview.studentData?.grades?.slice(0, 10).map((grade: any, idx: number) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">{grade.subject}</td>
                          <td className="py-2">
                            {grade.score}/{grade.maxScore} ({grade.grade})
                          </td>
                          <td className="py-2">{grade.term}</td>
                          <td className="py-2">{grade.academicYear}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {showTransferPreview.studentData?.grades?.length > 10 && (
                    <p className="text-xs text-light-text-muted dark:text-dark-text-muted mt-2">
                      ... and {showTransferPreview.studentData.grades.length - 10} more records
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setShowCompleteModal(showTransferPreview.transferId)}
                >
                  Complete Transfer
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleRejectTransfer(showTransferPreview.transferId)}
                  disabled={isRejecting}
                >
                  Reject
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Complete Transfer Modal */}
        {showCompleteModal && (
          <Modal
            isOpen={!!showCompleteModal}
            onClose={() => {
              setShowCompleteModal(null);
              setCompleteFormData({ targetClassLevel: '', academicYear: '', classId: '', classArmId: '' });
            }}
            title="Complete Transfer"
            size="md"
          >
            <div className="space-y-4">
              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                Select the target class for the student in your school.
              </p>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Class Level *
                </label>
                <select
                  value={completeFormData.targetClassLevel}
                  onChange={(e) => {
                    const selectedClass = classes.find((c: any) => c.name === e.target.value);
                    setCompleteFormData({
                      ...completeFormData,
                      targetClassLevel: e.target.value,
                      classId: selectedClass?.id || '',
                    });
                  }}
                  className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-lg bg-light-bg dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select class...</option>
                  {classes.map((cls: any) => (
                    <option key={cls.id} value={cls.name}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Academic Year *
                </label>
                <Input
                  placeholder="e.g., 2024/2025"
                  value={completeFormData.academicYear}
                  onChange={(e) =>
                    setCompleteFormData({ ...completeFormData, academicYear: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleCompleteTransfer}
                  isLoading={isCompleting}
                  disabled={!completeFormData.targetClassLevel || !completeFormData.academicYear}
                >
                  Complete Transfer
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowCompleteModal(null);
                    setCompleteFormData({ targetClassLevel: '', academicYear: '', classId: '', classArmId: '' });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ProtectedRoute>
  );
}
