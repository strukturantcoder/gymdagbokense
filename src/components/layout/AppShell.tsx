import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children?: ReactNode;
  /** Custom className for the outer container */
  className?: string;
  /** Whether to show loading state */
  loading?: boolean;
  /** Custom loading component */
  loadingComponent?: ReactNode;
}

/**
 * AppShell - Global layout wrapper for authenticated app pages.
 * 
 * Provides consistent:
 * - Full viewport height with dvh for mobile
 * - Background color from design system
 * - Flex column layout
 * - Overflow-x hidden to prevent horizontal scroll
 * 
 * Usage:
 * ```tsx
 * <AppShell>
 *   <AppShell.Header>...</AppShell.Header>
 *   <AppShell.Main>...</AppShell.Main>
 * </AppShell>
 * ```
 */
export function AppShell({ children, className, loading, loadingComponent }: AppShellProps) {
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        {loadingComponent || (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        )}
      </div>
    );
  }

  return (
    <div className={cn('min-h-[100dvh] bg-background flex flex-col overflow-x-hidden', className)}>
      {children}
    </div>
  );
}

interface AppShellHeaderProps {
  children: ReactNode;
  className?: string;
}

/**
 * AppShell.Header - Consistent page header with border and shrink behavior.
 */
function AppShellHeader({ children, className }: AppShellHeaderProps) {
  return (
    <header className={cn('border-b border-border bg-card shrink-0', className)}>
      {children}
    </header>
  );
}

interface AppShellMainProps {
  children: ReactNode;
  className?: string;
  /** Whether content should scroll (default: true) */
  scrollable?: boolean;
  /** Padding variant */
  padding?: 'default' | 'none' | 'compact';
}

/**
 * AppShell.Main - Main content area with consistent padding and scroll behavior.
 */
function AppShellMain({ 
  children, 
  className, 
  scrollable = true,
  padding = 'default' 
}: AppShellMainProps) {
  const paddingClasses = {
    default: 'px-3 py-3 md:px-4 md:py-4 pb-20 md:pb-4',
    compact: 'px-2 py-1.5 md:px-4 md:py-2 pb-16 md:pb-2',
    none: '',
  };

  return (
    <main 
      className={cn(
        'flex-1',
        scrollable && 'overflow-y-auto overflow-x-hidden',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </main>
  );
}

// Attach sub-components
AppShell.Header = AppShellHeader;
AppShell.Main = AppShellMain;
