import { createApp } from '#server/app';
import { aqlQuery } from '#server/aql';
import * as db from '#server/db';
import { APIError } from '#server/errors';
import { categoryGroupModel, categoryModel } from '#server/models';
import { mutator } from '#server/mutators';
import * as sheet from '#server/sheet';
import { resolveName } from '#server/spreadsheet/util';
import { batchMessages } from '#server/sync';
import { undoable } from '#server/undo';
import * as monthUtils from '#shared/months';
import { q } from '#shared/query';
import type { CategoryEntity, CategoryGroupEntity } from '#types/models';

import * as actions from './actions';
import * as budget from './base';
import * as cleanupGroupActions from './cleanup-groups';
import * as cleanupActions from './cleanup-template';
import { storeNoteCleanups } from './cleanup-template-notes';
import * as goalActions from './goal-template';
import { sortCategories } from './sort-categories';
import * as goalNoteActions from './template-notes';

export type BudgetHandlers = {
  'budget/budget-amount': typeof actions.setBudget;
  'budget/copy-previous-month': typeof actions.copyPreviousMonth;
  'budget/copy-single-month': typeof actions.copySinglePreviousMonth;
  'budget/set-zero': typeof actions.setZero;
  'budget/set-3month-avg': typeof actions.set3MonthAvg;
  'budget/set-6month-avg': typeof actions.set6MonthAvg;
  'budget/set-12month-avg': typeof actions.set12MonthAvg;
  'budget/set-n-month-avg': typeof actions.setNMonthAvg;
  'budget/check-templates': typeof goalActions.runCheckTemplates;
  'budget/apply-goal-template': typeof goalActions.applyTemplate;
  'budget/apply-multiple-templates': typeof goalActions.applyMultipleCategoryTemplates;
  'budget/overwrite-goal-template': typeof goalActions.overwriteTemplate;
  'budget/apply-single-template': typeof goalActions.applySingleCategoryTemplate;
  'budget/cleanup-goal-template': typeof cleanupActions.cleanupTemplate;
  'budget/hold-for-next-month': typeof actions.holdForNextMonth;
  'budget/reset-hold': typeof actions.resetHold;
  'budget/cover-overspending': typeof actions.coverOverspending;
  'budget/transfer-available': typeof actions.transferAvailable;
  'budget/cover-overbudgeted': typeof actions.coverOverbudgeted;
  'budget/transfer-category': typeof actions.transferCategory;
  'budget/copy-until-year-end': typeof actions.copyUntilYearEnd;
  'budget/set-carryover': typeof actions.setCategoryCarryover;
  'budget/reset-income-carryover': typeof actions.resetIncomeCarryover;
  'get-categories': typeof getCategories;
  'get-budget-bounds': typeof getBudgetBounds;
  'envelope-budget-month': typeof envelopeBudgetMonth;
  'budget/company-budget-amount': typeof setCompanyBudget;
  'tracking-budget-month': typeof trackingBudgetMonth;
  'category-create': typeof createCategory;
  'category-update': typeof updateCategory;
  'category-move': typeof moveCategory;
  'categories-sort': typeof sortCategories;
  'category-delete': typeof deleteCategory;
  'get-category-groups': typeof getCategoryGroups;
  'category-group-create': typeof createCategoryGroup;
  'category-group-update': typeof updateCategoryGroup;
  'category-group-move': typeof moveCategoryGroup;
  'category-group-delete': typeof deleteCategoryGroup;
  'must-category-transfer': typeof isCategoryTransferRequired;
  'budget/get-category-automations': typeof goalActions.getTemplatesForCategory;
  'budget/set-category-automations': typeof goalActions.storeTemplates;
  'budget/dry-run-category-template': typeof goalActions.dryRunCategoryTemplate;
  'budget/store-note-templates': typeof goalNoteActions.storeNoteTemplates;
  'budget/store-note-cleanups': typeof storeNoteCleanups;
  'budget/render-note-templates': typeof goalNoteActions.unparse;
  'budget/create-cleanup-group': typeof cleanupGroupActions.createCleanupGroup;
  'budget/company-budget-action': typeof applyCompanyBudgetAction;
  'budget/company-budget-month-action':
    typeof applyCompanyBudgetMonthAction;
  'budget/company-annual-budget': typeof getCompanyAnnualBudget;
  'budget/company-annual-spent': typeof getCompanyAnnualSpent;
  'budget/company-annual-budget-amount': typeof setCompanyAnnualBudget;
};

