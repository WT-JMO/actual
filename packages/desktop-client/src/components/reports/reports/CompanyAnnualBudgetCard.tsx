import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { send } from '@actual-app/core/platform/client/connection';
import * as monthUtils from '@actual-app/core/shared/months';
import type { CompanyAnnualBudgetWidget } from '@actual-app/core/types/models';

import { useAccounts } from '#hooks/useAccounts';
import { useCategories } from '#hooks/useCategories';
import { useFormat } from '#hooks/useFormat';
import { NON_DRAGGABLE_AREA_CLASS_NAME } from '../constants';
import { ReportCard } from '../ReportCard';

type Props = {
  widgetId: string;
  isEditing?: boolean;
  meta?: CompanyAnnualBudgetWidget['meta'];
  onMetaChange: (meta: CompanyAnnualBudgetWidget['meta']) => void;
};

type Amounts = Record<string, Record<string, number>>;

export function CompanyAnnualBudgetCard({
  widgetId,
  isEditing,
  meta,
  onMetaChange,
}: Props) {
  const { t } = useTranslation();
  const format = useFormat();
  const year = meta?.year ?? Number(monthUtils.currentMonth().slice(0, 4));

  const accounts = useAccounts().data ?? [];
  const companies = accounts.filter(
    account => !account.closed && !account.offbudget && !account.tombstone,
  );
  const companyIds = JSON.stringify(companies.map(company => company.id));

  const { data: categoryData } = useCategories();
  const categories = (categoryData?.grouped ?? []).flatMap(
    group => group.categories ?? [],
  );

  const [amounts, setAmounts] = useState<Amounts>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const results = await Promise.all(
          companies.map(async company => ({
            accountId: company.id,
            rows: await send('budget/company-annual-budget', {
              accountId: company.id,
              year,
            }),
          })),
        );

        if (cancelled) return;

        const next: Amounts = {};
        for (const result of results) {
          next[result.accountId] = {};
          for (const row of result.rows) {
            next[result.accountId][row.categoryId] = row.amount;
          }
        }
        setAmounts(next);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [year, companyIds]);

  const amountFor = (accountId: string, categoryId: string) =>
    amounts[accountId]?.[categoryId] ?? 0;

  const companyTotal = (accountId: string) =>
    categories.reduce(
      (total, category) => total + amountFor(accountId, category.id),
      0,
    );

  const categoryTotal = (categoryId: string) =>
    companies.reduce(
      (total, company) => total + amountFor(company.id, categoryId),
      0,
    );

  const grandTotal = companies.reduce(
    (total, company) => total + companyTotal(company.id),
    0,
  );

  const changeYear = (nextYear: number) => {
    onMetaChange({ ...(meta ?? {}), year: nextYear });
  };

  return (
    <ReportCard widgetId={widgetId} isEditing={isEditing}>
      <div style={{ padding: 12, height: '100%', overflow: 'auto' }}>
        <div
          className={NON_DRAGGABLE_AREA_CLASS_NAME}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            gap: 12,
          }}
        >
          <strong>{meta?.name || t('Company Annual Budget')}</strong>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" onClick={() => changeYear(year - 1)}>
              ‹
            </button>
            <strong>{year}</strong>
            <button type="button" onClick={() => changeYear(year + 1)}>
              ›
            </button>
          </div>
        </div>

        {loading ? (
          <div>{t('Loading...')}</div>
        ) : error ? (
          <div role="alert">{error}</div>
        ) : (
          <table
            className={NON_DRAGGABLE_AREA_CLASS_NAME}
            style={{
              borderCollapse: 'collapse',
              width: '100%',
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>
                  {t('Company')}
                </th>
                {categories.map(category => (
                  <th
                    key={category.id}
                    style={{ textAlign: 'right', padding: 8 }}
                  >
                    {category.name}
                  </th>
                ))}
                <th style={{ textAlign: 'right', padding: 8 }}>{t('Total')}</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(company => (
                <tr key={company.id}>
                  <th style={{ textAlign: 'left', padding: 8 }}>
                    {company.name}
                  </th>
                  {categories.map(category => (
                    <td
                      key={category.id}
                      style={{ textAlign: 'right', padding: 8 }}
                    >
                      {format(amountFor(company.id, category.id), 'financial')}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', padding: 8 }}>
                    <strong>
                      {format(companyTotal(company.id), 'financial')}
                    </strong>
                  </td>
                </tr>
              ))}
              <tr>
                <th style={{ textAlign: 'left', padding: 8 }}>{t('Total')}</th>
                {categories.map(category => (
                  <td
                    key={category.id}
                    style={{ textAlign: 'right', padding: 8 }}
                  >
                    <strong>
                      {format(categoryTotal(category.id), 'financial')}
                    </strong>
                  </td>
                ))}
                <td style={{ textAlign: 'right', padding: 8 }}>
                  <strong>{format(grandTotal, 'financial')}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </ReportCard>
  );
}
