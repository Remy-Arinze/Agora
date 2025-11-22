'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import {
  useGetMySchoolQuery,
  useGetActiveSessionQuery,
  useStartNewTermMutation,
  useGetSessionsQuery,
  type SessionType,
} from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';

type Step = 1 | 2 | 3;

export default function SessionWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [sessionType, setSessionType] = useState<SessionType>('NEW_TERM');
  const [sessionName, setSessionName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfTermStart, setHalfTermStart] = useState('');
  const [halfTermEnd, setHalfTermEnd] = useState('');
  const [carryOver, setCarryOver] = useState<boolean>(true);
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  const { data: schoolResponse } = useGetMySchoolQuery();
  const schoolId = schoolResponse?.data?.id;

  const { data: activeSessionResponse } = useGetActiveSessionQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  const { data: sessionsResponse } = useGetSessionsQuery(
    { schoolId: schoolId! },
    { skip: !schoolId }
  );

  const [startNewTerm, { isLoading: isStarting }] = useStartNewTermMutation();

  const activeSession = activeSessionResponse?.data;
  const sessions = sessionsResponse?.data || [];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSubmit = async () => {
    if (!schoolId) {
      toast.error('School not found');
      return;
    }

    try {
      const result = await startNewTerm({
        schoolId,
        data: {
          name: sessionName,
          startDate,
          endDate,
          type: sessionType,
          ...(sessionType === 'NEW_TERM' && selectedTermId && { termId: selectedTermId }),
        },
      }).unwrap();

      toast.success(
        `Term started successfully! ${result.data.migratedCount} students migrated.`
      );
      router.push('/dashboard/school/overview');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to start term');
    }
  };

  const canProceedStep1 = sessionType && (sessionType === 'NEW_SESSION' ? sessionName && startDate && endDate : selectedTermId);
  const canProceedStep2 = startDate && endDate;
  const canProceedStep3 = true; // Logic gate is just a question

  return (
    <ProtectedRoute roles={['SCHOOL_ADMIN']}>
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
            Start New Term
          </h1>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Transition your school from "Holiday" to "Active Term"
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {currentStep > step ? <CheckCircle className="h-5 w-5" /> : step}
                </div>
                <p className="text-xs mt-2 text-center text-light-text-secondary dark:text-dark-text-secondary">
                  {step === 1 ? 'Session & Term' : step === 2 ? 'Dates' : 'Migration'}
                </p>
              </div>
              {step < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Session & Term */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Select Session & Term</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                  Type
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setSessionType('NEW_SESSION')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      sessionType === 'NEW_SESSION'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold mb-1">New Session</h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      September - Start new academic year (Promotes students)
                    </p>
                  </button>
                  <button
                    onClick={() => setSessionType('NEW_TERM')}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      sessionType === 'NEW_TERM'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold mb-1">New Term</h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      January/April - Start new term (Carries over students)
                    </p>
                  </button>
                </div>
              </div>

              {sessionType === 'NEW_SESSION' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Session Name (e.g., "2025/2026")
                  </label>
                  <Input
                    value={sessionName}
                    onChange={(e) => setSessionName(e.target.value)}
                    placeholder="2025/2026"
                  />
                </div>
              )}

              {sessionType === 'NEW_TERM' && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Select Term
                  </label>
                  <select
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-dark-surface"
                  >
                    <option value="">Select a term...</option>
                    {sessions.map((session) =>
                      session.terms.map((term) => (
                        <option key={term.id} value={term.id}>
                          {session.name} - {term.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {activeSession?.session && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <div>
                    <strong>Current Active Session:</strong> {activeSession.session.name}
                    {activeSession.term && ` - ${activeSession.term.name}`}
                  </div>
                </Alert>
              )}

              <div className="flex justify-end">
                <Button onClick={handleNext} disabled={!canProceedStep1}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Date Pickers */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Set Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Half-Term Start (Optional)
                  </label>
                  <Input
                    type="date"
                    value={halfTermStart}
                    onChange={(e) => setHalfTermStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-light-text-primary dark:text-dark-text-primary">
                    Half-Term End (Optional)
                  </label>
                  <Input
                    type="date"
                    value={halfTermEnd}
                    onChange={(e) => setHalfTermEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button onClick={handleNext} disabled={!canProceedStep2}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Logic Gate */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Student Migration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-4 text-light-text-primary dark:text-dark-text-primary">
                  Do you want to carry over students from the last term?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setCarryOver(true)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      carryOver
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold mb-1">Yes - Carry Over</h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      Keep students in the same ClassArm
                    </p>
                  </button>
                  <button
                    onClick={() => setCarryOver(false)}
                    className={`p-4 rounded-lg border-2 transition-colors ${
                      !carryOver
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold mb-1">No - Promote</h3>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      Move students to next level (JSS1 → JSS2)
                    </p>
                  </button>
                </div>
              </div>

              <Alert>
                <Calendar className="h-4 w-4" />
                <div>
                  <strong>Note:</strong>{' '}
                  {carryOver
                    ? 'Students will remain in their current ClassArm for the new term.'
                    : 'Students will be promoted to the next level. SS3 students will be marked as ALUMNI.'}
                </div>
              </Alert>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={handleBack}>
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isStarting}
                  className="flex items-center gap-2"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting Term...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Start Term
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}