export const app = createApp<BudgetHandlers>();

app.method('budget/budget-amount', mutator(undoable(actions.setBudget)));
app.method(
  'budget/copy-previous-month',
  mutator(undoable(actions.copyPreviousMonth)),
);
app.method(
  'budget/company-budget-month-action',
  applyCompanyBudgetMonthAction,
);
app.method(
  'budget/copy-single-month',
  mutator(undoable(actions.copySinglePreviousMonth)),
);
app.method('budget/set-zero', mutator(undoable(actions.setZero)));
app.method('budget/set-3month-avg', mutator(undoable(actions.set3MonthAvg)));
app.method('budget/set-6month-avg', mutator(undoable(actions.set6MonthAvg)));
app.method('budget/set-12month-avg', mutator(undoable(actions.set12MonthAvg)));
app.method('budget/set-n-month-avg', mutator(undoable(actions.setNMonthAvg)));
app.method(
  'budget/check-templates',
  mutator(undoable(goalActions.runCheckTemplates)),
);
app.method(
  'budget/apply-goal-template',
  mutator(undoable(goalActions.applyTemplate)),
);
app.method(
  'budget/apply-multiple-templates',
  mutator(undoable(goalActions.applyMultipleCategoryTemplates)),
);
app.method(
  'budget/overwrite-goal-template',
  mutator(undoable(goalActions.overwriteTemplate)),
);
app.method(
  'budget/apply-single-template',
  mutator(undoable(goalActions.applySingleCategoryTemplate)),
);
app.method(
  'budget/cleanup-goal-template',
  mutator(undoable(cleanupActions.cleanupTemplate)),
);
app.method(
  'budget/hold-for-next-month',
  mutator(undoable(actions.holdForNextMonth)),
);
app.method('budget/reset-hold', mutator(undoable(actions.resetHold)));
app.method(
  'budget/cover-overspending',
  mutator(undoable(actions.coverOverspending)),
);
app.method(
  'budget/transfer-available',
  mutator(undoable(actions.transferAvailable)),
);
app.method(
  'budget/cover-overbudgeted',
  mutator(undoable(actions.coverOverbudgeted)),
);
app.method(
  'budget/transfer-category',
  mutator(undoable(actions.transferCategory)),
);
app.method(
  'budget/copy-until-year-end',
  mutator(undoable(actions.copyUntilYearEnd)),
);
app.method(
  'budget/set-carryover',
  mutator(undoable(actions.setCategoryCarryover)),
);
app.method(
  'budget/reset-income-carryover',
  mutator(undoable(actions.resetIncomeCarryover)),
);
app.method('get-categories', getCategories);
app.method('get-budget-bounds', getBudgetBounds);
app.method('envelope-budget-month', envelopeBudgetMonth);
app.method('budget/company-budget-amount', setCompanyBudget);
app.method('tracking-budget-month', trackingBudgetMonth);
app.method('category-create', mutator(undoable(createCategory)));
app.method('category-update', mutator(undoable(updateCategory)));
app.method('category-move', mutator(undoable(moveCategory)));
app.method('categories-sort', mutator(undoable(sortCategories)));
app.method('category-delete', mutator(undoable(deleteCategory)));
app.method('get-category-groups', getCategoryGroups);
app.method('category-group-create', mutator(undoable(createCategoryGroup)));
app.method('category-group-update', mutator(undoable(updateCategoryGroup)));
app.method('category-group-move', mutator(undoable(moveCategoryGroup)));
app.method('category-group-delete', mutator(undoable(deleteCategoryGroup)));
app.method('must-category-transfer', isCategoryTransferRequired);

