const modules = {
  customers: { label: 'Clientes', fields: ['name', 'email', 'phone'] },
  carriers: { label: 'Transportadoras', fields: ['name', 'mc', 'contact'] },
  trips: { label: 'Viagens', fields: ['trip_no', 'customer', 'carrier', 'status', 'sell_rate', 'buy_rate'] },
  invoices: { label: 'Faturas', fields: ['number', 'trip_no', 'amount', 'status'] },
  payments: { label: 'Pagamentos', fields: ['invoice', 'method', 'amount', 'paid_at'] },
};

const storageKey = 'cch_transports_demo_v1';

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (raw) return JSON.parse(raw);
  return Object.fromEntries(Object.keys(modules).map(k => [k, []]));
}

function saveState(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function money(v) {
  const n = Number(v || 0);
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'USD' });
}

function summary(state) {
  const tripMargin = state.trips.reduce((acc, t) => acc + ((+t.sell_rate || 0) - (+t.buy_rate || 0)), 0);
  const billed = state.invoices.reduce((acc, i) => acc + (+i.amount || 0), 0);
  const paid = state.payments.reduce((acc, p) => acc + (+p.amount || 0), 0);
  const pending = billed - paid;
  return { tripMargin, billed, paid, pending };
}

function renderTabs(active) {
  const tabs = document.getElementById('tabs');
  const reportTab = `<li class="nav-item"><button class="nav-link ${active === 'reports' ? 'active' : ''}" data-tab="reports">Relatórios</button></li>`;
  tabs.innerHTML = Object.entries(modules)
    .map(([key, m]) => `<li class="nav-item"><button class="nav-link ${active === key ? 'active' : ''}" data-tab="${key}">${m.label}</button></li>`)
    .join('') + reportTab;

  tabs.querySelectorAll('button[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => renderApp(btn.dataset.tab));
  });
}

function renderReports(state) {
  const s = summary(state);
  return `
    <div class="row g-3">
      <div class="col-md-3"><div class="card p-3"><h6>Margem total</h6><p class="mb-0 fs-5">${money(s.tripMargin)}</p></div></div>
      <div class="col-md-3"><div class="card p-3"><h6>Faturado</h6><p class="mb-0 fs-5">${money(s.billed)}</p></div></div>
      <div class="col-md-3"><div class="card p-3"><h6>Pago</h6><p class="mb-0 fs-5">${money(s.paid)}</p></div></div>
      <div class="col-md-3"><div class="card p-3"><h6>Em aberto</h6><p class="mb-0 fs-5">${money(s.pending)}</p></div></div>
    </div>
  `;
}

function renderModule(moduleKey, state) {
  const mod = modules[moduleKey];
  const rows = state[moduleKey];

  const formInputs = mod.fields
    .map(f => `<div class="col-md-4"><label class="form-label">${f}</label><input class="form-control" name="${f}" required></div>`)
    .join('');

  const headers = ['#', ...mod.fields, 'Ações'].map(h => `<th>${h}</th>`).join('');

  const body = rows.map((r, idx) => {
    const cols = mod.fields.map(f => `<td>${r[f] ?? ''}</td>`).join('');
    return `<tr><td>${idx + 1}</td>${cols}<td><button class="btn btn-sm btn-outline-danger" data-delete="${idx}">Excluir</button></td></tr>`;
  }).join('') || `<tr><td colspan="${mod.fields.length + 2}" class="text-center text-muted">Sem registros</td></tr>`;

  return `
    <section class="card p-3 mb-3">
      <h5 class="mb-3">Novo registro - ${mod.label}</h5>
      <form id="create-form" class="row g-3">${formInputs}<div class="col-12"><button class="btn btn-primary">Salvar</button></div></form>
    </section>
    <section class="card p-3">
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h5 class="mb-0">Lista</h5>
        <button class="btn btn-sm btn-outline-secondary" id="seed-btn">Carregar demo</button>
      </div>
      <div class="table-responsive">
        <table class="table table-striped"><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>
      </div>
    </section>
  `;
}

function seedData(moduleKey, state) {
  const seeds = {
    customers: [{ name: 'ACME Foods', email: 'ops@acme.com', phone: '+1 555-1234' }],
    carriers: [{ name: 'RoadFast LLC', mc: 'MC123456', contact: 'dispatch@roadfast.com' }],
    trips: [{ trip_no: 'TRP-1001', customer: 'ACME Foods', carrier: 'RoadFast LLC', status: 'in_transit', sell_rate: '2500', buy_rate: '1900' }],
    invoices: [{ number: 'INV-9001', trip_no: 'TRP-1001', amount: '2500', status: 'open' }],
    payments: [{ invoice: 'INV-9001', method: 'ACH', amount: '1000', paid_at: '2026-04-26' }],
  };
  state[moduleKey] = seeds[moduleKey] || [];
  saveState(state);
}

function attachModuleHandlers(moduleKey, state) {
  const form = document.getElementById('create-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const row = Object.fromEntries(fd.entries());
      state[moduleKey].push(row);
      saveState(state);
      renderApp(moduleKey);
    });
  }

  document.querySelectorAll('button[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.delete);
      state[moduleKey].splice(idx, 1);
      saveState(state);
      renderApp(moduleKey);
    });
  });

  const seedBtn = document.getElementById('seed-btn');
  if (seedBtn) {
    seedBtn.addEventListener('click', () => {
      seedData(moduleKey, state);
      renderApp(moduleKey);
    });
  }
}

function renderApp(active = 'customers') {
  const state = loadState();
  renderTabs(active);

  const view = document.getElementById('view');
  if (active === 'reports') {
    view.innerHTML = renderReports(state);
    return;
  }

  view.innerHTML = renderModule(active, state);
  attachModuleHandlers(active, state);
}

renderApp();
