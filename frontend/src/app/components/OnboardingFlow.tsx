import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Lock, GraduationCap, Search } from 'lucide-react';
import { submitOnboarding } from '../api';
import { HERD_REGISTRY } from '../utils';
import {
  UNIVERSITY_OPTIONS,
  INTEREST_OPTIONS,
  INTEREST_CATEGORIES,
  GENDER_OPTIONS,
  ACADEMIC_YEAR_OPTIONS,
  FIRST_EXPERIENCE_OPTIONS,
  INTEREST_TO_CIRCLE_MAP,
  UNIVERSITY_TO_CIRCLE_MAP,
} from '../onboarding-data';

interface OnboardingFlowProps {
  deviceId: string;
  onFinish: (firstExperience: string) => void;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 'loading';

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center py-4">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        let bg = 'bg-gray-300 dark:bg-gray-600';
        if (step < current) bg = 'bg-black dark:bg-white';
        if (step === current) bg = 'bg-yellow-400';
        return <div key={i} className={`w-2.5 h-2.5 rounded-full ${bg} transition-colors`} />;
      })}
    </div>
  );
}

function WelcomeScreen({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="fixed inset-0 bg-yellow-400 flex flex-col items-center justify-center z-[99]">
      <div className="text-8xl mb-6 animate-snap-bounce">🙊</div>
      <h1
        className="text-5xl font-bold text-black tracking-tight mb-3"
        style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}
      >
        See What's Brewing
      </h1>
      <p className="text-black/60 text-lg mb-12">Anonymous by default.</p>
      <button
        onClick={onContinue}
        className="px-10 py-4 bg-black text-yellow-400 rounded-full font-bold text-lg border-2 border-black active:scale-95 transition-transform"
      >
        Continue
      </button>
    </div>
  );
}

