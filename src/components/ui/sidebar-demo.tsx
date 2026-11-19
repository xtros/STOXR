"use client";
import React, { useState } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Search,
  Zap,
  Globe,
  Settings as SettingsIcon,
  LogOut,
  Shield,
  ShieldCheck,
  Star,
  Activity,
  Layers,
  PanelLeftClose,
  PanelLeft,
  Newspaper
} from "lucide-react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Watchlist from "@/pages/Watchlist";
import News from "@/pages/News";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";
import { NewsAPITest } from "@/components/newsApiTest";

export function SidebarDemo() {
  const { user, signOut, isAdmin } = useAuth();
  const [open, setOpen] = useState(true);
  const location = useLocation();

  const links = [
    {
      label: "Dashboard",
      href: "/",
      icon: (
        <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
      ),
    },
    {
      label: "Watchlist",
      href: "/watchlist",
      icon: (
        <Star className="h-4 w-4 flex-shrink-0" />
      ),
    },
    {
      label: "Stock News",
      href: "/news",
      icon: (
        <Newspaper className="h-4 w-4 flex-shrink-0" />
      ),
    },
    ...(isAdmin ? [
      {
        label: "Admin Console",
        href: "/admin",
        icon: (
          <ShieldCheck className="h-4 w-4 flex-shrink-0" />
        ),
      }
    ] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  const getInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "xtros";

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row bg-[#09090b] text-white w-full flex-1 mx-auto overflow-hidden",
        "h-screen w-full"
      )}
    >
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-6 h-full flex flex-col bg-[#0d0d10] border-r border-zinc-800/80">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
            {open ? (
              <Logo onToggle={() => setOpen(false)} />
            ) : (
              <LogoIcon onToggle={() => setOpen(true)} />
            )}
            
            <div className="mt-6 flex flex-col gap-1.5">
              {links.map((link, idx) => {
                const isActive = location.pathname === link.href;
                return (
                  <SidebarLink
                    key={idx}
                    link={link}
                    className={cn(
                      "px-3 py-2.5 rounded-2xl transition-all duration-200 flex items-center gap-3",
                      isActive
                        ? "bg-white text-black font-bold shadow-md shadow-white/5 [&_svg]:text-black"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 font-medium [&_svg]:text-zinc-400 hover:[&_svg]:text-white"
                    )}
                  />
                );
              })}
            </div>
          </div>

          {/* Bottom user profile & settings */}
          <div className="space-y-2 border-t border-zinc-800/80 pt-4 mt-auto">
            <SidebarLink
              link={{
                label: "Settings",
                href: "/settings",
                icon: (
                  <SettingsIcon className="h-4 w-4 flex-shrink-0" />
                ),
              }}
              className={cn(
                "px-3 py-2.5 rounded-2xl transition-all duration-200 flex items-center gap-3",
                location.pathname === "/settings"
                  ? "bg-white text-black font-bold shadow-md shadow-white/5 [&_svg]:text-black"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 font-medium [&_svg]:text-zinc-400 hover:[&_svg]:text-white"
              )}
            />

            <div className="flex items-center justify-between p-2 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 flex-shrink-0 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white text-xs font-bold uppercase">
                  {user?.email ? getInitials(user.email) : 'XT'}
                </div>
                {open && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate leading-tight">
                      {userName}
                    </p>
                    <span className={`inline-block mt-0.5 text-[9px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded leading-none ${
                      isAdmin ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {isAdmin ? 'ADMIN' : 'TRADER'}
                    </span>
                  </div>
                )}
              </div>

              {open && (
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors ml-1"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>

            {!open && (
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="w-full flex items-center justify-center p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main App Content Viewport */}
      <div className="flex flex-1 overflow-hidden bg-[#09090b]">
        <div className="flex flex-col flex-1 w-full h-full overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/news" element={<News />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/news-test" element={<NewsAPITest />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export const Logo = ({ onToggle }: { onToggle?: () => void }) => {
  return (
    <div className="flex items-center justify-between py-1 relative z-20 w-full pr-1">
      <Link
        to="/"
        className="font-normal flex items-center group"
      >
        <div className="h-7 w-28 flex items-center justify-start flex-shrink-0">
          <img
            src="/stoxr-banner.png"
            alt="STOXR"
            className="h-full w-auto object-contain brightness-125 group-hover:scale-105 transition-transform"
          />
        </div>
      </Link>

      {onToggle && (
        <button
          onClick={onToggle}
          title="Collapse sidebar"
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800/80 transition-colors"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export const LogoIcon = ({ onToggle }: { onToggle?: () => void }) => {
  return (
    <div className="flex flex-col items-center gap-3 py-1 relative z-20">
      <Link
        to="/"
        title="STOXR"
        className="h-9 w-9 bg-black border border-zinc-800 rounded-xl flex items-center justify-center p-1.5 shadow overflow-hidden flex-shrink-0 hover:scale-105 transition-transform"
      >
        <img
          src="/stoxr-icon.png"
          alt="STOXR"
          className="h-full w-full object-contain brightness-125"
        />
      </Link>

      {onToggle && (
        <button
          onClick={onToggle}
          title="Expand sidebar"
          className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-800/80 rounded transition-colors"
        >
          <PanelLeft className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
