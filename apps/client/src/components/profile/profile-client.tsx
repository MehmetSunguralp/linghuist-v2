'use client';

import * as React from 'react';
import ISO6391 from 'iso-639-1';
import {
  Ban,
  Bell,
  BookText,
  Check,
  Eye,
  Languages,
  Lock,
  MapPin,
  MessageCircle,
  Pencil,
  Plus,
  Rss,
  ShieldAlert,
  Trash2,
  Upload,
  UserMinus,
  UserRound,
  UserRoundPen,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CountryFlag from 'react-country-flag';

import { CommunityProfileAvatar } from '@/components/community/community-profile-avatar';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { Cropper, type CropperRef } from 'react-advanced-cropper';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WheelPicker, WheelPickerWrapper } from '@/components/wheel-picker';
import { enStrings } from '@/config/en.strings';
import {
  codeFromCountry,
  codeFromLanguage,
  languageOptions,
  normalizeLanguageLabel,
} from '@/components/community/utils';
import { useAuthStore } from '@/stores/auth-store';
import { AUTH_SIGN_IN_PATH } from '@/config/auth.constants';
import { imageSrcAfterSigning, resolveSignedStorageUrl } from '@/lib/storage-url';
import { useChatUnreadCount } from '@/lib/use-chat-unread-count';
import { buildNumericAgeOptions } from '@/lib/wheel-picker-builders';
import type {
  ApiEnvelope,
  Envelope,
  FriendRequestRow,
  FriendRequestsEnvelope,
  FriendsListEnvelope,
  LanguageRow,
  ProfileClientProps,
  MeUser,
} from '@/types/profile.types';

const strings = enStrings.profile;
const communityStrings = enStrings.community;
const selectableLanguages = languageOptions.filter((l) => l !== 'all');

function randomRowId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function mapCodesToRows(codes: string[], defaultLevel: string): LanguageRow[] {
  return codes.map((code) => ({
    id: randomRowId(),
    code,
    level: defaultLevel,
  }));
}

function languageNameFromCode(code: string): string {
  return ISO6391.getName(code) || normalizeLanguageLabel(code) || code;
}

function peerDisplayName(peer: FriendRequestRow['peer']): string {
  return peer.name || peer.username || peer.id;
}

function peerInitial(peer: FriendRequestRow['peer']): string {
  const value = (peer.username || peer.name || '').trim();
  if (!value) return '?';
  return value.charAt(0).toUpperCase();
}

function peerCountryCode(peer: FriendRequestRow['peer']): string | undefined {
  const raw = (peer.country || '').trim();
  if (!raw) return undefined;
  if (raw.length === 2) return raw.toUpperCase();
  return codeFromCountry(raw);
}

function LanguageFlagPill({
  code,
  label,
  rightLabel,
}: {
  readonly code: string;
  readonly label: string;
  readonly rightLabel?: string;
}) {
  const countryCode = codeFromLanguage(code);

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-[#181e36] px-3 py-2">
      <span className="inline-flex size-6 items-center justify-center overflow-hidden">
        {countryCode ? (
          <CountryFlag countryCode={countryCode} svg style={{ width: '1rem', height: '1rem' }} />
        ) : (
          <span className="text-[10px] text-[#8798b4]">—</span>
        )}
      </span>
      <span className="text-sm font-semibold">{label}</span>
      {rightLabel ? (
        <span className="rounded bg-[#00d4ff]/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#00d4ff]">
          {rightLabel}
        </span>
      ) : null}
    </div>
  );
}

