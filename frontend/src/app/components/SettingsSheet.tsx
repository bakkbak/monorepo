import { useState, useEffect } from 'react';
import { X, GraduationCap, CheckCircle, Loader2 } from 'lucide-react';
import { getDeviceStatus, requestVerification, confirmVerification } from '../api';

type VerifyStep = 'idle' | 'email' | 'otp' | 'verified';

interface SettingsSheetProps {
  deviceId: string | null;
  onClose: () => void;
}

export function SettingsSheet({ deviceId, onClose }: SettingsSheetProps) {
  const [step, setStep] = useState<VerifyStep>('idle');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verifiedDomain, setVerifiedDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current verification status
  useEffect(() => {
    if (!deviceId) return;
    getDeviceStatus(deviceId)
      .then((s) => {
        if (s.verified_university && s.university_domain) {
          setVerifiedDomain(s.university_domain);
          setStep('verified');
        }
      })
      .catch(() => {});
  }, [deviceId]);

  const handleRequestOtp = async () => {
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

  const handleConfirmOtp = async () => {
    if (!deviceId || !otp.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const res = await confirmVerification(deviceId, otp.trim());
      setVerifiedDomain(res.university_domain);
      setStep('verified');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl border-t-2 border-x-2 border-black z-50 pb-24">
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-2 pb-5">
          <h2 className="text-xl font-bold text-black">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {/* University Verification */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center gap-2.5 mb-5">
              <GraduationCap className="w-5 h-5 text-black" />
              <h3 className="font-bold text-black text-[15px]">University Verification</h3>
              {step === 'verified' && (
                <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
              )}
            </div>

            {step === 'verified' ? (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-green-800">Verified</p>
                <p className="text-xs text-green-600 mt-0.5">{verifiedDomain}</p>
              </div>
            ) : step === 'otp' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 leading-relaxed">
                  OTP sent to <span className="font-medium text-black">{email}</span>. Check your inbox.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="6-digit code"
                  className="w-full border-2 border-black rounded-xl px-4 py-3 text-center text-xl font-mono tracking-widest focus:outline-none focus:border-yellow-400"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setStep('email'); setError(null); setOtp(''); }}
                    className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-medium text-sm"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConfirmOtp}
                    disabled={otp.length < 6 || loading}
                    className="flex-1 py-3 rounded-xl border-2 border-black bg-black text-yellow-400 font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 leading-relaxed">
                  Enter your university email to unlock the University herd.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                  placeholder="you@university.edu"
                  className="w-full border-2 border-black rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-yellow-400"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  onClick={handleRequestOtp}
                  disabled={!email.includes('@') || loading}
                  className="w-full py-3.5 rounded-xl border-2 border-black bg-yellow-400 text-black font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
