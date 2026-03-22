import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Reads `request.user.id` set by `AuthGuard` (must be used on guarded routes). */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{ user: { id: string } }>();
    return request.user.id;
  },
);
