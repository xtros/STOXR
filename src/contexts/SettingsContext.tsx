import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

export type DisplayDensity = 'compact' | 'comfortable' | 'spacious';

export interface AppSettings {
  firstName: string;
  lastName: string;
  email: string;
  timezone: string;
  currency: string;
  highConfidenceAlerts: boolean;
  marketAlerts: boolean;
  portfolioUpdates: boolean;
  weeklySummary: boolean;
  emailDelivery: boolean;
  pushDelivery: boolean;
  displayDensity: DisplayDensity;
  showConfidenceScores: boolean;
  animateTransitions: boolean;
  twoFactorAuth: boolean;
  apiKeyEnabled: boolean;
  apiKey: string;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  firstName: 'Trader',
  lastName: '',
  email: '',
  timezone: 'Asia/Kolkata',
  currency: 'inr',
  highConfidenceAlerts: true,
  marketAlerts: true,
  portfolioUpdates: true,
  weeklySummary: true,
  emailDelivery: true,
  pushDelivery: false,
  displayDensity: 'comfortable',
  showConfidenceScores: true,
  animateTransitions: true,
  twoFactorAuth: false,
  apiKeyEnabled: true,
  apiKey: 'stoxr_live_9a7d2b8e3c4f5a6b',
};

const STORAGE_KEY = 'stoxr_user_settings';

interface SettingsContextType {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateMultipleSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_APP_SETTINGS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage:', e);
    }
    return DEFAULT_APP_SETTINGS;
  });

  // Apply layout density & motion classes to document.documentElement
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Density attribute
    document.documentElement.setAttribute('data-density', settings.displayDensity);

    // Reduced motion class
    if (!settings.animateTransitions) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [settings.displayDensity, settings.animateTransitions]);

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to persist settings:', e);
      }
      return next;
    });
  };

  const updateMultipleSettings = (updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to persist settings:', e);
      }
      return next;
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_APP_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_APP_SETTINGS));
      toast.success('Settings reset to factory defaults.');
    } catch (e) {
      console.error('Failed to reset settings:', e);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateMultipleSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
