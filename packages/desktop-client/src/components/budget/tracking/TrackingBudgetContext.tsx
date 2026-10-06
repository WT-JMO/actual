import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import * as monthUtils from '@actual-app/core/shared/months';

type TrackingBudgetContextDefinition = {
  summaryCollapsed: boolean;
  onBudgetAction: (month: string, action: string, arg?: unknown) => void;
  onToggleSummaryCollapse: () => void;
  currentMonth: string;
  canEditBudgeted: boolean;
};

const TrackingBudgetContext = createContext<TrackingBudgetContextDefinition>({
  summaryCollapsed: false,
  onBudgetAction: () => {
    throw new Error('Unitialised context method called: onBudgetAction');
  },
  onToggleSummaryCollapse: () => {
    throw new Error(
      'Unitialised context method called: onToggleSummaryCollapse',
    );
  },
  currentMonth: 'unknown',
  canEditBudgeted: true,
});

type TrackingBudgetProviderProps = Omit<
  TrackingBudgetContextDefinition,
  'currentMonth'
> & {
  children: ReactNode;
};
export function TrackingBudgetProvider({
  summaryCollapsed,
  onBudgetAction,
  onToggleSummaryCollapse,
  canEditBudgeted,
  children,
}: TrackingBudgetProviderProps) {
  const currentMonth = monthUtils.currentMonth();

  return (
    <TrackingBudgetContext.Provider
      value={{
        currentMonth,
        summaryCollapsed,
        onBudgetAction,
        onToggleSummaryCollapse,
        canEditBudgeted,
      }}
    >
      {children}
    </TrackingBudgetContext.Provider>
  );
}

export function useTrackingBudget() {
  return useContext(TrackingBudgetContext);
}
