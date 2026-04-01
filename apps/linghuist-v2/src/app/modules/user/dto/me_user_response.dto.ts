export class MeUserResponseDto {
  id!: string;
  email!: string;
  username?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
  languagesKnown!: string[];
  languagesLearning!: string[];
  country?: string | null;
  age?: number | null;
  isVerified!: boolean;
  isOnline!: boolean;
  isTyping!: boolean;
  lastOnline?: Date | null;
  bio?: string | null;
  role!: 'USER' | 'ADMIN' | 'MODERATOR';
}

export class MeUserResponseEnvelopeDto {
  message!: string;
  data!: MeUserResponseDto;
}
