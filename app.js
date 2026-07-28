'use strict';

const STORAGE_KEY = 'negocioSimpleDataV1';
const money = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 });
const dateTimeFormatter = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' });
const shortDateFormatter = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' });

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const uid = prefix => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const nowLocalInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
const toNumber = value => Number.parseFloat(value) || 0;
const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

const seed = () => {
  const today = new Date();
  const iso = (daysAgo, hour, minute = 0) => {
    const d = new Date(today);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  return {
    products: [
      { id: 'p1', barcode: '7750001000011', name: 'Gaseosa personal', price: 3.5, cost: 2.1, stock: 24, minStock: 8 },
      { id: 'p2', barcode: '7750001000028', name: 'Agua mineral', price: 2.5, cost: 1.3, stock: 6, minStock: 8 },
      { id: 'p3', barcode: '7750001000035', name: 'Galletas surtidas', price: 2, cost: 1.15, stock: 15, minStock: 5 },
      { id: 'p4', barcode: '7750001000042', name: 'Leche evaporada', price: 4.8, cost: 3.7, stock: 3, minStock: 6 },
      { id: 'p5', barcode: '7750001000059', name: 'Arroz 1 kg', price: 5.2, cost: 4.1, stock: 18, minStock: 5 }
    ],
    clients: [
      { id: 'c1', name: 'María Torres', phone: '987 654 321', note: 'Cliente frecuente' },
      { id: 'c2', name: 'Carlos Peña', phone: '956 220 118', note: '' },
      { id: 'c3', name: 'Lucía Ramos', phone: '912 440 671', note: 'Bodega de la esquina' }
    ],
    sales: [
      { id: 's1', date: iso(0, 10, 20), description: 'Gaseosa personal', productId: 'p1', quantity: 2, unitPrice: 3.5, total: 7, payment: 'Yape', clientId: null, type: 'product' },
      { id: 's2', date: iso(0, 12, 5), description: 'Arroz 1 kg', productId: 'p5', quantity: 3, unitPrice: 5.2, total: 15.6, payment: 'Efectivo', clientId: null, type: 'product' },
      { id: 's3', date: iso(1, 17, 40), description: 'Pedido surtido', productId: null, quantity: 1, unitPrice: 28, total: 28, payment: 'Fiado', clientId: 'c1', type: 'free' },
      { id: 's4', date: iso(2, 11, 15), description: 'Galletas surtidas', productId: 'p3', quantity: 4, unitPrice: 2, total: 8, payment: 'Plin', clientId: null, type: 'product' },
      { id: 's5', date: iso(5, 15, 0), description: 'Venta libre', productId: null, quantity: 1, unitPrice: 42, total: 42, payment: 'Transferencia', clientId: null, type: 'free' }
    ],
    expenses: [
      { id: 'e1', date: iso(0, 8, 30), description: 'Compra de bolsas', category: 'Compras', amount: 12.5, payment: 'Efectivo' },
      { id: 'e2', date: iso(2, 9, 0), description: 'Recarga de internet', category: 'Servicios', amount: 35, payment: 'Yape' },
      { id: 'e3', date: iso(6, 13, 10), description: 'Movilidad', category: 'Transporte', amount: 18, payment: 'Efectivo' }
    ],
    payments: [
      { id: 'pay1', clientId: 'c1', date: iso(0, 9, 0), amount: 8, method: 'Yape' }
    ]
  };
};

let state = loadState();
let dashboardPeriod = 'day';
let saleType = 'product';
let deferredPrompt = null;
let scannerStream = null;
let scannerMode = null;
let scannerFacingMode = 'environment';
let scannerLoopId = null;
let scannerDetector = null;
let torchEnabled = false;
let lastDetectedCode = '';
let lastDetectedAt = 0;

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seed();
    const parsed = JSON.parse(saved);
    const normalized = { products: [], clients: [], sales: [], expenses: [], payments: [], ...parsed };
    normalized.products = normalized.products.map(product => ({ barcode: '', ...product }));
    return normalized;
  } catch (error) {
    console.error('No se pudo leer localStorage:', error);
    return seed();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function sameDay(dateValue, target = new Date()) {
  const d = new Date(dateValue);
  return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth() && d.getDate() === target.getDate();
}

function sameMonth(dateValue, target = new Date()) {
  const d = new Date(dateValue);
  return d.getFullYear() === target.getFullYear() && d.getMonth() === target.getMonth();
}

function getClientDebt(clientId) {
  const debt = state.sales.filter(s => s.payment === 'Fiado' && s.clientId === clientId).reduce((sum, s) => sum + s.total, 0);
  const paid = state.payments.filter(p => p.clientId === clientId).reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, debt - paid);
}

