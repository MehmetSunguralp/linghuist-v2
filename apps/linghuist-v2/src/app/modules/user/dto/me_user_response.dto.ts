export class MeUserResponseDto {
  id!: string;
  email!: string;
  username?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  nativeLanguage?: string | null;
  learningLanguage?: string | null;
  level?: string | null;
}
