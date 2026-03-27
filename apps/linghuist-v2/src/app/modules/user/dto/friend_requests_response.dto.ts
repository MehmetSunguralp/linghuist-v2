import type { FriendRequestStatus } from '@prisma/client';

export class FriendRequestPeerDto {
  id!: string;
  username!: string | null;
  name!: string | null;
}

export class FriendRequestRowDto {
  id!: string;
  status!: FriendRequestStatus;
  createdAt!: Date;
  peer!: FriendRequestPeerDto;
}

export class FriendRequestsListDataDto {
  requests!: FriendRequestRowDto[];
}

export class FriendRequestsListEnvelopeDto {
  message!: string;
  data!: FriendRequestsListDataDto;
}
