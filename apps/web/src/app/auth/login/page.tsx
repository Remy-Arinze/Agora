'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch } from 'react-redux';
import { Eye, EyeOff } from 'lucide-react';
import { setCredentials } from '@/lib/store/slices/authSlice';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import Link from 'next/link';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { OtpVerification } from '@/components/auth/OtpVerification';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpSessionId, setOtpSessionId] = useState<string | null>(null);
  const [otpEmail, setOtpEmail] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    emailOrPublicId: '',
    password: '',
  });
  const sessionExpired = searchParams?.get('expired') === 'true';

  useEffect(() => {
    if (sessionExpired) {
      setError('Your session has expired. Please log in again to continue.');
    }
  }, [sessionExpired]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          // Include credentials to receive httpOnly cookie from server
          credentials: 'include',
          body: JSON.stringify({
            emailOrPublicId: formData.emailOrPublicId,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      // Debug logging
      console.log('Login response:', {
        ok: response.ok,
        status: response.status,
        data,
        requiresOtp: data?.data?.requiresOtp,
        sessionId: data?.data?.sessionId,
        email: data?.data?.email,
      });

      if (!response.ok) {
        // Handle validation errors from backend
        const errorMessage = data.message || 
          (data.error && typeof data.error === 'string' ? data.error : null) ||
          (data.error && Array.isArray(data.error) ? data.error.join(', ') : null) ||
          'Login failed';
        throw new Error(errorMessage);
      }

      // Backend returns ResponseDto<T> structure: { success, message, data, timestamp }
      if (data.success && data.data) {
        // Check if OTP is required
        if (data.data.requiresOtp && data.data.sessionId) {
          console.log('OTP required, showing OTP screen');
          setRequiresOtp(true);
          setOtpSessionId(data.data.sessionId);
          setOtpEmail(data.data.email || formData.emailOrPublicId);
          setError(null);
          return;
        }

        // Legacy flow (should not happen with new implementation)
        if (data.data.accessToken && data.data.user) {
          console.warn('Legacy login flow detected - OTP was bypassed!', data.data);
          dispatch(
            setCredentials({
              accessToken: data.data.accessToken,
              refreshToken: data.data.refreshToken,
              user: data.data.user,
            })
          );

          if (data.data.user.schoolId) {
            localStorage.setItem('currentSchoolId', data.data.user.schoolId);
          }

          const roleMap: Record<string, string> = {
            SUPER_ADMIN: '/dashboard/super-admin',
            SCHOOL_ADMIN: '/dashboard/school',
            TEACHER: '/dashboard/teacher',
            STUDENT: '/dashboard/student',
          };

          router.push(roleMap[data.data.user.role] || '/dashboard');
        } else {
          console.error('Unexpected login response structure:', data);
          setError('Unexpected response from server. Please try again.');
        }
      } else {
        console.error('Login response missing success or data:', data);
        setError('Invalid response from server. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async (code: string) => {
    if (!otpSessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/verify-login-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            sessionId: otpSessionId,
            code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.message || 
          (data.error && typeof data.error === 'string' ? data.error : null) ||
          (data.error && Array.isArray(data.error) ? data.error.join(', ') : null) ||
          'OTP verification failed';
        throw new Error(errorMessage);
      }

      if (data.success && data.data) {
        dispatch(
          setCredentials({
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
            user: data.data.user,
          })
        );

        if (data.data.user.schoolId) {
          localStorage.setItem('currentSchoolId', data.data.user.schoolId);
        }

        const roleMap: Record<string, string> = {
          SUPER_ADMIN: '/dashboard/super-admin',
          SCHOOL_ADMIN: '/dashboard/school',
          TEACHER: '/dashboard/teacher',
          STUDENT: '/dashboard/student',
        };

        router.push(roleMap[data.data.user.role] || '/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    // Re-submit login to get new OTP
    if (!formData.emailOrPublicId || !formData.password) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            emailOrPublicId: formData.emailOrPublicId,
            password: formData.password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
      }

      if (data.success && data.data && data.data.sessionId) {
        setOtpSessionId(data.data.sessionId);
        setOtpEmail(data.data.email || formData.emailOrPublicId);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresOtp(false);
    setOtpSessionId(null);
    setOtpEmail(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--dark-bg)] py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {requiresOtp && otpSessionId && otpEmail ? (
          <>
            <OtpVerification
              email={otpEmail}
              sessionId={otpSessionId}
              onVerify={handleOtpVerify}
              onResend={handleResendOtp}
              isLoading={isLoading}
              error={error}
            />
            <div className="mt-6 text-center">
              <button
                onClick={handleBackToLogin}
                className="text-sm text-[#9ca3af] hover:text-white hover:underline transition-colors"
              >
                ← Back to login
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
                <Image
                  src="/assets/logos/agora_worded_white.png"
                  alt="Agora"
                  width={100}
                  height={24}
                  className="h-6 w-auto"
                  priority
                />
            </div>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-white mb-3 text-center">
              Sign in to your account
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6 mt-8">
              {sessionExpired && (
                <div className="mb-4">
                  <Alert variant="warning">
                    <div>
                      <p className="font-semibold">Session Expired</p>
                      <p className="text-sm mt-1">Your session has expired for security reasons. Please log in again to continue.</p>
                    </div>
                  </Alert>
                </div>
              )}
              {error && !sessionExpired && (
                <div className="mb-4">
                  <Alert variant="error">{error}</Alert>
                </div>
              )}

              <div className="w-full">
                <label
                  htmlFor="email-input"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Email or Public ID
                </label>
                <input
                  id="email-input"
                  type="text"
                  placeholder="superadmin@agora.com or AG-SCHL-A3B5C7"
                  value={formData.emailOrPublicId}
                  onChange={(e) =>
                    setFormData({ ...formData, emailOrPublicId: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 border-2 rounded-lg bg-[#151a23] text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-[#1a1f2e]"
                />
              </div>

              <div className="w-full">
                <label
                  htmlFor="password-input"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-10 border-2 rounded-lg bg-[#151a23] text-white placeholder-[#6b7280] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all border-[#1a1f2e]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#2490FD] rounded p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full py-3.5"
                isLoading={isLoading}
                disabled={
                  !formData.password || 
                  formData.password.length < 8 ||
                  !formData.emailOrPublicId
                }
              >
                Sign In
              </Button>

              <div className="text-center pt-2">
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-[#9ca3af] hover:text-[#2490FD] hover:underline transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--dark-bg)]">
        <LoadingSpinner />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