export function ProfileClient({ profileId }: ProfileClientProps) {
  const unreadCount = useChatUnreadCount();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const cropperRef = React.useRef<CropperRef>(null);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [avatarSrc, setAvatarSrc] = React.useState('');
  const [avatarPreviewOpen, setAvatarPreviewOpen] = React.useState(false);
  const [profile, setProfile] = React.useState<MeUser | null>(null);
  const [bio, setBio] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [age, setAge] = React.useState<number>(18);
  const [knownRows, setKnownRows] = React.useState<LanguageRow[]>([]);
  const [learningRows, setLearningRows] = React.useState<LanguageRow[]>([]);
  const [modalMode, setModalMode] = React.useState<'known' | 'learning' | null>(null);
  const [bioModalOpen, setBioModalOpen] = React.useState(false);
  const [ageModalOpen, setAgeModalOpen] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [blockListModalOpen, setBlockListModalOpen] = React.useState(false);
  const [cropModalOpen, setCropModalOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [draftBio, setDraftBio] = React.useState('');
  const [deletePassword, setDeletePassword] = React.useState('');
  const [draftRows, setDraftRows] = React.useState<LanguageRow[]>([]);
  const [incomingRequests, setIncomingRequests] = React.useState<FriendRequestRow[]>([]);
  const [outgoingRequests, setOutgoingRequests] = React.useState<FriendRequestRow[]>([]);
  const [friends, setFriends] = React.useState<FriendRequestRow['peer'][]>([]);
  const [friendTab, setFriendTab] = React.useState<'friends' | 'incoming' | 'sent'>('friends');
  const [friendsLoading, setFriendsLoading] = React.useState(false);
  const [deletingAccount, setDeletingAccount] = React.useState(false);
  const [friendAvatarMap, setFriendAvatarMap] = React.useState<Record<string, string>>({});
  const [draftAge, setDraftAge] = React.useState(18);
  const [locatingCountry, setLocatingCountry] = React.useState(false);
  const [profileAccessDenied, setProfileAccessDenied] = React.useState(false);
  const [removeFriendModalOpen, setRemoveFriendModalOpen] = React.useState(false);
  const [blockUserModalOpen, setBlockUserModalOpen] = React.useState(false);
  const [socialBusy, setSocialBusy] = React.useState(false);

  const showOwnProfileFullEditor = React.useMemo(
    () => profileId === 'me' || profile?.viewerRelation === 'SELF',
    [profileId, profile?.viewerRelation],
  );

  React.useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!accessToken) {
        if (active) {
          setLoading(false);
          setProfileAccessDenied(false);
        }
        return;
      }

      setLoading(true);
      setProfileAccessDenied(false);
      try {
        const endpoint = profileId === 'me' ? '/api/user/me' : `/api/user/${encodeURIComponent(profileId)}`;
        const res = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        const json = (await res.json()) as Envelope<MeUser> & { message?: string };
        if (res.status === 403) {
          if (!active) return;
          setProfile(null);
          setProfileAccessDenied(true);
          return;
        }
        if (!res.ok || !json?.data) {
          throw new Error((json as { message?: string })?.message || strings.loadError);
        }
        if (!active) return;

        setProfile(json.data);
        setBio(json.data.bio ?? '');
        setCountry(json.data.country ?? '');
        setAge(json.data.age ?? 18);
        setKnownRows(mapCodesToRows(json.data.languagesKnown ?? [], strings.levelNative));
        setLearningRows(mapCodesToRows(json.data.languagesLearning ?? [], strings.levelBeginner));
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : strings.loadError);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [accessToken, profileId]);

  React.useEffect(() => {
    let active = true;
    async function resolveAvatar() {
      if (!profile) return;
      const rawPath = profile.avatarUrl ?? profile.thumbnailUrl ?? '';
      const signed = await resolveSignedStorageUrl(rawPath, accessToken);
      if (!active) return;
      setAvatarSrc(imageSrcAfterSigning(signed, rawPath));
    }
    void resolveAvatar();
    return () => {
      active = false;
    };
  }, [profile?.thumbnailUrl, profile?.avatarUrl, accessToken, profile?.id]);

  React.useEffect(() => {
    let active = true;
    async function loadFriendRequests() {
      if (!accessToken || !showOwnProfileFullEditor) return;
      setFriendsLoading(true);
      try {
        const [friendsRes, incomingRes, outgoingRes] = await Promise.all([
          fetch('/api/user/friends/list', {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          }),
          fetch('/api/user/friends/requests/incoming', {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          }),
          fetch('/api/user/friends/requests/outgoing', {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          }),
        ]);
        const friendsJson = (await friendsRes.json()) as FriendsListEnvelope;
        const incomingJson = (await incomingRes.json()) as FriendRequestsEnvelope;
        const outgoingJson = (await outgoingRes.json()) as FriendRequestsEnvelope;
        if (!active) return;
        setFriends(friendsJson?.data?.friends ?? []);
        setIncomingRequests(incomingJson?.data?.requests ?? []);
        setOutgoingRequests(outgoingJson?.data?.requests ?? []);
      } finally {
        if (active) {
          setFriendsLoading(false);
        }
      }
    }
    void loadFriendRequests();
    return () => {
      active = false;
    };
  }, [accessToken, showOwnProfileFullEditor]);

  const knownLanguages = React.useMemo(
    () =>
      knownRows
        .filter((row) => row.code)
        .map((row) => ({
          code: row.code,
          label: languageNameFromCode(row.code),
          level: row.level || strings.levelFluent,
        })),
    [knownRows],
  );
  const learningLanguages = React.useMemo(
    () =>
      learningRows
        .filter((row) => row.code)
        .map((row) => ({
          code: row.code,
          label: languageNameFromCode(row.code),
          level: row.level || strings.levelBeginner,
        })),
    [learningRows],
  );
  const ageOptions = React.useMemo(() => buildNumericAgeOptions(18, 99), []);

  const hasProfileChanges = React.useMemo(() => {
    if (!profile || !showOwnProfileFullEditor) return false;
    const normalizedCountry = country || null;
    const currentCountry = profile.country || null;
    const normalizedAge = Number.isFinite(age) ? age : null;
    const currentAge = profile.age ?? null;
    const normalizedBio = bio.trim();
    const currentBio = (profile.bio ?? '').trim();

    const normalizedKnown = [...new Set(knownRows.map((x) => x.code).filter(Boolean))].sort();
    const currentKnown = [...new Set((profile.languagesKnown ?? []).filter(Boolean))].sort();
    const normalizedLearning = [...new Set(learningRows.map((x) => x.code).filter(Boolean))].sort();
    const currentLearning = [...new Set((profile.languagesLearning ?? []).filter(Boolean))].sort();

    return (
      normalizedCountry !== currentCountry ||
      normalizedAge !== currentAge ||
      normalizedBio !== currentBio ||
      normalizedKnown.join('|') !== currentKnown.join('|') ||
      normalizedLearning.join('|') !== currentLearning.join('|')
    );
  }, [profile, showOwnProfileFullEditor, country, age, bio, knownRows, learningRows]);

  React.useEffect(() => {
    let active = true;
    async function resolveFriendAvatars() {
      if (!accessToken || !showOwnProfileFullEditor) return;
      const peers = [...friends, ...incomingRequests.map((r) => r.peer), ...outgoingRequests.map((r) => r.peer)];
      if (peers.length === 0) return;

      const entries = await Promise.all(
        peers.map(async (peer) => {
          const rawPath = peer.thumbnailUrl ?? peer.avatarUrl ?? '';
          if (!rawPath) return [peer.id, ''] as const;
          const signed = await resolveSignedStorageUrl(rawPath, accessToken);
          return [peer.id, imageSrcAfterSigning(signed, rawPath)] as const;
        }),
      );
      if (!active) return;
      setFriendAvatarMap((prev) => {
        const next = { ...prev };
        for (const [peerId, url] of entries) {
          if (url) next[peerId] = url;
        }
        return next;
      });
    }
    void resolveFriendAvatars();
    return () => {
      active = false;
    };
  }, [accessToken, showOwnProfileFullEditor, friends, incomingRequests, outgoingRequests]);

  async function onSaveProfile() {
    if (!accessToken || !showOwnProfileFullEditor) return;
    setSaving(true);
    try {
      if (bio.length > 300) {
        throw new Error(strings.bioTooLong);
      }
      if (knownRows.filter((row) => row.code).length < 1) {
        throw new Error(strings.minNativeLanguageRequired);
      }
      if (learningRows.filter((row) => row.code).length < 1) {
        throw new Error(strings.minLearningLanguageRequired);
      }

      const payload = {
        bio,
        country: country || null,
        age: Number.isFinite(age) ? Math.min(99, Math.max(18, age)) : null,
        languagesKnown: [...new Set(knownRows.map((x) => x.code).filter(Boolean))],
        languagesLearning: [...new Set(learningRows.map((x) => x.code).filter(Boolean))],
      };

      const res = await fetch('/api/user/update-me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as Envelope<MeUser>;
      if (!res.ok || !json?.data) {
        throw new Error(json?.message || strings.saveError);
      }
      setProfile(json.data);
      toast.success(strings.saveSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : strings.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteAccount() {
    if (!accessToken || !showOwnProfileFullEditor || profile?.role === 'ADMIN') {
      toast.error(strings.deleteAccountAdminBlocked);
      return;
    }
    setDeletingAccount(true);
    try {
      const res = await fetch('/api/user/me/delete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      const json = (await res.json()) as Envelope<null>;
      if (!res.ok) {
        throw new Error(json?.message || strings.deleteAccountError);
      }
      toast.success(strings.deleteAccountSuccess);
      clearSession();
      router.replace(AUTH_SIGN_IN_PATH);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : strings.deleteAccountError);
    } finally {
      setDeletingAccount(false);
      setDeleteModalOpen(false);
      setDeletePassword('');
    }
  }

  async function onRespondFriendRequest(requestId: string, action: 'accept' | 'reject') {
    if (!accessToken) return;
    const acceptedRequest = action === 'accept' ? incomingRequests.find((r) => r.id === requestId) : null;
    const res = await fetch(`/api/user/friends/requests/${requestId}/${action}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const json = (await res.json()) as ApiEnvelope;
    if (!res.ok) {
      toast.error(json?.message || strings.saveError);
      return;
    }
    setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    if (acceptedRequest?.peer) {
      setFriends((prev) => {
        if (prev.some((friend) => friend.id === acceptedRequest.peer.id)) return prev;
        return [acceptedRequest.peer, ...prev];
      });
    }
    toast.success(json.message);
  }

  function openLanguageModal(mode: 'known' | 'learning') {
    setModalMode(mode);
    setDraftRows(mode === 'known' ? knownRows : learningRows);
  }

  function applyLanguageModal() {
    if (!modalMode) return;
    const cleaned = draftRows.filter((row) => row.code);
    if (cleaned.length < 1) {
      toast.error(modalMode === 'known' ? strings.minNativeLanguageRequired : strings.minLearningLanguageRequired);
      return;
    }
    if (modalMode === 'known') setKnownRows(cleaned.map((row) => ({ ...row, level: strings.levelNative })));
    else setLearningRows(cleaned);
    setModalMode(null);
  }

  function updateDraftRow(rowId: string, patch: Partial<LanguageRow>) {
    setDraftRows((prev) => prev.map((item) => (item.id === rowId ? { ...item, ...patch } : item)));
  }

  function removeDraftRowAt(index: number) {
    setDraftRows((prev) => {
      if (prev.length <= 1) {
        toast.error(modalMode === 'known' ? strings.minNativeLanguageRequired : strings.minLearningLanguageRequired);
        return prev;
      }
      return prev.filter((_, rowIndex) => rowIndex !== index);
    });
  }

  async function onUpdateLocation() {
    if (!showOwnProfileFullEditor) return;
    if (typeof window === 'undefined' || !navigator?.geolocation) {
      toast.error(strings.locationUnsupported);
      return;
    }
    setLocatingCountry(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60_000,
        });
      });
      const { latitude, longitude } = position.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
        { cache: 'no-store' },
      );
      const json = (await res.json().catch(() => ({}))) as { address?: { country?: string; country_code?: string } };
      const countryFromName = json?.address?.country?.trim() ?? '';
      const countryCode = json?.address?.country_code?.trim().toUpperCase() ?? '';
      const countryFromCode =
        countryCode && typeof Intl !== 'undefined' && 'DisplayNames' in Intl
          ? (new Intl.DisplayNames(['en'], { type: 'region' }).of(countryCode) ?? '')
          : '';
      const resolvedCountry = countryFromName || countryFromCode;
      if (!resolvedCountry) {
        toast.error(strings.locationResolveError);
        return;
      }
      setCountry(resolvedCountry);
      toast.success(strings.locationUpdated);
    } catch {
      toast.error(strings.locationResolveError);
    } finally {
      setLocatingCountry(false);
    }
  }

  function onPickAvatar(file?: File) {
    if (!file || !showOwnProfileFullEditor) return;
    if (!file.type.startsWith('image/')) {
      toast.error(strings.avatarUploadError);
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setCropModalOpen(true);
  }

  function onCancelCropModal() {
    setCropModalOpen(false);
    if (selectedImage) URL.revokeObjectURL(selectedImage);
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function uploadAvatarFile(file?: File) {
    if (!file || !accessToken || !showOwnProfileFullEditor) return;
    setAvatarUploading(true);
    try {
      let compressedFile = file;
      try {
        compressedFile = await imageCompression(file, {
          maxSizeMB: 0.25,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: file.type,
        });
      } catch {
        // Keep original file if compression fails
      }

      const formData = new FormData();
      formData.append('file', compressedFile);
      const res = await fetch('/api/user/me/avatar', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const json = (await res.json()) as Envelope<MeUser>;
      if (!res.ok || !json?.data) {
        throw new Error(json?.message || strings.avatarUploadError);
      }
      setProfile(json.data);
      toast.success(strings.avatarUploadSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : strings.avatarUploadError);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function onApplyCropModal() {
    if (!cropperRef.current || !selectedImage) return;
    const canvas = cropperRef.current.getCanvas();
    if (!canvas) {
      toast.error(strings.avatarUploadError);
      return;
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error(strings.avatarUploadError);
          return;
        }
        const croppedFile = new File([blob], 'avatar.jpg', {
          type: 'image/jpeg',
        });
        void uploadAvatarFile(croppedFile);
        onCancelCropModal();
      },
      'image/jpeg',
      0.9,
    );
  }

  async function refetchProfile() {
    if (!accessToken) return;
    const endpoint = profileId === 'me' ? '/api/user/me' : `/api/user/${encodeURIComponent(profileId)}`;
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    const json = (await res.json()) as Envelope<MeUser>;
    if (!res.ok || !json?.data) return;
    setProfile(json.data);
    setBio(json.data.bio ?? '');
    setCountry(json.data.country ?? '');
    setAge(json.data.age ?? 18);
    setKnownRows(mapCodesToRows(json.data.languagesKnown ?? [], strings.levelNative));
    setLearningRows(mapCodesToRows(json.data.languagesLearning ?? [], strings.levelBeginner));
  }

  async function onSendFriendRequest() {
    if (!accessToken || !profile?.id) return;
    setSocialBusy(true);
    try {
      const res = await fetch('/api/user/friends/request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ receiverId: profile.id }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json?.message || strings.socialActionError);
      toast.success(strings.friendRequestSent);
      await refetchProfile();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : strings.socialActionError);
    } finally {
      setSocialBusy(false);
    }
  }

  async function onAcceptIncomingRequestFromProfile() {
    if (!accessToken || !profile?.id) return;
    setSocialBusy(true);
    try {
      const incomingRes = await fetch('/api/user/friends/requests/incoming', {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      const incomingJson = (await incomingRes.json()) as FriendRequestsEnvelope;
      const request = (incomingJson?.data?.requests ?? []).find((item) => item.peer.id === profile.id);
      if (!request?.id) {
        throw new Error(strings.socialActionError);
      }
      await onRespondFriendRequest(request.id, 'accept');
      await refetchProfile();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : strings.socialActionError);
    } finally {
      setSocialBusy(false);
    }
  }

  async function onConfirmRemoveFriend() {
    if (!accessToken || !profile?.id) return;
    setSocialBusy(true);
    try {
      const res = await fetch('/api/user/friends/remove', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otherUserId: profile.id }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json?.message || strings.socialActionError);
      toast.success(strings.friendRemoved);
      setRemoveFriendModalOpen(false);
      await refetchProfile();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : strings.socialActionError);
    } finally {
      setSocialBusy(false);
    }
  }

  async function onConfirmBlockUser() {
    if (!accessToken || !profile?.id) return;
    setSocialBusy(true);
    try {
      const res = await fetch('/api/user/friends/block', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockedUserId: profile.id }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json?.message || strings.socialActionError);
      toast.success(strings.userBlocked);
      setBlockUserModalOpen(false);
      router.replace('/community');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : strings.socialActionError);
    } finally {
      setSocialBusy(false);
    }
  }

  async function onStartChat() {
    if (!accessToken || !profile?.id || viewerRelation !== 'FRIEND') return;
    setSocialBusy(true);
    try {
      const res = await fetch('/api/user/chats/open', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ otherUserId: profile.id }),
      });
      const json = (await res.json()) as { message?: string; data?: { chatId?: string } };
      if (!res.ok || !json?.data?.chatId) {
        throw new Error(json?.message || strings.socialActionError);
      }
      router.push(`/chats?chatId=${encodeURIComponent(json.data.chatId)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : strings.socialActionError);
    } finally {
      setSocialBusy(false);
    }
  }

  const profileName = profile?.name || profile?.username || strings.profileHeadingFallback;
  const username = profile?.username ? `@${profile.username}` : `@${profileId}`;
  const isAdmin = profile?.role === 'ADMIN';
  const shownCountry = country || strings.countryNotSet;
  const viewerRelation = profile?.viewerRelation;
  const otherProfileAge =
    profile?.age != null && Number.isFinite(profile.age) ? Math.min(99, Math.max(18, profile.age)) : null;

  if (loading) {
    return <div className="min-h-dvh bg-[#0b1229]" aria-busy="true" aria-label={strings.loadingProfile} />;
  }

  if (profileAccessDenied) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0b1229] px-4 text-center text-[#dce1ff]">
        <p className="max-w-md text-sm text-[#9caec8]">{strings.profileAccessDenied}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#0b1229] px-4 text-center text-[#dce1ff]">
        <p className="text-sm text-[#9caec8]">{accessToken ? strings.loadError : strings.signInToViewProfile}</p>
        {!accessToken ? (
          <Button asChild className="bg-[#00d4ff] text-[#003642] hover:bg-[#00d4ff]/90">
            <Link href={AUTH_SIGN_IN_PATH}>{enStrings.auth.bottomNavLogin}</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0b1229] text-[#dce1ff]">
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-6 pb-28 md:px-8 md:pt-8 md:pb-10">
        {showOwnProfileFullEditor ? (
          <>
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl bg-[#141a32] p-8 md:flex-row md:items-start lg:col-span-8">
                <div className="relative">
                  <div className="size-32 overflow-hidden rounded-full ring-4 ring-[#00d4ff]/20 md:size-40">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={profileName} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#181e36] text-3xl font-bold">
                        {profileName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="absolute right-0 bottom-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#181e36] text-[#dce1ff] shadow-md transition-colors hover:bg-[#222941]"
                        aria-label={strings.profileImageMenu}
                      >
                        <Pencil className="size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => {
                          if (avatarSrc) setAvatarPreviewOpen(true);
                        }}
                        disabled={!avatarSrc}
                      >
                        <Eye className="size-4" />
                        {strings.viewProfileImage}
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={avatarUploading} onClick={() => fileInputRef.current?.click()}>
                        {avatarUploading ? (
                          <Upload className="size-4 animate-pulse" />
                        ) : (
                          <UserRoundPen className="size-4" />
                        )}
                        {strings.uploadProfilePicture}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    onPickAvatar(file);
                  }}
                />

                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight">{profileName}</h1>
                    <p className="text-lg font-medium text-[#9caec8]">{username}</p>
                  </div>
                  <button
                    type="button"
                    className="group relative w-full rounded-2xl bg-[#181e36] p-4 pr-12 text-left md:w-auto"
                    onClick={() => {
                      if (!showOwnProfileFullEditor) return;
                      setDraftBio(bio);
                      setBioModalOpen(true);
                    }}
                    disabled={!showOwnProfileFullEditor}
                    aria-label={strings.editBio}
                  >
                    <p className="text-sm leading-relaxed text-[#dce1ff]/80 italic">{bio || strings.bioFallback}</p>
                    {showOwnProfileFullEditor ? (
                      <span className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#2a3150] text-[#9caec8] transition-colors group-hover:text-[#dce1ff]">
                        <Pencil className="size-3.5" />
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:col-span-4">
                <div className="flex h-full flex-col rounded-3xl bg-[#141a32] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                      <BookText className="size-5 text-[#00d4ff]" />
                      {strings.sectionMyPosts}
                    </h3>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#181e36] p-6 text-center">
                    <Button
                      className="bg-[#00d4ff] text-[#003642] hover:bg-[#00d4ff]/90"
                      onClick={() => toast.info(strings.createPostComingSoon)}
                    >
                      <Plus className="size-4" />
                      {strings.createFirstPost}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-8 rounded-3xl bg-[#141a32] p-8">
                <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                  <Languages className="size-5 text-[#00d4ff]" />
                  {strings.sectionLanguageMastery}
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#9caec8]">
                      {strings.sectionNativeFluent}
                    </h3>
                    <button
                      type="button"
                      className="text-xs font-bold text-[#00d4ff] hover:underline"
                      onClick={() => openLanguageModal('known')}
                    >
                      {strings.edit}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {knownLanguages.map((lang) => (
                      <LanguageFlagPill
                        key={`known-${lang.code}`}
                        code={lang.code}
                        label={lang.label}
                        rightLabel={lang.level}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#9caec8]">
                      {strings.sectionCurrentlyLearning}
                    </h3>
                    <button
                      type="button"
                      className="text-xs font-bold text-[#00d4ff] hover:underline"
                      onClick={() => openLanguageModal('learning')}
                    >
                      {strings.edit}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {learningLanguages.map((lang) => (
                      <LanguageFlagPill
                        key={`learn-${lang.code}`}
                        code={lang.code}
                        label={lang.label}
                        rightLabel={lang.level}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6 rounded-3xl bg-[#141a32] p-8">
                <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                  <UserRound className="size-5 text-[#00d4ff]" />
                  {strings.sectionAccountCredentials}
                </h2>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="profile-country"
                        className="ml-1 text-[10px] font-bold tracking-[0.2em] uppercase text-[#9caec8]"
                      >
                        {strings.currentCountry}
                      </label>
                      <div
                        id="profile-country"
                        className="flex h-12 items-center justify-between gap-3 rounded-md border-none bg-[#2d344c] px-3"
                      >
                        <span className="inline-flex min-w-0 items-center gap-2 text-sm text-[#dce1ff]">
                          {(() => {
                            const code = codeFromCountry(shownCountry);
                            return code ? (
                              <CountryFlag countryCode={code} svg style={{ width: '1rem', height: '1rem' }} />
                            ) : null;
                          })()}
                          <span className="truncate">{shownCountry}</span>
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 rounded-xl bg-[#181e36] px-2.5 text-xs text-[#dce1ff] hover:bg-[#222941]"
                          onClick={() => void onUpdateLocation()}
                          disabled={!showOwnProfileFullEditor || locatingCountry}
                        >
                          <MapPin className="size-3.5" />
                          {locatingCountry ? strings.updatingLocation : strings.updateLocation}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="profile-age"
                        className="ml-1 text-[10px] font-bold tracking-[0.2em] uppercase text-[#9caec8]"
                      >
                        {strings.age}
                      </label>
                      <button
                        id="profile-age"
                        type="button"
                        className="flex h-12 w-full items-center justify-between rounded-md border-none bg-[#2d344c] px-4 text-[#dce1ff]"
                        onClick={() => {
                          setDraftAge(Math.min(99, Math.max(18, age)));
                          setAgeModalOpen(true);
                        }}
                        aria-label={strings.editAge}
                      >
                        <span className="tabular-nums">{Math.min(99, Math.max(18, age))}</span>
                        <Pencil className="size-4 text-[#9caec8]" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="profile-email"
                      className="ml-1 text-[10px] font-bold tracking-[0.2em] uppercase text-[#9caec8]"
                    >
                      {strings.emailAddress}
                    </label>
                    <div className="flex h-12 items-center gap-2 rounded-xl border border-white/10 bg-[#0b1229]/35 px-4 opacity-80">
                      <Lock className="size-4 text-[#9caec8]" />
                      <Input
                        id="profile-email"
                        readOnly
                        disabled
                        value={profile?.email ?? ''}
                        className="h-full border-none bg-transparent px-0 text-[#9caec8] opacity-100"
                      />
                    </div>
                  </div>

                  <Button
                    disabled={saving || !showOwnProfileFullEditor || !hasProfileChanges}
                    onClick={() => {
                      void onSaveProfile();
                    }}
                    className="h-12 w-full rounded-2xl bg-[#00d4ff] text-base font-extrabold text-[#003642] shadow-[0_4px_20px_rgba(0,212,255,0.15)] hover:bg-[#00d4ff]/90"
                  >
                    {strings.saveProfileChanges}
                  </Button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-[#141a32] p-8">
              <h2 className="mb-5 flex items-center gap-2 text-xl font-bold tracking-tight">
                <Users className="size-5 text-[#00d4ff]" />
                {strings.friendsSectionTitle}
              </h2>
              <Tabs
                value={friendTab}
                onValueChange={(value) => setFriendTab(value as 'friends' | 'incoming' | 'sent')}
                className="w-full"
              >
                <TabsList
                  variant="line"
                  className="mb-4 h-auto w-full shrink-0 flex-row flex-wrap justify-start gap-4 border-b border-white/10 bg-transparent p-0"
                >
                  <TabsTrigger
                    value="friends"
                    className="h-auto flex-none rounded-none border-none px-0 pb-2 pt-1 text-[#9caec8] hover:bg-transparent hover:text-[#dce1ff] data-active:text-[#dce1ff]"
                  >
                    {strings.friendsTabFriends}
                  </TabsTrigger>
                  <TabsTrigger
                    value="incoming"
                    className="h-auto flex-none rounded-none border-none px-0 pb-2 pt-1 text-[#9caec8] hover:bg-transparent hover:text-[#dce1ff] data-active:text-[#dce1ff]"
                  >
                    {strings.friendsTabIncoming}
                    {incomingRequests.length > 0 ? (
                      <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">
                        {incomingRequests.length}
                      </span>
                    ) : null}
                  </TabsTrigger>
                  <TabsTrigger
                    value="sent"
                    className="h-auto flex-none rounded-none border-none px-0 pb-2 pt-1 text-[#9caec8] hover:bg-transparent hover:text-[#dce1ff] data-active:text-[#dce1ff]"
                  >
                    {strings.friendsTabSent}
                    {outgoingRequests.length > 0 ? (
                      <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] text-white">
                        {outgoingRequests.length}
                      </span>
                    ) : null}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="friends" className="mt-0">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#181e36]">
                    {friendsLoading ? (
                      <p className="p-4 text-sm text-[#9caec8]">Loading...</p>
                    ) : friends.length === 0 ? (
                      <p className="p-4 text-sm text-[#9caec8]">{strings.noFriends}</p>
                    ) : (
                      <ul className="divide-y divide-white/10">
                        {friends.map((friend) => {
                          const cc = peerCountryCode(friend);
                          return (
                            <li key={friend.id}>
                              <Link
                                href={friend.username ? `/profile/${friend.username}` : `/profile/${friend.id}`}
                                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#222941]/60"
                              >
                                <span className="relative inline-flex h-10 w-10 shrink-0">
                                  {friendAvatarMap[friend.id] ? (
                                    <img
                                      src={friendAvatarMap[friend.id]}
                                      alt={peerDisplayName(friend)}
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a3150] text-sm font-bold text-[#dce1ff]">
                                      {peerInitial(friend)}
                                    </span>
                                  )}
                                  {cc ? (
                                    <span className="absolute -right-0.5 -bottom-0.5 inline-flex h-4 min-w-4 items-center justify-center overflow-hidden p-0.5">
                                      <CountryFlag
                                        countryCode={cc}
                                        svg
                                        style={{ width: '0.65rem', height: '0.65rem' }}
                                      />
                                    </span>
                                  ) : null}
                                </span>
                                <span className="min-w-0 truncate text-sm font-semibold text-[#dce1ff]">
                                  {peerDisplayName(friend)}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="incoming" className="mt-0">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#181e36]">
                    {friendsLoading ? (
                      <p className="p-4 text-sm text-[#9caec8]">Loading...</p>
                    ) : incomingRequests.length === 0 ? (
                      <p className="p-4 text-sm text-[#9caec8]">{strings.noIncomingRequests}</p>
                    ) : (
                      <ul className="divide-y divide-white/10">
                        {incomingRequests.map((request) => {
                          const cc = peerCountryCode(request.peer);
                          return (
                            <li key={request.id} className="px-4 py-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <Link
                                  href={
                                    request.peer.username
                                      ? `/profile/${request.peer.username}`
                                      : `/profile/${request.peer.id}`
                                  }
                                  className="flex min-w-0 flex-1 items-center gap-3"
                                >
                                  <span className="relative inline-flex h-10 w-10 shrink-0">
                                    {friendAvatarMap[request.peer.id] ? (
                                      <img
                                        src={friendAvatarMap[request.peer.id]}
                                        alt={peerDisplayName(request.peer)}
                                        className="h-10 w-10 rounded-full object-cover"
                                      />
                                    ) : (
                                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a3150] text-sm font-bold text-[#dce1ff]">
                                        {peerInitial(request.peer)}
                                      </span>
                                    )}
                                    {cc ? (
                                      <span className="absolute -right-0.5 -bottom-0.5 inline-flex h-4 min-w-4 items-center justify-center overflow-hidden p-0.5">
                                        <CountryFlag
                                          countryCode={cc}
                                          svg
                                          style={{ width: '0.65rem', height: '0.65rem' }}
                                        />
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="truncate text-sm font-semibold text-[#dce1ff]">
                                    {peerDisplayName(request.peer)}
                                  </span>
                                </Link>
                                <div className="flex shrink-0 gap-2">
                                  <Button
                                    size="sm"
                                    className="rounded-xl bg-[#00d4ff] px-2 text-[#003642] hover:bg-[#00d4ff]/90"
                                    aria-label={strings.accept}
                                    onClick={() => {
                                      onRespondFriendRequest(request.id, 'accept').catch(() => undefined);
                                    }}
                                  >
                                    <Check className="size-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-xl bg-red-500/20 px-2 text-red-300 hover:bg-red-500/30"
                                    aria-label={strings.reject}
                                    onClick={() => {
                                      onRespondFriendRequest(request.id, 'reject').catch(() => undefined);
                                    }}
                                  >
                                    <X className="size-4" />
                                  </Button>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="sent" className="mt-0">
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#181e36]">
                    {friendsLoading ? (
                      <p className="p-4 text-sm text-[#9caec8]">Loading...</p>
                    ) : outgoingRequests.length === 0 ? (
                      <p className="p-4 text-sm text-[#9caec8]">{strings.noOutgoingRequests}</p>
                    ) : (
                      <ul className="divide-y divide-white/10">
                        {outgoingRequests.map((request) => {
                          const cc = peerCountryCode(request.peer);
                          return (
                            <li key={request.id}>
                              <Link
                                href={
                                  request.peer.username
                                    ? `/profile/${request.peer.username}`
                                    : `/profile/${request.peer.id}`
                                }
                                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[#222941]/60"
                              >
                                <span className="relative inline-flex h-10 w-10 shrink-0">
                                  {friendAvatarMap[request.peer.id] ? (
                                    <img
                                      src={friendAvatarMap[request.peer.id]}
                                      alt={peerDisplayName(request.peer)}
                                      className="h-10 w-10 rounded-full object-cover"
                                    />
                                  ) : (
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a3150] text-sm font-bold text-[#dce1ff]">
                                      {peerInitial(request.peer)}
                                    </span>
                                  )}
                                  {cc ? (
                                    <span className="absolute -right-0.5 -bottom-0.5 inline-flex h-4 min-w-4 items-center justify-center overflow-hidden p-0.5">
                                      <CountryFlag
                                        countryCode={cc}
                                        svg
                                        style={{ width: '0.65rem', height: '0.65rem' }}
                                      />
                                    </span>
                                  ) : null}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-[#dce1ff]">
                                    {peerDisplayName(request.peer)}
                                  </p>
                                  <p className="text-xs text-[#9caec8]">{strings.pending}</p>
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </section>

            <section className="rounded-3xl border border-red-200/10 bg-[#060d24]/60 p-6">
              <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                <div className="text-center md:text-left">
                  <h3 className="text-lg font-bold text-red-300">{strings.sectionSecurityAccess}</h3>
                  <p className="text-sm text-[#9caec8]">{strings.sectionSecuritySubtitle}</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button
                    variant="secondary"
                    className="h-11 bg-[#181e36] px-6 text-[#9caec8] hover:bg-[#222941] hover:text-[#dce1ff]"
                    onClick={() => setBlockListModalOpen(true)}
                  >
                    {strings.manageBlockList}
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-11 bg-red-500/15 px-8 text-red-300 hover:bg-red-500/25"
                    onClick={() => {
                      if (isAdmin) {
                        toast.error(strings.deleteAccountAdminBlocked);
                        return;
                      }
                      setDeleteModalOpen(true);
                    }}
                    disabled={!showOwnProfileFullEditor}
                  >
                    <ShieldAlert className="size-4" />
                    {strings.deleteAccount}
                  </Button>
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="relative flex flex-col items-center gap-8 overflow-hidden rounded-3xl bg-[#141a32] p-8 md:flex-row md:items-start lg:col-span-8">
                <button
                  type="button"
                  className="size-32 shrink-0 overflow-hidden rounded-full ring-4 ring-[#00d4ff]/20 md:size-40"
                  onClick={() => {
                    if (avatarSrc) setAvatarPreviewOpen(true);
                  }}
                  disabled={!avatarSrc}
                  aria-label={strings.viewProfileImage}
                >
                  {avatarSrc ? (
                    <img src={avatarSrc} alt={profileName} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#181e36] text-3xl font-bold">
                      {profileName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                <div className="flex-1 space-y-4 text-center md:text-left">
                  <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight">{profileName}</h1>
                    <p className="text-lg font-medium text-[#9caec8]">{username}</p>
                  </div>
                  <div className="w-full rounded-2xl bg-[#181e36] p-4 text-left md:w-auto">
                    <p className="text-sm leading-relaxed text-[#dce1ff]/80 italic">{bio || strings.bioFallback}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#9caec8]">
                    <span className="inline-flex items-center gap-2">
                      {(() => {
                        const code = codeFromCountry(shownCountry);
                        return code ? (
                          <CountryFlag countryCode={code} svg style={{ width: '1rem', height: '1rem' }} />
                        ) : null;
                      })()}
                      <span>{shownCountry}</span>
                    </span>
                    {otherProfileAge != null ? (
                      <>
                        <span aria-hidden>·</span>
                        <span className="tabular-nums">
                          {otherProfileAge} {strings.ageLabelShort}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {accessToken && viewerRelation && viewerRelation !== 'SELF' ? (
                    <div className="flex flex-wrap justify-center gap-2 pt-2 md:justify-start">
                      {viewerRelation === 'FRIEND' ? (
                        <>
                          <Button
                            type="button"
                            className="h-10 bg-[#00d4ff] font-semibold text-[#003642] hover:bg-[#00d4ff]/90"
                            disabled={socialBusy}
                            onClick={() => void onStartChat()}
                          >
                            <MessageCircle className="size-4" />
                            {strings.chatNow}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-10 bg-[#2d344c] text-[#dce1ff] hover:bg-[#323851]"
                            disabled={socialBusy}
                            onClick={() => setRemoveFriendModalOpen(true)}
                          >
                            <UserMinus className="size-4" />
                            {strings.removeFriend}
                          </Button>
                        </>
                      ) : null}
                      {viewerRelation === 'NONE' ? (
                        <Button
                          type="button"
                          className="h-10 bg-[#00d4ff] font-semibold text-[#003642] hover:bg-[#00d4ff]/90"
                          disabled={socialBusy}
                          onClick={() => void onSendFriendRequest()}
                        >
                          <UserPlus className="size-4" />
                          {strings.addFriend}
                        </Button>
                      ) : null}
                      {viewerRelation === 'OUTGOING_PENDING' ? (
                        <Button type="button" className="h-10" disabled>
                          {strings.sentRequest}
                        </Button>
                      ) : null}
                      {viewerRelation === 'INCOMING_PENDING' ? (
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            className="h-10 bg-[#00d4ff] font-semibold text-[#003642] hover:bg-[#00d4ff]/90"
                            disabled={socialBusy}
                            onClick={() => void onAcceptIncomingRequestFromProfile()}
                          >
                            <Check className="size-4" />
                            {strings.accept}
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-10 border border-[#00d4ff]/35 bg-transparent text-[#9fdfff] hover:bg-[#00d4ff]/10 hover:text-[#d8f6ff]"
                            disabled={socialBusy}
                            onClick={() => {
                              const incoming = incomingRequests.find((r) => r.peer.id === profile.id);
                              if (!incoming?.id) {
                                toast.error(strings.socialActionError);
                                return;
                              }
                              onRespondFriendRequest(incoming.id, 'reject').catch(() => undefined);
                            }}
                          >
                            <X className="size-4" />
                            {strings.reject}
                          </Button>
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-10 bg-red-500/15 text-red-300 hover:bg-red-500/25"
                        disabled={socialBusy}
                        onClick={() => setBlockUserModalOpen(true)}
                      >
                        <Ban className="size-4" />
                        {strings.blockUser}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:col-span-4">
                <div className="flex h-full min-h-[200px] flex-col rounded-3xl bg-[#141a32] p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                      <BookText className="size-5 text-[#00d4ff]" />
                      {strings.sectionPosts}
                    </h3>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#181e36] p-6 text-center">
                    <p className="text-sm text-[#9caec8]">{strings.noPostsSimple}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-[#141a32] p-8">
              <h2 className="mb-6 flex items-center gap-2 text-xl font-bold tracking-tight">
                <Languages className="size-5 text-[#00d4ff]" />
                {strings.sectionLanguageMastery}
              </h2>

              <div className="space-y-4">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#9caec8]">
                  {strings.sectionNativeFluent}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {knownLanguages.map((lang) => (
                    <LanguageFlagPill
                      key={`known-${lang.code}`}
                      code={lang.code}
                      label={lang.label}
                      rightLabel={lang.level}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-6">
                <h3 className="text-xs font-bold tracking-[0.2em] uppercase text-[#9caec8]">
                  {strings.sectionCurrentlyLearning}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {learningLanguages.map((lang) => (
                    <LanguageFlagPill
                      key={`learn-${lang.code}`}
                      code={lang.code}
                      label={lang.label}
                      rightLabel={lang.level}
                    />
                  ))}
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      <nav className="fixed right-0 bottom-0 left-0 z-40 flex w-full items-center justify-around border-t border-white/10 bg-[#0b1229]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur md:hidden">
        <Link href="/community" className="flex flex-col items-center gap-1 text-[#8ea0ba]">
          <Users className="h-4 w-4" />
          <span className="text-[11px] font-semibold">{communityStrings.navCommunity}</span>
        </Link>
        <button type="button" className="flex flex-col items-center gap-1 text-[#8ea0ba]">
          <Rss className="h-4 w-4" />
          <span className="text-[11px]">{communityStrings.navFeed}</span>
        </button>
        <Link href="/chats" className="flex flex-col items-center gap-1 text-[#8ea0ba]">
          <span className="relative inline-flex">
            <MessageCircle className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1.5 -right-2 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-4 text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </span>
          <span className="text-[11px]">{communityStrings.navChats}</span>
        </Link>
        <button type="button" className="flex flex-col items-center gap-1 text-[#8ea0ba]">
          <Bell className="h-4 w-4" />
          <span className="text-[11px]">{communityStrings.navNotifications}</span>
        </button>
        <Link href="/profile/me" className="flex flex-col items-center gap-1 text-[#00d4ff]">
          <CommunityProfileAvatar className="size-6" fallbackClassName="text-[9px]" />
          <span className="text-[11px] font-semibold">{communityStrings.navProfile}</span>
        </Link>
      </nav>

      {modalMode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#141a32] p-4 md:p-6">
            <div className="mb-4 flex items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold">{strings.languageModalTitle}</h3>
                <p className="text-sm text-[#9caec8]">{strings.languageModalSubtitle}</p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-[#9caec8] hover:bg-white/10"
                onClick={() => setModalMode(null)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[60dvh] space-y-3 overflow-y-auto pr-1">
              {draftRows.map((row, index) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-[#181e36] p-3 md:grid-cols-[1fr_180px_auto]"
                >
                  <Select
                    value={row.code || '__empty_language__'}
                    onValueChange={(value) => {
                      const code = value === '__empty_language__' ? '' : value;
                      updateDraftRow(row.id, { code });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={strings.chooseLanguage} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__empty_language__">{strings.chooseLanguage}</SelectItem>
                      {selectableLanguages.map((languageName) => {
                        const code = ISO6391.getCode(languageName);
                        if (!code) return null;
                        return (
                          <SelectItem key={code} value={code}>
                            <span className="inline-flex items-center gap-2">
                              {(() => {
                                const country = codeFromLanguage(code);
                                return country ? (
                                  <CountryFlag countryCode={country} svg style={{ width: '1rem', height: '1rem' }} />
                                ) : null;
                              })()}
                              <span>{languageName}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {modalMode === 'known' ? (
                    <div className="flex h-10 items-center rounded-md border border-white/10 bg-[#0b1229]/35 px-3 text-sm text-[#9caec8]">
                      {strings.levelNative}
                    </div>
                  ) : (
                    <Select
                      value={row.level || '__empty_level__'}
                      onValueChange={(value) => {
                        const level = value === '__empty_level__' ? '' : value;
                        updateDraftRow(row.id, { level });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={strings.chooseLevel} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__empty_level__">{strings.chooseLevel}</SelectItem>
                        {[strings.levelBeginner, strings.levelIntermediate, strings.levelAdvanced].map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <Button
                    variant="ghost"
                    className="h-10 justify-center text-red-300 hover:bg-red-500/15 hover:text-red-200"
                    onClick={() => removeDraftRowAt(index)}
                    aria-label={strings.removeLanguage}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="secondary"
                className="bg-[#222941] text-[#dce1ff] hover:bg-[#2d344c]"
                onClick={() =>
                  setDraftRows((prev) => [
                    ...prev,
                    {
                      id: randomRowId(),
                      code: '',
                      level: modalMode === 'known' ? strings.levelNative : strings.levelBeginner,
                    },
                  ])
                }
              >
                <Plus className="size-4" />
                {strings.addLanguage}
              </Button>

              <div className="flex gap-2">
                <Button variant="ghost" className="text-[#9caec8]" onClick={() => setModalMode(null)}>
                  {strings.cancel}
                </Button>
                <Button className="bg-[#00d4ff] text-[#003642] hover:bg-[#00d4ff]/90" onClick={applyLanguageModal}>
                  {strings.apply}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {bioModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#141a32] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">{strings.editBio}</h3>
              <button
                type="button"
                className="rounded-md p-1 text-[#9caec8] hover:bg-white/10"
                onClick={() => setBioModalOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <textarea
              value={draftBio}
              onChange={(event) => setDraftBio(event.target.value.slice(0, 300))}
              maxLength={300}
              className="min-h-36 w-full rounded-xl border border-white/10 bg-[#181e36] p-3 text-sm text-[#dce1ff] outline-none focus:ring-2 focus:ring-[#00d4ff]"
            />
            <p className="mt-2 text-right text-xs text-[#9caec8]">{draftBio.length}/300</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" className="text-[#9caec8]" onClick={() => setBioModalOpen(false)}>
                {strings.cancel}
              </Button>
              <Button
                className="bg-[#00d4ff] text-[#003642] hover:bg-[#00d4ff]/90"
                onClick={() => {
                  setBio(draftBio);
                  setBioModalOpen(false);
                }}
              >
                {strings.apply}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {ageModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#141a32] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">{strings.editAge}</h3>
              <button
                type="button"
                className="rounded-md p-1 text-[#9caec8] hover:bg-white/10"
                onClick={() => setAgeModalOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <WheelPickerWrapper className="mx-auto w-full max-w-[220px] border-none bg-[#2d344c] px-0 shadow-none">
              <WheelPicker<number>
                value={Math.min(99, Math.max(18, draftAge))}
                options={ageOptions}
                onValueChange={(value) => setDraftAge(value)}
                optionItemHeight={36}
                visibleCount={20}
                classNames={{
                  optionItem: 'text-[#9caec8]',
                  highlightWrapper: 'bg-[#181e36] text-[#dce1ff]',
                  highlightItem: 'text-[#dce1ff] font-semibold',
                }}
              />
            </WheelPickerWrapper>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" className="text-[#9caec8]" onClick={() => setAgeModalOpen(false)}>
                {strings.cancel}
              </Button>
              <Button
                className="bg-[#00d4ff] text-[#003642] hover:bg-[#00d4ff]/90"
                onClick={() => {
                  setAge(Math.min(99, Math.max(18, draftAge)));
                  setAgeModalOpen(false);
                }}
              >
                {strings.apply}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {avatarPreviewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="relative w-full max-w-3xl">
            <button
              type="button"
              className="absolute top-2 right-2 rounded-md bg-black/50 p-2 text-white hover:bg-black/70"
              onClick={() => setAvatarPreviewOpen(false)}
              aria-label={strings.closeImagePreview}
            >
              <X className="size-4" />
            </button>
            <img src={avatarSrc} alt={profileName} className="max-h-[85vh] w-full rounded-2xl object-contain" />
          </div>
        </div>
      ) : null}

      {cropModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#141a32] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">{strings.cropAvatarTitle}</h3>
              <button
                type="button"
                className="rounded-md p-1 text-[#9caec8] hover:bg-white/10"
                onClick={onCancelCropModal}
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="h-[55vh] overflow-hidden rounded-xl bg-[#0b1229]">
              {selectedImage ? (
                <Cropper
                  ref={cropperRef}
                  src={selectedImage}
                  stencilProps={{ aspectRatio: 1 }}
                  className="h-full w-full"
                />
              ) : null}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" className="text-[#9caec8]" onClick={onCancelCropModal}>
                {strings.cancel}
              </Button>
              <Button
                className="bg-[#00d4ff] text-[#003642] hover:bg-[#00d4ff]/90"
                onClick={() => void onApplyCropModal()}
              >
                {strings.apply}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {removeFriendModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141a32] p-5">
            <h3 className="text-lg font-bold text-[#dce1ff]">{strings.confirmRemoveFriendTitle}</h3>
            <p className="mt-2 text-sm text-[#9caec8]">{strings.confirmRemoveFriendBody}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" className="text-[#9caec8]" onClick={() => setRemoveFriendModalOpen(false)}>
                {strings.cancel}
              </Button>
              <Button
                variant="destructive"
                className="bg-red-500/20 text-red-300 hover:bg-red-500/30"
                disabled={socialBusy}
                onClick={() => void onConfirmRemoveFriend()}
              >
                {strings.removeFriend}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {blockUserModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141a32] p-5">
            <h3 className="text-lg font-bold text-red-300">{strings.confirmBlockTitle}</h3>
            <p className="mt-2 text-sm text-[#9caec8]">{strings.confirmBlockBody}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" className="text-[#9caec8]" onClick={() => setBlockUserModalOpen(false)}>
                {strings.cancel}
              </Button>
              <Button
                variant="destructive"
                className="bg-red-500/20 text-red-300 hover:bg-red-500/30"
                disabled={socialBusy}
                onClick={() => void onConfirmBlockUser()}
              >
                {strings.blockUser}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141a32] p-5">
            <h3 className="text-lg font-bold text-red-300">{strings.deleteAccountConfirmTitle}</h3>
            <p className="mt-1 text-sm text-[#9caec8]">{strings.deleteAccountConfirmBody}</p>
            <label className="mt-4 mb-2 block text-xs font-bold tracking-[0.2em] uppercase text-[#9caec8]">
              {strings.deleteAccountPasswordLabel}
            </label>
            <Input
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              className="h-10 border-white/10 bg-[#181e36]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" className="text-[#9caec8]" onClick={() => setDeleteModalOpen(false)}>
                {strings.cancel}
              </Button>
              <Button
                variant="destructive"
                className="bg-red-500/20 text-red-300 hover:bg-red-500/30"
                disabled={deletingAccount || deletePassword.trim().length === 0}
                onClick={() => {
                  void onDeleteAccount();
                }}
              >
                {strings.deleteAccountConfirmAction}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {blockListModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#141a32] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold">{strings.manageBlockList}</h3>
              <button
                type="button"
                className="rounded-md p-1 text-[#9caec8] hover:bg-white/10"
                onClick={() => setBlockListModalOpen(false)}
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm text-[#9caec8]">{strings.blockListComingSoon}</p>
            <div className="mt-4 flex justify-end">
              <Button
                className="bg-[#00d4ff] text-[#003642] hover:bg-[#00d4ff]/90"
                onClick={() => setBlockListModalOpen(false)}
              >
                {strings.apply}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
