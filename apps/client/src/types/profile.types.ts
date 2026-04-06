export type ProfileClientProps = {
  readonly profileId: string;
};

export type ViewerProfileRelation = 'SELF' | 'FRIEND' | 'OUTGOING_PENDING' | 'INCOMING_PENDING' | 'NONE';

export type MeUser = {
  id: string;
  email?: string;
  username?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
  languagesKnown: string[];
  languagesLearning: string[];
  country?: string | null;
  age?: number | null;
  bio?: string | null;
  role?: 'USER' | 'ADMIN' | 'MODERATOR';
  /** Set when loading another user by username (authenticated). */
  viewerRelation?: ViewerProfileRelation;
  isOnline?: boolean;
  isTyping?: boolean;
  isVerified?: boolean;
};

export type Envelope<T> = {
  message: string;
  data: T;
};

export type ApiEnvelope = {
  message: string;
};

export type LanguageRow = {
  id: string;
  code: string;
  level: string;
};

export type FriendPeer = {
  id: string;
  username: string | null;
  name: string | null;
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
  country?: string | null;
};

export type FriendRequestRow = {
  id: string;
  status: string;
  createdAt: string;
  peer: FriendPeer;
};

export type FriendRequestsEnvelope = {
  message: string;
  data: {
    requests: FriendRequestRow[];
  };
};

export type FriendsListEnvelope = {
  message: string;
  data: {
    friends: FriendPeer[];
  };
};
