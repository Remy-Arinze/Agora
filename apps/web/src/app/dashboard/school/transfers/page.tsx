'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import { 
  ArrowRightLeft, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  Plus, 
  Download,
  Copy,
  Key,
  ArrowDown,
  ArrowUp
} from 'lucide-react';

// Mock data - will be replaced with API calls later
const mockOutgoingTransfers = [
  {
    id: '1',
    studentName: 'John Doe',
    studentId: 'STU001',
    admissionNumber: 'ADM001',
    classLevel: 'JSS2',
    toSchool: 'Premier High School',
    transferKey: 'TRF-ABC123-XYZ789',
    generatedAt: '2024-03-01',
    status: 'pending' as const,
    expiresAt: '2024-04-01',
  },
  {
    id: '2',
    studentName: 'Jane Smith',
    studentId: 'STU002',
    admissionNumber: 'ADM002',
    classLevel: 'SS1',
    toSchool: 'Elite Secondary School',
    transferKey: 'TRF-DEF456-UVW012',
    generatedAt: '2024-03-05',
    status: 'completed' as const,
    expiresAt: '2024-04-05',
  },
];

const mockIncomingTransfers = [
  {
    id: '1',
    studentName: 'Michael Johnson',
    studentId: 'STU003',
    fromSchool: 'Test Academy',
    classLevel: 'JSS3',
    receivedAt: '2024-03-10',
    status: 'pending' as const,
  },
  {
    id: '2',
    studentName: 'Sarah Williams',
    studentId: 'STU004',
    fromSchool: 'Elite Secondary School',
    classLevel: 'SS2',
    receivedAt: '2024-03-15',
    status: 'completed' as const,
  },
];

export default function TransfersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [showIncomingForm, setShowIncomingForm] = useState(false);
  const [showGenerateKeyModal, setShowGenerateKeyModal] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    transferKey: '',
    studentPrivateKey: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleIncomingTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    // TODO: API call to process incoming transfer
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Transfer request processed successfully!');
      setFormData({ transferKey: '', studentPrivateKey: '' });
      setShowIncomingForm(false);
    } catch (err) {
      setError('Failed to process transfer. Please verify the keys and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTransferKey = async (studentId: string) => {
    setIsLoading(true);
    // TODO: API call to generate transfer key
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowGenerateKeyModal(studentId);
    } catch (err) {
      setError('Failed to generate transfer key.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Transfer key copied to clipboard!');
    setTimeout(() => setSuccess(null), 2000);
  };

  const filteredOutgoing = mockOutgoingTransfers.filter((transfer) =>
    transfer.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transfer.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transfer.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIncoming = mockIncomingTransfers.filter((transfer) =>
    transfer.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    transfer.studentId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
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
                    <form onSubmit={handleIncomingTransfer} className="space-y-4">
                      {error && <Alert variant="error">{error}</Alert>}
                      {success && <Alert variant="success">{success}</Alert>}

                      <div>
                        <Input
                          label="Transfer Key"
                          placeholder="Enter transfer key from source school"
                          value={formData.transferKey}
                          onChange={(e) =>
                            setFormData({ ...formData, transferKey: e.target.value })
                          }
                          required
                          helperText="Get this key from the school the student is transferring from"
                        />
                      </div>

                      <div>
                        <Input
                          label="Student Private Key"
                          type="password"
                          placeholder="Enter student's private key"
                          value={formData.studentPrivateKey}
                          onChange={(e) =>
                            setFormData({ ...formData, studentPrivateKey: e.target.value })
                          }
                          required
                          helperText="The student's private key for verification"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          type="submit"
                          variant="primary"
                          isLoading={isLoading}
                          disabled={!formData.transferKey || !formData.studentPrivateKey}
                        >
                          Process Transfer
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setShowIncomingForm(false);
                            setFormData({ transferKey: '', studentPrivateKey: '' });
                            setError(null);
                            setSuccess(null);
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
                      Incoming Transfer Requests
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
                              Class Level
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Received Date
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
                          {filteredIncoming.map((transfer, index) => (
                            <motion.tr
                              key={transfer.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                  {transfer.studentName}
                                </p>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  {transfer.studentId}
                                </p>
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {transfer.fromSchool}
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {transfer.classLevel}
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {new Date(transfer.receivedAt).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}
                                >
                                  {transfer.status}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                {transfer.status === 'completed' ? (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => router.push('/dashboard/school/admissions?new=true&fromTransfer=' + transfer.id)}
                                  >
                                    Proceed to Application
                                  </Button>
                                ) : (
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
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

          {activeTab === 'outgoing' && (
            <div className="space-y-6">
              {/* Outgoing Transfers List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                      Outgoing Transfers
                    </CardTitle>
                    <div className="flex-1 max-w-md ml-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-light-text-muted dark:text-dark-text-muted" />
                        <Input
                          placeholder="Search by student name, ID, or admission number..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredOutgoing.length === 0 ? (
                    <div className="text-center py-12">
                      <ArrowUp className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                      <p className="text-light-text-secondary dark:text-dark-text-secondary">
                        No outgoing transfers. Generate a transfer key for a student to initiate a transfer.
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
                              To School
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Transfer Key
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-light-text-secondary dark:text-dark-text-secondary">
                              Generated
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
                          {filteredOutgoing.map((transfer, index) => (
                            <motion.tr
                              key={transfer.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-light-border dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                            >
                              <td className="py-4 px-4">
                                <p className="font-medium text-light-text-primary dark:text-dark-text-primary">
                                  {transfer.studentName}
                                </p>
                                <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">
                                  {transfer.admissionNumber} • {transfer.classLevel}
                                </p>
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {transfer.toSchool}
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-gray-100 dark:bg-dark-surface px-2 py-1 rounded font-mono text-light-text-primary dark:text-dark-text-primary">
                                    {transfer.transferKey}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(transfer.transferKey)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                                {new Date(transfer.generatedAt).toLocaleDateString()}
                              </td>
                              <td className="py-4 px-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transfer.status)}`}
                                >
                                  {transfer.status}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm">
                                    <Download className="h-4 w-4 mr-1" />
                                    Download
                                  </Button>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
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

              {/* Generate Transfer Key Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Generate Transfer Key for Student
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      To initiate a student transfer, generate a transfer key. This key, along with the student's private key, 
                      will be used by the receiving school to process the transfer.
                    </p>
                    <div className="flex gap-3">
                      <Input
                        placeholder="Search for student by name or admission number..."
                        className="flex-1"
                      />
                      <Button variant="primary">
                        <Key className="h-4 w-4 mr-2" />
                        Generate Key
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.div>

        {/* Generate Key Modal */}
        {showGenerateKeyModal && (
          <Modal
            isOpen={!!showGenerateKeyModal}
            onClose={() => setShowGenerateKeyModal(null)}
            title="Transfer Key Generated"
          >
            <div className="space-y-4">
              <Alert variant="success">
                Transfer key has been generated successfully. Share this key with the receiving school.
              </Alert>
              <div>
                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2 block">
                  Transfer Key
                </label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-gray-100 dark:bg-dark-surface px-4 py-3 rounded font-mono text-sm text-light-text-primary dark:text-dark-text-primary">
                    TRF-ABC123-XYZ789-{Date.now()}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`TRF-ABC123-XYZ789-${Date.now()}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    // TODO: Download transfer key
                    setShowGenerateKeyModal(null);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Key
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowGenerateKeyModal(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </ProtectedRoute>
  );
}