function UniversityScreen({
  selected,
  otherText,
  onSelect,
  onOtherChange,
  onContinue,
  onSkip,
  onBack,
}: {
  selected: string | null;
  otherText: string;
  onSelect: (id: string | null) => void;
  onOtherChange: (text: string) => void;
  onContinue: () => void;
  onSkip: () => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-slide-left">
      <button onClick={onBack} className="p-2 -ml-2 mb-2">
        <ChevronLeft className="w-6 h-6 text-black dark:text-white" />
      </button>

      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-black" />
        </div>
        <h2
          className="text-3xl font-bold text-black dark:text-white"
          style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}
        >
          Your university
        </h2>
      </div>
      <p className="text-gray-500 dark:text-gray-400 mb-8">This connects you with your campus community and unlocks university-exclusive content.</p>

      <div className="space-y-3">
        {UNIVERSITY_OPTIONS.map((uni) => (
          <button
            key={uni.id}
            onClick={() => onSelect(selected === uni.id ? null : uni.id)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
              selected === uni.id
                ? 'border-black dark:border-white bg-yellow-400 text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.3)]'
                : 'border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] text-black dark:text-white hover:border-black/30 dark:hover:border-white/30'
            }`}
          >
            <span className="text-2xl">{uni.emoji}</span>
            <span className="font-semibold text-left flex-1">{uni.label}</span>
            {selected === uni.id && (
              <span className="text-lg">✓</span>
            )}
          </button>
        ))}
      </div>

      {selected === 'other' && (
        <div className="relative mt-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={otherText}
            onChange={(e) => onOtherChange(e.target.value)}
            placeholder="Search for your institution..."
            className="w-full pl-11 pr-5 py-4 rounded-2xl border-2 border-black/15 dark:border-white/15 bg-white dark:bg-[#252525] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
          />
        </div>
      )}

      <div className="mt-8 space-y-3">
        <button
          onClick={onContinue}
          disabled={selected === 'other' && !otherText.trim()}
          className="w-full py-4 bg-black dark:bg-white text-yellow-400 dark:text-black rounded-full font-bold text-lg active:scale-95 transition-transform disabled:opacity-40"
        >
          Continue
        </button>
        <button
          onClick={onSkip}
          className="w-full py-3 text-gray-400 dark:text-gray-500 font-medium text-sm"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}

function InterestsScreen({
  selected,
  onToggle,
  onContinue,
  onBack,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-slide-left">
      <button onClick={onBack} className="p-2 -ml-2 mb-2">
        <ChevronLeft className="w-6 h-6 text-black dark:text-white" />
      </button>
      <h2
        className="text-3xl font-bold text-black dark:text-white mb-2"
        style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}
      >
        What Are You Into?
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Pick at least 5 interests.{' '}
        <span className={selected.size >= 5 ? 'text-green-500 font-semibold' : 'text-yellow-600 font-semibold'}>
          {selected.size}/5 selected
        </span>
      </p>

      <div className="space-y-6 pb-24">
        {INTEREST_CATEGORIES.map((cat) => {
          const options = INTEREST_OPTIONS.filter((o) => o.category === cat.id);
          return (
            <div key={cat.id}>
              <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                {cat.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onToggle(opt.id)}
                    className={`px-4 py-2.5 rounded-full border-2 font-medium transition-all active:scale-95 ${
                      selected.has(opt.id)
                        ? 'bg-yellow-400 text-black border-black'
                        : 'bg-white dark:bg-[#252525] text-black dark:text-white border-black/20 dark:border-white/20'
                    }`}
                  >
                    {opt.emoji} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-700 max-w-md mx-auto">
        <button
          onClick={onContinue}
          disabled={selected.size < 5}
          className="w-full py-4 bg-black dark:bg-white text-yellow-400 dark:text-black rounded-full font-bold text-lg active:scale-95 transition-transform disabled:opacity-40"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function AboutYouScreen({
  dateOfBirth,
  gender,
  genderSelfDescribe,
  academicYear,
  onDobChange,
  onGenderChange,
  onGenderDescribeChange,
  onYearChange,
  onContinue,
  onBack,
}: {
  dateOfBirth: string;
  gender: string;
  genderSelfDescribe: string;
  academicYear: string;
  onDobChange: (v: string) => void;
  onGenderChange: (v: string) => void;
  onGenderDescribeChange: (v: string) => void;
  onYearChange: (v: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="animate-slide-left">
      <button onClick={onBack} className="p-2 -ml-2 mb-2">
        <ChevronLeft className="w-6 h-6 text-black dark:text-white" />
      </button>
      <h2
        className="text-3xl font-bold text-black dark:text-white mb-2"
        style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}
      >
        Tell Us About Yourself
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">This helps us personalize your experience</p>

      <div className="space-y-6 pb-28">
        <div>
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Date of birth</h3>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => onDobChange(e.target.value)}
            max={today}
            className="w-full px-5 py-3.5 rounded-2xl border-2 border-black/20 dark:border-white/20 bg-white dark:bg-[#252525] text-black dark:text-white focus:outline-none focus:border-yellow-400 transition-colors"
          />
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Gender</h3>
          <div className="flex flex-wrap gap-2">
            {GENDER_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onGenderChange(gender === opt.id ? '' : opt.id)}
                className={`px-4 py-2.5 rounded-full border-2 font-medium transition-all active:scale-95 ${
                  gender === opt.id
                    ? 'bg-yellow-400 text-black border-black'
                    : 'bg-white dark:bg-[#252525] text-black dark:text-white border-black/20 dark:border-white/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {gender === 'self_describe' && (
            <input
              type="text"
              value={genderSelfDescribe}
              onChange={(e) => onGenderDescribeChange(e.target.value)}
              placeholder="How do you identify?"
              className="w-full mt-3 px-5 py-3 rounded-2xl border-2 border-black/20 dark:border-white/20 bg-white dark:bg-[#252525] text-black dark:text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400"
            />
          )}
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Academic Year</h3>
          <div className="flex flex-wrap gap-2">
            {ACADEMIC_YEAR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onYearChange(academicYear === opt.id ? '' : opt.id)}
                className={`px-4 py-2.5 rounded-full border-2 font-medium transition-all active:scale-95 ${
                  academicYear === opt.id
                    ? 'bg-yellow-400 text-black border-black'
                    : 'bg-white dark:bg-[#252525] text-black dark:text-white border-black/20 dark:border-white/20'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-2xl bg-gray-50 dark:bg-[#252525]">
          <Lock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            Your information stays private. Your date of birth, gender, and university help us personalize your experience and keep Teevo safe. Your identity is never shown to other users.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-700 max-w-md mx-auto">
        <button
          onClick={onContinue}
          className="w-full py-4 bg-black dark:bg-white text-yellow-400 dark:text-black rounded-full font-bold text-lg active:scale-95 transition-transform"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function CirclesScreen({
  interests,
  university,
  selectedCircles,
  onToggle,
  onContinue,
  onBack,
}: {
  interests: Set<string>;
  university: string | null;
  selectedCircles: Set<string>;
  onToggle: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const recommendedIds = new Set<string>();
  interests.forEach((interest) => {
    const mapped = INTEREST_TO_CIRCLE_MAP[interest];
    if (mapped) mapped.forEach((id) => recommendedIds.add(id));
  });
  if (university) {
    const uniCircles = UNIVERSITY_TO_CIRCLE_MAP[university];
    if (uniCircles) uniCircles.forEach((id) => recommendedIds.add(id));
  }

  const circleList = Array.from(recommendedIds)
    .map((id) => HERD_REGISTRY[id])
    .filter(Boolean);

  const allCircles = Object.values(HERD_REGISTRY).filter(
    (h) => !h.isUniversityHerd && !recommendedIds.has(h.herdId)
  );

  return (
    <div className="animate-slide-left">
      <button onClick={onBack} className="p-2 -ml-2 mb-2">
        <ChevronLeft className="w-6 h-6 text-black dark:text-white" />
      </button>
      <h2
        className="text-3xl font-bold text-black dark:text-white mb-2"
        style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}
      >
        Recommended Circles
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-6">Based on your interests</p>

      <div className="space-y-3 pb-24">
        {circleList.length > 0 && (
          <>
            {circleList.map((herd) => (
              <div
                key={herd.herdId}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-black/20 dark:border-white/20 bg-white dark:bg-[#252525]"
              >
                <div className="w-12 h-12 rounded-2xl bg-yellow-400 border-2 border-black flex items-center justify-center text-xl flex-shrink-0">
                  {herd.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-black dark:text-white truncate">{herd.displayName}</h3>
                </div>
                <button
                  onClick={() => onToggle(herd.herdId)}
                  className={`px-5 py-2 rounded-full font-bold text-sm border-2 border-black transition-all flex-shrink-0 active:scale-95 ${
                    selectedCircles.has(herd.herdId)
                      ? 'bg-yellow-400 text-black'
                      : 'bg-white text-black'
                  }`}
                >
                  {selectedCircles.has(herd.herdId) ? '✓ Joined' : 'Join'}
                </button>
              </div>
            ))}
          </>
        )}

        {allCircles.length > 0 && (
          <>
            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mt-6 mb-1">
              More Circles
            </h3>
            {allCircles.map((herd) => (
              <div
                key={herd.herdId}
                className="flex items-center gap-4 p-4 rounded-2xl border-2 border-black/20 dark:border-white/20 bg-white dark:bg-[#252525]"
              >
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-700 border-2 border-black/20 dark:border-white/20 flex items-center justify-center text-xl flex-shrink-0">
                  {herd.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-black dark:text-white truncate">{herd.displayName}</h3>
                </div>
                <button
                  onClick={() => onToggle(herd.herdId)}
                  className={`px-5 py-2 rounded-full font-bold text-sm border-2 border-black transition-all flex-shrink-0 active:scale-95 ${
                    selectedCircles.has(herd.herdId)
                      ? 'bg-yellow-400 text-black'
                      : 'bg-white text-black'
                  }`}
                >
                  {selectedCircles.has(herd.herdId) ? '✓ Joined' : 'Join'}
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-700 max-w-md mx-auto">
        <button
          onClick={onContinue}
          className="w-full py-4 bg-black dark:bg-white text-yellow-400 dark:text-black rounded-full font-bold text-lg active:scale-95 transition-transform"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function FirstExperienceScreen({
  selected,
  onSelect,
  onContinue,
  onBack,
}: {
  selected: string;
  onSelect: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-slide-left">
      <button onClick={onBack} className="p-2 -ml-2 mb-2">
        <ChevronLeft className="w-6 h-6 text-black dark:text-white" />
      </button>
      <h2
        className="text-3xl font-bold text-black dark:text-white mb-2"
        style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}
      >
        What Would You Like To Do First?
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Pick your first experience</p>

      <div className="space-y-3">
        {FIRST_EXPERIENCE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={`w-full flex items-center gap-4 px-5 py-5 rounded-2xl border-2 transition-all active:scale-[0.98] text-left ${
              selected === opt.id
                ? 'border-yellow-400 bg-yellow-400 text-black'
                : 'border-black/20 dark:border-white/20 bg-white dark:bg-[#252525] text-black dark:text-white'
            }`}
          >
            <span className="text-3xl">{opt.emoji}</span>
            <div>
              <h3 className="font-bold text-lg">{opt.label}</h3>
              <p className={`text-sm ${selected === opt.id ? 'text-black/60' : 'text-gray-500 dark:text-gray-400'}`}>
                {opt.desc}
              </p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8">
        <button
          onClick={onContinue}
          disabled={!selected}
          className="w-full py-4 bg-black dark:bg-white text-yellow-400 dark:text-black rounded-full font-bold text-lg active:scale-95 transition-transform disabled:opacity-40"
        >
          Let's Go
        </button>
      </div>
    </div>
  );
}

function LoadingScreen({ onDone, error, onRetry }: { onDone: () => void; error: string | null; onRetry: () => void }) {
  const [checks, setChecks] = useState<number[]>([]);
  const doneRef = useRef(false);

  const steps = [
    'Finding trending conversations',
    'Joining your Circles',
    'Personalizing your feed',
  ];

  useEffect(() => {
    if (error) return;
    const timers = steps.map((_, i) =>
      setTimeout(() => setChecks((prev) => [...prev, i]), 400 + i * 500)
    );
    const finishTimer = setTimeout(() => {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
    }, 400 + steps.length * 500 + 300);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finishTimer);
    };
  }, [error]);

  return (
    <div className="fixed inset-0 bg-yellow-400 flex flex-col items-center justify-center z-[99] px-6">
      <h2
        className="text-2xl font-bold text-black mb-8 text-center"
        style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}
      >
        Brewing your Teevo experience...
      </h2>
      <div className="space-y-4 w-full max-w-xs">
        {steps.map((label, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 ${checks.includes(i) ? 'animate-check-in' : 'opacity-0'}`}
          >
            <span className="text-xl">✓</span>
            <span className="text-black font-medium">{label}</span>
          </div>
        ))}
      </div>
      {error && (
        <div className="mt-8 text-center">
          <p className="text-black/70 mb-4">Something went wrong. Please try again.</p>
          <button
            onClick={onRetry}
            className="px-8 py-3 bg-black text-yellow-400 rounded-full font-bold active:scale-95 transition-transform"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

export function OnboardingFlow({ deviceId, onFinish }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [university, setUniversity] = useState<string | null>(null);
  const [universityOther, setUniversityOther] = useState('');
  const [interests, setInterests] = useState<Set<string>>(new Set());
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [genderSelfDescribe, setGenderSelfDescribe] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [selectedCircles, setSelectedCircles] = useState<Set<string>>(new Set());
  const [firstExperience, setFirstExperience] = useState('');

  useEffect(() => {
    if (step === 5 && selectedCircles.size === 0) {
      const recommended = new Set<string>();
      interests.forEach((interest) => {
        const mapped = INTEREST_TO_CIRCLE_MAP[interest];
        if (mapped) mapped.forEach((id) => recommended.add(id));
      });
      if (university) {
        const uniCircles = UNIVERSITY_TO_CIRCLE_MAP[university];
        if (uniCircles) uniCircles.forEach((id) => recommended.add(id));
      }
      if (recommended.size > 0) setSelectedCircles(recommended);
    }
  }, [step]);

  const toggleInterest = (id: string) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCircle = (id: string) => {
    setSelectedCircles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const interestCategories: Record<string, string> = {};
  INTEREST_OPTIONS.forEach((opt) => {
    interestCategories[opt.id] = opt.category;
  });

  const doSubmit = async () => {
    setStep('loading');
    setSubmitError(null);
    try {
      await submitOnboarding({
        device_id: deviceId,
        university,
        university_other: university === 'other' ? universityOther : null,
        interests: Array.from(interests),
        interest_categories: interestCategories,
        date_of_birth: dateOfBirth || null,
        gender: gender || 'prefer_not_to_say',
        gender_self_describe: gender === 'self_describe' ? genderSelfDescribe : null,
        academic_year: academicYear || 'other',
        circle_ids: Array.from(selectedCircles),
        first_experience: firstExperience,
      });
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to save');
    }
  };

  if (step === 1) {
    return <WelcomeScreen onContinue={() => setStep(2)} />;
  }

  if (step === 'loading') {
    return (
      <LoadingScreen
        error={submitError}
        onRetry={doSubmit}
        onDone={() => onFinish(firstExperience)}
      />
    );
  }

  return (
    <div className="safe-top safe-bottom min-h-screen bg-white dark:bg-[#1a1a1a] max-w-md mx-auto relative px-5 pt-2 pb-4">
      <ProgressDots current={step as number} total={6} />

      {step === 2 && (
        <UniversityScreen
          selected={university}
          otherText={universityOther}
          onSelect={setUniversity}
          onOtherChange={setUniversityOther}
          onContinue={() => setStep(3)}
          onSkip={() => {
            setUniversity(null);
            setUniversityOther('');
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <InterestsScreen
          selected={interests}
          onToggle={toggleInterest}
          onContinue={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <AboutYouScreen
          dateOfBirth={dateOfBirth}
          gender={gender}
          genderSelfDescribe={genderSelfDescribe}
          academicYear={academicYear}
          onDobChange={setDateOfBirth}
          onGenderChange={setGender}
          onGenderDescribeChange={setGenderSelfDescribe}
          onYearChange={setAcademicYear}
          onContinue={() => setStep(5)}
          onBack={() => setStep(3)}
        />
      )}

      {step === 5 && (
        <CirclesScreen
          interests={interests}
          university={university}
          selectedCircles={selectedCircles}
          onToggle={toggleCircle}
          onContinue={() => setStep(6)}
          onBack={() => setStep(4)}
        />
      )}

      {step === 6 && (
        <FirstExperienceScreen
          selected={firstExperience}
          onSelect={setFirstExperience}
          onContinue={doSubmit}
          onBack={() => setStep(5)}
        />
      )}
    </div>
  );
}