app.method(
  'budget/get-category-automations',
  goalActions.getTemplatesForCategory,
);
app.method(
  'budget/set-category-automations',
  mutator(undoable(goalActions.storeTemplates)),
);
app.method(
  'budget/dry-run-category-template',
  goalActions.dryRunCategoryTemplate,
);
app.method(
  'budget/store-note-templates',
  mutator(goalNoteActions.storeNoteTemplates),
);
app.method('budget/store-note-cleanups', mutator(storeNoteCleanups));
app.method('budget/render-note-templates', goalNoteActions.unparse);
app.method(
  'budget/create-cleanup-group',
  mutator(undoable(cleanupGroupActions.createCleanupGroup)),
);
app.method(
  'budget/company-budget-action',
  applyCompanyBudgetAction,
);

app.method(
  'budget/company-annual-budget',
  getCompanyAnnualBudget,
);

app.method(
  'budget/company-annual-budget-amount',
  setCompanyAnnualBudget,
);

app.method(
  'budget/company-annual-spent',
  getCompanyAnnualSpent,
);

// Server must return AQL entities not the raw DB data
async function getCategories({ hidden }: { hidden?: boolean } = {}) {
  const categoryGroups = await getCategoryGroups({ hidden });
  let list: CategoryEntity[];
  if (hidden === true) {
    // A hidden category can live in a visible group, so when the caller
    // explicitly asks for hidden categories the flat list must look beyond
    // the (already hidden-filtered) groups returned above.
    const { data }: { data: CategoryEntity[] } = await aqlQuery(
      q('categories').filter({ hidden: true }).select('*'),
    );
    list = data;
  } else {
    list = categoryGroups.flatMap(g => g.categories ?? []);
  }
  return {
    grouped: categoryGroups,
    list,
  };
}

async function getBudgetBounds() {
  return await budget.createAllBudgets();
}

async function envelopeBudgetMonth({ month }: { month: string }) {
  const groups = await db.getCategoriesGrouped();
  const sheetName = monthUtils.sheetForMonth(month);

  function value(name: string) {
    const v = sheet.getCellValue(sheetName, name);
    return { value: v === '' ? 0 : v, name: resolveName(sheetName, name) };
  }

  let values = [
    value('available-funds'),
    value('last-month-overspent'),
    value('buffered'),
    value('total-budgeted'),
    value('to-budget'),

    value('from-last-month'),
    value('total-income'),
    value('total-spent'),
    value('total-leftover'),
  ];

  for (const group of groups) {
    const categories = group.categories ?? [];

    if (group.is_income) {
      values.push(value('total-income'));

      for (const cat of categories) {
        values.push(value(`sum-amount-${cat.id}`));
      }
    } else {
      values = values.concat([
        value(`group-budget-${group.id}`),
        value(`group-sum-amount-${group.id}`),
        value(`group-leftover-${group.id}`),
      ]);

      for (const cat of categories) {
        values = values.concat([
          value(`budget-${cat.id}`),
          value(`sum-amount-${cat.id}`),
          value(`leftover-${cat.id}`),
          value(`carryover-${cat.id}`),
          value(`goal-${cat.id}`),
          value(`long-goal-${cat.id}`),
        ]);
      }
    }
  }

  return values;
}