function notify(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'error' : ''}`;
  toast.textContent = message;
  $('#toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 2800);
}

function setView(viewId) {
  $$('.view').forEach(view => view.classList.toggle('active', view.id === viewId));
  $$('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === viewId));
  const titles = { dashboard: 'Resumen', ventas: 'Ventas', gastos: 'Gastos', inventario: 'Inventario', clientes: 'Clientes y fiados' };
  $('#pageTitle').textContent = titles[viewId] || 'Negocio Simple';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  renderDashboard();
  renderSales();
  renderExpenses();
  renderProducts();
  renderClients();
  updateSelects();
}

function renderDashboard() {
  const filter = dashboardPeriod === 'day' ? sameDay : sameMonth;
  const sales = state.sales.filter(item => filter(item.date));
  const expenses = state.expenses.filter(item => filter(item.date));
  const income = sales.reduce((sum, item) => sum + item.total, 0);
  const expense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const totalDebt = state.clients.reduce((sum, client) => sum + getClientDebt(client.id), 0);
  const debtors = state.clients.filter(client => getClientDebt(client.id) > 0).length;

  $('#metricIncome').textContent = money.format(income);
  $('#metricExpenses').textContent = money.format(expense);
  $('#metricProfit').textContent = money.format(income - expense);
  $('#metricReceivables').textContent = money.format(totalDebt);
  $('#metricSalesCount').textContent = `${sales.length} ${sales.length === 1 ? 'venta' : 'ventas'}`;
  $('#metricExpenseCount').textContent = `${expenses.length} ${expenses.length === 1 ? 'movimiento' : 'movimientos'}`;
  $('#metricDebtors').textContent = `${debtors} ${debtors === 1 ? 'cliente con deuda' : 'clientes con deuda'}`;

  renderWeeklyChart();
  const lowStock = state.products.filter(p => p.stock <= p.minStock).sort((a, b) => a.stock - b.stock).slice(0, 5);
  $('#lowStockList').innerHTML = lowStock.length ? lowStock.map(product => `
    <div class="compact-item">
      <div class="item-main"><div class="item-icon">${escapeHTML(product.name.charAt(0).toUpperCase())}</div><div class="item-copy"><strong>${escapeHTML(product.name)}</strong><span>Alerta en ${product.minStock} unidades</span></div></div>
      <span class="stock-pill">${product.stock} disponibles</span>
    </div>`).join('') : '<div class="empty-state">Todo el inventario está saludable.</div>';

  const movements = [
    ...state.sales.map(item => ({ ...item, movementType: 'sale', value: item.total })),
    ...state.expenses.map(item => ({ ...item, movementType: 'expense', value: item.amount })),
    ...state.payments.map(item => ({ ...item, description: `Abono de ${state.clients.find(c => c.id === item.clientId)?.name || 'cliente'}`, movementType: 'payment', value: item.amount }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);

  $('#recentMovements').innerHTML = movements.length ? movements.map(item => {
    const positive = item.movementType !== 'expense';
    const label = item.movementType === 'sale' ? `Venta · ${item.payment}` : item.movementType === 'payment' ? `Cobranza · ${item.method}` : `${item.category} · ${item.payment}`;
    return `<div class="movement-item"><div class="item-main"><div class="item-icon">${positive ? '↗' : '↘'}</div><div class="item-copy"><strong>${escapeHTML(item.description)}</strong><span>${label} · ${dateTimeFormatter.format(new Date(item.date))}</span></div></div><span class="amount ${positive ? 'positive' : 'negative'}">${positive ? '+' : '-'}${money.format(item.value)}</span></div>`;
  }).join('') : '<div class="empty-state">Aún no hay movimientos.</div>';
}

function renderWeeklyChart() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const income = state.sales.filter(s => sameDay(s.date, d)).reduce((sum, s) => sum + s.total, 0);
    const expense = state.expenses.filter(e => sameDay(e.date, d)).reduce((sum, e) => sum + e.amount, 0);
    days.push({ d, income, expense });
  }
  const max = Math.max(1, ...days.flatMap(day => [day.income, day.expense]));
  $('#weeklyChart').innerHTML = days.map(day => `
    <div class="chart-day" title="${shortDateFormatter.format(day.d)} · Ingresos ${money.format(day.income)} · Gastos ${money.format(day.expense)}">
      <div class="bar-pair"><div class="bar income" style="height:${(day.income / max) * 100}%"></div><div class="bar expense" style="height:${(day.expense / max) * 100}%"></div></div>
      <small>${day.d.toLocaleDateString('es-PE', { weekday: 'short' }).slice(0, 3)}</small>
    </div>`).join('');
}

function renderSales() {
  const query = $('#salesSearch').value.trim().toLowerCase();
  const date = $('#salesDate').value;
  const rows = state.sales.filter(s => {
    const client = state.clients.find(c => c.id === s.clientId)?.name || '';
    const matchesText = `${s.description} ${s.payment} ${client}`.toLowerCase().includes(query);
    const matchesDate = !date || sameDay(s.date, new Date(`${date}T00:00:00`));
    return matchesText && matchesDate;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  $('#salesTableBody').innerHTML = rows.map(s => `<tr>
    <td>${dateTimeFormatter.format(new Date(s.date))}</td>
    <td><strong>${escapeHTML(s.description)}</strong>${s.quantity > 1 ? `<br><small>${s.quantity} × ${money.format(s.unitPrice)}</small>` : ''}</td>
    <td>${escapeHTML(s.payment)}</td><td><span class="type-badge">${s.type === 'product' ? 'Producto' : 'Monto libre'}</span></td>
    <td><strong>${money.format(s.total)}</strong></td>
    <td><div class="row-actions"><button class="icon-btn delete-btn" data-delete-sale="${s.id}" title="Eliminar">×</button></div></td>
  </tr>`).join('');
  $('#salesEmpty').classList.toggle('hidden', rows.length > 0);
}

function renderExpenses() {
  const query = $('#expensesSearch').value.trim().toLowerCase();
  const category = $('#expenseCategoryFilter').value;
  const rows = state.expenses.filter(e => `${e.description} ${e.category} ${e.payment}`.toLowerCase().includes(query) && (!category || e.category === category)).sort((a, b) => new Date(b.date) - new Date(a.date));
  $('#expensesTableBody').innerHTML = rows.map(e => `<tr><td>${dateTimeFormatter.format(new Date(e.date))}</td><td><strong>${escapeHTML(e.description)}</strong></td><td>${escapeHTML(e.category)}</td><td>${escapeHTML(e.payment)}</td><td><strong>${money.format(e.amount)}</strong></td><td><div class="row-actions"><button class="icon-btn delete-btn" data-delete-expense="${e.id}">×</button></div></td></tr>`).join('');
  $('#expensesEmpty').classList.toggle('hidden', rows.length > 0);
  const categories = [...new Set(state.expenses.map(e => e.category))].sort();
  const current = $('#expenseCategoryFilter').value;
  $('#expenseCategoryFilter').innerHTML = '<option value="">Todas las categorías</option>' + categories.map(c => `<option ${c === current ? 'selected' : ''}>${escapeHTML(c)}</option>`).join('');
}

function renderProducts() {
  const query = $('#productsSearch').value.trim().toLowerCase();
  const filter = $('#stockFilter').value;
  const products = state.products.filter(p => {
    const matchText = `${p.name} ${p.barcode || ''}`.toLowerCase().includes(query);
    const matchStock = filter === 'all' || (filter === 'low' && p.stock <= p.minStock) || (filter === 'out' && p.stock === 0);
    return matchText && matchStock;
  }).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  $('#productGrid').innerHTML = products.map(p => `<article class="product-card">
    <div class="product-card-top"><div class="product-avatar">${escapeHTML(p.name.charAt(0).toUpperCase())}</div>${p.stock <= p.minStock ? `<span class="stock-pill">${p.stock === 0 ? 'Sin stock' : 'Stock bajo'}</span>` : ''}</div>
    <h3>${escapeHTML(p.name)}</h3><p>${p.barcode ? `Código: ${escapeHTML(p.barcode)} · ` : ''}Costo: ${money.format(p.cost)}</p>
    <div class="product-meta"><div class="product-price">${money.format(p.price)}</div><div class="stock-info">Stock<strong>${p.stock} unidades</strong></div></div>
    <div class="card-actions"><button class="secondary-btn" data-edit-product="${p.id}">Editar</button><button class="secondary-btn delete-btn" data-delete-product="${p.id}">Eliminar</button></div>
  </article>`).join('');
  $('#productsEmpty').classList.toggle('hidden', products.length > 0);
  $('#productCount').textContent = state.products.length;
  $('#inventoryValue').textContent = money.format(state.products.reduce((sum, p) => sum + p.cost * p.stock, 0));
  $('#lowStockCount').textContent = state.products.filter(p => p.stock <= p.minStock).length;
}

function renderClients() {
  const query = $('#clientsSearch').value.trim().toLowerCase();
  const clients = state.clients.filter(c => `${c.name} ${c.phone} ${c.note}`.toLowerCase().includes(query)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  $('#clientGrid').innerHTML = clients.map(c => {
    const debt = getClientDebt(c.id);
    return `<article class="client-card"><div class="client-card-top"><div class="client-avatar">${escapeHTML(c.name.charAt(0).toUpperCase())}</div>${debt > 0 ? '<span class="stock-pill">Pendiente</span>' : '<span class="status-badge">Al día</span>'}</div><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML(c.phone || 'Sin teléfono')}${c.note ? ` · ${escapeHTML(c.note)}` : ''}</p><div class="client-debt ${debt === 0 ? 'zero' : ''}">${money.format(debt)}</div><p>${debt > 0 ? 'Saldo por cobrar' : 'Sin deuda pendiente'}</p><div class="card-actions">${debt > 0 ? `<button class="primary-btn" data-pay-client="${c.id}">Registrar abono</button>` : ''}<button class="secondary-btn" data-edit-client="${c.id}">Editar</button><button class="secondary-btn delete-btn" data-delete-client="${c.id}">Eliminar</button></div></article>`;
  }).join('');
  $('#clientsEmpty').classList.toggle('hidden', clients.length > 0);
  const totalDebt = state.clients.reduce((sum, c) => sum + getClientDebt(c.id), 0);
  $('#clientCount').textContent = state.clients.length;
  $('#totalDebt').textContent = money.format(totalDebt);
  $('#clientsCurrent').textContent = state.clients.filter(c => getClientDebt(c.id) === 0).length;
}

function updateSelects() {
  const products = state.products.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const clients = state.clients.slice().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  $('#saleProduct').innerHTML = products.length ? products.map(p => `<option value="${p.id}" ${p.stock === 0 ? 'disabled' : ''}>${escapeHTML(p.name)} · ${money.format(p.price)} · Stock ${p.stock}</option>`).join('') : '<option value="">No hay productos</option>';
  $('#saleClient').innerHTML = clients.length ? clients.map(c => `<option value="${c.id}">${escapeHTML(c.name)}</option>`).join('') : '<option value="">No hay clientes</option>';
  syncProductSale();
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (id === 'saleModal') {
    $('#saleDateTime').value = nowLocalInput();
    $('#saleQuantity').value = 1;
    $('#salePayment').value = 'Efectivo';
    setSaleType('product');
    syncProductSale();
  }
  if (id === 'expenseModal') $('#expenseDateTime').value = nowLocalInput();
  modal.showModal();
}

function closeModal(modal) {
  (modal.closest('dialog') || modal).close();
}

function setSaleType(type) {
  saleType = type;
  $$('[data-sale-type]').forEach(button => button.classList.toggle('active', button.dataset.saleType === type));
  $('#productSaleFields').classList.toggle('hidden', type !== 'product');
  $('#freeSaleFields').classList.toggle('hidden', type !== 'free');
  updateSalePreview();
}

function syncProductSale() {
  const product = state.products.find(p => p.id === $('#saleProduct').value);
  if (!product) {
    $('#saleUnitPrice').value = '';
    $('#availableStock').textContent = 'No hay productos disponibles.';
  } else {
    $('#saleUnitPrice').value = product.price.toFixed(2);
    $('#availableStock').textContent = `${product.stock} unidades disponibles.`;
  }
  updateSalePreview();
}

function updateSalePreview() {
  const total = saleType === 'product' ? toNumber($('#saleQuantity').value) * toNumber($('#saleUnitPrice').value) : toNumber($('#saleFreeAmount').value);
  $('#saleTotalPreview').textContent = money.format(total);
}

function handleSaleSubmit(event) {
  event.preventDefault();
  const payment = $('#salePayment').value;
  const date = new Date($('#saleDateTime').value).toISOString();
  let sale;
  if (saleType === 'product') {
    const product = state.products.find(p => p.id === $('#saleProduct').value);
    const quantity = Math.floor(toNumber($('#saleQuantity').value));
    const unitPrice = toNumber($('#saleUnitPrice').value);
    if (!product || quantity < 1 || unitPrice <= 0) return notify('Completa los datos de la venta.', 'error');
    if (quantity > product.stock) return notify(`Solo hay ${product.stock} unidades disponibles.`, 'error');
    product.stock -= quantity;
    sale = { id: uid('sale'), date, description: product.name, productId: product.id, quantity, unitPrice, total: quantity * unitPrice, payment, clientId: payment === 'Fiado' ? $('#saleClient').value : null, type: 'product' };
  } else {
    const description = $('#saleDescription').value.trim() || 'Venta libre';
    const amount = toNumber($('#saleFreeAmount').value);
    if (amount <= 0) return notify('Ingresa un monto válido.', 'error');
    sale = { id: uid('sale'), date, description, productId: null, quantity: 1, unitPrice: amount, total: amount, payment, clientId: payment === 'Fiado' ? $('#saleClient').value : null, type: 'free' };
  }
  if (payment === 'Fiado' && !sale.clientId) return notify('Crea o selecciona un cliente para registrar el fiado.', 'error');
  state.sales.push(sale); saveState(); renderAll(); $('#saleModal').close(); event.target.reset(); notify('Venta registrada correctamente.');
}

function handleExpenseSubmit(event) {
  event.preventDefault();
  const amount = toNumber($('#expenseAmount').value);
  const description = $('#expenseDescription').value.trim();
  if (!description || amount <= 0) return notify('Completa el concepto y monto.', 'error');
  state.expenses.push({ id: uid('expense'), date: new Date($('#expenseDateTime').value).toISOString(), description, category: $('#expenseCategory').value, amount, payment: $('#expensePayment').value });
  saveState(); renderAll(); $('#expenseModal').close(); event.target.reset(); notify('Gasto registrado correctamente.');
}

function handleProductSubmit(event) {
  event.preventDefault();
  const id = $('#productId').value;
  const productData = { name: $('#productName').value.trim(), barcode: $('#productBarcode').value.trim(), price: toNumber($('#productPrice').value), cost: toNumber($('#productCost').value), stock: Math.max(0, Math.floor(toNumber($('#productStock').value))), minStock: Math.max(0, Math.floor(toNumber($('#productMinStock').value))) };
  const duplicateBarcode = productData.barcode && state.products.some(product => product.barcode === productData.barcode && product.id !== id);
  if (duplicateBarcode) return notify('Ese código de barras ya pertenece a otro producto.', 'error');
  if (!productData.name || productData.price <= 0) return notify('Ingresa un nombre y precio válidos.', 'error');
  if (id) Object.assign(state.products.find(p => p.id === id), productData);
  else state.products.push({ id: uid('product'), ...productData });
  saveState(); renderAll(); $('#productModal').close(); event.target.reset(); notify(id ? 'Producto actualizado.' : 'Producto creado.');
}

function handleClientSubmit(event) {
  event.preventDefault();
  const id = $('#clientId').value;
  const data = { name: $('#clientName').value.trim(), phone: $('#clientPhone').value.trim(), note: $('#clientNote').value.trim() };
  if (!data.name) return notify('Ingresa el nombre del cliente.', 'error');
  if (id) Object.assign(state.clients.find(c => c.id === id), data);
  else state.clients.push({ id: uid('client'), ...data });
  saveState(); renderAll(); $('#clientModal').close(); event.target.reset(); notify(id ? 'Cliente actualizado.' : 'Cliente creado.');
}

function handlePaymentSubmit(event) {
  event.preventDefault();
  const clientId = $('#paymentClientId').value;
  const amount = toNumber($('#paymentAmount').value);
  const debt = getClientDebt(clientId);
  if (amount <= 0 || amount > debt) return notify(`El abono debe ser mayor a cero y no superar ${money.format(debt)}.`, 'error');
  state.payments.push({ id: uid('payment'), clientId, date: new Date().toISOString(), amount, method: $('#paymentMethod').value });
  saveState(); renderAll(); $('#paymentModal').close(); event.target.reset(); notify('Abono registrado correctamente.');
}

function delegatedActions(event) {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.dataset.open) return openModal(target.dataset.open);
  if (target.dataset.go) return setView(target.dataset.go);
  if (target.dataset.view) return setView(target.dataset.view);
  if (target.dataset.editProduct) {
    const p = state.products.find(item => item.id === target.dataset.editProduct); if (!p) return;
    $('#productId').value = p.id; $('#productName').value = p.name; $('#productBarcode').value = p.barcode || ''; $('#productPrice').value = p.price; $('#productCost').value = p.cost; $('#productStock').value = p.stock; $('#productMinStock').value = p.minStock; $('#productModalTitle').textContent = 'Editar producto'; openModal('productModal');
  }
  if (target.dataset.editClient) {
    const c = state.clients.find(item => item.id === target.dataset.editClient); if (!c) return;
    $('#clientId').value = c.id; $('#clientName').value = c.name; $('#clientPhone').value = c.phone; $('#clientNote').value = c.note; $('#clientModalTitle').textContent = 'Editar cliente'; openModal('clientModal');
  }
  if (target.dataset.payClient) {
    const c = state.clients.find(item => item.id === target.dataset.payClient); if (!c) return;
    $('#paymentClientId').value = c.id; const debt = getClientDebt(c.id); $('#paymentClientInfo').textContent = `${c.name} debe ${money.format(debt)}.`; $('#paymentAmount').max = debt; openModal('paymentModal');
  }
  if (target.dataset.deleteSale) {
    const sale = state.sales.find(s => s.id === target.dataset.deleteSale);
    if (sale && confirm('¿Eliminar esta venta? El stock vendido será devuelto.')) { if (sale.productId) { const p = state.products.find(item => item.id === sale.productId); if (p) p.stock += sale.quantity; } state.sales = state.sales.filter(s => s.id !== sale.id); saveState(); renderAll(); notify('Venta eliminada.'); }
  }
  if (target.dataset.deleteExpense && confirm('¿Eliminar este gasto?')) { state.expenses = state.expenses.filter(e => e.id !== target.dataset.deleteExpense); saveState(); renderAll(); notify('Gasto eliminado.'); }
  if (target.dataset.deleteProduct) {
    const used = state.sales.some(s => s.productId === target.dataset.deleteProduct);
    if (used) return notify('No puedes eliminar un producto con ventas registradas.', 'error');
    if (confirm('¿Eliminar este producto?')) { state.products = state.products.filter(p => p.id !== target.dataset.deleteProduct); saveState(); renderAll(); notify('Producto eliminado.'); }
  }
  if (target.dataset.deleteClient) {
    const debt = getClientDebt(target.dataset.deleteClient);
    if (debt > 0) return notify('Primero registra el pago total de la deuda.', 'error');
    const used = state.sales.some(s => s.clientId === target.dataset.deleteClient) || state.payments.some(p => p.clientId === target.dataset.deleteClient);
    if (used) return notify('No puedes eliminar un cliente con historial registrado.', 'error');
    if (confirm('¿Eliminar este cliente?')) { state.clients = state.clients.filter(c => c.id !== target.dataset.deleteClient); saveState(); renderAll(); notify('Cliente eliminado.'); }
  }
}


function vibrate(pattern = 70) {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

function setScannerStatus(message) {
  $('#scannerStatus').textContent = message;
}

async function openScanner(mode) {
  scannerMode = mode;
  lastDetectedCode = '';
  lastDetectedAt = 0;
  $('#scannerTitle').textContent = mode === 'sale' ? 'Escanear producto para vender' : 'Escanear código del producto';
  $('#manualBarcode').value = mode === 'product' ? $('#productBarcode').value : '';
  $('#scannerModal').showModal();
  await startScannerCamera();
}

async function startScannerCamera() {
  await stopScannerCamera();
  if (!navigator.mediaDevices?.getUserMedia) {
    setScannerStatus('Este navegador no permite usar la cámara. Ingresa el código manualmente.');
    return;
  }
  try {
    setScannerStatus('Solicitando acceso a la cámara…');
    scannerStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: scannerFacingMode }, width: { ideal: 1920 }, height: { ideal: 1080 }, focusMode: { ideal: 'continuous' } }
    });
    const video = $('#scannerVideo');
    video.srcObject = scannerStream;
    await video.play();
    configureTorchButton();
    if ('BarcodeDetector' in window) {
      const supported = await BarcodeDetector.getSupportedFormats().catch(() => []);
      scannerDetector = new BarcodeDetector({ formats: supported.length ? supported : undefined });
      setScannerStatus('Apunta el código dentro del recuadro');
      scanVideoFrame();
    } else {
      setScannerStatus('Lectura automática no disponible aquí. Usa Chrome en Android o ingresa el código manualmente.');
    }
  } catch (error) {
    console.error('No se pudo abrir la cámara:', error);
    const message = error.name === 'NotAllowedError' ? 'Permiso de cámara denegado. Actívalo en el navegador.' : 'No se pudo abrir la cámara. Prueba cambiar de cámara o usa el ingreso manual.';
    setScannerStatus(message);
  }
}

function configureTorchButton() {
  const track = scannerStream?.getVideoTracks()[0];
  const capabilities = track?.getCapabilities?.() || {};
  $('#torchBtn').disabled = !capabilities.torch;
  torchEnabled = false;
  $('#torchBtn').textContent = '🔦 Linterna';
}

async function toggleTorch() {
  const track = scannerStream?.getVideoTracks()[0];
  if (!track) return;
  try {
    torchEnabled = !torchEnabled;
    await track.applyConstraints({ advanced: [{ torch: torchEnabled }] });
    $('#torchBtn').textContent = torchEnabled ? '🔦 Apagar linterna' : '🔦 Linterna';
  } catch (error) {
    torchEnabled = false;
    $('#torchBtn').textContent = '🔦 Linterna';
    notify('La linterna no está disponible en esta cámara.', 'error');
  }
}

async function scanVideoFrame() {
  if (!scannerStream || !scannerDetector || !$('#scannerModal').open) return;
  const video = $('#scannerVideo');
  try {
    if (video.readyState >= 2) {
      const codes = await scannerDetector.detect(video);
      if (codes.length) {
        const code = String(codes[0].rawValue || '').trim();
        const now = Date.now();
        if (code && (code !== lastDetectedCode || now - lastDetectedAt > 1800)) {
          lastDetectedCode = code;
          lastDetectedAt = now;
          applyScannedCode(code);
          return;
        }
      }
    }
  } catch (error) {
    console.debug('Lectura omitida:', error);
  }
  scannerLoopId = requestAnimationFrame(scanVideoFrame);
}

function applyScannedCode(code) {
  if (!code) return notify('Ingresa un código válido.', 'error');
  if (scannerMode === 'product') {
    const duplicate = state.products.find(product => product.barcode === code && product.id !== $('#productId').value);
    if (duplicate) {
      vibrate([100, 70, 100]);
      setScannerStatus(`El código ya pertenece a ${duplicate.name}`);
      return notify(`El código ya pertenece a ${duplicate.name}.`, 'error');
    }
    $('#productBarcode').value = code;
    vibrate(80);
    notify(`Código ${code} agregado al producto.`);
    closeScanner();
    return;
  }
  const product = state.products.find(item => item.barcode === code);
  if (!product) {
    vibrate([100, 60, 100]);
    setScannerStatus(`Código ${code} no registrado`);
    notify('Producto no encontrado. Regístralo primero en Inventario.', 'error');
    return;
  }
  if (product.stock <= 0) {
    vibrate([120, 70, 120]);
    setScannerStatus(`${product.name} está sin stock`);
    notify(`${product.name} no tiene stock disponible.`, 'error');
    return;
  }
  setSaleType('product');
  $('#saleProduct').value = product.id;
  syncProductSale();
  vibrate(80);
  notify(`${product.name} seleccionado.`);
  closeScanner();
}

async function stopScannerCamera() {
  if (scannerLoopId) cancelAnimationFrame(scannerLoopId);
  scannerLoopId = null;
  scannerDetector = null;
  if (scannerStream) scannerStream.getTracks().forEach(track => track.stop());
  scannerStream = null;
  const video = $('#scannerVideo');
  if (video) video.srcObject = null;
  torchEnabled = false;
}

async function closeScanner() {
  await stopScannerCamera();
  if ($('#scannerModal').open) $('#scannerModal').close();
}

function init() {
  $('#todayLabel').textContent = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  document.addEventListener('click', delegatedActions);
  $$('.modal-close').forEach(button => button.addEventListener('click', () => closeModal(button)));
  $$('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
  $('#quickSaleBtn').addEventListener('click', () => openModal('saleModal'));
  $('#mobileQuickSale').addEventListener('click', () => openModal('saleModal'));
  $$('[data-scan-target]').forEach(button => button.addEventListener('click', () => openScanner(button.dataset.scanTarget)));
  $('#scannerCloseBtn').addEventListener('click', closeScanner);
  $('#torchBtn').addEventListener('click', toggleTorch);
  $('#switchCameraBtn').addEventListener('click', async () => { scannerFacingMode = scannerFacingMode === 'environment' ? 'user' : 'environment'; await startScannerCamera(); });
  $('#useManualBarcodeBtn').addEventListener('click', () => applyScannedCode($('#manualBarcode').value.trim()));
  $('#manualBarcode').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); applyScannedCode(event.target.value.trim()); } });
  $('#scannerModal').addEventListener('close', stopScannerCamera);
  $('#saleForm').addEventListener('submit', handleSaleSubmit);
  $('#expenseForm').addEventListener('submit', handleExpenseSubmit);
  $('#productForm').addEventListener('submit', handleProductSubmit);
  $('#clientForm').addEventListener('submit', handleClientSubmit);
  $('#paymentForm').addEventListener('submit', handlePaymentSubmit);
  $$('[data-sale-type]').forEach(button => button.addEventListener('click', () => setSaleType(button.dataset.saleType)));
  $('#saleProduct').addEventListener('change', syncProductSale);
  ['saleQuantity', 'saleUnitPrice', 'saleFreeAmount'].forEach(id => $(`#${id}`).addEventListener('input', updateSalePreview));
  $('#salePayment').addEventListener('change', event => $('#saleClientField').classList.toggle('hidden', event.target.value !== 'Fiado'));
  $$('.period-btn').forEach(button => button.addEventListener('click', () => { dashboardPeriod = button.dataset.period; $$('.period-btn').forEach(b => b.classList.toggle('active', b === button)); renderDashboard(); }));
  ['salesSearch', 'salesDate'].forEach(id => $(`#${id}`).addEventListener('input', renderSales));
  ['expensesSearch', 'expenseCategoryFilter'].forEach(id => $(`#${id}`).addEventListener('input', renderExpenses));
  ['productsSearch', 'stockFilter'].forEach(id => $(`#${id}`).addEventListener('input', renderProducts));
  $('#clientsSearch').addEventListener('input', renderClients);
  $('#productModal').addEventListener('close', () => { $('#productForm').reset(); $('#productId').value = ''; $('#productModalTitle').textContent = 'Nuevo producto'; });
  $('#clientModal').addEventListener('close', () => { $('#clientForm').reset(); $('#clientId').value = ''; $('#clientModalTitle').textContent = 'Nuevo cliente'; });
  $('#resetBtn').addEventListener('click', () => { if (confirm('Esto eliminará todos tus datos locales y restaurará la demostración. ¿Continuar?')) { state = seed(); saveState(); renderAll(); notify('Datos restablecidos.'); } });

  const updateConnection = () => { $('#connectionBadge').textContent = navigator.onLine ? 'En línea' : 'Modo offline'; $('#connectionBadge').classList.toggle('offline', !navigator.onLine); };
  window.addEventListener('online', updateConnection); window.addEventListener('offline', updateConnection); updateConnection();

  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredPrompt = event; $('#installBtn').classList.remove('hidden'); });
  $('#installBtn').addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt = null; $('#installBtn').classList.add('hidden'); });
  window.addEventListener('appinstalled', () => notify('Negocio Simple fue instalado.'));

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => console.error('Error al registrar SW:', error)));
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
