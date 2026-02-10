'use client';

import { useSubscription, SubscriptionTier } from '@/hooks/useSubscription';
import { useToolAccess } from '@/hooks/useToolAccess';
import { PricingTable } from '@/components/subscriptions/PricingTable';

export default function SubscriptionPage() {
  const { subscription, summary, isLoading } = useSubscription();
  const { aiCredits, accessibleTools } = useToolAccess();

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const tier = summary?.tier || SubscriptionTier.FREE;
  
  const tierInfo: Record<SubscriptionTier, { name: string; color: string; bgColor: string }> = {
    [SubscriptionTier.FREE]: { 
      name: 'Free', 
      color: 'text-gray-600 dark:text-gray-400',
      bgColor: 'bg-gray-100 dark:bg-gray-800'
    },
    [SubscriptionTier.STARTER]: { 
      name: 'Starter', 
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30'
    },
    [SubscriptionTier.PROFESSIONAL]: { 
      name: 'Professional', 
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30'
    },
    [SubscriptionTier.ENTERPRISE]: { 
      name: 'Enterprise', 
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30'
    },
  };

  const currentTierInfo = tierInfo[tier];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-bold text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-page-title)' }}>
          Subscription & Billing
        </h1>
        <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1" style={{ fontSize: 'var(--text-page-subtitle)' }}>
          Manage your school&apos;s subscription plan and billing
        </p>
      </div>

      {/* Current Plan Card */}
      <div className={`${currentTierInfo.bgColor} rounded-2xl border-4 border-gray-50 dark:border-dark-border bg-blue-50 dark:bg-dark-surface p-6 mb-8`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Plan</p>
            <h2 className={`text-3xl font-bold ${currentTierInfo.color}`}>
              {currentTierInfo.name}
            </h2>
            {subscription?.endDate && (
              <p className="text-light-text-secondary dark:text-dark-text-secondary mt-1" style={{ fontSize: 'var(--text-small)' }}>
                Renews on {new Date(subscription.endDate).toLocaleDateString()}
              </p>
            )}
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-6">
            {/* AI Credits */}
            <div className="text-center">
              <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-small)' }}>AI Credits</p>
              <p className={`font-bold ${currentTierInfo.color}`} style={{ fontSize: 'var(--text-stat-value)' }}>
                {aiCredits.remaining === -1 ? '♾️' : aiCredits.remaining}
                {aiCredits.total > 0 && aiCredits.total !== -1 && (
                  <span className="font-normal text-light-text-muted dark:text-dark-text-muted" style={{ fontSize: 'var(--text-body)' }}>/{aiCredits.total}</span>
                )}
              </p>
            </div>
            
            {/* Admin Slots */}
            <div className="text-center">
              <p className="text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-small)' }}>Admin Slots</p>
              <p className={`font-bold ${currentTierInfo.color}`} style={{ fontSize: 'var(--text-stat-value)' }}>
                {summary?.limits.maxAdmins === -1 ? '♾️' : summary?.limits.maxAdmins}
              </p>
            </div>
            
            {/* Active Tools */}
            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Tools</p>
              <p className={`text-2xl font-bold ${currentTierInfo.color}`}>
                {accessibleTools.length}
              </p>
            </div>
          </div>
        </div>

        {/* Active Tools List */}
        {accessibleTools.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-dark-border">
            <p className="text-light-text-secondary dark:text-dark-text-secondary mb-3" style={{ fontSize: 'var(--text-small)' }}>Active Tools</p>
            <div className="flex flex-wrap gap-2">
              {accessibleTools.map((tool) => (
                <span
                  key={tool.slug}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm"
                >
                  {tool.name}
                  {tool.status === 'TRIAL' && (
                    <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">(Trial)</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pricing Section */}
      <div className="mb-8">
        <h2 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-2" style={{ fontSize: 'var(--text-section-title)' }}>
          {tier === SubscriptionTier.FREE ? 'Upgrade Your Plan' : 'Available Plans'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          {tier === SubscriptionTier.FREE 
            ? 'Unlock powerful tools to enhance your school management'
            : 'Compare plans and upgrade to unlock more features'
          }
        </p>
        
        <PricingTable />
      </div>

      {/* FAQ Section */}
      <div className="bg-blue-50 dark:bg-dark-surface rounded-2xl border-4 border-gray-50 dark:border-dark-border p-6">
        <h2 className="font-semibold text-light-text-primary dark:text-dark-text-primary mb-4" style={{ fontSize: 'var(--text-section-title)' }}>
          Frequently Asked Questions
        </h2>
        
        <div className="space-y-4">
          <details className="group">
            <summary className="flex justify-between items-center cursor-pointer list-none py-3 border-b border-gray-100 dark:border-dark-border">
              <span className="font-medium text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                What happens when I upgrade?
              </span>
              <span className="text-light-text-muted dark:text-dark-text-muted group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <p className="py-3 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-body)' }}>
              Your new plan activates immediately after payment. You&apos;ll get instant access to all included tools and your AI credits will be updated to the new tier&apos;s allocation.
            </p>
          </details>

          <details className="group">
            <summary className="flex justify-between items-center cursor-pointer list-none py-3 border-b border-gray-100 dark:border-dark-border">
              <span className="font-medium text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                Can I downgrade my plan?
              </span>
              <span className="text-light-text-muted dark:text-dark-text-muted group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <p className="py-3 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-body)' }}>
              Yes, you can downgrade at any time. Your current plan will remain active until the end of the billing period, then switch to the lower tier.
            </p>
          </details>

          <details className="group">
            <summary className="flex justify-between items-center cursor-pointer list-none py-3 border-b border-gray-100 dark:border-dark-border">
              <span className="font-medium text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                What are AI Credits?
              </span>
              <span className="text-light-text-muted dark:text-dark-text-muted group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <p className="py-3 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-body)' }}>
              AI Credits are used for AI-powered features like generating flashcards, lesson plans, and grading essays. Credits reset monthly. You can purchase additional credits if needed.
            </p>
          </details>

          <details className="group">
            <summary className="flex justify-between items-center cursor-pointer list-none py-3 border-b border-gray-100 dark:border-dark-border">
              <span className="font-medium text-light-text-primary dark:text-dark-text-primary" style={{ fontSize: 'var(--text-body)' }}>
                How do I contact support?
              </span>
              <span className="text-light-text-muted dark:text-dark-text-muted group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <p className="py-3 text-light-text-secondary dark:text-dark-text-secondary" style={{ fontSize: 'var(--text-body)' }}>
              Email us at <a href="mailto:support@agora.ng" className="text-blue-600 dark:text-blue-400 hover:underline">support@agora.ng</a> or use the chat widget in the bottom right corner.
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}


