async function applyCompanyBudgetAction({
  accountId,
  categoryId,
  month,
  action,
}: {
  accountId: string;
  categoryId: string;
  month: string;
  action:
    | 'copy-single-last'
    | 'set-single-zero'
    | 'set-single-3-avg'
    | 'set-single-6-avg'
    | 'set-single-12-avg'
    | 'copy-until-year-end';
}) {
  async function getCompanyBudget(targetMonth: string) {
    const rows = db.runQuery<{ amount: number | null }>(
      `
        SELECT amount
        FROM company_budgets
        WHERE account_id = ?
          AND category_id = ?
          AND month = ?
      `,
      [accountId, categoryId, targetMonth],
      true,
    );

    return rows[0]?.amount ?? 0;
  }

  async function saveCompanyBudget(targetMonth: string, amount: number) {
    db.runQuery(
      `
        INSERT INTO company_budgets (
          account_id,
          category_id,
          month,
          amount
        )
        VALUES (?, ?, ?, ?)

        ON CONFLICT(account_id, category_id, month)
        DO UPDATE SET amount = excluded.amount
      `,
      [accountId, categoryId, targetMonth, amount],
      true,
    );
  }

  if (action === 'copy-single-last') {
    const previousMonth = monthUtils.prevMonth(month);
    const amount = await getCompanyBudget(previousMonth);

    await saveCompanyBudget(month, amount);
    return null;
  }

  if (action === 'set-single-zero') {
    await saveCompanyBudget(month, 0);
    return null;
  }

  if (
    action === 'set-single-3-avg' ||
    action === 'set-single-6-avg' ||
    action === 'set-single-12-avg'
  ) {
    const numberOfMonths =
      action === 'set-single-3-avg'
        ? 3
        : action === 'set-single-6-avg'
          ? 6
          : 12;

    const previousMonth = monthUtils.prevMonth(month);

    const firstActivityRows = db.runQuery<{ month: number | null }>(
      `
        SELECT MIN(month) AS month
        FROM (
          SELECT CAST(REPLACE(month, '-', '') AS INTEGER) AS month
          FROM company_budgets
          WHERE account_id = ?
            AND category_id = ?
            AND month <= ?

          UNION ALL

          SELECT CAST(t.date / 100 AS INTEGER) AS month
          FROM v_transactions_internal_alive t
          LEFT JOIN accounts a ON a.id = t.account
          WHERE t.category = ?
            AND t.account = ?
            AND CAST(t.date / 100 AS INTEGER) <= ?
            AND a.offbudget = 0
        )
      `,
      [
        accountId,
        categoryId,
        previousMonth,
        categoryId,
        accountId,
        Number(previousMonth.replace('-', '')),
      ],
      true,
    );

    const firstActivityMonth =
      firstActivityRows[0]?.month != null
        ? String(firstActivityRows[0].month)
        : null;

    const months: string[] = [];
    let current = previousMonth;

    for (let i = 0; i < numberOfMonths; i++) {
      if (
        firstActivityMonth &&
        Number(current.replace('-', '')) < Number(firstActivityMonth)
      ) {
        break;
      }

      months.push(current);
      current = monthUtils.prevMonth(current);
    }

    if (months.length === 0) {
      await saveCompanyBudget(month, 0);
      return null;
    }

    let total = 0;

    for (const averageMonth of months) {
      const { start, end } = monthUtils.bounds(averageMonth);

      const rows = db.runQuery<{ amount: number | null }>(
        `
          SELECT SUM(t.amount) AS amount
          FROM v_transactions_internal_alive t
          LEFT JOIN accounts a ON a.id = t.account
          WHERE t.date >= ?
            AND t.date <= ?
            AND t.category = ?
            AND t.account = ?
            AND a.offbudget = 0
        `,
        [start, end, categoryId, accountId],
        true,
      );

      total += rows[0]?.amount ?? 0;
    }

    let average = Math.round(total / months.length);

    const categoryRows = db.runQuery<{ is_income: number }>(
      `
        SELECT is_income
        FROM v_categories
        WHERE id = ?
      `,
      [categoryId],
      true,
    );

    if (categoryRows[0]?.is_income === 0) {
      average *= -1;
    }

    await saveCompanyBudget(month, average);

    return null;
  }

  if (action === 'copy-until-year-end') {
    const amount = await getCompanyBudget(month);

    const year = Number(month.slice(0, 4));
    const currentMonthNumber = Number(month.slice(5, 7));

    for (
      let monthNumber = currentMonthNumber + 1;
      monthNumber <= 12;
      monthNumber++
    ) {
      const targetMonth =
        `${year}-${String(monthNumber).padStart(2, '0')}`;

      await saveCompanyBudget(targetMonth, amount);
    }

    return null;
  }

  return null;
}

