import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  User,
  Bell,
  Shield,
  Globe,
  Smartphone,
  Mail,
  Key,
  Download,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWatchlist } from "@/contexts/WatchlistContext";
import { useSettings, type DisplayDensity } from "@/contexts/SettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function Settings() {
  const { user, profile, isAdmin, role, refreshProfile } = useAuth();
  const { bookmarkedSignals } = useWatchlist();
  const { settings, updateSetting, updateMultipleSettings } = useSettings();

  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Dialog states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  // Sync with auth user on mount or user change
  useEffect(() => {
    if (user || profile) {
      const fullName = profile?.full_name || user?.user_metadata?.full_name || "";
      const parts = fullName.trim().split(" ");
      const firstName = parts[0] || (user?.email ? user.email.split("@")[0] : "Trader");
      const lastName = parts.slice(1).join(" ") || "";

      updateMultipleSettings({
        firstName: settings.firstName && settings.firstName !== "Trader" ? settings.firstName : firstName,
        lastName: settings.lastName ? settings.lastName : lastName,
        email: user?.email || settings.email,
      });
    }
  }, [user, profile]);

  // Update specific setting field
  const updateField = <K extends keyof typeof settings>(field: K, value: typeof settings[K]) => {
    updateSetting(field, value);
  };

  // Handle Save Changes
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // 1. Persist to localStorage
      localStorage.setItem("stoxr_user_settings", JSON.stringify(settings));

      // 2. Persist profile update to Supabase if authenticated
      if (user?.id) {
        const combinedName = `${settings.firstName} ${settings.lastName}`.trim();
        
        // Update user auth metadata
        await supabase.auth.updateUser({
          data: { full_name: combinedName }
        });

        // Update profiles table if it exists
        try {
          await supabase
            .from("profiles")
            .update({ full_name: combinedName, updated_at: new Date().toISOString() })
            .eq("id", user.id);
        } catch (dbErr) {
          console.warn("Could not update profiles table directly:", dbErr);
        }

        if (refreshProfile) {
          await refreshProfile();
        }
      }

      toast.success("Settings and preferences saved successfully!");
    } catch (err: any) {
      console.error("Failed to save settings:", err);
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Password Update
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password updated successfully!");
      setIsPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error("Password change failed:", err);
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Push Notification Toggle
  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          updateField("pushDelivery", true);
          new Notification("STOXR Terminal", {
            body: "Live market alerts and AI trade signals are now active.",
            icon: "/stoxr-icon.png",
          });
          toast.success("Browser push notifications enabled!");
          return;
        } else {
          toast.error("Push notification permission was denied in browser.");
          updateField("pushDelivery", false);
          return;
        }
      } else if (Notification.permission === "denied") {
        toast.error("Push notifications are blocked in your browser settings.");
        updateField("pushDelivery", false);
        return;
      }
    }
    updateField("pushDelivery", enabled);
  };

  // Handle Copy API Key
  const handleCopyApiKey = () => {
    navigator.clipboard.writeText(settings.apiKey);
    setCopiedKey(true);
    toast.success("API key copied to clipboard!");
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Handle Regenerate API Key
  const handleRegenerateApiKey = () => {
    const randomHex = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const newKey = `stoxr_live_${randomHex}`;
    updateField("apiKey", newKey);
    toast.success("New API key generated! Click 'Save Changes' to commit.");
  };

  // Handle Download Account Data
  const handleDownloadData = () => {
    const exportData = {
      user: {
        id: user?.id,
        email: settings.email,
        name: `${settings.firstName} ${settings.lastName}`.trim(),
        role: role,
        tier: isAdmin ? "Institutional Admin" : "Pro Trader",
      },
      preferences: settings,
      watchlist: bookmarkedSignals,
      exportedAt: new Date().toISOString(),
      platform: "STOXR Terminal 2.0",
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stoxr-account-data-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Account data exported successfully!");
  };

  return (
    <div className="space-y-6 p-4 md:p-8 min-h-screen bg-[#09090b] text-[#f4f4f5]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings</h1>
            <Badge
              variant="outline"
              className={
                isAdmin
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs py-0.5 px-2.5 font-bold"
                  : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs py-0.5 px-2.5 font-bold"
              }
            >
              {isAdmin ? "EXECUTIVE ADMIN" : "PRO TRADER"}
            </Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Configure your autonomous execution preferences, notification delivery, and terminal parameters.
          </p>
        </div>

        {/* Top Save Button */}
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl px-6 py-2 h-10 transition-all flex items-center gap-2 shadow-lg shadow-white/5"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/20 border-t-black" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Settings Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card className="rounded-2xl border-zinc-800 bg-[#0d0d10] shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-white text-lg">
                <User className="w-5 h-5 text-zinc-400" />
                <span>Account Profile</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Personal identity and localized market exchange defaults.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs text-zinc-400">First Name</Label>
                  <Input
                    id="firstName"
                    value={settings.firstName}
                    onChange={(e) => updateField("firstName", e.target.value)}
                    className="rounded-xl bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs text-zinc-400">Last Name</Label>
                  <Input
                    id="lastName"
                    value={settings.lastName}
                    onChange={(e) => updateField("lastName", e.target.value)}
                    className="rounded-xl bg-zinc-900 border-zinc-800 text-white focus:border-zinc-500 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-zinc-400">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  disabled
                  className="rounded-xl bg-zinc-900/50 border-zinc-800 text-zinc-400 cursor-not-allowed text-sm"
                />
                <span className="text-[11px] text-zinc-500">Managed via verified Supabase authentication.</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="timezone" className="text-xs text-zinc-400">Trading Timezone</Label>
                  <Select
                    value={settings.timezone}
                    onValueChange={(val) => updateField("timezone", val)}
                  >
                    <SelectTrigger className="rounded-xl bg-zinc-900 border-zinc-800 text-white text-sm">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</SelectItem>
                      <SelectItem value="America/New_York">America/New York (EST -5:00)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los Angeles (PST -8:00)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT +0:00)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST +9:00)</SelectItem>
                      <SelectItem value="UTC">UTC (Universal Time)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="currency" className="text-xs text-zinc-400">Default Currency</Label>
                  <Select
                    value={settings.currency}
                    onValueChange={(val) => updateField("currency", val)}
                  >
                    <SelectTrigger className="rounded-xl bg-zinc-900 border-zinc-800 text-white text-sm">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="inr">INR (₹) - Indian Rupee</SelectItem>
                      <SelectItem value="usd">USD ($) - US Dollar</SelectItem>
                      <SelectItem value="eur">EUR (€) - Euro</SelectItem>
                      <SelectItem value="gbp">GBP (£) - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="rounded-2xl border-zinc-800 bg-[#0d0d10] shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-white text-lg">
                <Bell className="w-5 h-5 text-zinc-400" />
                <span>Market Alerts & Notifications</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Choose which signals trigger real-time alerts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-white">High Confidence Signals (85%+ AI Score)</div>
                    <div className="text-xs text-zinc-400">
                      Immediate alert when an institutional breakout signal exceeds 85% probability.
                    </div>
                  </div>
                  <Switch
                    checked={settings.highConfidenceAlerts}
                    onCheckedChange={(checked) => updateField("highConfidenceAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-white">Market Event & Catalyst Alerts</div>
                    <div className="text-xs text-zinc-400">
                      Major macro economic events, RBI/FED rate decisions, and quarterly earnings.
                    </div>
                  </div>
                  <Switch
                    checked={settings.marketAlerts}
                    onCheckedChange={(checked) => updateField("marketAlerts", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-white">Watchlist & Portfolio Price Movements</div>
                    <div className="text-xs text-zinc-400">
                      Alerts when stocks in your watchlist move more than ±2.0% in 24 hours.
                    </div>
                  </div>
                  <Switch
                    checked={settings.portfolioUpdates}
                    onCheckedChange={(checked) => updateField("portfolioUpdates", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm text-white">Weekly Performance Summary</div>
                    <div className="text-xs text-zinc-400">
                      Comprehensive trade performance and AI sentiment recap delivered every Sunday.
                    </div>
                  </div>
                  <Switch
                    checked={settings.weeklySummary}
                    onCheckedChange={(checked) => updateField("weeklySummary", checked)}
                  />
                </div>
              </div>

              {/* Delivery Channels */}
              <div className="pt-4 border-t border-zinc-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                  Delivery Channels
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3.5 border border-zinc-800 bg-zinc-900/60 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-white" />
                      <div>
                        <div className="text-xs font-semibold text-white">Email Digest</div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[130px]">
                          {settings.email || "Active address"}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={settings.emailDelivery}
                      onCheckedChange={(checked) => updateField("emailDelivery", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 border border-zinc-800 bg-zinc-900/60 rounded-xl">
                    <div className="flex items-center space-x-3">
                      <Smartphone className="w-5 h-5 text-white" />
                      <div>
                        <div className="text-xs font-semibold text-white">Browser Push</div>
                        <div className="text-[11px] text-zinc-400">Instant desktop popups</div>
                      </div>
                    </div>
                    <Switch
                      checked={settings.pushDelivery}
                      onCheckedChange={handlePushToggle}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display & Terminal Preferences */}
          <Card className="rounded-2xl border-zinc-800 bg-[#0d0d10] shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2 text-white text-lg">
                <Globe className="w-5 h-5 text-zinc-400" />
                <span>Terminal Display & UX</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Customize data density and graphical aesthetics.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="density" className="text-xs text-zinc-400">Dashboard Layout Density</Label>
                <Select
                  value={settings.displayDensity}
                  onValueChange={(val: DisplayDensity) => {
                    updateSetting("displayDensity", val);
                    toast.success(`Dashboard layout set to ${val.toUpperCase()}`);
                  }}
                >
                  <SelectTrigger className="rounded-xl bg-zinc-900 border-zinc-800 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    <SelectItem value="compact">Compact (High density for multi-monitor)</SelectItem>
                    <SelectItem value="comfortable">Comfortable (Standard balanced view)</SelectItem>
                    <SelectItem value="spacious">Spacious (Relaxed card padding)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="font-semibold text-sm text-white">Show AI Confidence Badges</div>
                  <div className="text-xs text-zinc-400">
                    Display quantitative percentage scores across signal cards and leaderboards.
                  </div>
                </div>
                <Switch
                  checked={settings.showConfidenceScores}
                  onCheckedChange={(checked) => {
                    updateSetting("showConfidenceScores", checked);
                    toast.success(checked ? "AI Confidence scores enabled" : "AI Confidence scores hidden");
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-white">Smooth Transitions & Interactive Hover</div>
                  <div className="text-xs text-zinc-400">
                    Enable hardware-accelerated animations and glowing focus rings.
                  </div>
                </div>
                <Switch
                  checked={settings.animateTransitions}
                  onCheckedChange={(checked) => {
                    updateSetting("animateTransitions", checked);
                    toast.success(checked ? "Smooth animations & hover enabled" : "Instant mode / Reduced motion enabled");
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Right Column */}
        <div className="space-y-6">
          {/* Security & Access */}
          <Card className="rounded-2xl border-zinc-800 bg-[#0d0d10] shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-white text-lg">
                <Shield className="w-5 h-5 text-zinc-400" />
                <span>Security & Credentials</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-white">Two-Factor Authentication</div>
                  <div className="text-[11px] text-zinc-400">TOTP Authenticator app sync</div>
                </div>
                <Switch
                  checked={settings.twoFactorAuth}
                  onCheckedChange={(checked) => {
                    updateField("twoFactorAuth", checked);
                    toast.success(checked ? "2FA enabled for next login" : "2FA disabled");
                  }}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-white">Algorithmic API Access</div>
                  <div className="text-[11px] text-zinc-400">REST endpoint authorization</div>
                </div>
                <Switch
                  checked={settings.apiKeyEnabled}
                  onCheckedChange={(checked) => updateField("apiKeyEnabled", checked)}
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full rounded-xl border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsApiKeyModalOpen(true)}
                  className="w-full rounded-xl border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>View API Credentials</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={handleDownloadData}
                  className="w-full rounded-xl border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Account Data (JSON)</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="flex justify-end pt-4 border-t border-zinc-800">
        <Button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl px-8 py-2.5 h-11 transition-all flex items-center gap-2 shadow-xl shadow-white/5"
        >
          {isSaving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-black/20 border-t-black" />
              <span>Saving Preferences...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </Button>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="bg-[#121215] border-zinc-800 text-white rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-white font-bold">
              <Lock className="w-5 h-5 text-white" />
              Change Password
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Enter your new password below. It must be at least 6 characters long.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdatePassword} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-pass" className="text-xs text-zinc-300">New Password</Label>
              <div className="relative">
                <Input
                  id="new-pass"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="rounded-xl bg-zinc-900 border-zinc-800 text-white pr-10 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-pass" className="text-xs text-zinc-300">Confirm New Password</Label>
              <Input
                id="confirm-pass"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="rounded-xl bg-zinc-900 border-zinc-800 text-white text-sm"
                required
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPasswordModalOpen(false)}
                className="rounded-xl border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isUpdatingPassword}
                className="rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold"
              >
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View API Credentials Dialog */}
      <Dialog open={isApiKeyModalOpen} onOpenChange={setIsApiKeyModalOpen}>
        <DialogContent className="bg-[#121215] border-zinc-800 text-white rounded-2xl max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg text-white font-bold">
              <Key className="w-5 h-5 text-white" />
              Algorithmic API Credentials
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Use this secret key to authenticate automated trading scripts and webhook receivers.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Secret Live API Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={settings.apiKey}
                  className="rounded-xl bg-zinc-950 font-mono text-xs border-zinc-800 text-emerald-400"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleCopyApiKey}
                  className="rounded-xl border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-white flex-shrink-0"
                  title="Copy Key"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <div className="font-semibold text-white">Endpoint Base URL:</div>
              <code className="text-[11px] text-zinc-300 block bg-zinc-950 p-1.5 rounded-lg border border-zinc-800 font-mono">
                https://api.stoxr.com/v1/signals
              </code>
            </div>

            <DialogFooter className="pt-2 flex justify-between sm:justify-between items-center w-full">
              <Button
                type="button"
                variant="outline"
                onClick={handleRegenerateApiKey}
                className="rounded-xl border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Roll Key</span>
              </Button>
              <Button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
