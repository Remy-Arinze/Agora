'use client';

import { useSubscription } from './useSubscription';
import { ToolStatus } from '@/lib/store/api/subscriptionsApi';

interface Tool {
  slug: string;
  name: string;
  status?: ToolStatus;
}

interface AICredits {
  remaining: number;
  total: number;
}

interface UseToolAccessReturn {
  aiCredits: AICredits;
  accessibleTools: Tool[];
}

/**
 * Hook to get AI credits and accessible tools based on subscription
 */
export function useToolAccess(): UseToolAccessReturn {
  const { summary } = useSubscription();

  // Get AI credits from subscription summary
  const aiCredits: AICredits = {
    remaining: summary?.aiCreditsRemaining ?? 0,
    total: summary?.aiCredits ?? 0,
  };

  // Get accessible tools from subscription summary (filter by hasAccess)
  const accessibleTools: Tool[] = (summary?.tools ?? [])
    .filter((tool) => tool.hasAccess)
    .map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      status: tool.status,
    }));

  return {
    aiCredits,
    accessibleTools,
  };
}