async function applyCompanyBudgetMonthAction({
  accountId,
  month,
  action,
}: {
  accountId: string;
  month: string;
  action:
    | 'copy-last'
    | 'set-zero'
    | 'set-3-avg'
    | 'set-6-avg'
    | 'set-12-avg';
}) {
  const categories = db.runQuery<{ id: string }>(
    `
      SELECT c.id
      FROM categories c
      LEFT JOIN category_groups g ON c.cat_group = g.id
      WHERE c.tombstone = 0
        AND c.hidden = 0
        AND g.hidden = 0
    `,
    [],
    true,
  );

  const actionMap = {
    'copy-last': 'copy-single-last',
    'set-zero': 'set-single-zero',
    'set-3-avg': 'set-single-3-avg',
    'set-6-avg': 'set-single-6-avg',
    'set-12-avg': 'set-single-12-avg',
  } as const;

  const companyAction = actionMap[action];

  for (const category of categories) {
    await applyCompanyBudgetAction({
      accountId,
      categoryId: category.id,
      month,
      action: companyAction,
    });
  }

  return null;
}

async function setCompanyBudget({
  accountId,
  categoryId,
  month,
  amount,
}: {
  accountId: string;
  categoryId: string;
  month: string;
  amount: number;
}) {
  db.runQuery(
    `
      INSERT INTO company_budgets (
        account_id,
        category_id,
        month,
        amount
      )
      VALUES (?, ?, ?, ?)

      ON CONFLICT(account_id, category_id, month)
      DO UPDATE SET amount = excluded.amount
    `,
    [accountId, categoryId, month, amount],
    true,
  );

  return null;
}

async function getCompanyAnnualSpent({
  accountId,
  year,
}: {
  accountId?: string;
  year: number;
}) {
  const { start: startDate } = monthUtils.bounds(`${year}-01`);
  const { end: endDate } = monthUtils.bounds(`${year}-12`);
  const rows = db.runQuery<{
    categoryId: string;
    amount: number | null;
  }>(
    `
      SELECT
        t.category AS categoryId,
        -SUM(t.amount) AS amount
      FROM v_transactions_internal_alive t
      LEFT JOIN accounts a ON a.id = t.account
      WHERE t.date >= ?
        AND t.date <= ?
        AND a.offbudget = 0
        AND t.category IS NOT NULL
        ${accountId ? 'AND t.account = ?' : ''}
      GROUP BY t.category
    `,
    accountId
      ? [startDate, endDate, accountId]
      : [startDate, endDate],
    true,
  );

  return rows.map(row => ({
    categoryId: row.categoryId,
    amount: row.amount ?? 0,
  }));
}

async function getCompanyAnnualBudget({
  accountId,
  year,
}: {
  accountId?: string;
  year: number;
}) {
  const startMonth = `${year}-01`;
  const endMonth = `${year}-12`;

  const rows = accountId
    ? db.runQuery<{
        categoryId: string;
        amount: number | null;
      }>(
        `
          SELECT
            category_id AS categoryId,
            SUM(amount) AS amount
          FROM company_budgets
          WHERE account_id = ?
            AND month >= ?
            AND month <= ?
          GROUP BY category_id
        `,
        [accountId, startMonth, endMonth],
        true,
      )
    : db.runQuery<{
        categoryId: string;
        amount: number | null;
      }>(
        `
          SELECT
            category_id AS categoryId,
            SUM(amount) AS amount
          FROM company_budgets
          WHERE month >= ?
            AND month <= ?
          GROUP BY category_id
        `,
        [startMonth, endMonth],
        true,
      );

  return rows.map(row => ({
    categoryId: row.categoryId,
    amount: row.amount ?? 0,
  }));
}

