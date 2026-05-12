/**
 * Module_Finance.js — сводки по доходам/расходам за периоды.
 */

function financeSummary_(period) {
  const all = listAll_(SHEET.FINANCE);
  const range = periodRange_(period || 'day');
  const filtered = all.filter(r => {
    const t = new Date(r.occurred_at || r.created_at || 0).getTime();
    return t >= range.from && t < range.to;
  });

  const income = filtered.filter(r => r.kind === 'income')
    .reduce((s, r) => s + Number(r.amount || 0), 0);
  const expense = filtered.filter(r => r.kind === 'expense')
    .reduce((s, r) => s + Number(r.amount || 0), 0);

  const byCat = {};
  filtered.filter(r => r.kind === 'expense').forEach(r => {
    const k = (r.category || '—').toString();
    byCat[k] = (byCat[k] || 0) + Number(r.amount || 0);
  });
  const topCategories = Object.keys(byCat)
    .map(category => ({ category, amount: byCat[category] }))
    .sort((a, b) => b.amount - a.amount);

  const currency = filtered[0] && filtered[0].currency ? filtered[0].currency : 'UAH';

  // включаем доходы от рекламы (если связаны через Ads)
  const ads = listAll_(SHEET.ADS).filter(a => {
    if (a.status === 'pending') return false;
    const t = new Date(a.pub_at || a.created_at || 0).getTime();
    return t >= range.from && t < range.to;
  });
  const adsIncome = ads.reduce((s, a) => s + Number(a.price || 0), 0);

  return {
    period: period || 'day',
    income: income,
    expense: expense,
    balance: income - expense,
    ads_income: adsIncome,
    currency: currency,
    topCategories: topCategories,
    count: filtered.length,
  };
}

function periodRange_(period) {
  const now = new Date();
  const z = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 24 * 3600 * 1000;
  switch (period) {
    case 'day':
      return { from: z.getTime(), to: z.getTime() + dayMs };
    case 'week': {
      const dow = (z.getDay() + 6) % 7; // понедельник = 0
      const mon = new Date(z.getTime() - dow * dayMs);
      return { from: mon.getTime(), to: mon.getTime() + 7 * dayMs };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return { from: start.getTime(), to: end.getTime() };
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear() + 1, 0, 1);
      return { from: start.getTime(), to: end.getTime() };
    }
    default:
      return { from: 0, to: Date.now() + dayMs };
  }
}

function apiFinanceSummary_(body, sess) {
  const period = (body && body.period) || 'month';
  return ok_({ summary: financeSummary_(period) });
}
