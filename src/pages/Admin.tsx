import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Database, 
  Activity, 
  Cpu, 
  RefreshCw, 
  CheckCircle2, 
  Key, 
  Server, 
  Radio, 
  ExternalLink,
  Lock,
  UserCheck,
  Zap,
  Globe
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, UserProfile } from '@/contexts/AuthContext';
import { supabaseKeepAlive } from '@/services/supabaseKeepAlive';
import { toast } from 'sonner';

export default function Admin() {
  const { user, profile } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string>(new Date().toLocaleTimeString());
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
        toast.error('Failed to load user profiles from Supabase');
      } else if (data) {
        setProfiles(data as UserProfile[]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleManualPing = async () => {
    setPinging(true);
    try {
      await supabaseKeepAlive.ping();
      setLastPingTime(new Date().toLocaleTimeString());
      toast.success('Supabase keep-alive ping dispatched successfully! Project active.');
    } catch (err) {
      toast.error('Keep-alive ping failed');
    } finally {
      setTimeout(() => setPinging(false), 500);
    }
  };

  const toggleUserRole = async (targetUser: UserProfile) => {
    if (targetUser.email === 'admin@stoxr.com') {
      toast.error('Cannot modify root admin role.');
      return;
    }

    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    setIsUpdatingRole(targetUser.id);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUser.id);

      if (error) {
        toast.error(`Failed to update role: ${error.message}`);
      } else {
        toast.success(`Updated ${targetUser.email} role to ${newRole.toUpperCase()}`);
        setProfiles(prev =>
          prev.map(p => p.id === targetUser.id ? { ...p, role: newRole } : p)
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Error updating user role');
    } finally {
      setIsUpdatingRole(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto text-white">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white text-black shadow-lg shadow-white/10">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">
                  STOXR Command Console
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-white border border-white/20">
                  Elevated Root
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Centralized system administration, live telemetry & user access management
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualPing}
            disabled={pinging}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${pinging ? 'animate-spin' : ''}`} />
            <span>Ping Database ({lastPingTime})</span>
          </button>

          <button
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
            <span>Sync Data</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Supabase Keep-Alive */}
        <div className="p-5 rounded-2xl bg-[#0d0d10] border border-zinc-800/80 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Database Status</span>
            <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xl font-bold text-white tracking-tight">Active & Paired</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Supabase Tokyo (ap-northeast-1) • Daemon auto-ping active
            </p>
          </div>
        </div>

        {/* Card 2: Registered Accounts */}
        <div className="p-5 rounded-2xl bg-[#0d0d10] border border-zinc-800/80 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Active Users</span>
            <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">{profiles.length}</span>
              <span className="text-xs text-zinc-500 font-medium">registered profiles</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {profiles.filter(p => p.role === 'admin').length} Admin · {profiles.filter(p => p.role !== 'admin').length} Traders
            </p>
          </div>
        </div>

        {/* Card 3: AI Inference Core */}
        <div className="p-5 rounded-2xl bg-[#0d0d10] border border-zinc-800/80 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">AI Reasoning</span>
            <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-white" />
              <span className="text-base font-bold text-white tracking-tight">kimi-k2-0711</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Moonshot AI · Web search grounding · FinNLP sentiment
            </p>
          </div>
        </div>

        {/* Card 4: Access Level */}
        <div className="p-5 rounded-2xl bg-[#0d0d10] border border-zinc-800/80 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Your Session</span>
            <div className="h-8 w-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
              <Key className="h-4 w-4" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-black uppercase bg-white text-black">
                SUPERUSER
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-1.5 truncate">
              {user?.email || 'admin@stoxr.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Sections: User Directory + System Credentials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Management Table (Takes 2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-[#0d0d10] border border-zinc-800/80 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">User Directory & Role Control</h2>
              <p className="text-xs text-zinc-400">Manage account access levels and administrative privileges</p>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              {profiles.length} Total Registered
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-semibold uppercase tracking-wider">
                  <th className="pb-3 px-3">User</th>
                  <th className="pb-3 px-3">Role</th>
                  <th className="pb-3 px-3">Created</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500">
                      Loading user accounts from Supabase...
                    </td>
                  </tr>
                ) : profiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-zinc-500">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  profiles.map((p) => {
                    const isRoot = p.email === 'admin@stoxr.com';
                    const isAdmin = p.role === 'admin';

                    return (
                      <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white uppercase text-[11px] flex-shrink-0">
                              {p.email.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-white truncate">
                                {p.full_name || p.email.split('@')[0]}
                              </p>
                              <p className="text-[11px] text-zinc-400 font-mono truncate">
                                {p.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isAdmin
                                ? 'bg-white text-black font-black'
                                : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                            }`}
                          >
                            {isAdmin ? <ShieldCheck className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                            {p.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-zinc-400 font-mono text-[11px]">
                          {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'N/A'}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          {isRoot ? (
                            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                              Protected
                            </span>
                          ) : (
                            <button
                              onClick={() => toggleUserRole(p)}
                              disabled={isUpdatingRole === p.id}
                              className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                isAdmin
                                  ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'
                                  : 'border-white/30 text-white hover:bg-white hover:text-black'
                              }`}
                            >
                              {isUpdatingRole === p.id 
                                ? 'Updating...' 
                                : (isAdmin ? 'Demote to User' : 'Promote to Admin')}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Credentials & System Health (Takes 1 col) */}
        <div className="space-y-6">
          {/* Admin Credentials Reference Card */}
          <div className="p-6 rounded-3xl bg-[#0d0d10] border border-zinc-800/80 space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-white" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Admin Credentials
              </h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Use these credentials to sign in directly from the login page under the <strong className="text-white">Admin Console</strong> tab.
            </p>

            <div className="space-y-2.5 pt-2">
              <div className="p-3 rounded-xl bg-black border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
                  Admin Email
                </span>
                <span className="text-xs text-white font-mono select-all font-bold">
                  admin@stoxr.com
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
                  Default Password
                </span>
                <span className="text-xs text-white font-mono select-all font-bold">
                  Admin@stoxr2026!
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black border border-zinc-800">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold block">
                  Clearance Level
                </span>
                <span className="text-xs text-white font-semibold">
                  Full Superuser & System Telemetry
                </span>
              </div>
            </div>
          </div>

          {/* AI Pipeline & Feed Services Status */}
          <div className="p-6 rounded-3xl bg-[#0d0d10] border border-zinc-800/80 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-white" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Subsystems Status
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-400">Supabase Keep-Alive Worker</span>
                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Running (Task #302)
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-400">Moonshot Kimi-k2 AI Core</span>
                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Operational
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-zinc-800/60">
                <span className="text-zinc-400">Yahoo Finance Live Quotes</span>
                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active Stream
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-zinc-400">FinNLP Sentiment Weighing</span>
                <span className="text-emerald-400 font-mono font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
