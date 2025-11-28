'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Calendar, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useGetMyTeacherSchoolQuery, useConnectGoogleCalendarMutation } from '@/lib/store/api/schoolAdminApi';
import toast from 'react-hot-toast';

export function GoogleCalendarConnect() {
  const { data: schoolResponse } = useGetMyTeacherSchoolQuery();
  const schoolId = schoolResponse?.data?.id;
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectGoogleCalendar] = useConnectGoogleCalendarMutation();

  const handleConnect = async () => {
    if (!schoolId) {
      toast.error('School not found');
      return;
    }

    setIsConnecting(true);
    try {
      const response = await connectGoogleCalendar({ schoolId }).unwrap();
      if (response.data?.authUrl) {
        // Redirect to Google OAuth URL
        window.location.href = response.data.authUrl;
      } else {
        toast.error('Failed to get OAuth URL');
        setIsConnecting(false);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to connect Google Calendar');
      setIsConnecting(false);
    }
  };

  return (
    <Button
      onClick={handleConnect}
      variant="primary"
      disabled={isConnecting || !schoolId}
      className="flex items-center gap-2"
    >
      {isConnecting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Calendar className="h-4 w-4" />
          Connect Google Calendar
        </>
      )}
    </Button>
  );
}

export function GoogleCalendarStatus({ 
  isConnected, 
  onDisconnect 
}: { 
  isConnected: boolean; 
  onDisconnect: () => void;
}) {
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar? Events will no longer sync.')) {
      return;
    }

    setIsDisconnecting(true);
    try {
      await onDisconnect();
      toast.success('Google Calendar disconnected');
    } catch (error) {
      toast.error('Failed to disconnect Google Calendar');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-green-900 dark:text-green-300">
          Google Calendar Connected
        </p>
        <p className="text-xs text-green-700 dark:text-green-400">
          Events will automatically sync to your Google Calendar
        </p>
      </div>
      <Button
        onClick={handleDisconnect}
        variant="ghost"
        size="sm"
        disabled={isDisconnecting}
        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
      >
        {isDisconnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Disconnect'
        )}
      </Button>
    </div>
  );
}

