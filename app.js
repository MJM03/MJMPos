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

/* ===== V3 · Edición completa + Kardex auditable ===== */
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : seed();
    const normalized = { products: [], clients: [], sales: [], expenses: [], payments: [], kardex: [], ...parsed };
    normalized.products = normalized.products.map(product => ({ barcode: '', ...product }));
    if (!Array.isArray(normalized.kardex)) normalized.kardex = [];
    if (!normalized.kardex.length) {
      normalized.products.forEach(product => {
        if (product.stock > 0) normalized.kardex.push({ id: uid('kardex'), productId: product.id, date: new Date().toISOString(), type: 'entrada', quantity: product.stock, previousStock: 0, newStock: product.stock, reason: 'Stock inicial migrado', reference: 'Inicio del Kardex', sourceType: 'migration', sourceId: product.id });
      });
    }
    return normalized;
  } catch (error) {
    console.error('No se pudo leer localStorage:', error);
    const fresh = seed(); fresh.kardex = [];
    return fresh;
  }
}

function addKardex(product, { type, quantity, previousStock, newStock, reason, reference = '', date = new Date().toISOString(), sourceType = 'manual', sourceId = null }) {
  state.kardex.push({ id: uid('kardex'), productId: product.id, productName: product.name, date, type, quantity: Math.abs(Number(quantity) || 0), previousStock, newStock, reason, reference, sourceType, sourceId });
}

function renderAll() {
  renderDashboard(); renderSales(); renderExpenses(); renderProducts(); renderClients(); renderKardex(); updateSelects();
}

