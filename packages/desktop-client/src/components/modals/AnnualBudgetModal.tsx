import React, { useEffect, useMemo, useState } from 'react';
import { useFormat } from '#hooks/useFormat';
import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Select } from '@actual-app/components/select';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import {
  integerToAmount,
  amountToInteger,
} from '@actual-app/core/shared/util';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import { AmountInput } from '#components/mobile/transactions/AmountInput';
import { useCategories } from '#hooks/useCategories';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type AnnualBudgetModalProps = Extract<
  ModalType,
  { name: 'annual-budget' }
>['options'];

export function AnnualBudgetModal({
  accountId,
  companyName,
  year,
  onUpdated,
}: AnnualBudgetModalProps) {
  const dispatch = useDispatch();
  const [selectedYear, setSelectedYear] = useState(year);

  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const format = useFormat();
  const formatAmount = (amount: number) =>
    format(amount, 'financial');
  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [previousYearSpent, setPreviousYearSpent] =
    useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const editable = Boolean(accountId);

  useEffect(() => {
    async function load() {
      const rows = await send('budget/company-annual-budget', {
        accountId,
        year: selectedYear,
      });

      const spentRows = await send('budget/company-annual-spent', {
        accountId,
        year: selectedYear - 1,
      });

      const nextSpent: Record<string, number> = {};

      for (const row of spentRows) {
        nextSpent[row.categoryId] = row.amount;
      }

      setPreviousYearSpent(nextSpent);

      const nextAmounts: Record<string, number> = {};

      for (const row of rows) {
        nextAmounts[row.categoryId] = row.amount;
      }

      setAmounts(nextAmounts);
      setLoading(false);
    }

    void load();
  }, [accountId, selectedYear]);

  const expenseGroups = useMemo(
    () =>
      categoryGroups
        .filter(group => !group.is_income && !group.hidden)
        .map(group => ({
          ...group,
          categories: (group.categories ?? []).filter(
            category => !category.hidden,
          ),
        })),
    [categoryGroups],
  );

  const total = expenseGroups.reduce(
    (groupTotal, group) =>
      groupTotal +
      group.categories.reduce(
        (categoryTotal, category) =>
          categoryTotal + (amounts[category.id] ?? 0),
        0,
      ),
    0,
  );

  const totalPreviousYearSpent = expenseGroups.reduce(
    (groupTotal, group) =>
      groupTotal +
      group.categories.reduce(
        (categoryTotal, category) =>
          categoryTotal + (previousYearSpent[category.id] ?? 0),
        0,
      ),
    0,
  );

  const saveAmount = async (categoryId: string, amount: number) => {
    if (!accountId) {
      return;
    }

    const integerAmount = amountToInteger(amount);

    setAmounts(current => ({
      ...current,
      [categoryId]: integerAmount,
    }));

    await send('budget/company-annual-budget-amount', {
      accountId,
      categoryId,
      year: selectedYear,
      amount: integerAmount,
    });
    onUpdated();
  };

  const usePreviousYear = (
    categoryId: string,
    categoryName: string,
  ) => {
    if (!accountId) {
      return;
    }

    const spent = previousYearSpent[categoryId] ?? 0;
    const currentBudget = amounts[categoryId] ?? 0;

    dispatch(
      pushModal({
        modal: {
          name: 'confirm-delete',
          options: {
            title: 'Confirm Budget Update',
            confirmLabel: 'Confirm',
            message:
              `Use ${selectedYear - 1} spending for "${categoryName}"?\n\n` +
              `Current annual budget: ${formatAmount(currentBudget)}\n` +
              `New annual budget: ${formatAmount(spent)}\n\n` +
              `This will replace the budget for all 12 months of ${selectedYear}.`,
            onConfirm: () => {
              void saveAmount(categoryId, spent / 100);
            },
          },
        },
      }),
    );
  };

  const yearOptions = [
    [String(selectedYear - 2), String(selectedYear - 2)],
    [String(selectedYear - 1), String(selectedYear - 1)],
    [String(selectedYear), String(selectedYear)],
    [String(selectedYear + 1), String(selectedYear + 1)],
    [String(selectedYear + 2), String(selectedYear + 2)],
  ] as [string, string][];
  return (
    <Modal
      name="annual-budget"
      wrapperProps={{
        style: {
          width: 950,
          maxWidth: '95vw',
          maxHeight: '90vh',
        },
      }}
    >
      {({ state }) => (
        <>
           <ModalHeader
             title={
               <ModalTitle
                 title={`Annual Budget — ${companyName}`}
                 shrinkOnOverflow
               />
             }
             rightContent={
               <ModalCloseButton onPress={() => state.close()} />
             }
           />

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 8,
              paddingBottom: 8,
              gap: 10,
            }}
          >
            <Text style={{ fontWeight: 600 }}>Budget year</Text>

            <Select
              aria-label="Select year"
              options={yearOptions}
              value={String(selectedYear)}
              onChange={value => setSelectedYear(Number(value))}
            />
          </View>

          <View
            style={{
              padding: 20,
              gap: 10,
              overflowY: 'auto',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                paddingBottom: 8,
                borderBottom: `1px solid ${theme.tableBorder}`,
              }}
            >
              <Text style={{ flex: 1, fontWeight: 600 }}>
                Category
              </Text>

              <Text
                style={{
                  width: 150,
                  textAlign: 'right',
                  fontWeight: 600,
                }}
              >
                {selectedYear - 1} Spent
              </Text>

              <Text
                style={{
                  width: 160,
                  textAlign: 'right',
                  fontWeight: 600,
                }}
              >
                Annual Budget
              </Text>

              <Text
                style={{
                  width: 130,
                  textAlign: 'right',
                  fontWeight: 600,
                }}
              >
                Monthly
              </Text>
              <Text
                style={{
                  width: 130,
                  textAlign: 'right',
                  fontWeight: 600,
                }}
              >
                Action
              </Text>
            </View>

            {loading ? (
              <Text>Loading…</Text>
            ) : (
            expenseGroups.map(group => (
              <React.Fragment key={group.id}>
                <View
                  style={{
                    paddingTop: 14,
                    paddingBottom: 6,
                    borderBottom: `1px solid ${theme.tableBorder}`,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: 700,
                      color: theme.pageTextSubdued,
                    }}
                  >
                    {group.name}
                  </Text>
                </View>

                {group.categories.map(category => {
                  const annualAmount = amounts[category.id] ?? 0;

                  return (
                    <View
                      key={category.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        minHeight: 42,
                        borderBottom: `1px solid ${theme.tableBorder}`,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontWeight: 500,
                          paddingLeft: 12,
                        }}
                      >
                        {category.name}
                      </Text>

                      <Text
                        style={{
                          width: 150,
                          textAlign: 'right',
                       }}
                      >
                       {formatAmount(previousYearSpent[category.id] ?? 0)}
                     </Text>

                     <View
                       style={{
                         width: 160,
                         alignItems: 'flex-end',
                       }}
                     >
                       {editable ? (
                         <AmountInput
                           value={integerToAmount(annualAmount)}
                           onChange={value => {
                             void saveAmount(category.id, value);
                           }}
                           data-testid={`annual-budget-${category.id}`}
                         />
                       ) : (
                         <Text>{formatAmount(annualAmount)}</Text>
                       )}
                     </View>

                    <Text
                      style={{
                        width: 130,
                        textAlign: 'right',
                     }}
                   >
                     {formatAmount(Math.round(annualAmount / 12))}
                  </Text>
                  <View
                    style={{
                      width: 145,
                      alignItems: 'flex-end',
                      paddingLeft: 15,
                    }}
                  >
                    {editable && (
                      <Button
                        onPress={() =>
                          usePreviousYear(category.id, category.name)
                       }
                     >
                       Use previous year
                    </Button>
                   )}
                </View>
             </View>
            );
         })}
              </React.Fragment>
            ))
            )}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: 12,
                marginTop: 4,
                borderTop: `2px solid ${theme.tableBorder}`,
              }}
            >
              <Text style={{ flex: 1, fontWeight: 700 }}>
                TOTAL
              </Text>

              <Text
                style={{
                  width: 150,
                  textAlign: 'right',
                  fontWeight: 700,
                }}
              >
                {formatAmount(totalPreviousYearSpent)}
              </Text>

              <Text
                style={{
                  width: 160,
                  textAlign: 'right',
                  fontWeight: 700,
                }}
              >
                {formatAmount(total)}
              </Text>

              <Text
                style={{
                  width: 130,
                  textAlign: 'right',
                  fontWeight: 700,
                }}
              >
                {formatAmount(Math.round(total / 12))}
              </Text>
              <View style={{ width: 145 }} />
            </View>
            {!editable && (
              <Text
                style={{
                  color: theme.pageTextSubdued,
                  marginTop: 8,
                }}
              >
                All companies is a consolidated read-only view.
              </Text>
            )}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                paddingTop: 12,
              }}
            >
              <Button onPress={() => state.close()}>
                Close
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
