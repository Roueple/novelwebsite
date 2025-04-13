// src/hooks/use-reading-preferences.ts
import { useState, useEffect, useRef, RefObject } from 'react';

type TextSize = 'sm' | 'md' | 'lg' | 'xl';
type ThemeOption = 'default' | 'sepia' | 'dark' | 'night' | 'forest' | 'ocean';

interface ReadingPreferences {
  textSize: TextSize;
  effectsEnabled: boolean;
  animationsEnabled: boolean;
  theme: ThemeOption;
  fontFamily: string;
  lineSpacing: number;
  pageMargins: number;
}

const DEFAULT_PREFERENCES: ReadingPreferences = {
  textSize: 'md',
  effectsEnabled: true,
  animationsEnabled: true,
  theme: 'default',
  fontFamily: 'serif',
  lineSpacing: 1.6,
  pageMargins: 16,
};

export function useReadingPreferences() {
  // Main preferences state
  const [preferences, setPreferences] = useState<ReadingPreferences>(DEFAULT_PREFERENCES);
  
  // UI state
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  // Use explicit type assertion to fix the RefObject issue
  const settingsMenuRef = useRef<HTMLDivElement>(null) as RefObject<HTMLDivElement>;

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedPreferences = localStorage.getItem('readingPreferences');
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }
    } catch (error) {
      console.error('Error loading reading preferences:', error);
      // Fallback to defaults on error
      setPreferences(DEFAULT_PREFERENCES);
    }
    
    // Setup click outside listener for settings menu
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('readingPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving reading preferences:', error);
    }
  }, [preferences]);

  // Convenience methods for changing specific preferences
  const updatePreference = <K extends keyof ReadingPreferences>(
    key: K, 
    value: ReadingPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Common preference updaters
  const changeTextSize = (size: TextSize) => updatePreference('textSize', size);
  const toggleEffects = () => updatePreference('effectsEnabled', !preferences.effectsEnabled);
  const toggleAnimations = () => updatePreference('animationsEnabled', !preferences.animationsEnabled);
  const changeTheme = (theme: ThemeOption) => updatePreference('theme', theme);
  const changeFontFamily = (fontFamily: string) => updatePreference('fontFamily', fontFamily);
  const changeLineSpacing = (spacing: number) => updatePreference('lineSpacing', spacing);
  const changePageMargins = (margins: number) => updatePreference('pageMargins', margins);

  // Reset to defaults
  const resetPreferences = () => setPreferences(DEFAULT_PREFERENCES);

  return {
    // Preference values
    ...preferences,
    
    // UI state
    showSettingsMenu,
    settingsMenuRef,
    setShowSettingsMenu,
    
    // Updater methods
    changeTextSize,
    toggleEffects,
    toggleAnimations,
    changeTheme,
    changeFontFamily,
    changeLineSpacing,
    changePageMargins,
    resetPreferences,
  };
}