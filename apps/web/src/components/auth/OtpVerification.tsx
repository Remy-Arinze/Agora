'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

interface OtpVerificationProps {
  email: string;
  sessionId: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading?: boolean;
  error?: string | null;
}

export function OtpVerification({
  email,
  sessionId,
  onVerify,
  onResend,
  isLoading = false,
  error,
}: OtpVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newOtp.every((digit) => digit !== '')) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, '').slice(0, 6).split('');
        if (digits.length === 6) {
          const newOtp = [...otp];
          digits.forEach((digit, i) => {
            if (i < 6) newOtp[i] = digit;
          });
          setOtp(newOtp);
          handleSubmit(newOtp.join(''));
        }
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const digits = pastedData.split('');
      const newOtp = [...otp];
      digits.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtp(newOtp);
      handleSubmit(newOtp.join(''));
    }
  };

  const handleSubmit = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length === 6) {
      await onVerify(otpCode);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await onResend();
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      console.error('Failed to resend OTP:', err);
    } finally {
      setIsResending(false);
    }
  };

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-2 px-3 py-1.5 ">
          <Image
            src="/assets/logos/agora_worded_white.png"
            alt="Agora"
            width={100}
            height={24}
            className="h-6 w-auto"
            priority
          />
        </div>
      </div>



      {/* Instructions */}
      <p className="text-sm text-[#9ca3af] mb-8 text-center leading-relaxed">
        A 6-digit code has been sent to your email, <span className="text-white">{email}</span>. Please enter it below to sign in.
      </p>

      {/* Error Alert */}
      {error && (
        <div className="mb-6">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-6"
      >
        {/* Enter Code Label */}
        <label className="block text-sm font-medium text-white mb-3">
          Enter Code
        </label>

        {/* OTP Input Fields */}
        <div className="flex justify-between  gap-3 mb-6">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              placeholder="-"
              className="w-14 h-14 text-center text-2xl font-semibold border-2 rounded-lg bg-[#151a23] text-white border-[#1a1f2e] focus:outline-none focus:ring-2 focus:ring-[#2490FD] focus:border-[#2490FD] transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-[#6b7280]"
              disabled={isLoading}
            />
          ))}
        </div>

        {/* Verify Button */}
        <Button
          type="submit"
          variant="primary"
          className="w-full py-3.5"
          isLoading={isLoading}
          disabled={otp.some((digit) => !digit) || isLoading}
        >
          Verify OTP
        </Button>

        {/* Resend Link */}
        <div className="text-center pt-2">
          <p className="text-sm text-[#9ca3af]">
            Didn&apos;t get the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending || isLoading}
              className="text-[#2490FD] hover:text-[#2a9fff] hover:underline disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {isResending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : resendCooldown > 0 ? (
                `Resend it! (${resendCooldown}s)`
              ) : (
                'Resend it!'
              )}
            </button>
          </p>
        </div>
      </form>
    </div>
  );
}
