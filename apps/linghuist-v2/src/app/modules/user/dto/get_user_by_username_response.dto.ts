export class GetUserByUsernameResponseDto {
  username?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  thumbnailUrl?: string | null;
  languagesKnown!: string[];
  languagesLearning!: string[];
  country?: string | null;
  age?: number | null;
  isVerified!: boolean;
  bio?: string | null;
}

export class GetUserByUsernameResponseEnvelopeDto {
  message!: string;
  data!: GetUserByUsernameResponseDto;
}
