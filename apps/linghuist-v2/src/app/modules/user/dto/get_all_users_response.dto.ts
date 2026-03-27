/** Public “discovery” card — no email, bio, or verification flags. */
export class GetAllUsersResponseDto {
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
}

export class GetAllUsersPaginatedDataDto {
  users!: GetAllUsersResponseDto[];
  page!: number;
  pageSize!: number;
  total!: number;
  totalPages!: number;
  hasNextPage!: boolean;
}

export class GetAllUsersResponseEnvelopeDto {
  message!: string;
  data!: GetAllUsersPaginatedDataDto;
}
