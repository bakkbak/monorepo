import { useState } from 'react';
import { GraduationCap, Loader2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { requestVerification, confirmVerification } from '../api';

type Step = 'collapsed' | 'email' | 'otp' | 'verified';

interface Props {
  deviceId: string | null;
  onVerified: () => void;
}

export function UniversityVerifyPrompt({ deviceId, onVerified }: Props) {
  const [step, setStep] = useState<Step>('collapsed');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendFailed, setResendFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!deviceId || !email.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await requestVerification(deviceId, email.trim().toLowerCase());
      setStep('otp');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!deviceId || !email.trim()) return;
    setError(null);
    setResendFailed(false);
    setResendLoading(true);
    try {
      await requestVerification(deviceId, email.trim().toLowerCase());
    } catch {
      setResendFailed(true);
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!deviceId || otp.length < 6) return;
    setError(null);
    setLoading(true);
    try {
      await confirmVerification(deviceId, otp.trim());
      setStep('verified');
      setTimeout(onVerified, 900);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verified') {
    return (
      <div className="mx-4 mt-3 mb-1 px-4 py-3 rounded-xl bg-black border-2 border-black flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-yellow-400 shrink-0" />
        <p className="text-sm font-medium text-yellow-400">Verified! You can now post here.</p>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-3 mb-1 rounded-xl border-2 border-black overflow-hidden">
      {/* Banner header — always visible */}
      <button
        onClick={() => setStep(step === 'collapsed' ? 'email' : 'collapsed')}
        className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-400 active:bg-yellow-300 transition-colors"
      >
        <GraduationCap className="w-5 h-5 text-black shrink-0" />
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-black leading-tight">Want to post here?</p>
          <p className="text-xs text-black/60 leading-tight">Verify your university email to join the conversation</p>
        </div>
        {step === 'collapsed'
          ? <ChevronDown className="w-4 h-4 text-black shrink-0" />
          : <ChevronUp className="w-4 h-4 text-black shrink-0" />
        }
      </button>

      {/* Expanded form */}
      {step === 'email' && (
        <div className="px-4 py-3 bg-white space-y-2.5">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendOtp()}
            placeholder="you@university.edu"
            autoFocus
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-yellow-400"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={handleSendOtp}
            disabled={!email.includes('@') || loading}
            className="w-full py-2.5 rounded-lg bg-black text-yellow-400 font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div className="px-4 py-3 bg-white space-y-2.5">
          <p className="text-xs text-gray-500 text-center">
            OTP sent to <span className="font-semibold text-black">{email}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            placeholder="6-digit code"
            autoFocus
            className="w-full border-2 border-black rounded-lg px-3 py-2 text-center text-xl font-mono tracking-widest focus:outline-none focus:border-yellow-400"
          />
          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          <button
            onClick={handleVerify}
            disabled={otp.length < 6 || loading}
            className="w-full py-2.5 rounded-lg bg-black text-yellow-400 font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
          </button>
          <button
            onClick={handleResend}
            disabled={resendLoading}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1 disabled:opacity-40 flex items-center justify-center gap-1"
          >
            {resendLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            {resendLoading ? 'Sending...' : 'Resend OTP'}
          </button>
          {resendFailed && (
            <p className="text-xs text-red-500 text-center">
              Couldn't send the code. Try a{' '}
              <button
                onClick={() => { setStep('email'); setOtp(''); setError(null); setResendFailed(false); }}
                className="underline font-medium"
              >
                different email
              </button>
              .
            </p>
          )}
          <button
            onClick={() => { setStep('email'); setOtp(''); setError(null); setResendFailed(false); }}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600 py-1"
          >
            Use a different email
          </button>
        </div>
      )}
    </div>
  );
}
