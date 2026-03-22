export class GetUserByUsernameResponseDto {
  username?: string | null;
  avatarUrl?: string | null;
  nativeLanguage?: string | null;
  learningLanguage?: string | null;
  level?: string | null;
  bio?: string | null;
}

export class GetUserByUsernameResponseEnvelopeDto {
  message!: string;
  data!: GetUserByUsernameResponseDto;
}