async function setCompanyAnnualBudget({
  accountId,
  categoryId,
  year,
  amount,
}: {
  accountId: string;
  categoryId: string;
  year: number;
  amount: number;
}) {
  const monthlyAmount = Math.trunc(amount / 12);
  const remainder = amount - monthlyAmount * 12;

  for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
    const month = `${year}-${String(monthNumber).padStart(2, '0')}`;

    const amountForMonth =
      monthlyAmount + (monthNumber === 12 ? remainder : 0);

    await setCompanyBudget({
      accountId,
      categoryId,
      month,
      amount: amountForMonth,
    });
  }

  return null;
}

async function trackingBudgetMonth({
  month,
  accountId,
}: {
  month: string;
  accountId?: string;
}) {
  const groups = await db.getCategoriesGrouped();
  const sheetName = monthUtils.sheetForMonth(month);
  const { start, end } = monthUtils.bounds(month);

  function rawValue(name: string) {
    const v = sheet.getCellValue(sheetName, name);
    return v === '' || v == null ? 0 : Number(v);
  }

  function value(name: string, overrideValue?: number) {
    const originalValue = sheet.getCellValue(sheetName, name);

    const v =
      overrideValue !== undefined
        ? overrideValue
        : originalValue === ''
          ? 0
          : originalValue;

    return {
      value: v,
      name: resolveName(sheetName, name),
    };
  }

  function filteredAmount(categoryId: string) {
    /*
     * All companies :
     * on peut utiliser le calcul natif Actual puisque celui-ci
     * contient déjà les transactions de tous les comptes on-budget.
     */
    if (!accountId) {
      return rawValue(`sum-amount-${categoryId}`);
    }

    const rows = db.runQuery<{ amount: number | null }>(
      `
        SELECT SUM(t.amount) AS amount
        FROM v_transactions_internal_alive t
        LEFT JOIN accounts a ON a.id = t.account
        WHERE t.date >= ?
          AND t.date <= ?
          AND t.category = ?
          AND a.offbudget = 0
          AND t.account = ?
      `,
      [start, end, categoryId, accountId],
      true,
    );

    return rows[0]?.amount ?? 0;
  }

  function companyBudget(categoryId: string) {
    /*
     * Company sélectionnée :
     * budget de cette société uniquement.
     */
    if (accountId) {
      const rows = db.runQuery<{ amount: number | null }>(
        `
          SELECT amount
          FROM company_budgets
          WHERE account_id = ?
            AND category_id = ?
            AND month = ?
        `,
        [accountId, categoryId, month],
        true,
      );

      return rows[0]?.amount ?? 0;
    }

    /*
     * All companies :
     * somme des budgets de toutes les sociétés.
     */
    const rows = db.runQuery<{ amount: number | null }>(
      `
        SELECT SUM(amount) AS amount
        FROM company_budgets
        WHERE category_id = ?
          AND month = ?
      `,
      [categoryId, month],
      true,
    );

    return rows[0]?.amount ?? 0;
  }

  let totalBudgeted = 0;
  let totalBudgetIncome = 0;

  let totalSpent = 0;
  let totalLeftover = 0;
  let totalIncome = 0;

  const companyGroupValues = new Map<
    string,
    {
      budgeted: number;
      spent: number;
      leftover: number;
    }
  >();

  const companyCategoryValues = new Map<
    string,
    {
      budgeted: number;
      spent: number;
      leftover: number;
    }
  >();

  for (const group of groups) {
    let groupBudgeted = 0;
    let groupSpent = 0;
    let groupLeftover = 0;

    const categories = group.categories ?? [];

    for (const cat of categories) {
      const budgeted = companyBudget(cat.id);
      const spent = filteredAmount(cat.id);

      const leftover = cat.is_income
        ? budgeted - spent
        : budgeted + spent;

      companyCategoryValues.set(cat.id, {
        budgeted,
        spent,
        leftover,
      });

      if (!cat.hidden) {
        groupBudgeted += budgeted;
        groupSpent += spent;
        groupLeftover += leftover;
      }
    }

    companyGroupValues.set(group.id, {
      budgeted: groupBudgeted,
      spent: groupSpent,
      leftover: groupLeftover,
    });

    if (group.is_income) {
      totalBudgetIncome += groupBudgeted;
      totalIncome += groupSpent;
    } else if (!group.hidden) {
      totalBudgeted += groupBudgeted;
      totalSpent += groupSpent;
      totalLeftover += groupLeftover;
    }
  }

  const totalSaved = totalBudgetIncome - totalBudgeted;
  const realSaved = totalIncome - -totalSpent;

  let values = [
    value('total-budgeted', totalBudgeted),
    value('total-budget-income', totalBudgetIncome),
    value('total-saved', totalSaved),

    value('total-income', totalIncome),
    value('total-spent', totalSpent),
    value('real-saved', realSaved),
    value('total-leftover', totalLeftover),
  ];

  for (const group of groups) {
    const companyGroup = companyGroupValues.get(group.id);

    values = values.concat([
      value(
        `group-budget-${group.id}`,
        companyGroup?.budgeted ?? 0,
      ),
      value(
        `group-sum-amount-${group.id}`,
        companyGroup?.spent ?? 0,
      ),
      value(
        `group-leftover-${group.id}`,
        companyGroup?.leftover ?? 0,
      ),
    ]);

    const categories = group.categories ?? [];

    for (const cat of categories) {
      const companyCategory = companyCategoryValues.get(cat.id);

      values = values.concat([
        value(
          `budget-${cat.id}`,
          companyCategory?.budgeted ?? 0,
        ),

        value(
          `sum-amount-${cat.id}`,
          companyCategory?.spent ?? 0,
        ),

        value(
          `leftover-${cat.id}`,
          companyCategory?.leftover ?? 0,
        ),

        value(`goal-${cat.id}`),
        value(`long-goal-${cat.id}`),
      ]);

      if (!group.is_income) {
        values.push(value(`carryover-${cat.id}`));
      }
    }
  }

  return values;
}

