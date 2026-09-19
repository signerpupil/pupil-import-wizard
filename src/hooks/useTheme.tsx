import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type SiteTheme = 'pupil' | 'seven-education';

const THEME_QUERY_KEY = ['site-setting', 'theme'] as const;
const THEME_CACHE_KEY = 'pupil-site-theme';

function isSiteTheme(value: unknown): value is SiteTheme {
  return value === 'pupil' || value === 'seven-education';
}

function cachedTheme(): SiteTheme {
  if (typeof window === 'undefined') return 'pupil';
  const value = window.localStorage.getItem(THEME_CACHE_KEY);
  return isSiteTheme(value) ? value : 'pupil';
}

interface ThemeContextValue {
  theme: SiteTheme;
  isSevenTheme: boolean;
  isLoading: boolean;
  isSaving: boolean;
  setTheme: (theme: SiteTheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const themeQuery = useQuery({
    queryKey: THEME_QUERY_KEY,
    queryFn: async (): Promise<SiteTheme> => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'theme')
        .maybeSingle();

      if (error) throw error;
      return isSiteTheme(data?.value) ? data.value : 'pupil';
    },
    placeholderData: cachedTheme,
    staleTime: 60_000,
    retry: 1,
  });

  const theme = themeQuery.data ?? 'pupil';

  useEffect(() => {
    window.localStorage.setItem(THEME_CACHE_KEY, theme);
  }, [theme]);

  const mutation = useMutation({
    mutationFn: async (nextTheme: SiteTheme) => {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ key: 'theme', value: nextTheme, updated_at: new Date().toISOString() });
      if (error) throw error;
      return nextTheme;
    },
    onSuccess: (nextTheme) => {
      queryClient.setQueryData(THEME_QUERY_KEY, nextTheme);
    },
  });

  const setTheme = async (nextTheme: SiteTheme) => {
    await mutation.mutateAsync(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isSevenTheme: theme === 'seven-education',
        isLoading: themeQuery.isLoading,
        isSaving: mutation.isPending,
        setTheme,
      }}
    >
      <div className={theme === 'seven-education' ? 'seven-theme min-h-screen' : 'min-h-screen'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