function setView(viewId) {
  $$('.view').forEach(view => view.classList.toggle('active', view.id === viewId));
  $$('[data-view]').forEach(button => button.classList.toggle('active', button.dataset.view === viewId));
  const titles = { dashboard: 'Resumen', ventas: 'Ventas', gastos: 'Gastos', inventario: 'Inventario', clientes: 'Clientes y fiados', kardex: 'Kardex de inventario' };
  $('#pageTitle').textContent = titles[viewId] || 'Negocio Simple';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderSales() {
  const query = $('#salesSearch').value.trim().toLowerCase();
  const date = $('#salesDate').value;
  const rows = state.sales.filter(s => {
    const client = state.clients.find(c => c.id === s.clientId)?.name || '';
    return `${s.description} ${s.payment} ${client}`.toLowerCase().includes(query) && (!date || sameDay(s.date, new Date(`${date}T00:00:00`)));
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
  $('#salesTableBody').innerHTML = rows.map(s => `<tr><td>${dateTimeFormatter.format(new Date(s.date))}</td><td><strong>${escapeHTML(s.description)}</strong>${s.quantity > 1 ? `<br><small>${s.quantity} × ${money.format(s.unitPrice)}</small>` : ''}</td><td>${escapeHTML(s.payment)}</td><td><span class="type-badge">${s.type === 'product' ? 'Producto' : 'Monto libre'}</span></td><td><strong>${money.format(s.total)}</strong></td><td><div class="row-actions"><button class="icon-btn" data-edit-sale="${s.id}" title="Editar">✎</button><button class="icon-btn delete-btn" data-delete-sale="${s.id}" title="Eliminar">×</button></div></td></tr>`).join('');
  $('#salesEmpty').classList.toggle('hidden', rows.length > 0);
}

function renderExpenses() {
  const query = $('#expensesSearch').value.trim().toLowerCase();
  const category = $('#expenseCategoryFilter').value;
  const rows = state.expenses.filter(e => `${e.description} ${e.category} ${e.payment}`.toLowerCase().includes(query) && (!category || e.category === category)).sort((a, b) => new Date(b.date) - new Date(a.date));
  $('#expensesTableBody').innerHTML = rows.map(e => `<tr><td>${dateTimeFormatter.format(new Date(e.date))}</td><td><strong>${escapeHTML(e.description)}</strong></td><td>${escapeHTML(e.category)}</td><td>${escapeHTML(e.payment)}</td><td><strong>${money.format(e.amount)}</strong></td><td><div class="row-actions"><button class="icon-btn" data-edit-expense="${e.id}" title="Editar">✎</button><button class="icon-btn delete-btn" data-delete-expense="${e.id}">×</button></div></td></tr>`).join('');
  $('#expensesEmpty').classList.toggle('hidden', rows.length > 0);
  const categories = [...new Set(state.expenses.map(e => e.category))].sort();
  const current = $('#expenseCategoryFilter').value;
  $('#expenseCategoryFilter').innerHTML = '<option value="">Todas las categorías</option>' + categories.map(c => `<option ${c === current ? 'selected' : ''}>${escapeHTML(c)}</option>`).join('');
}

function renderProducts() {
  const query = $('#productsSearch').value.trim().toLowerCase(); const filter = $('#stockFilter').value;
  const products = state.products.filter(p => `${p.name} ${p.barcode || ''}`.toLowerCase().includes(query) && (filter === 'all' || (filter === 'low' && p.stock <= p.minStock) || (filter === 'out' && p.stock === 0))).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  $('#productGrid').innerHTML = products.map(p => `<article class="product-card"><div class="product-card-top"><div class="product-avatar">${escapeHTML(p.name.charAt(0).toUpperCase())}</div>${p.stock <= p.minStock ? `<span class="stock-pill">${p.stock === 0 ? 'Sin stock' : 'Stock bajo'}</span>` : ''}</div><h3>${escapeHTML(p.name)}</h3><p>${p.barcode ? `Código: ${escapeHTML(p.barcode)} · ` : ''}Costo: ${money.format(p.cost)}</p><div class="product-meta"><div class="product-price">${money.format(p.price)}</div><div class="stock-info">Stock<strong>${p.stock} unidades</strong></div></div><div class="card-actions"><button class="secondary-btn" data-edit-product="${p.id}">Editar</button><button class="secondary-btn kardex-link" data-product-kardex="${p.id}">Kardex</button><button class="secondary-btn" data-move-product="${p.id}">Stock ±</button><button class="secondary-btn delete-btn" data-delete-product="${p.id}">Eliminar</button></div></article>`).join('');
  $('#productsEmpty').classList.toggle('hidden', products.length > 0); $('#productCount').textContent = state.products.length; $('#inventoryValue').textContent = money.format(state.products.reduce((sum,p)=>sum+p.cost*p.stock,0)); $('#lowStockCount').textContent = state.products.filter(p=>p.stock<=p.minStock).length;
}

function renderClients() {
  const query = $('#clientsSearch').value.trim().toLowerCase();
  const clients = state.clients.filter(c => `${c.name} ${c.phone} ${c.note}`.toLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name,'es'));
  $('#clientGrid').innerHTML = clients.map(c => { const debt=getClientDebt(c.id); return `<article class="client-card"><div class="client-card-top"><div class="client-avatar">${escapeHTML(c.name.charAt(0).toUpperCase())}</div>${debt>0?'<span class="stock-pill">Pendiente</span>':'<span class="status-badge">Al día</span>'}</div><h3>${escapeHTML(c.name)}</h3><p>${escapeHTML(c.phone||'Sin teléfono')}${c.note?` · ${escapeHTML(c.note)}`:''}</p><div class="client-debt ${debt===0?'zero':''}">${money.format(debt)}</div><p>${debt>0?'Saldo por cobrar':'Sin deuda pendiente'}</p><div class="card-actions">${debt>0?`<button class="primary-btn" data-pay-client="${c.id}">Registrar abono</button>`:''}<button class="secondary-btn" data-account-client="${c.id}">Ver cuenta</button><button class="secondary-btn" data-edit-client="${c.id}">Editar</button><button class="secondary-btn delete-btn" data-delete-client="${c.id}">Eliminar</button></div></article>`; }).join('');
  $('#clientsEmpty').classList.toggle('hidden', clients.length>0); $('#clientCount').textContent=state.clients.length; $('#totalDebt').textContent=money.format(state.clients.reduce((sum,c)=>sum+getClientDebt(c.id),0)); $('#clientsCurrent').textContent=state.clients.filter(c=>getClientDebt(c.id)===0).length;
}

function renderKardex() {
  if (!$('#kardexTableBody')) return;
  const q=$('#kardexSearch').value.trim().toLowerCase(), productId=$('#kardexProductFilter').value, type=$('#kardexTypeFilter').value;
  const rows=state.kardex.filter(k=>{ const p=state.products.find(x=>x.id===k.productId); return `${p?.name||k.productName||''} ${k.reason||''} ${k.reference||''}`.toLowerCase().includes(q)&&(!productId||k.productId===productId)&&(!type||k.type===type); }).sort((a,b)=>new Date(b.date)-new Date(a.date));
  $('#kardexTableBody').innerHTML=rows.map(k=>{ const p=state.products.find(x=>x.id===k.productId); const sign=k.type==='entrada'?'+':k.type==='salida'?'-':'±'; return `<tr><td>${dateTimeFormatter.format(new Date(k.date))}</td><td><strong>${escapeHTML(p?.name||k.productName||'Producto eliminado')}</strong></td><td><span class="movement-badge ${k.type}">${escapeHTML(k.type)}</span></td><td class="${k.type==='entrada'?'quantity-positive':k.type==='salida'?'quantity-negative':''}">${sign}${k.quantity}</td><td>${k.previousStock}</td><td><strong>${k.newStock}</strong></td><td>${escapeHTML(k.reason||'Sin motivo')}${k.reference?`<div class="audit-note">Ref: ${escapeHTML(k.reference)}</div>`:''}</td></tr>`; }).join('');
  $('#kardexEmpty').classList.toggle('hidden', rows.length>0); $('#kardexCount').textContent=state.kardex.length; $('#kardexEntries').textContent=state.kardex.filter(k=>k.type==='entrada').reduce((s,k)=>s+k.quantity,0); $('#kardexOutputs').textContent=state.kardex.filter(k=>k.type==='salida').reduce((s,k)=>s+k.quantity,0);
  const current=$('#kardexProductFilter').value; $('#kardexProductFilter').innerHTML='<option value="">Todos los productos</option>'+state.products.slice().sort((a,b)=>a.name.localeCompare(b.name,'es')).map(p=>`<option value="${p.id}" ${p.id===current?'selected':''}>${escapeHTML(p.name)}</option>`).join('');
}

function updateSelects() {
  const products=state.products.slice().sort((a,b)=>a.name.localeCompare(b.name,'es')), clients=state.clients.slice().sort((a,b)=>a.name.localeCompare(b.name,'es'));
  const currentSale=$('#saleProduct').value, currentMove=$('#movementProduct')?.value;
  $('#saleProduct').innerHTML=products.length?products.map(p=>`<option value="${p.id}" ${p.stock===0?'disabled':''}>${escapeHTML(p.name)} · ${money.format(p.price)} · Stock ${p.stock}</option>`).join(''):'<option value="">No hay productos</option>';
  if (currentSale && products.some(p=>p.id===currentSale)) $('#saleProduct').value=currentSale;
  $('#saleClient').innerHTML=clients.length?clients.map(c=>`<option value="${c.id}">${escapeHTML(c.name)}</option>`).join(''):'<option value="">No hay clientes</option>';
  if ($('#movementProduct')) { $('#movementProduct').innerHTML=products.map(p=>`<option value="${p.id}">${escapeHTML(p.name)} · Stock ${p.stock}</option>`).join(''); if(currentMove&&products.some(p=>p.id===currentMove)) $('#movementProduct').value=currentMove; }
  syncProductSale(); updateMovementInfo();
}

function handleSaleSubmit(event) {
  event.preventDefault();
  const id=$('#saleId').value, old=id?state.sales.find(s=>s.id===id):null, payment=$('#salePayment').value, date=new Date($('#saleDateTime').value).toISOString();
  let newSale;
  if(saleType==='product'){
    const product=state.products.find(p=>p.id===$('#saleProduct').value), quantity=Math.floor(toNumber($('#saleQuantity').value)), unitPrice=toNumber($('#saleUnitPrice').value);
    if(!product||quantity<1||unitPrice<=0)return notify('Completa los datos de la venta.','error');
    const restored=product.stock+(old?.productId===product.id?old.quantity:0);
    if(quantity>restored)return notify(`Solo hay ${restored} unidades disponibles considerando la corrección.`,'error');
    newSale={id:id||uid('sale'),date,description:product.name,productId:product.id,quantity,unitPrice,total:quantity*unitPrice,payment,clientId:payment==='Fiado'?$('#saleClient').value:null,type:'product'};
  }else{ const description=$('#saleDescription').value.trim()||'Venta libre', amount=toNumber($('#saleFreeAmount').value); if(amount<=0)return notify('Ingresa un monto válido.','error'); newSale={id:id||uid('sale'),date,description,productId:null,quantity:1,unitPrice:amount,total:amount,payment,clientId:payment==='Fiado'?$('#saleClient').value:null,type:'free'}; }
  if(payment==='Fiado'&&!newSale.clientId)return notify('Selecciona un cliente para el fiado.','error');
  if(old?.productId){ const p=state.products.find(x=>x.id===old.productId); if(p){const before=p.stock;p.stock+=old.quantity;addKardex(p,{type:'entrada',quantity:old.quantity,previousStock:before,newStock:p.stock,reason:'Corrección de venta editada',reference:`Venta ${old.id}`,sourceType:'sale_edit',sourceId:old.id});}}
  if(newSale.productId){ const p=state.products.find(x=>x.id===newSale.productId); const before=p.stock;p.stock-=newSale.quantity;addKardex(p,{type:'salida',quantity:newSale.quantity,previousStock:before,newStock:p.stock,reason:old?'Venta corregida':'Venta registrada',reference:`Venta ${newSale.id}`,date:newSale.date,sourceType:'sale',sourceId:newSale.id}); }
  if(old) Object.assign(old,newSale); else state.sales.push(newSale);
  saveState();renderAll();$('#saleModal').close();event.target.reset();$('#saleId').value='';notify(old?'Venta actualizada y Kardex corregido.':'Venta registrada correctamente.');
}

function handleExpenseSubmit(event){event.preventDefault();const id=$('#expenseId').value,amount=toNumber($('#expenseAmount').value),description=$('#expenseDescription').value.trim();if(!description||amount<=0)return notify('Completa el concepto y monto.','error');const data={id:id||uid('expense'),date:new Date($('#expenseDateTime').value).toISOString(),description,category:$('#expenseCategory').value,amount,payment:$('#expensePayment').value};if(id)Object.assign(state.expenses.find(e=>e.id===id),data);else state.expenses.push(data);saveState();renderAll();$('#expenseModal').close();event.target.reset();$('#expenseId').value='';notify(id?'Gasto actualizado.':'Gasto registrado correctamente.');}

function handleProductSubmit(event){event.preventDefault();const id=$('#productId').value;const data={name:$('#productName').value.trim(),barcode:$('#productBarcode').value.trim(),price:toNumber($('#productPrice').value),cost:toNumber($('#productCost').value),stock:Math.max(0,Math.floor(toNumber($('#productStock').value))),minStock:Math.max(0,Math.floor(toNumber($('#productMinStock').value)))};if(data.barcode&&state.products.some(p=>p.barcode===data.barcode&&p.id!==id))return notify('Ese código ya pertenece a otro producto.','error');if(!data.name||data.price<=0)return notify('Ingresa un nombre y precio válidos.','error');if(id){const p=state.products.find(x=>x.id===id),before=p.stock;Object.assign(p,data);if(before!==p.stock)addKardex(p,{type:'ajuste',quantity:Math.abs(p.stock-before),previousStock:before,newStock:p.stock,reason:'Stock modificado desde edición de producto',reference:'Edición manual',sourceType:'product_edit',sourceId:p.id});}else{const p={id:uid('product'),...data};state.products.push(p);if(p.stock>0)addKardex(p,{type:'entrada',quantity:p.stock,previousStock:0,newStock:p.stock,reason:'Stock inicial del producto',reference:'Alta de producto',sourceType:'product_create',sourceId:p.id});}saveState();renderAll();$('#productModal').close();event.target.reset();notify(id?'Producto actualizado.':'Producto creado.');}

function handlePaymentSubmit(event){event.preventDefault();const id=$('#paymentId').value,clientId=$('#paymentClientId').value,amount=toNumber($('#paymentAmount').value),old=id?state.payments.find(p=>p.id===id):null;const debtWithoutOld=getClientDebt(clientId)+(old?.amount||0);if(amount<=0||amount>debtWithoutOld)return notify(`El abono no puede superar ${money.format(debtWithoutOld)}.`,'error');const data={id:id||uid('payment'),clientId,date:new Date($('#paymentDateTime').value).toISOString(),amount,method:$('#paymentMethod').value};if(old)Object.assign(old,data);else state.payments.push(data);saveState();renderAll();$('#paymentModal').close();event.target.reset();$('#paymentId').value='';notify(id?'Abono actualizado.':'Abono registrado correctamente.');}

function handleStockMovementSubmit(event){event.preventDefault();const product=state.products.find(p=>p.id===$('#movementProduct').value),type=$('#movementType').value,value=Math.floor(toNumber($('#movementQuantity').value)),reason=$('#movementReason').value.trim();if(!product||!reason||value<0)return notify('Completa correctamente el movimiento.','error');const before=product.stock;let after=before;if(type==='entrada')after=before+value;if(type==='salida'){if(value>before)return notify(`No puedes retirar más de ${before} unidades.`,'error');after=before-value;}if(type==='ajuste')after=value;if(type!=='ajuste'&&value===0)return notify('La cantidad debe ser mayor a cero.','error');product.stock=after;addKardex(product,{type,quantity:type==='ajuste'?Math.abs(after-before):value,previousStock:before,newStock:after,reason,reference:$('#movementReference').value.trim(),date:new Date($('#movementDateTime').value).toISOString(),sourceType:'manual'});saveState();renderAll();$('#stockMovementModal').close();event.target.reset();notify('Movimiento aplicado y registrado en Kardex.');}

function openStockMovement(productId=''){openModal('stockMovementModal');if(productId)$('#movementProduct').value=productId;$('#movementDateTime').value=nowLocalInput();updateMovementInfo();}
function updateMovementInfo(){const p=state.products.find(x=>x.id===$('#movementProduct')?.value);if($('#movementStockInfo'))$('#movementStockInfo').textContent=p?`Stock actual: ${p.stock} unidades.`:'Selecciona un producto.';if($('#movementQuantityLabel'))$('#movementQuantityLabel').firstChild.textContent=$('#movementType')?.value==='ajuste'?'Nuevo stock final':'Cantidad';}
function openAccount(clientId){const c=state.clients.find(x=>x.id===clientId);if(!c)return;$('#accountModalTitle').textContent=`Cuenta de ${c.name}`;const debt=getClientDebt(c.id),credits=state.sales.filter(s=>s.clientId===c.id&&s.payment==='Fiado').reduce((a,s)=>a+s.total,0),paid=state.payments.filter(p=>p.clientId===c.id).reduce((a,p)=>a+p.amount,0);$('#accountSummary').innerHTML=`<div class="mini-stat"><span>Fiado acumulado</span><strong>${money.format(credits)}</strong></div><div class="mini-stat"><span>Pagado</span><strong>${money.format(paid)}</strong></div><div class="mini-stat"><span>Saldo pendiente</span><strong>${money.format(debt)}</strong></div>`;const items=[...state.sales.filter(s=>s.clientId===c.id&&s.payment==='Fiado').map(s=>({...s,kind:'Fiado',amount:s.total})),...state.payments.filter(p=>p.clientId===c.id).map(p=>({...p,kind:'Abono',description:'Pago recibido',payment:p.method}))].sort((a,b)=>new Date(b.date)-new Date(a.date));$('#accountTableBody').innerHTML=items.map(i=>`<tr><td>${dateTimeFormatter.format(new Date(i.date))}</td><td><span class="type-badge">${i.kind}</span></td><td>${escapeHTML(i.description)}</td><td>${escapeHTML(i.payment||i.method)}</td><td class="${i.kind==='Abono'?'quantity-positive':'quantity-negative'}">${i.kind==='Abono'?'+':'-'}${money.format(i.amount)}</td><td><div class="row-actions">${i.kind==='Abono'?`<button class="icon-btn" data-edit-payment="${i.id}">✎</button><button class="icon-btn delete-btn" data-delete-payment="${i.id}" data-account="${clientId}">×</button>`:`<button class="icon-btn" data-edit-sale="${i.id}">✎</button>`}</div></td></tr>`).join('');$('#accountModal').showModal();}

function delegatedActions(event){const t=event.target.closest('button');if(!t)return;if(t.dataset.open)return openModal(t.dataset.open);if(t.dataset.go)return setView(t.dataset.go);if(t.dataset.view)return setView(t.dataset.view);if(t.hasAttribute('data-open-stock-movement'))return openStockMovement();if(t.dataset.moveProduct)return openStockMovement(t.dataset.moveProduct);if(t.dataset.productKardex){setView('kardex');$('#kardexProductFilter').value=t.dataset.productKardex;return renderKardex();}
if(t.dataset.editSale){const s=state.sales.find(x=>x.id===t.dataset.editSale);if(!s)return;if($('#accountModal').open)$('#accountModal').close();$('#saleId').value=s.id;$('#saleModalTitle').textContent='Editar venta';setSaleType(s.type);$('#saleDateTime').value=localDateTimeValue(s.date);$('#salePayment').value=s.payment;$('#saleClientField').classList.toggle('hidden',s.payment!=='Fiado');if(s.type==='product'){$('#saleProduct').value=s.productId;$('#saleQuantity').value=s.quantity;$('#saleUnitPrice').value=s.unitPrice;syncProductSale();$('#saleUnitPrice').value=s.unitPrice;}else{$('#saleDescription').value=s.description;$('#saleFreeAmount').value=s.total;}if(s.clientId)$('#saleClient').value=s.clientId;updateSalePreview();return $('#saleModal').showModal();}
if(t.dataset.editExpense){const e=state.expenses.find(x=>x.id===t.dataset.editExpense);if(!e)return;$('#expenseId').value=e.id;$('#expenseModalTitle').textContent='Editar gasto';$('#expenseDescription').value=e.description;$('#expenseCategory').value=e.category;$('#expenseAmount').value=e.amount;$('#expensePayment').value=e.payment;$('#expenseDateTime').value=localDateTimeValue(e.date);return $('#expenseModal').showModal();}
if(t.dataset.editProduct){const p=state.products.find(x=>x.id===t.dataset.editProduct);if(!p)return;$('#productId').value=p.id;$('#productName').value=p.name;$('#productBarcode').value=p.barcode||'';$('#productPrice').value=p.price;$('#productCost').value=p.cost;$('#productStock').value=p.stock;$('#productMinStock').value=p.minStock;$('#productModalTitle').textContent='Editar producto';return $('#productModal').showModal();}
if(t.dataset.editClient){const c=state.clients.find(x=>x.id===t.dataset.editClient);if(!c)return;$('#clientId').value=c.id;$('#clientName').value=c.name;$('#clientPhone').value=c.phone;$('#clientNote').value=c.note;$('#clientModalTitle').textContent='Editar cliente';return $('#clientModal').showModal();}
if(t.dataset.payClient){const c=state.clients.find(x=>x.id===t.dataset.payClient);if(!c)return;$('#paymentId').value='';$('#paymentClientId').value=c.id;$('#paymentModalTitle').textContent='Registrar abono';$('#paymentClientInfo').textContent=`${c.name} debe ${money.format(getClientDebt(c.id))}.`;$('#paymentDateTime').value=nowLocalInput();return $('#paymentModal').showModal();}
if(t.dataset.accountClient)return openAccount(t.dataset.accountClient);if(t.dataset.editPayment){const p=state.payments.find(x=>x.id===t.dataset.editPayment);if(!p)return;if($('#accountModal').open)$('#accountModal').close();const c=state.clients.find(x=>x.id===p.clientId);$('#paymentId').value=p.id;$('#paymentClientId').value=p.clientId;$('#paymentModalTitle').textContent='Editar abono';$('#paymentClientInfo').textContent=`Editando pago de ${c?.name||'cliente'}.`;$('#paymentAmount').value=p.amount;$('#paymentMethod').value=p.method;$('#paymentDateTime').value=localDateTimeValue(p.date);return $('#paymentModal').showModal();}
if(t.dataset.deletePayment&&confirm('¿Eliminar este abono? La deuda del cliente aumentará nuevamente.')){const clientId=state.payments.find(p=>p.id===t.dataset.deletePayment)?.clientId;state.payments=state.payments.filter(p=>p.id!==t.dataset.deletePayment);saveState();renderAll();$('#accountModal').close();notify('Abono eliminado.');if(clientId)openAccount(clientId);return;}
if(t.dataset.deleteSale){const s=state.sales.find(x=>x.id===t.dataset.deleteSale);if(s&&confirm('¿Eliminar esta venta? El stock será devuelto y quedará registrado en Kardex.')){if(s.productId){const p=state.products.find(x=>x.id===s.productId);if(p){const before=p.stock;p.stock+=s.quantity;addKardex(p,{type:'entrada',quantity:s.quantity,previousStock:before,newStock:p.stock,reason:'Anulación de venta',reference:`Venta ${s.id}`,sourceType:'sale_delete',sourceId:s.id});}}state.sales=state.sales.filter(x=>x.id!==s.id);saveState();renderAll();if($('#accountModal').open)$('#accountModal').close();notify('Venta eliminada y stock devuelto.');}return;}
if(t.dataset.deleteExpense&&confirm('¿Eliminar este gasto?')){state.expenses=state.expenses.filter(e=>e.id!==t.dataset.deleteExpense);saveState();renderAll();return notify('Gasto eliminado.');}
if(t.dataset.deleteProduct){if(state.sales.some(s=>s.productId===t.dataset.deleteProduct)||state.kardex.some(k=>k.productId===t.dataset.deleteProduct))return notify('No puedes eliminar un producto con historial. Puedes dejar su stock en cero.','error');if(confirm('¿Eliminar este producto?')){state.products=state.products.filter(p=>p.id!==t.dataset.deleteProduct);saveState();renderAll();notify('Producto eliminado.');}return;}
if(t.dataset.deleteClient){if(getClientDebt(t.dataset.deleteClient)>0)return notify('Primero cancela o corrige la deuda.','error');if(state.sales.some(s=>s.clientId===t.dataset.deleteClient)||state.payments.some(p=>p.clientId===t.dataset.deleteClient))return notify('No puedes eliminar un cliente con historial. Puedes editar sus datos.','error');if(confirm('¿Eliminar este cliente?')){state.clients=state.clients.filter(c=>c.id!==t.dataset.deleteClient);saveState();renderAll();notify('Cliente eliminado.');}}
}
function localDateTimeValue(value){const d=new Date(value);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);}

document.addEventListener('DOMContentLoaded',()=>{
  $('#stockMovementForm')?.addEventListener('submit',handleStockMovementSubmit);
  $('#movementProduct')?.addEventListener('change',updateMovementInfo);$('#movementType')?.addEventListener('change',updateMovementInfo);
  ['kardexSearch','kardexProductFilter','kardexTypeFilter'].forEach(id=>$(`#${id}`)?.addEventListener('input',renderKardex));
  $('#saleModal')?.addEventListener('close',()=>{$('#saleId').value='';$('#saleModalTitle').textContent='Registrar venta';});
  $('#expenseModal')?.addEventListener('close',()=>{$('#expenseId').value='';$('#expenseModalTitle').textContent='Registrar gasto';});
  $('#paymentModal')?.addEventListener('close',()=>{$('#paymentId').value='';$('#paymentModalTitle').textContent='Registrar abono';});
});
