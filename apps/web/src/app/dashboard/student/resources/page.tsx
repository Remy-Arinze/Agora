'use client';

import { useState, useMemo } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { FileText, Download, Upload, X, Loader2, AlertCircle } from 'lucide-react';
import {
  useGetMyStudentResourcesQuery,
  useGetMyStudentPersonalResourcesQuery,
  useUploadPersonalResourceMutation,
  useDeletePersonalResourceMutation,
  useGetMyStudentClassesQuery,
  useGetMyStudentSchoolQuery,
} from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';

type ResourceType = 'class' | 'personal';

export default function StudentResourcesPage() {
  const [activeTab, setActiveTab] = useState<ResourceType>('class');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  // Get student's school and classes
  const { data: schoolResponse } = useGetMyStudentSchoolQuery();
  const { data: classesResponse } = useGetMyStudentClassesQuery();
  const schoolId = schoolResponse?.data?.id;
  const classes = classesResponse?.data || [];
  const classData = useMemo(() => classes[0] || null, [classes]);

  // Get class resources
  const { data: classResourcesResponse, isLoading: isLoadingClassResources } = useGetMyStudentResourcesQuery(
    { classId: classData?.id },
    { skip: !classData?.id }
  );
  const classResources = classResourcesResponse?.data || [];

  // Get personal resources
  const { data: personalResourcesResponse, isLoading: isLoadingPersonalResources } = useGetMyStudentPersonalResourcesQuery();
  const personalResources = personalResourcesResponse?.data || [];

  // Upload and delete mutations
  const [uploadPersonalResource, { isLoading: isUploadingMutation }] = useUploadPersonalResourceMutation();
  const [deletePersonalResource] = useDeletePersonalResourceMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size exceeds 50MB limit');
        return;
      }
      
      // Validate file type - only documents and spreadsheets, no images
      const allowedMimeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/csv',
      ];
      
      if (!allowedMimeTypes.includes(file.type)) {
        toast.error(`File type ${file.type} is not allowed. Only documents and spreadsheets are permitted (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV). Images are not allowed.`);
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      await uploadPersonalResource({
        file: selectedFile,
        description: description || undefined,
      }).unwrap();
      toast.success('Resource uploaded successfully');
      setShowUploadModal(false);
      setSelectedFile(null);
      setDescription('');
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to upload resource');
    }
  };

  const handleDownload = async (resource: any, isPersonal: boolean) => {
    try {
      const baseUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:4000/api';
      let downloadUrl: string;
      
      if (isPersonal) {
        downloadUrl = `${baseUrl}/students/me/personal-resources/${resource.id}/download`;
      } else {
        if (schoolId && classData?.id) {
          downloadUrl = `${baseUrl}/schools/${schoolId}/classes/${classData.id}/resources/${resource.id}/download`;
        } else {
          toast.error('Unable to download resource');
          return;
        }
      }

      // Get auth token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || localStorage.getItem('token') : null;
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      if (token) {
        // For authenticated downloads, we need to fetch and create a blob
        const response = await fetch(downloadUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to download resource');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        link.href = url;
        link.download = resource.name || resource.fileName || 'resource';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback to direct link (may not work if auth is required)
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download resource');
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      await deletePersonalResource({ resourceId }).unwrap();
      toast.success('Resource deleted successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || error?.message || 'Failed to delete resource');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'PDF':
        return '📄';
      case 'IMAGE':
        return '🖼️';
      case 'DOCX':
        return '📝';
      case 'XLSX':
        return '📊';
      case 'PPTX':
        return '📽️';
      default:
        return '📎';
    }
  };

  return (
    <ProtectedRoute roles={['STUDENT']}>
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
            <div>
              <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                Resources
              </h1>
              <p className="text-light-text-secondary dark:text-dark-text-secondary">
                Access class resources and manage your personal study materials
              </p>
            </div>
        </motion.div>

        {/* Resources List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary">
                Resources
              </CardTitle>
              {activeTab === 'personal' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Resource
                </Button>
              )}
            </div>
            <div className="flex gap-3 mt-4">
              <Button
                variant={activeTab === 'class' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('class')}
              >
                Class Resources ({classResources.length})
              </Button>
              <Button
                variant={activeTab === 'personal' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('personal')}
              >
                Personal Resources ({personalResources.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingClassResources || isLoadingPersonalResources ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-light-text-muted dark:text-dark-text-muted animate-spin" />
              </div>
            ) : activeTab === 'class' ? (
              classResources.length > 0 ? (
                <div className="space-y-3">
                  {classResources.map((resource: any) => (
                    <motion.div
                      key={resource.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border border-light-border dark:border-dark-border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="text-2xl flex-shrink-0">
                            {getFileIcon(resource.fileType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">
                              {resource.title || resource.name}
                            </h3>
                            {resource.description && (
                              <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate mt-1">
                                {resource.description}
                              </p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-xs text-light-text-muted dark:text-dark-text-muted">
                              <span>{resource.fileType}</span>
                              <span>•</span>
                              <span>{formatFileSize(resource.fileSize || 0)}</span>
                              <span>•</span>
                              <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                              {resource.uploadedByName && (
                                <>
                                  <span>•</span>
                                  <span className="text-light-text-secondary dark:text-dark-text-secondary">
                                    By {resource.uploadedByName}
                                  </span>
                                </>
                              )}
                              {resource.class && (
                                <>
                                  <span>•</span>
                                  <span>From: {resource.class.name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(resource, false)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                  <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    No class resources available
                  </p>
                </div>
              )
            ) : personalResources.length > 0 ? (
              <div className="space-y-3">
                {personalResources.map((resource: any) => (
                  <motion.div
                    key={resource.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-light-border dark:border-dark-border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-[var(--dark-hover)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="text-2xl flex-shrink-0">
                          {getFileIcon(resource.fileType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">
                            {resource.name}
                          </h3>
                          {resource.description && (
                            <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary truncate mt-1">
                              {resource.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-light-text-muted dark:text-dark-text-muted">
                            <span>{resource.fileType}</span>
                            <span>•</span>
                            <span>{formatFileSize(resource.fileSize || 0)}</span>
                            <span>•</span>
                            <span>{new Date(resource.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(resource, true)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(resource.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-light-text-muted dark:text-dark-text-muted mx-auto mb-4" />
                <p className="text-light-text-secondary dark:text-dark-text-secondary mb-4">
                  No personal resources yet
                </p>
                <Button
                  variant="primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Your First Resource
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-light-card dark:bg-dark-surface rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-light-text-primary dark:text-dark-text-primary">
                    Upload Personal Resource
                  </h2>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                      setDescription('');
                    }}
                    className="text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                      File
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      onChange={handleFileSelect}
                      className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                    />
                    {selectedFile && (
                      <p className="mt-2 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                        Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-light-text-primary dark:text-dark-text-primary mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-light-border dark:border-dark-border rounded-md bg-light-bg dark:bg-dark-surface text-light-text-primary dark:text-dark-text-primary"
                      placeholder="Add a description for this resource..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowUploadModal(false);
                        setSelectedFile(null);
                        setDescription('');
                      }}
                      disabled={isUploadingMutation}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleUpload}
                      disabled={!selectedFile || isUploadingMutation}
                    >
                      {isUploadingMutation ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

