import { useState, useEffect } from 'react';
import { X, GraduationCap, CheckCircle, Loader2, Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);

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

  const handleCopyId = () => {
    if (!deviceId) return;
    navigator.clipboard.writeText(deviceId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const shortId = deviceId ? `...${deviceId.slice(-8)}` : '—';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white rounded-t-3xl border-t-2 border-x-2 border-black z-50 pb-10">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-black">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="px-6 pt-5 space-y-6">
          {/* University Verification */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <GraduationCap className="w-5 h-5 text-black" />
              <h3 className="font-bold text-black">University Verification</h3>
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
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
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
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  Enter your university email to unlock the University herd.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                  placeholder="you@university.edu"
                  className="w-full border-2 border-black rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-yellow-400"
                />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button
                  onClick={handleRequestOtp}
                  disabled={!email.includes('@') || loading}
                  className="w-full py-3 rounded-xl border-2 border-black bg-yellow-400 text-black font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
                </button>
              </div>
            )}
          </div>

          {/* Device ID */}
          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-bold text-black mb-2 text-sm">Your Anonymous ID</h3>
            <button
              onClick={handleCopyId}
              className="flex items-center gap-3 w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-mono text-gray-700 flex-1 text-left">{shortId}</span>
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <p className="text-xs text-gray-400 mt-1.5 px-1">Tap to copy your full device ID</p>
          </div>
        </div>
      </div>
    </>
  );
}
