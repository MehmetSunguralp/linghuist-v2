import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly url: string;
  private readonly serviceRoleKey: string;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    this.url = url;
    this.serviceRoleKey = key;
  }

  /**
   * Return a fresh service-role client for each call.
   * Avoids cross-request auth session leakage on a shared singleton.
   */
  getClient(): SupabaseClient {
    return createClient(this.url, this.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
}
