CREATE TABLE company_budgets (
  account_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  month TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (account_id, category_id, month)
);