async function createCategory({
  name,
  groupId,
  isIncome,
  hidden,
}: {
  name: string;
  groupId: CategoryGroupEntity['id'];
  isIncome?: boolean;
  hidden?: boolean;
}): Promise<CategoryEntity['id']> {
  if (!groupId) {
    throw APIError('Creating a category: groupId is required');
  }

  return await db.insertCategory({
    name: name.trim(),
    cat_group: groupId,
    is_income: isIncome ? 1 : 0,
    hidden: hidden ? 1 : 0,
  });
}

async function updateCategory(category: CategoryEntity): Promise<void> {
  try {
    await db.updateCategory(
      categoryModel.toDb({
        ...category,
        name: category.name.trim(),
      }),
    );
  } catch (e) {
    if (
      e instanceof Error &&
      e.message.toLowerCase().includes('unique constraint')
    ) {
      throw new Error(
        `A category with the name "${category.name}" already exists.`,
        { cause: e },
      );
    }
    throw e;
  }
}

async function moveCategory({
  id,
  groupId,
  targetId,
}: {
  id: CategoryEntity['id'];
  groupId: CategoryGroupEntity['id'];
  targetId: CategoryEntity['id'] | null;
}): Promise<void> {
  await batchMessages(async () => {
    await db.moveCategory(id, groupId, targetId);
  });
}

