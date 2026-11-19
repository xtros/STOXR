// src/services/supabaseKeepAlive.ts
import { supabase } from '@/integrations/supabase/client';

class SupabaseKeepAliveService {
  private timer: number | null = null;
  private readonly INTERVAL = 4 * 60 * 60 * 1000; // 4 hours

  public start() {
    if (this.timer) return;

    // Run initial ping
    this.ping();

    // Schedule regular ping
    this.timer = window.setInterval(() => {
      this.ping();
    }, this.INTERVAL);
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async ping() {
    try {
      const { status } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      console.log(`[Supabase KeepAlive] Ping sent to keep project active. Status: ${status}`);
    } catch (err) {
      console.warn('[Supabase KeepAlive] Ping warning:', err);
    }
  }
}

export const supabaseKeepAlive = new SupabaseKeepAliveService();
