export type ViewerProfileRelation = 'SELF' | 'FRIEND' | 'OUTGOING_PENDING' | 'INCOMING_PENDING' | 'NONE';

export class GetUserByUsernameResponseDto {
  id!: string;
  username?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
  languagesKnown!: string[];
  languagesLearning!: string[];
  isOnline!: boolean;
  isTyping!: boolean;
  lastOnline?: Date | null;
  country?: string | null;
  age?: number | null;
  isVerified!: boolean;
  bio?: string | null;
  /** How the authenticated viewer relates to this profile (omitted on unauthenticated responses). */
  viewerRelation?: ViewerProfileRelation;
}

export class GetUserByUsernameResponseEnvelopeDto {
  message!: string;
  data!: GetUserByUsernameResponseDto;
}
