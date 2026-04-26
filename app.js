'use strict';

const STORAGE_KEY = 'cch_logistics_tms_v2';

const NAV = [
  ['dashboard', 'Dashboard'],
  ['trips', 'Trips / Loads'],
  ['customers', 'Customers'],
  ['carriers', 'Carriers'],
  ['invoices', 'Invoices'],
  ['payments', 'Payments'],
  ['payables', 'Carrier Pay'],
  ['reports', 'Reports'],
  ['settings', 'Settings'],
];

const TRIP_STATUSES = [
  ['draft', 'Draft'],
  ['booked', 'Booked'],
  ['in_transit', 'In Transit'],
  ['delivered', 'Delivered'],
  ['closed', 'Closed'],
];
const CUSTOMER_STATUSES = [
  ['active', 'Active'],
  ['credit_hold', 'Credit Hold'],
  ['blocked', 'Blocked'],
  ['inactive', 'Inactive'],
];
const CARRIER_STATUSES = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['blocked', 'Blocked'],
  ['inactive', 'Inactive'],
];
const PAYMENT_METHODS = ['ACH', 'Check', 'Wire', 'Card', 'Cash', 'Credit'];
const EQUIPMENT = ['Van', 'Reefer', 'Flatbed', 'Step Deck', 'Hot Shot', 'RGN / Lowboy', 'Power Only', 'Box Truck', 'Other'];

