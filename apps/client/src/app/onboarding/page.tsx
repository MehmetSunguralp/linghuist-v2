'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { WheelPicker, WheelPickerWrapper, type WheelPickerOption } from '@/components/wheel-picker';
import { buildNumericAgeOptions } from '@/lib/wheel-picker-builders';
import { countryOptions, languageOptions } from '@/components/community/utils';
import { useAuthStore } from '@/stores/auth-store';

type MeEnvelope = {
  data?: {
    id?: string;
    username?: string | null;
    name?: string | null;
    country?: string | null;
    age?: number | null;
    languagesKnown?: string[];
    languagesLearning?: string[];
    bio?: string | null;
    avatarUrl?: string | null;
    thumbnailUrl?: string | null;
  };
  message?: string;
};

const steps = ['Name', 'Username', 'Country', 'Age', 'Native language', 'Learning language', 'Biography', 'Profile photo'] as const;

function looksComplete(me: NonNullable<MeEnvelope['data']> | undefined): boolean {
  if (!me) return false;
  return Boolean(
    me.name?.trim() &&
      me.username?.trim() &&
      me.country?.trim() &&
      me.age &&
      (me.languagesKnown?.length ?? 0) > 0 &&
      (me.languagesLearning?.length ?? 0) > 0 &&
      me.bio?.trim() &&
      (me.thumbnailUrl || me.avatarUrl),
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [step, setStep] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const [name, setName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [age, setAge] = React.useState<number>(18);
  const [nativeLanguage, setNativeLanguage] = React.useState('');
  const [learningLanguage, setLearningLanguage] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = React.useState('');

  const ageOptions = React.useMemo(() => buildNumericAgeOptions(13, 99), []);
  const languageChoices = React.useMemo(() => languageOptions.filter((x) => x !== 'all'), []);
  const countryChoices = React.useMemo(() => countryOptions.filter((x) => x !== 'all'), []);
  const progress = Math.round(((step + 1) / steps.length) * 100);

  React.useEffect(() => {
    if (!accessToken) return;
    let active = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/user/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        const json = (await res.json()) as MeEnvelope;
        if (!res.ok) throw new Error(json?.message || 'Failed to load profile');
        if (!active) return;
        const me = json.data;
        if (looksComplete(me)) {
          router.replace('/community');
          return;
        }
        setName(me?.name || '');
        setUsername(me?.username || '');
        setCountry(me?.country || '');
        setAge(me?.age && me.age >= 13 ? me.age : 18);
        setNativeLanguage(me?.languagesKnown?.[0] || '');
        setLearningLanguage(me?.languagesLearning?.[0] || '');
        setBio(me?.bio || '');
        setAvatarPreview(me?.thumbnailUrl || me?.avatarUrl || '');
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Failed to load profile');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [accessToken, router]);

  function stepValid(): boolean {
    if (step === 0) return name.trim().length >= 2;
    if (step === 1) return username.trim().length >= 3;
    if (step === 2) return country.trim().length > 0;
    if (step === 3) return Number.isFinite(age) && age >= 13;
    if (step === 4) return nativeLanguage.trim().length > 0;
    if (step === 5) return learningLanguage.trim().length > 0;
    if (step === 6) return bio.trim().length >= 8;
    return Boolean(avatarFile || avatarPreview);
  }

  function onChooseAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setAvatarFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarPreview(url);
    }
  }

  async function submitAll() {
    if (!accessToken) return;
    setSaving(true);
    setError('');
    try {
      const profileRes = await fetch('/api/user/update-me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          country: country.trim(),
          age,
          languagesKnown: [nativeLanguage.trim()],
          languagesLearning: [learningLanguage.trim()],
          bio: bio.trim(),
        }),
      });
      const profileJson = (await profileRes.json().catch(() => ({}))) as { message?: string };
      if (!profileRes.ok) {
        throw new Error(profileJson.message || 'Failed to save profile');
      }

      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const avatarRes = await fetch('/api/user/me/avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: fd,
        });
        const avatarJson = (await avatarRes.json().catch(() => ({}))) as { message?: string };
        if (!avatarRes.ok) throw new Error(avatarJson.message || 'Failed to upload profile photo');
      }

      router.replace('/community');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to finish setup');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-[100dvh] bg-[#0b1229]" />;
  }

  return (
    <main className="min-h-[100dvh] bg-[#0b1229] px-4 py-6 text-[#dce1ff] md:px-6">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-[#111834] p-4 md:p-6">
        <p className="text-xs text-[#95a7c4]">Profile setup</p>
        <h1 className="mt-1 text-xl font-semibold md:text-2xl">Step {step + 1} of {steps.length}: {steps[step]}</h1>
        <div className="mt-4 h-2 w-full rounded-full bg-[#212846]">
          <div className="h-2 rounded-full bg-[#00d4ff]" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-6">
          {step === 0 ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="h-11 w-full rounded-lg bg-[#1d2545] px-3 text-sm outline-none"
            />
          ) : null}

          {step === 1 ? (
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replaceAll(' ', ''))}
              placeholder="Unique username"
              className="h-11 w-full rounded-lg bg-[#1d2545] px-3 text-sm outline-none"
            />
          ) : null}

          {step === 2 ? (
            <select value={country} onChange={(e) => setCountry(e.target.value)} className="h-11 w-full rounded-lg bg-[#1d2545] px-3 text-sm outline-none">
              <option value="">Select country</option>
              {countryChoices.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          ) : null}

          {step === 3 ? (
            <WheelPickerWrapper className="mx-auto w-full max-w-[220px] border-none bg-[#2d344c] px-0 shadow-none">
              <WheelPicker<number>
                value={age}
                options={ageOptions as WheelPickerOption<number>[]}
                onValueChange={(value) => setAge(Number(value))}
                optionItemHeight={36}
                visibleCount={5}
                classNames={{
                  optionItem: 'text-[#8ea0ba]',
                  highlightWrapper: 'bg-[#00d4ff]/20 text-[#dce1ff]',
                }}
              />
            </WheelPickerWrapper>
          ) : null}

          {step === 4 ? (
            <div>
              <select value={nativeLanguage} onChange={(e) => setNativeLanguage(e.target.value)} className="h-11 w-full rounded-lg bg-[#1d2545] px-3 text-sm outline-none">
                <option value="">Select native language</option>
                {languageChoices.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-[#95a7c4]">You can add more later from profile settings.</p>
            </div>
          ) : null}

          {step === 5 ? (
            <div>
              <select value={learningLanguage} onChange={(e) => setLearningLanguage(e.target.value)} className="h-11 w-full rounded-lg bg-[#1d2545] px-3 text-sm outline-none">
                <option value="">Select learning language</option>
                {languageChoices.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-[#95a7c4]">You can add more later from profile settings.</p>
            </div>
          ) : null}

          {step === 6 ? (
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              placeholder="Short biography"
              className="min-h-28 w-full rounded-lg bg-[#1d2545] px-3 py-2 text-sm outline-none"
            />
          ) : null}

          {step === 7 ? (
            <div>
              {avatarPreview ? <img src={avatarPreview} alt="Avatar preview" className="mx-auto mb-3 size-24 rounded-full object-cover" /> : null}
              <input type="file" accept="image/*" onChange={onChooseAvatar} className="block w-full text-sm" />
            </div>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            disabled={step === 0 || saving}
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            className="h-10 rounded-md border border-white/20 px-4 text-sm disabled:opacity-50"
          >
            Back
          </button>

          {step < steps.length - 1 ? (
            <button
              type="button"
              disabled={!stepValid() || saving}
              onClick={() => setStep((prev) => Math.min(steps.length - 1, prev + 1))}
              className="h-10 rounded-md bg-[#00d4ff] px-4 text-sm font-semibold text-[#053545] disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              disabled={!stepValid() || saving}
              onClick={() => void submitAll()}
              className="h-10 rounded-md bg-[#00d4ff] px-4 text-sm font-semibold text-[#053545] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Finish setup'}
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
