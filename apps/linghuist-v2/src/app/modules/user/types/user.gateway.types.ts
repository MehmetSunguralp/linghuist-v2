import type { Socket } from 'socket.io';

export type AuthenticatedSocket = Socket & {
  data: Socket['data'] & {
    userId: string;
  };
};