let state = loadState();
let activeView = 'dashboard';
let activePayload = {};
let searchTerms = {};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
const uid = (prefix) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const numberOrZero = (value) => Number.parseFloat(value || 0) || 0;
const money = (value) => numberOrZero(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const displayDate = (value) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('en-US') : '';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
const labelFrom = (pairs, key) => (pairs.find(([value]) => value === key)?.[1] || key || '');

function defaultState() {
  return {
    settings: {
      companyName: 'CCH Logistics',
      tagline: 'Transportation Management System',
      address1: '',
      address2: '',
      city: '',
      state: 'UT',
      zip: '',
      phone: '',
      email: '',
      website: '',
      nextTripNumber: 1001,
      nextInvoiceNumber: 9001,
      nextRateConfirmationNumber: 7001,
      defaultPaymentTerms: 30,
      brokers: 'DGB - Abby Transport\nABC - Alison Wishes\nJPF - Jaqueline Foote\nJVF - Jeune Faye\nMMM - Margaret Matley\nRJB - Roland Brunson\nRGV - Regina Vicente',
      invoiceNotes: 'Thank you for your business. Please remit payment according to the terms listed above.',
      rateConfirmationTerms: 'Carrier must verify all pickup and delivery details before dispatch. Driver must call broker with any delay, detention, damage, shortage, or change in appointment time. Signed POD is required for payment.',
    },
    customers: [],
    carriers: [],
    trips: [],
    invoices: [],
    payments: [],
    payables: [],
    rateConfirmations: [],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return { ...base, ...parsed, settings: { ...base.settings, ...(parsed.settings || {}) } };
  } catch (error) {
    console.warn('Could not load saved database:', error);
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function notify(message, type = 'success') {
  const host = $('#alertHost');
  const id = uid('alert');
  host.insertAdjacentHTML('beforeend', `<div id="${id}" class="alert alert-${type} shadow-sm mb-2" role="alert">${escapeHtml(message)}</div>`);
  setTimeout(() => $(`#${id}`)?.remove(), 3600);
}

function downloadFile(filename, content, mime = 'application/octet-stream') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function exportCSV(key) {
  const rows = state[key] || [];
  const headers = rows.length ? Object.keys(rows[0]) : ['id'];
  const csv = [headers.join(','), ...rows.map(row => headers.map(h => csvEscape(row[h])).join(','))].join('\n');
  downloadFile(`cch-${key}-${todayISO()}.csv`, csv, 'text/csv');
}

function backupJSON() {
  downloadFile(`cch-logistics-backup-${todayISO()}.json`, JSON.stringify(state, null, 2), 'application/json');
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const base = defaultState();
      state = { ...base, ...imported, settings: { ...base.settings, ...(imported.settings || {}) } };
      saveState();
      notify('Backup imported successfully. The tiny database goblin has accepted the offering.');
      renderApp('dashboard');
    } catch (error) {
      notify('Invalid backup file. Nothing was imported.', 'danger');
    }
  };
  reader.readAsText(file);
}

function nextSequence(type) {
  if (type === 'trip') {
    const value = Number.parseInt(state.settings.nextTripNumber, 10) || 1001;
    state.settings.nextTripNumber = value + 1;
    return `TRP-${value}`;
  }
  if (type === 'invoice') {
    const value = Number.parseInt(state.settings.nextInvoiceNumber, 10) || 9001;
    state.settings.nextInvoiceNumber = value + 1;
    return `INV-${value}`;
  }
  if (type === 'rateConfirmation') {
    const value = Number.parseInt(state.settings.nextRateConfirmationNumber, 10) || 7001;
    state.settings.nextRateConfirmationNumber = value + 1;
    return `RC-${value}`;
  }
  return `${type.toUpperCase()}-${Date.now()}`;
}

function addDays(dateString, days) {
  const date = dateString ? new Date(`${dateString}T12:00:00`) : new Date();
  date.setDate(date.getDate() + (Number.parseInt(days, 10) || 0));
  return date.toISOString().slice(0, 10);
}

function selectOptions(rows, selected, labelFn, empty = 'Select...') {
  return `<option value="">${empty}</option>` + rows.map(row => `<option value="${row.id}" ${row.id === selected ? 'selected' : ''}>${escapeHtml(labelFn(row))}</option>`).join('');
}

function staticOptions(options, selected, empty = '') {
  const start = empty ? `<option value="">${empty}</option>` : '';
  return start + options.map(item => {
    const value = Array.isArray(item) ? item[0] : item;
    const label = Array.isArray(item) ? item[1] : item;
    return `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
}

function getCustomer(id) { return state.customers.find(row => row.id === id); }
function getCarrier(id) { return state.carriers.find(row => row.id === id); }
function getTrip(id) { return state.trips.find(row => row.id === id); }
function getInvoice(id) { return state.invoices.find(row => row.id === id); }
function getPayable(id) { return state.payables.find(row => row.id === id); }
function customerName(id) { return getCustomer(id)?.companyName || 'Unassigned'; }
function carrierName(id) { return getCarrier(id)?.legalName || 'Unassigned'; }
function tripNo(id) { return getTrip(id)?.tripNo || 'Unassigned'; }

function invoiceTotal(invoice) {
  return numberOrZero(invoice.freightCharge) + numberOrZero(invoice.additionalCharges);
}
function invoicePaid(invoiceId) {
  return state.payments.filter(p => p.invoiceId === invoiceId).reduce((sum, p) => sum + numberOrZero(p.amount), 0);
}
function invoiceBalance(invoice) {
  return invoiceTotal(invoice) - invoicePaid(invoice.id);
}
function invoiceStatus(invoice) {
  const balance = invoiceBalance(invoice);
  const paid = invoicePaid(invoice.id);
  if (balance <= 0 && invoiceTotal(invoice) > 0) return 'paid';
  if (paid > 0) return 'partial';
  if (invoice.dueDate && new Date(`${invoice.dueDate}T12:00:00`) < new Date(`${todayISO()}T12:00:00`)) return 'past_due';
  return 'open';
}
function payableBalance(payable) {
  return numberOrZero(payable.amount) - numberOrZero(payable.paidAmount);
}
function payableStatus(payable) {
  if (payableBalance(payable) <= 0 && numberOrZero(payable.amount) > 0) return 'paid';
  if (numberOrZero(payable.paidAmount) > 0) return 'partial';
  if (payable.dueDate && new Date(`${payable.dueDate}T12:00:00`) < new Date(`${todayISO()}T12:00:00`)) return 'past_due';
  return 'open';
}
function tripMargin(trip) {
  return numberOrZero(trip.customerRate) - numberOrZero(trip.carrierRate);
}

function statusBadge(value, label) {
  return `<span class="badge-soft ${escapeHtml(value)}">${escapeHtml(label || value)}</span>`;
}

function filtered(rows, key, fields) {
  const term = (searchTerms[key] || '').trim().toLowerCase();
  if (!term) return rows;
  return rows.filter(row => fields.some(field => String(row[field] ?? '').toLowerCase().includes(term)));
}

function appMetrics() {
  const activeTrips = state.trips.filter(t => !['delivered', 'closed'].includes(t.status)).length;
  const openAR = state.invoices.reduce((sum, inv) => sum + Math.max(invoiceBalance(inv), 0), 0);
  const openAP = state.payables.reduce((sum, bill) => sum + Math.max(payableBalance(bill), 0), 0);
  const margin = state.trips.reduce((sum, trip) => sum + tripMargin(trip), 0);
  const pastDue = state.invoices.filter(inv => invoiceStatus(inv) === 'past_due').length;
  return { activeTrips, openAR, openAP, margin, pastDue };
}

function renderNav(active) {
  const nav = $('#sideNav');
  const counts = {
    trips: state.trips.length,
    customers: state.customers.length,
    carriers: state.carriers.length,
    invoices: state.invoices.length,
    payments: state.payments.length,
    payables: state.payables.length,
  };
  nav.innerHTML = NAV.map(([key, label]) => `
    <button class="side-link ${active === key ? 'active' : ''}" data-action="nav" data-view="${key}">
      <span>${label}</span>${counts[key] !== undefined ? `<span class="side-count">${counts[key]}</span>` : ''}
    </button>
  `).join('');
}

function setTitle(title, eyebrow = 'Transportation Management System') {
  $('#pageTitle').textContent = title;
  $('#pageEyebrow').textContent = eyebrow;
  document.title = `${title} | CCH Logistics TMS`;
}

function renderApp(view = activeView, payload = {}) {
  activeView = view;
  activePayload = payload;
  renderNav(view);
  const viewEl = $('#view');
  const renderers = {
    dashboard: renderDashboard,
    trips: renderTrips,
    customers: renderCustomers,
    carriers: renderCarriers,
    invoices: renderInvoices,
    payments: renderPayments,
    payables: renderPayables,
    reports: renderReports,
    settings: renderSettings,
    customerForm: renderCustomerForm,
    carrierForm: renderCarrierForm,
    tripForm: renderTripForm,
    invoiceForm: renderInvoiceForm,
    paymentForm: renderPaymentForm,
    payableForm: renderPayableForm,
    invoiceDoc: renderInvoicePreview,
    rateConfirmationDoc: renderRateConfirmationPreview,
  };
  viewEl.innerHTML = (renderers[view] || renderDashboard)(payload);
}

function panel(title, subtitle, body, actions = '') {
  return `<section class="panel">
    <div class="panel-header">
      <div><h2 class="panel-title">${title}</h2>${subtitle ? `<p class="panel-subtitle">${subtitle}</p>` : ''}</div>
      <div class="toolbar-right no-print">${actions}</div>
    </div>
    ${body}
  </section>`;
}

function renderDashboard() {
  setTitle('Dashboard', 'Control tower');
  const m = appMetrics();
  const recentTrips = [...state.trips].sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '')).slice(0, 8);
  const openInvoices = state.invoices.filter(inv => invoiceStatus(inv) !== 'paid').slice(0, 8);
  return `
    <div class="kpi-grid">
      <div class="kpi-card"><div class="kpi-label">Active Trips</div><div class="kpi-value">${m.activeTrips}</div><div class="kpi-sub">Booked, draft or in transit</div></div>
      <div class="kpi-card"><div class="kpi-label">Open A/R</div><div class="kpi-value">${money(m.openAR)}</div><div class="kpi-sub">Customer balance due</div></div>
      <div class="kpi-card"><div class="kpi-label">Open Carrier Pay</div><div class="kpi-value">${money(m.openAP)}</div><div class="kpi-sub">Estimated carrier payable</div></div>
      <div class="kpi-card"><div class="kpi-label">Gross Margin</div><div class="kpi-value">${money(m.margin)}</div><div class="kpi-sub">Sell rate minus buy rate</div></div>
    </div>

    ${state.customers.length === 0 || state.carriers.length === 0 ? panel('Start here', 'Create one customer and one carrier before building a load. Revolutionary, I know.', `
      <div class="row g-3">
        <div class="col-md-4"><button class="btn btn-primary w-100" data-action="new-customer">Add Customer</button></div>
        <div class="col-md-4"><button class="btn btn-primary w-100" data-action="new-carrier">Add Carrier</button></div>
        <div class="col-md-4"><button class="btn btn-outline-primary w-100" data-action="seed-demo">Load Demo Data</button></div>
      </div>
    `) : ''}

    <div class="row g-3">
      <div class="col-xl-7">
        ${panel('Recent Trips', 'Latest operational records', tripMiniTable(recentTrips), `<button class="btn btn-primary btn-sm" data-action="new-trip">+ New Trip</button>`)}
      </div>
      <div class="col-xl-5">
        ${panel('Open Invoices', `${m.pastDue} past due. Because calendars are apparently difficult.`, invoiceMiniTable(openInvoices), `<button class="btn btn-outline-primary btn-sm" data-action="nav" data-view="invoices">View all</button>`)}
      </div>
    </div>
  `;
}

function tripMiniTable(rows) {
  if (!rows.length) return `<div class="empty-state"><strong>No trips yet.</strong>Build a trip and the dashboard stops looking lonely.</div>`;
  return `<div class="table-responsive table-card"><table class="table">
    <thead><tr><th>Trip</th><th>Customer</th><th>Carrier</th><th>Status</th><th>Pickup</th><th>Margin</th></tr></thead>
    <tbody>${rows.map(t => `<tr>
      <td><a href="#" data-action="edit-trip" data-id="${t.id}">${escapeHtml(t.tripNo)}</a></td>
      <td>${escapeHtml(customerName(t.customerId))}</td>
      <td>${escapeHtml(carrierName(t.carrierId))}</td>
      <td>${statusBadge(t.status, labelFrom(TRIP_STATUSES, t.status))}</td>
      <td>${displayDate(t.pickupDate)}</td>
      <td>${money(tripMargin(t))}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function invoiceMiniTable(rows) {
  if (!rows.length) return `<div class="empty-state"><strong>No open invoices.</strong>Suspiciously peaceful accounting.</div>`;
  return `<div class="table-responsive table-card"><table class="table">
    <thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th>Balance</th><th>Status</th></tr></thead>
    <tbody>${rows.map(inv => `<tr>
      <td><a href="#" data-action="preview-invoice" data-id="${inv.id}">${escapeHtml(inv.invoiceNo)}</a></td>
      <td>${escapeHtml(customerName(inv.customerId))}</td>
      <td>${displayDate(inv.dueDate)}</td>
      <td>${money(invoiceBalance(inv))}</td>
      <td>${statusBadge(invoiceStatus(inv), labelFrom([['open','Open'],['partial','Partially Paid'],['paid','Paid'],['past_due','Past Due']], invoiceStatus(inv)))}</td>
    </tr>`).join('')}</tbody>
  </table></div>`;
}

function renderCustomers() {
  setTitle('Customers', 'Bill-to names and contacts');
  const rows = filtered(state.customers, 'customers', ['companyName', 'contactName', 'email', 'billingEmail', 'phone', 'city', 'state']);
  return panel('Customers', 'Manage bill-to accounts, contacts, credit status, and payment terms.', `
    ${moduleToolbar('customers', 'new-customer')}
    <div class="table-responsive table-card"><table class="table">
      <thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th>Terms</th><th>Status</th><th class="text-end">Balance</th><th class="action-cell">Actions</th></tr></thead>
      <tbody>${rows.map(c => {
        const balance = state.invoices.filter(i => i.customerId === c.id).reduce((sum, inv) => sum + Math.max(invoiceBalance(inv), 0), 0);
        return `<tr>
          <td><a href="#" data-action="edit-customer" data-id="${c.id}">${escapeHtml(c.companyName)}</a><div class="text-muted small">${escapeHtml([c.city, c.state].filter(Boolean).join(', '))}</div></td>
          <td>${escapeHtml(c.contactName)}</td>
          <td>${escapeHtml(c.email || c.billingEmail)}</td>
          <td>${escapeHtml(c.phone)}</td>
          <td>${escapeHtml(c.paymentTerms || `${state.settings.defaultPaymentTerms} days`)}</td>
          <td>${statusBadge(c.status || 'active', labelFrom(CUSTOMER_STATUSES, c.status || 'active'))}</td>
          <td class="text-end">${money(balance)}</td>
          <td class="action-cell"><button class="btn btn-sm btn-outline-primary" data-action="edit-customer" data-id="${c.id}">Edit</button> <button class="btn btn-sm btn-outline-danger" data-action="delete-customer" data-id="${c.id}">Delete</button></td>
        </tr>`;
      }).join('') || `<tr><td colspan="8"><div class="empty-state"><strong>No customers.</strong>Add a customer before trying to bill the void.</div></td></tr>`}</tbody>
    </table></div>
  `, `<button class="btn btn-primary btn-sm" data-action="new-customer">+ Add Customer</button>`);
}

function moduleToolbar(key, newAction) {
  return `<div class="toolbar no-print">
    <div class="toolbar-left"><input class="form-control search-input" placeholder="Search..." value="${escapeHtml(searchTerms[key] || '')}" data-search="${key}"></div>
    <div class="toolbar-right">
      <button class="btn btn-outline-secondary btn-sm" data-action="export-csv" data-key="${key}">Export CSV</button>
      <button class="btn btn-primary btn-sm" data-action="${newAction}">New</button>
    </div>
  </div>`;
}

function renderCustomerForm({ id } = {}) {
  const c = id ? getCustomer(id) : {};
  setTitle(id ? 'Edit Customer' : 'New Customer', 'Customer file');
  return `<section class="form-panel">
    <form data-form="customer">
      <input type="hidden" name="id" value="${escapeHtml(c.id || '')}">
      <div class="form-section-title">Company</div>
      <div class="row g-3">
        ${input('companyName', 'Company Name', c.companyName, 'text', true, 'col-md-6')}
        ${input('dbaName', 'DBA Name', c.dbaName, 'text', false, 'col-md-3')}
        ${selectInput('status', 'Status', CUSTOMER_STATUSES, c.status || 'active', false, 'col-md-3')}
      </div>
      <div class="form-section-title">Primary Contact</div>
      <div class="row g-3">
        ${input('contactName', 'Contact Name', c.contactName, 'text', false, 'col-md-4')}
        ${input('phone', 'Phone', c.phone, 'text', false, 'col-md-4')}
        ${input('email', 'Email', c.email, 'email', false, 'col-md-4')}
      </div>
      <div class="form-section-title">Billing</div>
      <div class="row g-3">
        ${input('billingEmail', 'Billing Email', c.billingEmail, 'email', false, 'col-md-4')}
        ${input('paymentTerms', 'Payment Terms', c.paymentTerms || `${state.settings.defaultPaymentTerms} days`, 'text', false, 'col-md-4')}
        ${input('creditLimit', 'Credit Limit', c.creditLimit || 0, 'number', false, 'col-md-4', '0.01')}
        ${input('address1', 'Address', c.address1, 'text', false, 'col-md-8')}
        ${input('address2', 'Address 2', c.address2, 'text', false, 'col-md-4')}
        ${input('city', 'City', c.city, 'text', false, 'col-md-4')}
        ${input('state', 'State', c.state, 'text', false, 'col-md-2')}
        ${input('zip', 'ZIP', c.zip, 'text', false, 'col-md-2')}
        ${input('country', 'Country', c.country || 'US', 'text', false, 'col-md-4')}
        ${textarea('notes', 'Notes', c.notes, 'col-12')}
      </div>
      ${formActions('customers')}
    </form>
  </section>`;
}

function renderCarriers() {
  setTitle('Carriers', 'Carrier qualification and dispatch info');
  const rows = filtered(state.carriers, 'carriers', ['legalName', 'dbaName', 'mcNumber', 'dotNumber', 'dispatchEmail', 'dispatchPhone', 'city', 'state']);
  return panel('Carriers', 'Manage carrier profile, MC/DOT, insurance, dispatch, factoring, and equipment capabilities.', `
    ${moduleToolbar('carriers', 'new-carrier')}
    <div class="table-responsive table-card"><table class="table">
      <thead><tr><th>Carrier</th><th>MC / DOT</th><th>Dispatch</th><th>Insurance Exp.</th><th>Status</th><th>Equipment</th><th class="action-cell">Actions</th></tr></thead>
      <tbody>${rows.map(c => `<tr>
        <td><a href="#" data-action="edit-carrier" data-id="${c.id}">${escapeHtml(c.legalName)}</a><div class="text-muted small">${escapeHtml([c.city, c.state].filter(Boolean).join(', '))}</div></td>
        <td>${escapeHtml(c.mcNumber || '')}<div class="text-muted small">${escapeHtml(c.dotNumber || '')}</div></td>
        <td>${escapeHtml(c.dispatchName || '')}<div class="text-muted small">${escapeHtml(c.dispatchPhone || c.dispatchEmail || '')}</div></td>
        <td>${displayDate(c.insuranceExpiration)}</td>
        <td>${statusBadge(c.status || 'pending', labelFrom(CARRIER_STATUSES, c.status || 'pending'))}</td>
        <td>${escapeHtml((c.equipment || []).join(', '))}</td>
        <td class="action-cell"><button class="btn btn-sm btn-outline-primary" data-action="edit-carrier" data-id="${c.id}">Edit</button> <button class="btn btn-sm btn-outline-danger" data-action="delete-carrier" data-id="${c.id}">Delete</button></td>
      </tr>`).join('') || `<tr><td colspan="7"><div class="empty-state"><strong>No carriers.</strong>Add a carrier before inventing a truck out of paperwork.</div></td></tr>`}</tbody>
    </table></div>
  `, `<button class="btn btn-primary btn-sm" data-action="new-carrier">+ Add Carrier</button>`);
}

function renderCarrierForm({ id } = {}) {
  const c = id ? getCarrier(id) : {};
  setTitle(id ? 'Edit Carrier' : 'New Carrier', 'Carrier file');
  const selectedEquipment = c.equipment || [];
  return `<section class="form-panel">
    <form data-form="carrier">
      <input type="hidden" name="id" value="${escapeHtml(c.id || '')}">
      <div class="form-section-title">Carrier Identity</div>
      <div class="row g-3">
        ${input('legalName', 'Legal Name', c.legalName, 'text', true, 'col-md-5')}
        ${input('dbaName', 'DBA Name', c.dbaName, 'text', false, 'col-md-3')}
        ${selectInput('status', 'Status', CARRIER_STATUSES, c.status || 'pending', false, 'col-md-4')}
        ${input('mcNumber', 'MC Number', c.mcNumber, 'text', false, 'col-md-3')}
        ${input('dotNumber', 'DOT Number', c.dotNumber, 'text', false, 'col-md-3')}
        ${input('taxId', 'Federal ID / EIN', c.taxId, 'text', false, 'col-md-3')}
        ${input('paymentTerms', 'Payment Terms', c.paymentTerms || '30 days', 'text', false, 'col-md-3')}
      </div>
      <div class="form-section-title">Contacts</div>
      <div class="row g-3">
        ${input('dispatchName', 'Dispatch Contact', c.dispatchName, 'text', false, 'col-md-4')}
        ${input('dispatchPhone', 'Dispatch Phone', c.dispatchPhone, 'text', false, 'col-md-4')}
        ${input('dispatchEmail', 'Dispatch Email', c.dispatchEmail, 'email', false, 'col-md-4')}
        ${input('accountingName', 'Accounting Contact', c.accountingName, 'text', false, 'col-md-4')}
        ${input('accountingPhone', 'Accounting Phone', c.accountingPhone, 'text', false, 'col-md-4')}
        ${input('accountingEmail', 'Accounting Email', c.accountingEmail, 'email', false, 'col-md-4')}
      </div>
      <div class="form-section-title">Address and Compliance</div>
      <div class="row g-3">
        ${input('address1', 'Address', c.address1, 'text', false, 'col-md-8')}
        ${input('address2', 'Address 2', c.address2, 'text', false, 'col-md-4')}
        ${input('city', 'City', c.city, 'text', false, 'col-md-4')}
        ${input('state', 'State', c.state, 'text', false, 'col-md-2')}
        ${input('zip', 'ZIP', c.zip, 'text', false, 'col-md-2')}
        ${input('country', 'Country', c.country || 'US', 'text', false, 'col-md-4')}
        ${input('insuranceExpiration', 'Insurance Expiration', c.insuranceExpiration, 'date', false, 'col-md-4')}
        ${input('cargoInsurance', 'Cargo Insurance Amount', c.cargoInsurance || 0, 'number', false, 'col-md-4', '0.01')}
        ${input('autoLiability', 'Auto Liability Amount', c.autoLiability || 0, 'number', false, 'col-md-4', '0.01')}
        ${input('factoringCompany', 'Factoring Company', c.factoringCompany, 'text', false, 'col-md-6')}
        ${input('factoringEmail', 'Factoring Email', c.factoringEmail, 'email', false, 'col-md-6')}
        <div class="col-12"><label class="form-label">Equipment</label><div class="row g-2">
          ${EQUIPMENT.map(eq => `<div class="col-sm-6 col-lg-4"><label class="form-check"><input class="form-check-input" type="checkbox" name="equipment" value="${escapeHtml(eq)}" ${selectedEquipment.includes(eq) ? 'checked' : ''}> <span class="form-check-label">${escapeHtml(eq)}</span></label></div>`).join('')}
        </div></div>
        ${textarea('notes', 'Safety / Internal Notes', c.notes, 'col-12')}
      </div>
      ${formActions('carriers')}
    </form>
  </section>`;
}

function renderTrips() {
  setTitle('Trips / Loads', 'Build and dispatch loads');
  const rows = filtered(state.trips, 'trips', ['tripNo', 'status', 'commodity', 'equipment', 'pickupNo', 'deliveryRef', 'broker']);
  return panel('Trips / Loads', 'Create trip numbers, attach customer and carrier, add multiple pickup/delivery stops, and generate documents.', `
    ${moduleToolbar('trips', 'new-trip')}
    <div class="table-responsive table-card"><table class="table">
      <thead><tr><th>Trip #</th><th>Customer</th><th>Carrier</th><th>Status</th><th>Equipment</th><th>Pickup</th><th>Delivery</th><th class="text-end">Customer</th><th class="text-end">Carrier</th><th class="text-end">Margin</th><th class="action-cell">Actions</th></tr></thead>
      <tbody>${rows.map(t => `<tr>
        <td><a href="#" data-action="edit-trip" data-id="${t.id}">${escapeHtml(t.tripNo)}</a><div class="text-muted small">${escapeHtml(t.broker || '')}</div></td>
        <td>${escapeHtml(customerName(t.customerId))}</td>
        <td>${escapeHtml(carrierName(t.carrierId))}</td>
        <td>${statusBadge(t.status || 'draft', labelFrom(TRIP_STATUSES, t.status || 'draft'))}</td>
        <td>${escapeHtml(t.equipment || '')}</td>
        <td>${displayDate(t.pickupDate)}</td>
        <td>${displayDate(t.deliveryDate)}</td>
        <td class="text-end">${money(t.customerRate)}</td>
        <td class="text-end">${money(t.carrierRate)}</td>
        <td class="text-end fw-bold ${tripMargin(t) < 0 ? 'text-danger' : 'text-success'}">${money(tripMargin(t))}</td>
        <td class="action-cell">
          <button class="btn btn-sm btn-outline-primary" data-action="edit-trip" data-id="${t.id}">Edit</button>
          <button class="btn btn-sm btn-outline-success" data-action="generate-invoice" data-id="${t.id}">Invoice</button>
          <button class="btn btn-sm btn-outline-secondary" data-action="preview-rc" data-id="${t.id}">Rate Con</button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete-trip" data-id="${t.id}">Delete</button>
        </td>
      </tr>`).join('') || `<tr><td colspan="11"><div class="empty-state"><strong>No trips yet.</strong>This is where the money starts, tragically through paperwork.</div></td></tr>`}</tbody>
    </table></div>
  `, `<button class="btn btn-primary btn-sm" data-action="new-trip">+ Build Trip</button>`);
}

function renderTripForm({ id } = {}) {
  const t = id ? getTrip(id) : {};
  setTitle(id ? `Edit Trip ${t.tripNo}` : 'Build a Trip', 'Operations');
  const pickups = t.pickups?.length ? t.pickups : [{}];
  const deliveries = t.deliveries?.length ? t.deliveries : [{}];
  return `<section class="form-panel">
    <form data-form="trip">
      <input type="hidden" name="id" value="${escapeHtml(t.id || '')}">
      <div class="form-section-title">Trip Header</div>
      <div class="row g-3">
        ${input('tripNo', 'Trip #', t.tripNo || '(auto)', 'text', false, 'col-md-3')}
        ${selectFromRows('customerId', 'Customer', state.customers, t.customerId, customer => customer.companyName, true, 'col-md-4')}
        ${selectFromRows('carrierId', 'Carrier', state.carriers, t.carrierId, carrier => carrier.legalName, true, 'col-md-4')}
        ${selectInput('status', 'Status', TRIP_STATUSES, t.status || 'draft', false, 'col-md-3')}
        ${selectInput('equipment', 'Equipment', EQUIPMENT, t.equipment, false, 'col-md-3', 'Select equipment')}
        ${input('broker', 'Broker / Owner', t.broker, 'text', false, 'col-md-3', null, 'Example: DGB')}
        ${input('commodity', 'Commodity', t.commodity, 'text', false, 'col-md-3')}
        ${input('pickupDate', 'Pickup Date', t.pickupDate, 'date', false, 'col-md-3')}
        ${input('deliveryDate', 'Delivery Date', t.deliveryDate, 'date', false, 'col-md-3')}
        ${input('pickupNo', 'Pickup #', t.pickupNo, 'text', false, 'col-md-3')}
        ${input('deliveryRef', 'Delivery Ref', t.deliveryRef, 'text', false, 'col-md-3')}
      </div>
      <div class="form-section-title">Financials</div>
      <div class="row g-3">
        ${input('customerRate', 'Customer Rate', t.customerRate || 0, 'number', false, 'col-md-3', '0.01')}
        ${input('carrierRate', 'Carrier Rate', t.carrierRate || 0, 'number', false, 'col-md-3', '0.01')}
        ${input('fuelSurcharge', 'Fuel Surcharge', t.fuelSurcharge || 0, 'number', false, 'col-md-3', '0.01')}
        ${input('additionalCharges', 'Additional Customer Charges', t.additionalCharges || 0, 'number', false, 'col-md-3', '0.01')}
      </div>
      <div class="form-section-title">Freight Details</div>
      <div class="row g-3">
        ${input('weight', 'Weight', t.weight, 'number', false, 'col-md-3', '0.01')}
        ${input('pieceCount', 'Pieces', t.pieceCount, 'number', false, 'col-md-3', '1')}
        ${input('dimensions', 'Dimensions', t.dimensions, 'text', false, 'col-md-6', null, 'Example: 48x40x60')}
      </div>
      <div class="form-section-title">Pickups</div>
      <div id="pickupStops">${pickups.map(stop => stopBox('pickup', stop)).join('')}</div>
      <button type="button" class="btn btn-outline-primary btn-sm no-print" data-action="add-stop" data-type="pickup">+ Add Pickup</button>
      <div class="form-section-title">Deliveries</div>
      <div id="deliveryStops">${deliveries.map(stop => stopBox('delivery', stop)).join('')}</div>
      <button type="button" class="btn btn-outline-primary btn-sm no-print" data-action="add-stop" data-type="delivery">+ Add Delivery</button>
      <div class="form-section-title">Driver / Truck</div>
      <div class="row g-3">
        ${input('driverName', 'Driver Name', t.driverName, 'text', false, 'col-md-3')}
        ${input('driverPhone', 'Driver Phone', t.driverPhone, 'text', false, 'col-md-3')}
        ${input('truckNumber', 'Truck #', t.truckNumber, 'text', false, 'col-md-3')}
        ${input('trailerNumber', 'Trailer #', t.trailerNumber, 'text', false, 'col-md-3')}
        ${textarea('customerNotes', 'Customer Notes / Instructions', t.customerNotes, 'col-md-4')}
        ${textarea('carrierNotes', 'Carrier Notes', t.carrierNotes, 'col-md-4')}
        ${textarea('internalNotes', 'Internal Notes', t.internalNotes, 'col-md-4')}
      </div>
      ${formActions('trips', id ? `<button type="button" class="btn btn-outline-success" data-action="generate-invoice" data-id="${t.id}">Create Invoice</button><button type="button" class="btn btn-outline-secondary" data-action="preview-rc" data-id="${t.id}">Rate Confirmation</button>` : '')}
    </form>
  </section>`;
}

function stopBox(type, stop = {}) {
  return `<div class="stop-box" data-stop-type="${type}">
    <div class="row g-3">
      ${input('company', `${type === 'pickup' ? 'Pickup' : 'Delivery'} Company`, stop.company, 'text', false, 'col-md-3')}
      ${input('address', 'Address', stop.address, 'text', false, 'col-md-4')}
      ${input('city', 'City', stop.city, 'text', false, 'col-md-2')}
      ${input('state', 'State', stop.state, 'text', false, 'col-md-1')}
      ${input('zip', 'ZIP', stop.zip, 'text', false, 'col-md-2')}
      ${input('date', 'Date', stop.date, 'date', false, 'col-md-2')}
      ${input('time', 'Time / Appt', stop.time, 'text', false, 'col-md-2')}
      ${input('contact', 'Contact', stop.contact, 'text', false, 'col-md-2')}
      ${input('phone', 'Phone', stop.phone, 'text', false, 'col-md-2')}
      ${input('ref', 'Ref #', stop.ref, 'text', false, 'col-md-2')}
      ${textarea('notes', 'Notes', stop.notes, 'col-md-2')}
      <div class="col-md-12 no-print"><button type="button" class="btn btn-sm btn-outline-danger" data-action="remove-stop">Remove Stop</button></div>
    </div>
  </div>`;
}

function readStops(type) {
  return $$(`.stop-box[data-stop-type="${type}"]`).map(box => {
    const get = name => $(`[name="${name}"]`, box)?.value.trim() || '';
    return {
      company: get('company'), address: get('address'), city: get('city'), state: get('state'), zip: get('zip'),
      date: get('date'), time: get('time'), contact: get('contact'), phone: get('phone'), ref: get('ref'), notes: get('notes'),
    };
  }).filter(stop => Object.values(stop).some(Boolean));
}

function renderInvoices() {
  setTitle('Invoices', 'Customer billing');
  const rows = filtered(state.invoices, 'invoices', ['invoiceNo', 'notes']);
  return panel('Invoices', 'Create invoices from trips, track balance, and print customer billing documents.', `
    ${moduleToolbar('invoices', 'new-invoice')}
    <div class="table-responsive table-card"><table class="table">
      <thead><tr><th>Invoice #</th><th>Trip</th><th>Customer</th><th>Issue</th><th>Due</th><th class="text-end">Total</th><th class="text-end">Paid</th><th class="text-end">Balance</th><th>Status</th><th class="action-cell">Actions</th></tr></thead>
      <tbody>${rows.map(inv => `<tr>
        <td><a href="#" data-action="preview-invoice" data-id="${inv.id}">${escapeHtml(inv.invoiceNo)}</a></td>
        <td>${escapeHtml(tripNo(inv.tripId))}</td>
        <td>${escapeHtml(customerName(inv.customerId))}</td>
        <td>${displayDate(inv.issueDate)}</td>
        <td>${displayDate(inv.dueDate)}</td>
        <td class="text-end">${money(invoiceTotal(inv))}</td>
        <td class="text-end">${money(invoicePaid(inv.id))}</td>
        <td class="text-end fw-bold">${money(invoiceBalance(inv))}</td>
        <td>${statusBadge(invoiceStatus(inv), labelFrom([['open','Open'],['partial','Partially Paid'],['paid','Paid'],['past_due','Past Due']], invoiceStatus(inv)))}</td>
        <td class="action-cell"><button class="btn btn-sm btn-outline-primary" data-action="edit-invoice" data-id="${inv.id}">Edit</button> <button class="btn btn-sm btn-outline-success" data-action="new-payment" data-invoice="${inv.id}">Pay</button> <button class="btn btn-sm btn-outline-secondary" data-action="preview-invoice" data-id="${inv.id}">Print</button> <button class="btn btn-sm btn-outline-danger" data-action="delete-invoice" data-id="${inv.id}">Delete</button></td>
      </tr>`).join('') || `<tr><td colspan="10"><div class="empty-state"><strong>No invoices.</strong>Generate one from a trip, because apparently carriers like money too.</div></td></tr>`}</tbody>
    </table></div>
  `, `<button class="btn btn-primary btn-sm" data-action="new-invoice">+ New Invoice</button>`);
}

function renderInvoiceForm({ id, tripId } = {}) {
  const inv = id ? getInvoice(id) : {};
  const trip = tripId ? getTrip(tripId) : getTrip(inv.tripId);
  const defaultTerms = Number.parseInt(getCustomer(trip?.customerId)?.paymentTerms, 10) || Number.parseInt(state.settings.defaultPaymentTerms, 10) || 30;
  const issue = inv.issueDate || todayISO();
  const due = inv.dueDate || addDays(issue, defaultTerms);
  setTitle(id ? `Edit Invoice ${inv.invoiceNo}` : 'New Invoice', 'Customer billing');
  return `<section class="form-panel">
    <form data-form="invoice">
      <input type="hidden" name="id" value="${escapeHtml(inv.id || '')}">
      <div class="form-section-title">Invoice Header</div>
      <div class="row g-3">
        ${input('invoiceNo', 'Invoice #', inv.invoiceNo || '(auto)', 'text', false, 'col-md-3')}
        ${selectFromRows('tripId', 'Trip', state.trips, inv.tripId || tripId, t => `${t.tripNo} - ${customerName(t.customerId)}`, true, 'col-md-5')}
        ${input('issueDate', 'Issue Date', issue, 'date', true, 'col-md-2')}
        ${input('dueDate', 'Due Date', due, 'date', false, 'col-md-2')}
        ${input('freightCharge', 'Freight Charge', inv.freightCharge ?? (trip?.customerRate || 0), 'number', false, 'col-md-3', '0.01')}
        ${input('additionalCharges', 'Additional Charges', inv.additionalCharges ?? (trip?.additionalCharges || 0), 'number', false, 'col-md-3', '0.01')}
        ${textarea('notes', 'Invoice Notes', inv.notes || state.settings.invoiceNotes, 'col-md-6')}
      </div>
      ${formActions('invoices', id ? `<button type="button" class="btn btn-outline-secondary" data-action="preview-invoice" data-id="${inv.id}">Preview / Print</button>` : '')}
    </form>
  </section>`;
}

function renderPayments() {
  setTitle('Payments', 'Customer receipts');
  const rows = filtered(state.payments, 'payments', ['reference', 'method', 'receivedFrom', 'memo']);
  return panel('Payments', 'Record customer payments and apply them to invoices.', `
    ${moduleToolbar('payments', 'new-payment')}
    <div class="table-responsive table-card"><table class="table">
      <thead><tr><th>Date</th><th>Invoice</th><th>Received From</th><th>Method</th><th>Reference</th><th class="text-end">Amount</th><th class="action-cell">Actions</th></tr></thead>
      <tbody>${rows.map(p => `<tr>
        <td>${displayDate(p.date)}</td>
        <td>${escapeHtml(getInvoice(p.invoiceId)?.invoiceNo || '')}</td>
        <td>${escapeHtml(p.receivedFrom || customerName(getInvoice(p.invoiceId)?.customerId))}</td>
        <td>${escapeHtml(p.method)}</td>
        <td>${escapeHtml(p.reference)}</td>
        <td class="text-end">${money(p.amount)}</td>
        <td class="action-cell"><button class="btn btn-sm btn-outline-primary" data-action="edit-payment" data-id="${p.id}">Edit</button> <button class="btn btn-sm btn-outline-danger" data-action="delete-payment" data-id="${p.id}">Delete</button></td>
      </tr>`).join('') || `<tr><td colspan="7"><div class="empty-state"><strong>No payments.</strong>Receivables without receipts: the ancient accounting tragedy.</div></td></tr>`}</tbody>
    </table></div>
  `, `<button class="btn btn-primary btn-sm" data-action="new-payment">+ Record Payment</button>`);
}

function renderPaymentForm({ id, invoiceId } = {}) {
  const p = id ? state.payments.find(row => row.id === id) : {};
  const inv = getInvoice(invoiceId || p.invoiceId);
  setTitle(id ? 'Edit Payment' : 'Record Payment', 'Customer receipts');
  return `<section class="form-panel">
    <form data-form="payment">
      <input type="hidden" name="id" value="${escapeHtml(p.id || '')}">
      <div class="row g-3">
        ${selectFromRows('invoiceId', 'Invoice', state.invoices, p.invoiceId || invoiceId, inv => `${inv.invoiceNo} - ${customerName(inv.customerId)} - Balance ${money(invoiceBalance(inv))}`, true, 'col-md-6')}
        ${input('date', 'Payment Date', p.date || todayISO(), 'date', true, 'col-md-3')}
        ${selectInput('method', 'Method', PAYMENT_METHODS, p.method || 'ACH', false, 'col-md-3')}
        ${input('receivedFrom', 'Received From', p.receivedFrom || customerName(inv?.customerId), 'text', false, 'col-md-4')}
        ${input('amount', 'Amount', p.amount || Math.max(invoiceBalance(inv || {}), 0), 'number', true, 'col-md-4', '0.01')}
        ${input('reference', 'Reference / Check #', p.reference, 'text', false, 'col-md-4')}
        ${textarea('memo', 'Memo', p.memo, 'col-12')}
      </div>
      ${formActions('payments')}
    </form>
  </section>`;
}

function renderPayables() {
  setTitle('Carrier Pay', 'Accounts payable');
  const rows = filtered(state.payables, 'payables', ['billNo', 'reference', 'notes']);
  return panel('Carrier Pay', 'Track carrier bills, payments, balances, and quick-pay status.', `
    ${moduleToolbar('payables', 'new-payable')}
    <div class="table-responsive table-card"><table class="table">
      <thead><tr><th>Bill #</th><th>Trip</th><th>Carrier</th><th>Invoice Date</th><th>Due</th><th class="text-end">Amount</th><th class="text-end">Paid</th><th class="text-end">Balance</th><th>Status</th><th class="action-cell">Actions</th></tr></thead>
      <tbody>${rows.map(b => `<tr>
        <td><a href="#" data-action="edit-payable" data-id="${b.id}">${escapeHtml(b.billNo)}</a></td>
        <td>${escapeHtml(tripNo(b.tripId))}</td>
        <td>${escapeHtml(carrierName(b.carrierId))}</td>
        <td>${displayDate(b.invoiceDate)}</td>
        <td>${displayDate(b.dueDate)}</td>
        <td class="text-end">${money(b.amount)}</td>
        <td class="text-end">${money(b.paidAmount)}</td>
        <td class="text-end fw-bold">${money(payableBalance(b))}</td>
        <td>${statusBadge(payableStatus(b), labelFrom([['open','Open'],['partial','Partially Paid'],['paid','Paid'],['past_due','Past Due']], payableStatus(b)))}</td>
        <td class="action-cell"><button class="btn btn-sm btn-outline-primary" data-action="edit-payable" data-id="${b.id}">Edit</button> <button class="btn btn-sm btn-outline-success" data-action="mark-payable-paid" data-id="${b.id}">Mark Paid</button> <button class="btn btn-sm btn-outline-danger" data-action="delete-payable" data-id="${b.id}">Delete</button></td>
      </tr>`).join('') || `<tr><td colspan="10"><div class="empty-state"><strong>No carrier payables.</strong>Saving a trip with a carrier rate can create one automatically.</div></td></tr>`}</tbody>
    </table></div>
  `, `<button class="btn btn-primary btn-sm" data-action="new-payable">+ Add Carrier Bill</button>`);
}

function renderPayableForm({ id, tripId } = {}) {
  const b = id ? getPayable(id) : {};
  const trip = tripId ? getTrip(tripId) : getTrip(b.tripId);
  const issue = b.invoiceDate || todayISO();
  const due = b.dueDate || addDays(issue, 30);
  setTitle(id ? `Edit Carrier Bill ${b.billNo}` : 'Add Carrier Bill', 'Carrier pay');
  return `<section class="form-panel">
    <form data-form="payable">
      <input type="hidden" name="id" value="${escapeHtml(b.id || '')}">
      <div class="row g-3">
        ${input('billNo', 'Bill #', b.billNo || (trip ? `BILL-${trip.tripNo}` : ''), 'text', false, 'col-md-3')}
        ${selectFromRows('tripId', 'Trip', state.trips, b.tripId || tripId, t => `${t.tripNo} - ${carrierName(t.carrierId)}`, true, 'col-md-5')}
        ${selectFromRows('carrierId', 'Carrier', state.carriers, b.carrierId || trip?.carrierId, c => c.legalName, true, 'col-md-4')}
        ${input('invoiceDate', 'Invoice Date', issue, 'date', false, 'col-md-3')}
        ${input('dueDate', 'Due Date', due, 'date', false, 'col-md-3')}
        ${input('amount', 'Amount', b.amount ?? (trip?.carrierRate || 0), 'number', true, 'col-md-3', '0.01')}
        ${input('paidAmount', 'Paid Amount', b.paidAmount || 0, 'number', false, 'col-md-3', '0.01')}
        ${selectInput('method', 'Payment Method', PAYMENT_METHODS, b.method, false, 'col-md-3', 'Select method')}
        ${input('paidDate', 'Paid Date', b.paidDate, 'date', false, 'col-md-3')}
        ${input('reference', 'Reference', b.reference, 'text', false, 'col-md-6')}
        ${textarea('notes', 'Notes', b.notes, 'col-12')}
      </div>
      ${formActions('payables')}
    </form>
  </section>`;
}

function renderReports() {
  setTitle('Reports', 'Receivables, payables, and margin');
  const aging = agingBuckets();
  const marginRows = [...state.trips].sort((a, b) => tripMargin(b) - tripMargin(a)).slice(0, 20);
  const carrierBalances = state.carriers.map(c => ({ carrier: c, balance: state.payables.filter(b => b.carrierId === c.id).reduce((sum, b) => sum + Math.max(payableBalance(b), 0), 0) })).filter(row => row.balance > 0);
  return `
    <div class="row g-3">
      <div class="col-lg-6">${panel('A/R Aging', 'Outstanding customer balances by days past due.', `<div class="table-responsive table-card"><table class="table"><thead><tr><th>Bucket</th><th class="text-end">Balance</th></tr></thead><tbody>${aging.map(row => `<tr><td>${row.label}</td><td class="text-end fw-bold">${money(row.total)}</td></tr>`).join('')}</tbody></table></div>`, `<button class="btn btn-outline-secondary btn-sm" data-action="export-csv" data-key="invoices">Export invoices</button>`)}</div>
      <div class="col-lg-6">${panel('Carrier Payables', 'Open payable balance by carrier.', `<div class="table-responsive table-card"><table class="table"><thead><tr><th>Carrier</th><th class="text-end">Open Balance</th></tr></thead><tbody>${carrierBalances.map(row => `<tr><td>${escapeHtml(row.carrier.legalName)}</td><td class="text-end fw-bold">${money(row.balance)}</td></tr>`).join('') || `<tr><td colspan="2">No open carrier balances.</td></tr>`}</tbody></table></div>`, `<button class="btn btn-outline-secondary btn-sm" data-action="export-csv" data-key="payables">Export payables</button>`)}</div>
    </div>
    ${panel('Trip Margin', 'Customer rate minus carrier rate. Brutal little arithmetic, very useful.', `<div class="table-responsive table-card"><table class="table"><thead><tr><th>Trip</th><th>Customer</th><th>Carrier</th><th class="text-end">Customer Rate</th><th class="text-end">Carrier Rate</th><th class="text-end">Margin</th><th class="text-end">Margin %</th></tr></thead><tbody>${marginRows.map(t => {
      const pct = numberOrZero(t.customerRate) ? (tripMargin(t) / numberOrZero(t.customerRate)) * 100 : 0;
      return `<tr><td>${escapeHtml(t.tripNo)}</td><td>${escapeHtml(customerName(t.customerId))}</td><td>${escapeHtml(carrierName(t.carrierId))}</td><td class="text-end">${money(t.customerRate)}</td><td class="text-end">${money(t.carrierRate)}</td><td class="text-end fw-bold">${money(tripMargin(t))}</td><td class="text-end">${pct.toFixed(1)}%</td></tr>`;
    }).join('') || `<tr><td colspan="7">No trips.</td></tr>`}</tbody></table></div>`, `<button class="btn btn-outline-secondary btn-sm" data-action="export-csv" data-key="trips">Export trips</button>`)}
  `;
}

function agingBuckets() {
  const buckets = [
    { label: 'Current', min: -Infinity, max: 0, total: 0 },
    { label: '1-30 Days', min: 1, max: 30, total: 0 },
    { label: '31-60 Days', min: 31, max: 60, total: 0 },
    { label: '61-90 Days', min: 61, max: 90, total: 0 },
    { label: '91+ Days', min: 91, max: Infinity, total: 0 },
  ];
  const today = new Date(`${todayISO()}T12:00:00`);
  state.invoices.forEach(inv => {
    const balance = Math.max(invoiceBalance(inv), 0);
    if (!balance) return;
    const due = inv.dueDate ? new Date(`${inv.dueDate}T12:00:00`) : today;
    const days = Math.floor((today - due) / 86400000);
    const bucket = buckets.find(row => days >= row.min && days <= row.max) || buckets.at(-1);
    bucket.total += balance;
  });
  return buckets;
}

function renderSettings() {
  setTitle('Settings', 'Company setup and backups');
  return `<section class="form-panel">
    <form data-form="settings">
      <div class="form-section-title">Company Profile</div>
      <div class="row g-3">
        ${input('companyName', 'Company Name', state.settings.companyName, 'text', true, 'col-md-4')}
        ${input('tagline', 'Tagline', state.settings.tagline, 'text', false, 'col-md-4')}
        ${input('phone', 'Phone', state.settings.phone, 'text', false, 'col-md-2')}
        ${input('email', 'Email', state.settings.email, 'email', false, 'col-md-2')}
        ${input('website', 'Website', state.settings.website, 'text', false, 'col-md-4')}
        ${input('address1', 'Address', state.settings.address1, 'text', false, 'col-md-5')}
        ${input('address2', 'Address 2', state.settings.address2, 'text', false, 'col-md-3')}
        ${input('city', 'City', state.settings.city, 'text', false, 'col-md-3')}
        ${input('state', 'State', state.settings.state, 'text', false, 'col-md-2')}
        ${input('zip', 'ZIP', state.settings.zip, 'text', false, 'col-md-2')}
      </div>
      <div class="form-section-title">Numbering and Defaults</div>
      <div class="row g-3">
        ${input('nextTripNumber', 'Next Trip Number', state.settings.nextTripNumber, 'number', true, 'col-md-3')}
        ${input('nextInvoiceNumber', 'Next Invoice Number', state.settings.nextInvoiceNumber, 'number', true, 'col-md-3')}
        ${input('nextRateConfirmationNumber', 'Next Rate Confirmation #', state.settings.nextRateConfirmationNumber, 'number', true, 'col-md-3')}
        ${input('defaultPaymentTerms', 'Default Payment Terms / Days', state.settings.defaultPaymentTerms, 'number', true, 'col-md-3')}
        ${textarea('brokers', 'Broker List', state.settings.brokers, 'col-md-4')}
        ${textarea('invoiceNotes', 'Default Invoice Notes', state.settings.invoiceNotes, 'col-md-4')}
        ${textarea('rateConfirmationTerms', 'Default Rate Confirmation Terms', state.settings.rateConfirmationTerms, 'col-md-4')}
      </div>
      <div class="mt-4 d-flex gap-2 flex-wrap no-print">
        <button class="btn btn-primary" type="submit">Save Settings</button>
        <button class="btn btn-outline-secondary" type="button" data-action="backup-json">Backup JSON</button>
        <button class="btn btn-outline-secondary" type="button" data-action="restore-json">Restore JSON</button>
        <button class="btn btn-outline-primary" type="button" data-action="seed-demo">Load Demo Data</button>
        <button class="btn btn-outline-danger" type="button" data-action="clear-data">Clear All Data</button>
        <input type="file" id="restoreFile" accept="application/json" class="d-none">
      </div>
    </form>
  </section>`;
}

function renderInvoicePreview({ id } = {}) {
  const inv = getInvoice(id);
  if (!inv) return `<div class="alert alert-danger">Invoice not found.</div>`;
  setTitle(`Invoice ${inv.invoiceNo}`, 'Preview and print');
  return `${documentActions('invoices')}<div class="doc-preview">${invoiceDocumentHTML(inv)}</div>`;
}

function renderRateConfirmationPreview({ tripId } = {}) {
  const trip = getTrip(tripId);
  if (!trip) return `<div class="alert alert-danger">Trip not found.</div>`;
  const rc = ensureRateConfirmation(trip.id);
  setTitle(`Rate Confirmation ${rc.number}`, 'Preview and print');
  return `${documentActions('trips')}<div class="doc-preview">${rateConfirmationHTML(trip, rc)}</div>`;
}

function documentActions(backView) {
  return `<div class="panel no-print"><div class="toolbar"><div class="toolbar-left"><button class="btn btn-secondary" data-action="nav" data-view="${backView}">Back</button></div><div class="toolbar-right"><button class="btn btn-primary" data-action="print-page">Print / Save PDF</button></div></div></div>`;
}

function input(name, label, value = '', type = 'text', required = false, col = 'col-md-4', step = null, placeholder = '') {
  return `<div class="${col}"><label class="form-label" for="${name}">${label}${required ? ' *' : ''}</label><input class="form-control" id="${name}" name="${name}" type="${type}" value="${escapeHtml(value ?? '')}" ${required ? 'required' : ''} ${step ? `step="${step}"` : ''} ${placeholder ? `placeholder="${escapeHtml(placeholder)}"` : ''}></div>`;
}
function textarea(name, label, value = '', col = 'col-md-4') {
  return `<div class="${col}"><label class="form-label" for="${name}">${label}</label><textarea class="form-control" id="${name}" name="${name}">${escapeHtml(value ?? '')}</textarea></div>`;
}
function selectInput(name, label, options, selected = '', required = false, col = 'col-md-4', empty = '') {
  return `<div class="${col}"><label class="form-label" for="${name}">${label}${required ? ' *' : ''}</label><select class="form-select" id="${name}" name="${name}" ${required ? 'required' : ''}>${staticOptions(options, selected, empty)}</select></div>`;
}
function selectFromRows(name, label, rows, selected, labelFn, required = false, col = 'col-md-4') {
  return `<div class="${col}"><label class="form-label" for="${name}">${label}${required ? ' *' : ''}</label><select class="form-select" id="${name}" name="${name}" ${required ? 'required' : ''}>${selectOptions(rows, selected, labelFn)}</select></div>`;
}
function formActions(cancelView, extra = '') {
  return `<div class="mt-4 d-flex gap-2 flex-wrap no-print"><button class="btn btn-primary" type="submit">Save</button>${extra}<button class="btn btn-outline-secondary" type="button" data-action="nav" data-view="${cancelView}">Cancel</button></div>`;
}

function customerAddress(customer) {
  if (!customer) return '';
  return [customer.address1, customer.address2, [customer.city, customer.state, customer.zip].filter(Boolean).join(', '), customer.country].filter(Boolean).join('<br>');
}
function stopAddress(stop) {
  if (!stop) return '';
  return [stop.company, stop.address, [stop.city, stop.state, stop.zip].filter(Boolean).join(', '), stop.contact ? `Contact: ${stop.contact}` : '', stop.phone ? `Phone: ${stop.phone}` : '', stop.ref ? `Ref: ${stop.ref}` : '', stop.notes].filter(Boolean).map(escapeHtml).join('<br>');
}
function companyBlock() {
  const s = state.settings;
  return `<strong>${escapeHtml(s.companyName)}</strong><br>${[s.address1, s.address2, [s.city, s.state, s.zip].filter(Boolean).join(', ')].filter(Boolean).map(escapeHtml).join('<br>')}<br>${escapeHtml(s.phone || '')}${s.email ? `<br>${escapeHtml(s.email)}` : ''}${s.website ? `<br>${escapeHtml(s.website)}` : ''}`;
}

function invoiceDocumentHTML(inv) {
  const trip = getTrip(inv.tripId) || {};
  const customer = getCustomer(inv.customerId) || getCustomer(trip.customerId) || {};
  const total = invoiceTotal(inv);
  const paid = invoicePaid(inv.id);
  const balance = invoiceBalance(inv);
  return `<div class="doc-header"><div>${companyBlock()}</div><div class="text-end"><div class="doc-title">INVOICE</div><div><strong>${escapeHtml(inv.invoiceNo)}</strong></div><div>Issue: ${displayDate(inv.issueDate)}</div><div>Due: ${displayDate(inv.dueDate)}</div></div></div>
    <div class="row g-3">
      <div class="col-md-6"><div class="doc-box"><strong>Bill To</strong><br>${escapeHtml(customer.companyName || '')}<br>${customerAddress(customer)}</div></div>
      <div class="col-md-6"><div class="doc-box"><strong>Trip</strong><br>Trip #: ${escapeHtml(trip.tripNo || '')}<br>Pickup: ${displayDate(trip.pickupDate)}<br>Delivery: ${displayDate(trip.deliveryDate)}<br>Commodity: ${escapeHtml(trip.commodity || '')}</div></div>
    </div>
    <table class="doc-table"><thead><tr><th>Description</th><th class="text-end">Amount</th></tr></thead><tbody>
      <tr><td>Freight charge for trip ${escapeHtml(trip.tripNo || '')}</td><td class="text-end">${money(inv.freightCharge)}</td></tr>
      <tr><td>Additional charges</td><td class="text-end">${money(inv.additionalCharges)}</td></tr>
      <tr><th>Total</th><th class="text-end">${money(total)}</th></tr>
      <tr><td>Payments Applied</td><td class="text-end">${money(paid)}</td></tr>
      <tr><th>Balance Due</th><th class="text-end">${money(balance)}</th></tr>
    </tbody></table>
    <div class="row g-3">
      <div class="col-md-6"><div class="doc-box"><strong>Pickup Stops</strong><br>${(trip.pickups || []).map(stopAddress).join('<hr>') || 'N/A'}</div></div>
      <div class="col-md-6"><div class="doc-box"><strong>Delivery Stops</strong><br>${(trip.deliveries || []).map(stopAddress).join('<hr>') || 'N/A'}</div></div>
    </div>
    <div class="doc-box"><strong>Notes</strong><br>${escapeHtml(inv.notes || state.settings.invoiceNotes)}</div>`;
}

function ensureRateConfirmation(tripId) {
  let rc = state.rateConfirmations.find(row => row.tripId === tripId);
  if (!rc) {
    rc = { id: uid('rc'), tripId, number: nextSequence('rateConfirmation'), createdAt: new Date().toISOString() };
    state.rateConfirmations.push(rc);
    saveState();
  }
  return rc;
}

function rateConfirmationHTML(trip, rc) {
  const carrier = getCarrier(trip.carrierId) || {};
  const customer = getCustomer(trip.customerId) || {};
  return `<div class="doc-header"><div>${companyBlock()}</div><div class="text-end"><div class="doc-title">RATE CONFIRMATION</div><div><strong>${escapeHtml(rc.number)}</strong></div><div>Trip: ${escapeHtml(trip.tripNo)}</div><div>Date: ${displayDate(todayISO())}</div></div></div>
    <div class="row g-3">
      <div class="col-md-6"><div class="doc-box"><strong>Carrier</strong><br>${escapeHtml(carrier.legalName || '')}<br>MC: ${escapeHtml(carrier.mcNumber || '')}<br>DOT: ${escapeHtml(carrier.dotNumber || '')}<br>Dispatch: ${escapeHtml(carrier.dispatchPhone || carrier.dispatchEmail || '')}</div></div>
      <div class="col-md-6"><div class="doc-box"><strong>Load Summary</strong><br>Customer: ${escapeHtml(customer.companyName || '')}<br>Equipment: ${escapeHtml(trip.equipment || '')}<br>Commodity: ${escapeHtml(trip.commodity || '')}<br>Weight: ${escapeHtml(trip.weight || '')}</div></div>
    </div>
    <table class="doc-table"><thead><tr><th>Pickup Stops</th><th>Delivery Stops</th></tr></thead><tbody><tr><td>${(trip.pickups || []).map(stopAddress).join('<hr>') || 'N/A'}</td><td>${(trip.deliveries || []).map(stopAddress).join('<hr>') || 'N/A'}</td></tr></tbody></table>
    <table class="doc-table"><tbody>
      <tr><th>Carrier Rate</th><td class="text-end"><strong>${money(trip.carrierRate)}</strong></td></tr>
      <tr><th>Pickup #</th><td>${escapeHtml(trip.pickupNo || '')}</td></tr>
      <tr><th>Delivery Ref</th><td>${escapeHtml(trip.deliveryRef || '')}</td></tr>
      <tr><th>Driver</th><td>${escapeHtml([trip.driverName, trip.driverPhone].filter(Boolean).join(' / '))}</td></tr>
      <tr><th>Truck / Trailer</th><td>${escapeHtml([trip.truckNumber, trip.trailerNumber].filter(Boolean).join(' / '))}</td></tr>
    </tbody></table>
    <div class="doc-box"><strong>Carrier Instructions</strong><br>${escapeHtml(trip.carrierNotes || state.settings.rateConfirmationTerms)}</div>
    <table class="doc-table"><tbody><tr><td style="height:70px;"><strong>Carrier Signature</strong></td><td style="height:70px;"><strong>Date</strong></td></tr></tbody></table>`;
}

function generateInvoiceFromTrip(tripId) {
  const trip = getTrip(tripId);
  if (!trip) return notify('Trip not found.', 'danger');
  let inv = state.invoices.find(row => row.tripId === trip.id);
  if (!inv) {
    const customer = getCustomer(trip.customerId);
    const issueDate = todayISO();
    const terms = Number.parseInt(customer?.paymentTerms, 10) || Number.parseInt(state.settings.defaultPaymentTerms, 10) || 30;
    inv = {
      id: uid('inv'),
      invoiceNo: nextSequence('invoice'),
      tripId: trip.id,
      customerId: trip.customerId,
      issueDate,
      dueDate: addDays(issueDate, terms),
      freightCharge: numberOrZero(trip.customerRate),
      additionalCharges: numberOrZero(trip.additionalCharges),
      notes: state.settings.invoiceNotes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    state.invoices.push(inv);
    saveState();
    notify(`Invoice ${inv.invoiceNo} created from trip ${trip.tripNo}.`);
  } else {
    notify(`Invoice ${inv.invoiceNo} already exists for this trip.`, 'info');
  }
  renderApp('invoiceDoc', { id: inv.id });
}

function syncPayableForTrip(trip) {
  if (!numberOrZero(trip.carrierRate) || !trip.carrierId) return;
  let bill = state.payables.find(row => row.tripId === trip.id && row.autoCreated);
  const base = {
    tripId: trip.id,
    carrierId: trip.carrierId,
    amount: numberOrZero(trip.carrierRate),
    invoiceDate: todayISO(),
    dueDate: addDays(todayISO(), 30),
    notes: `Auto-created from trip ${trip.tripNo}`,
    updatedAt: new Date().toISOString(),
  };
  if (!bill) {
    state.payables.push({ id: uid('bill'), billNo: `BILL-${trip.tripNo}`, paidAmount: 0, method: '', paidDate: '', reference: '', autoCreated: true, createdAt: new Date().toISOString(), ...base });
  } else if (payableBalance(bill) === numberOrZero(bill.amount)) {
    Object.assign(bill, base);
  }
}

function handleFormSubmit(form) {
  const type = form.dataset.form;
  const data = formObject(form);
  if (type === 'customer') {
    const row = { ...data, updatedAt: new Date().toISOString() };
    if (data.id) Object.assign(getCustomer(data.id), row);
    else state.customers.push({ ...row, id: uid('cust'), createdAt: new Date().toISOString() });
    saveState(); notify('Customer saved.'); renderApp('customers');
  }
  if (type === 'carrier') {
    const equipment = new FormData(form).getAll('equipment');
    const row = { ...data, equipment, updatedAt: new Date().toISOString() };
    if (data.id) Object.assign(getCarrier(data.id), row);
    else state.carriers.push({ ...row, id: uid('car'), createdAt: new Date().toISOString() });
    saveState(); notify('Carrier saved.'); renderApp('carriers');
  }
  if (type === 'trip') {
    const row = { ...data, pickups: readStops('pickup'), deliveries: readStops('delivery'), updatedAt: new Date().toISOString() };
    if (!row.tripNo || row.tripNo === '(auto)') row.tripNo = nextSequence('trip');
    if (data.id) Object.assign(getTrip(data.id), row);
    else state.trips.push({ ...row, id: uid('trip'), createdAt: new Date().toISOString() });
    const savedTrip = data.id ? getTrip(data.id) : state.trips.at(-1);
    syncPayableForTrip(savedTrip);
    saveState(); notify(`Trip ${savedTrip.tripNo} saved.`); renderApp('trips');
  }
  if (type === 'invoice') {
    const trip = getTrip(data.tripId);
    const row = { ...data, customerId: trip?.customerId || data.customerId || '', updatedAt: new Date().toISOString() };
    if (!row.invoiceNo || row.invoiceNo === '(auto)') row.invoiceNo = nextSequence('invoice');
    if (data.id) Object.assign(getInvoice(data.id), row);
    else state.invoices.push({ ...row, id: uid('inv'), createdAt: new Date().toISOString() });
    saveState(); notify('Invoice saved.'); renderApp('invoices');
  }
  if (type === 'payment') {
    const row = { ...data, updatedAt: new Date().toISOString() };
    if (data.id) Object.assign(state.payments.find(p => p.id === data.id), row);
    else state.payments.push({ ...row, id: uid('pay'), createdAt: new Date().toISOString() });
    saveState(); notify('Payment recorded.'); renderApp('payments');
  }
  if (type === 'payable') {
    const row = { ...data, autoCreated: false, updatedAt: new Date().toISOString() };
    if (!row.billNo) row.billNo = `BILL-${tripNo(row.tripId)}`;
    if (data.id) Object.assign(getPayable(data.id), row);
    else state.payables.push({ ...row, id: uid('bill'), createdAt: new Date().toISOString() });
    saveState(); notify('Carrier bill saved.'); renderApp('payables');
  }
  if (type === 'settings') {
    state.settings = { ...state.settings, ...data };
    saveState(); notify('Settings saved.'); renderApp('settings');
  }
}

function canDeleteCustomer(id) {
  return !state.trips.some(t => t.customerId === id) && !state.invoices.some(i => i.customerId === id);
}
function canDeleteCarrier(id) {
  return !state.trips.some(t => t.carrierId === id) && !state.payables.some(b => b.carrierId === id);
}

function deleteRow(key, id) {
  const labels = { customers: 'customer', carriers: 'carrier', trips: 'trip', invoices: 'invoice', payments: 'payment', payables: 'carrier bill' };
  if (key === 'customers' && !canDeleteCustomer(id)) return notify('This customer is used by trips or invoices. Change those records before deleting it.', 'warning');
  if (key === 'carriers' && !canDeleteCarrier(id)) return notify('This carrier is used by trips or payables. Change those records before deleting it.', 'warning');
  if (!confirm(`Delete this ${labels[key]}?`)) return;
  state[key] = state[key].filter(row => row.id !== id);
  if (key === 'trips') {
    state.invoices = state.invoices.filter(row => row.tripId !== id);
    state.payables = state.payables.filter(row => row.tripId !== id);
    state.rateConfirmations = state.rateConfirmations.filter(row => row.tripId !== id);
  }
  if (key === 'invoices') state.payments = state.payments.filter(row => row.invoiceId !== id);
  saveState(); notify(`${labels[key]} deleted.`); renderApp(key);
}

function markPayablePaid(id) {
  const bill = getPayable(id);
  if (!bill) return;
  bill.paidAmount = bill.amount;
  bill.paidDate = todayISO();
  bill.method = bill.method || 'ACH';
  bill.updatedAt = new Date().toISOString();
  saveState(); notify('Carrier bill marked paid.'); renderApp('payables');
}

function seedDemo() {
  if ((state.customers.length || state.carriers.length || state.trips.length) && !confirm('Load demo data? Existing data will stay, demo records will be added.')) return;
  const customerId = uid('cust');
  const carrierId = uid('car');
  const tripId = uid('trip');
  const invId = uid('inv');
  state.customers.push({ id: customerId, companyName: 'Wasatch Manufacturing', dbaName: '', contactName: 'Sarah Jensen', phone: '(801) 555-0191', email: 'shipping@wasatchmfg.com', billingEmail: 'ap@wasatchmfg.com', paymentTerms: '30 days', creditLimit: 25000, status: 'active', address1: '1200 Industrial Way', city: 'Salt Lake City', state: 'UT', zip: '84104', country: 'US', notes: 'Demo customer', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  state.carriers.push({ id: carrierId, legalName: 'Mountain Line Carriers LLC', dbaName: '', mcNumber: 'MC123456', dotNumber: 'DOT789123', dispatchName: 'Mike Ramos', dispatchPhone: '(801) 555-0177', dispatchEmail: 'dispatch@mountainline.example', accountingEmail: 'billing@mountainline.example', paymentTerms: '30 days', insuranceExpiration: addDays(todayISO(), 90), cargoInsurance: 250000, autoLiability: 1000000, status: 'approved', equipment: ['Flatbed', 'Step Deck'], city: 'Ogden', state: 'UT', notes: 'Demo carrier', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  state.trips.push({ id: tripId, tripNo: nextSequence('trip'), customerId, carrierId, status: 'booked', equipment: 'Flatbed', broker: 'DGB', commodity: 'Steel components', pickupDate: todayISO(), deliveryDate: addDays(todayISO(), 2), pickupNo: 'PU-88421', deliveryRef: 'DEL-5501', customerRate: 2700, carrierRate: 2100, fuelSurcharge: 0, additionalCharges: 0, weight: 18500, pieceCount: 6, dimensions: 'Partial flatbed', pickups: [{ company: 'Wasatch Manufacturing', address: '1200 Industrial Way', city: 'Salt Lake City', state: 'UT', zip: '84104', date: todayISO(), time: '08:00', contact: 'Sarah Jensen', phone: '(801) 555-0191', ref: 'PU-88421', notes: 'Call 30 minutes before arrival' }], deliveries: [{ company: 'Front Range Distribution', address: '4500 Logistics Dr', city: 'Denver', state: 'CO', zip: '80216', date: addDays(todayISO(), 2), time: '10:00', contact: 'Receiving', phone: '(303) 555-0100', ref: 'DEL-5501', notes: 'Flatbed receiving dock' }], driverName: 'Carlos Vega', driverPhone: '(801) 555-0110', truckNumber: 'ML-204', trailerNumber: 'FB-77', carrierNotes: state.settings.rateConfirmationTerms, internalNotes: 'Demo trip', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  state.invoices.push({ id: invId, invoiceNo: nextSequence('invoice'), tripId, customerId, issueDate: todayISO(), dueDate: addDays(todayISO(), 30), freightCharge: 2700, additionalCharges: 0, notes: state.settings.invoiceNotes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  state.payments.push({ id: uid('pay'), invoiceId: invId, date: todayISO(), method: 'ACH', receivedFrom: 'Wasatch Manufacturing', amount: 1000, reference: 'ACH-DEMO-1', memo: 'Partial payment demo', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  state.payables.push({ id: uid('bill'), billNo: `BILL-${state.trips.at(-1).tripNo}`, tripId, carrierId, invoiceDate: todayISO(), dueDate: addDays(todayISO(), 30), amount: 2100, paidAmount: 0, method: '', paidDate: '', reference: '', notes: 'Demo carrier bill', autoCreated: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  saveState(); notify('Demo data loaded.'); renderApp('dashboard');
}

function clearData() {
  if (!confirm('This will erase all local browser data for this TMS. Backup first unless you enjoy preventable disasters. Continue?')) return;
  state = defaultState();
  saveState(); notify('All data cleared.'); renderApp('dashboard');
}

document.addEventListener('submit', event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  handleFormSubmit(form);
});

document.addEventListener('input', event => {
  const search = event.target.closest('[data-search]');
  if (!search) return;
  searchTerms[search.dataset.search] = search.value;
  window.clearTimeout(search._timer);
  search._timer = window.setTimeout(() => renderApp(activeView, activePayload), 180);
});

document.addEventListener('change', event => {
  if (event.target.id === 'restoreFile' && event.target.files?.[0]) importJSON(event.target.files[0]);
});

document.addEventListener('click', event => {
  const actionEl = event.target.closest('[data-action]');
  if (!actionEl) return;
  event.preventDefault();
  const { action, id, view, key, type, invoice, trip } = actionEl.dataset;

  if (action === 'nav') return renderApp(view || 'dashboard');
  if (action === 'new-customer') return renderApp('customerForm');
  if (action === 'edit-customer') return renderApp('customerForm', { id });
  if (action === 'delete-customer') return deleteRow('customers', id);
  if (action === 'new-carrier') return renderApp('carrierForm');
  if (action === 'edit-carrier') return renderApp('carrierForm', { id });
  if (action === 'delete-carrier') return deleteRow('carriers', id);
  if (action === 'new-trip') return renderApp('tripForm');
  if (action === 'edit-trip') return renderApp('tripForm', { id });
  if (action === 'delete-trip') return deleteRow('trips', id);
  if (action === 'new-invoice') return renderApp('invoiceForm', { tripId: trip });
  if (action === 'edit-invoice') return renderApp('invoiceForm', { id });
  if (action === 'delete-invoice') return deleteRow('invoices', id);
  if (action === 'generate-invoice') return generateInvoiceFromTrip(id);
  if (action === 'preview-invoice') return renderApp('invoiceDoc', { id });
  if (action === 'new-payment') return renderApp('paymentForm', { invoiceId: invoice });
  if (action === 'edit-payment') return renderApp('paymentForm', { id });
  if (action === 'delete-payment') return deleteRow('payments', id);
  if (action === 'new-payable') return renderApp('payableForm', { tripId: trip });
  if (action === 'edit-payable') return renderApp('payableForm', { id });
  if (action === 'delete-payable') return deleteRow('payables', id);
  if (action === 'mark-payable-paid') return markPayablePaid(id);
  if (action === 'preview-rc') return renderApp('rateConfirmationDoc', { tripId: id });
  if (action === 'add-stop') return $(`#${type}Stops`).insertAdjacentHTML('beforeend', stopBox(type, {}));
  if (action === 'remove-stop') return actionEl.closest('.stop-box')?.remove();
  if (action === 'export-csv') return exportCSV(key);
  if (action === 'backup-json') return backupJSON();
  if (action === 'restore-json') return $('#restoreFile')?.click();
  if (action === 'seed-demo') return seedDemo();
  if (action === 'clear-data') return clearData();
  if (action === 'print-page') return window.print();
});

$('#quickNewTrip').addEventListener('click', () => renderApp('tripForm'));
$('#backupNow').addEventListener('click', backupJSON);

renderApp('dashboard');
