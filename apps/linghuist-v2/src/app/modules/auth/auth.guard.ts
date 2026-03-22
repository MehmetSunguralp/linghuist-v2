import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '@linghuist-v2/supabase';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;
    const token =
      authHeader && /^Bearer\s+/i.test(authHeader)
        ? authHeader.replace(/^Bearer\s+/i, '').trim()
        : '';

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid token');
    }

    request.user = { id: data.user.id };

    return true;
  }
}