async function deleteCategory({
  id,
  transferId,
}: {
  id: CategoryEntity['id'];
  transferId?: CategoryEntity['id'] | null;
}): Promise<void> {
  await batchMessages(async () => {
    const row = await db.first<Pick<db.DbCategory, 'is_income'>>(
      'SELECT is_income FROM categories WHERE id = ?',
      [id],
    );
    if (!row) {
      throw new Error(`Category with id ${id} not found.`);
    }

    const transfer =
      transferId &&
      (await db.first<Pick<db.DbCategory, 'is_income'>>(
        'SELECT is_income FROM categories WHERE id = ?',
        [transferId],
      ));

    if (transferId && !transfer) {
      throw new Error(`Transfer category with id ${transferId} not found.`);
    } else if (
      transferId &&
      row &&
      transfer &&
      row.is_income !== transfer.is_income
    ) {
      throw new Error('Cannot transfer between income and expense categories.');
    }

    // Update spreadsheet values if it's an expense category
    // TODO: We should do this for income too if it's a tracking budget
    if (row.is_income === 0) {
      if (transferId) {
        await budget.doTransfer([id], transferId);
      }
    }

    await db.deleteCategory({ id }, transferId);
  });
}

// Server must return AQL entities not the raw DB data
async function getCategoryGroups({ hidden }: { hidden?: boolean } = {}) {
  const baseQuery = q('category_groups').select('*');
  const query = hidden === undefined ? baseQuery : baseQuery.filter({ hidden });
  const { data: categoryGroups }: { data: CategoryGroupEntity[] } =
    await aqlQuery(query);
  if (hidden === undefined) {
    return categoryGroups;
  }
  return categoryGroups.map(g => ({
    ...g,
    categories: g.categories?.filter(c => Boolean(c.hidden) === hidden),
  }));
}

async function createCategoryGroup({
  name,
  isIncome,
  hidden,
}: {
  name: CategoryGroupEntity['name'];
  isIncome?: CategoryGroupEntity['is_income'];
  hidden?: CategoryGroupEntity['hidden'];
}): Promise<CategoryGroupEntity['id']> {
  return await db.insertCategoryGroup({
    name,
    is_income: isIncome ? 1 : 0,
    hidden: hidden ? 1 : 0,
  });
}

async function updateCategoryGroup(group: CategoryGroupEntity) {
  await db.updateCategoryGroup(categoryGroupModel.toDb(group));
}

async function moveCategoryGroup({
  id,
  targetId,
}: {
  id: CategoryGroupEntity['id'];
  targetId: CategoryGroupEntity['id'] | null;
}): Promise<void> {
  await batchMessages(async () => {
    await db.moveCategoryGroup(id, targetId);
  });
}

async function deleteCategoryGroup({
  id,
  transferId,
}: {
  id: CategoryGroupEntity['id'];
  transferId?: CategoryGroupEntity['id'] | null;
}): Promise<void> {
  const groupCategories = await db.all<Pick<CategoryEntity, 'id'>>(
    'SELECT id FROM categories WHERE cat_group = ? AND tombstone = 0',
    [id],
  );

  await batchMessages(async () => {
    if (transferId) {
      await budget.doTransfer(
        groupCategories.map(c => c.id),
        transferId,
      );
    }
    await db.deleteCategoryGroup({ id }, transferId);
  });
}

async function isCategoryTransferRequired({
  id,
}: {
  id: CategoryEntity['id'];
}) {
  const res = db.runQuery<{ count: number }>(
    `SELECT count(t.id) as count FROM transactions t
       LEFT JOIN category_mapping cm ON cm.id = t.category
       WHERE cm.transferId = ? AND t.tombstone = 0`,
    [id],
    true,
  );

  // If there are transactions with this category, return early since
  // we already know it needs to be tranferred
  if (res[0].count !== 0) {
    return true;
  }

  // If there are any non-zero budget values, also force the user to
  // transfer the category.
  return [...(sheet.get().meta().createdMonths as Set<string>)].some(month => {
    const sheetName = monthUtils.sheetForMonth(month);
    const value = sheet.get().getCellValue(sheetName, 'budget-' + id);

    return value != null && value !== 0;
  });
}
