import { Injectable, computed, effect, signal } from '@angular/core';

export interface AppTheme {
  name: 'light' | 'dark' | 'system';
  icon: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private appTheme = signal<'light' | 'dark' | 'system'>('system');

  private themes: AppTheme[] = [
    { name: 'light', icon: 'light_mode' },
    { name: 'dark', icon: 'dark_mode' },
    { name: 'system', icon: 'desktop_windows' },
  ];

  selectedTheme = computed(() =>
    this.themes.find((t) => t.name === this.appTheme())
  );

  getThemes() {
    return this.themes;
  }

  setTheme(theme: 'light' | 'dark' | 'system') {
    this.appTheme.set(theme);
  }

  constructor() {
    effect(() => {
      const appTheme = this.appTheme();
      const colorScheme = appTheme === 'system' ? 'light ' : appTheme;
      document.body.style.setProperty('color-scheme', colorScheme);
    });
  }
}
