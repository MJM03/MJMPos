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
  // Demostración determinista de un negocio con 8 meses de operación.
  // Se genera localmente para mantener el proyecto liviano y totalmente offline.
  let randomState = 934871;
  const random = () => ((randomState = (randomState * 1664525 + 1013904223) >>> 0) / 4294967296);
  const pick = list => list[Math.floor(random() * list.length)];
  const round2 = value => Math.round(value * 100) / 100;
  const now = new Date();
  const at = (daysAgo, hour = 10, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const catalog = [
    ['Arroz extra 1 kg',5.50,4.20,'7751010000012'],['Azúcar rubia 1 kg',4.80,3.65,'7751010000029'],['Aceite vegetal 1 L',10.90,8.70,'7751010000036'],['Leche evaporada',4.90,3.85,'7751010000043'],['Fideos spaghetti 500 g',3.40,2.45,'7751010000050'],['Atún en lata',6.90,5.35,'7751010000067'],['Sal de mesa 1 kg',2.40,1.55,'7751010000074'],['Harina sin preparar',5.20,3.95,'7751010000081'],['Avena 400 g',4.60,3.40,'7751010000098'],['Café instantáneo 50 g',7.90,6.15,'7751010000104'],
    ['Gaseosa personal',3.50,2.10,'7751010000111'],['Gaseosa 1.5 L',8.50,6.25,'7751010000128'],['Agua mineral 625 ml',2.50,1.30,'7751010000135'],['Bebida rehidratante',4.50,3.10,'7751010000142'],['Jugo en caja',2.20,1.35,'7751010000159'],['Cerveza lata',5.50,4.20,'7751010000166'],['Yogurt personal',3.20,2.15,'7751010000173'],['Leche chocolatada',3.00,1.95,'7751010000180'],
    ['Galletas vainilla',2.00,1.15,'7751010000197'],['Galletas chocolate',2.50,1.45,'7751010000203'],['Piqueo familiar',7.90,5.85,'7751010000210'],['Papas fritas personal',2.50,1.45,'7751010000227'],['Chocolate barra',3.50,2.30,'7751010000234'],['Caramelos surtidos',0.50,0.20,'7751010000241'],['Chicle menta',1.00,0.48,'7751010000258'],['Queque envasado',2.50,1.55,'7751010000265'],
    ['Papel higiénico x4',8.90,6.70,'7751010000272'],['Detergente 800 g',8.50,6.45,'7751010000289'],['Lavavajilla 500 ml',6.90,5.10,'7751010000296'],['Lejía 1 L',4.20,2.95,'7751010000302'],['Jabón de tocador',3.20,2.15,'7751010000319'],['Shampoo sachet',1.50,0.75,'7751010000326'],['Pasta dental',7.50,5.65,'7751010000333'],['Toalla higiénica x10',6.90,5.05,'7751010000340'],
    ['Pan de molde',8.90,6.50,'7751010000357'],['Huevos x6',6.50,5.10,'7751010000364'],['Mantequilla 200 g',7.20,5.60,'7751010000371'],['Queso fresco 250 g',8.50,6.80,'7751010000388'],['Jamón 200 g',7.90,6.10,'7751010000395'],['Helado personal',3.50,2.20,'7751010000401'],
    ['Encendedor',2.00,0.90,'7751010000418'],['Pilas AA x2',5.50,3.95,'7751010000425'],['Bolsa de hielo',4.00,2.20,'7751010000432'],['Servilletas x100',4.50,3.10,'7751010000449'],['Vasos descartables x20',5.00,3.40,'7751010000456'],['Bolsas basura x10',6.50,4.80,'7751010000463'],['Mascarillas x5',3.50,1.80,'7751010000470'],['Alcohol 250 ml',5.90,4.10,'7751010000487']
  ];
  const products = catalog.map((item,index) => ({ id:`p${index+1}`, name:item[0], price:item[1], cost:item[2], barcode:item[3], stock:0, minStock: 6 + (index % 7) }));
  const clientNames = ['María Torres','Carlos Peña','Lucía Ramos','José Vargas','Ana Salazar','Rosa Mendoza','Luis Castillo','Carmen Rojas','Miguel Quispe','Patricia Flores','Jorge Chávez','Elena Paredes','Diego Sánchez','Sofía Navarro','Renzo Medina','Milagros León','Raúl Campos','Daniela Cruz','Víctor Huamán','Andrea Vega','Marco Espinoza','Claudia Reyes','Fernando Silva','Karina Valdez','Óscar Núñez','Natalia Cabrera','Hugo Palomino','Gabriela Soto','Ricardo Ríos','Paola Acosta','Sergio Lozano','Mónica Aguilar','Alonso Guerra','Vanessa Luna','César Tapia','Teresa Bravo'];
  const clients = clientNames.map((name,index)=>({id:`c${index+1}`,name,phone:`9${String(10000000 + index*173941).slice(-8)}`,note:index%6===0?'Cliente frecuente':index%9===0?'Entrega cercana':''}));
  const sales=[], expenses=[], payments=[], kardex=[];
  const stock = Object.fromEntries(products.map((p,i)=>[p.id,90+(i*17)%95]));
  products.forEach(p=>kardex.push({id:`k-open-${p.id}`,productId:p.id,productName:p.name,date:at(245,7),type:'entrada',quantity:stock[p.id],previousStock:0,newStock:stock[p.id],reason:'Inventario inicial',reference:'APERTURA-001',sourceType:'opening',sourceId:p.id}));
  const paymentMethods=['Efectivo','Efectivo','Yape','Yape','Plin','Transferencia'];
  const expenseConcepts=[['Compra mayorista','Compras'],['Reposición de bebidas','Compras'],['Pago de energía','Servicios'],['Internet del negocio','Servicios'],['Movilidad de abastecimiento','Transporte'],['Bolsas y empaques','Compras'],['Limpieza del local','Mantenimiento'],['Mantenimiento de refrigeradora','Mantenimiento'],['Pago de agua','Servicios'],['Publicidad local','Marketing']];
  let saleNo=1, expenseNo=1, kardexNo=1, paymentNo=1;
  for(let daysAgo=244;daysAgo>=0;daysAgo--){
    const date = new Date(now); date.setDate(date.getDate()-daysAgo);
    const dow=date.getDay();
    const dailySales=4+Math.floor(random()*7)+(dow===0||dow===6?3:0);
    for(let j=0;j<dailySales;j++){
      const product=pick(products); const quantity=1+Math.floor(random()*(random()<.82?3:7));
      if(stock[product.id]<quantity+3){
        const incoming=45+Math.floor(random()*90), before=stock[product.id]; stock[product.id]+=incoming;
        kardex.push({id:`k${kardexNo++}`,productId:product.id,productName:product.name,date:at(daysAgo,7,20),type:'entrada',quantity:incoming,previousStock:before,newStock:stock[product.id],reason:'Reposición de mercadería',reference:`COMP-${String(expenseNo).padStart(5,'0')}`,sourceType:'purchase'});
      }
      const before=stock[product.id]; stock[product.id]-=quantity;
      const isCredit=random()<.075; const client=isCredit?pick(clients):null; const payment=isCredit?'Fiado':pick(paymentMethods);
      const sale={id:`s${saleNo}`,receiptNumber:`B001-${String(saleNo).padStart(6,'0')}`,date:at(daysAgo,8+Math.floor(random()*13),Math.floor(random()*60)),description:product.name,productId:product.id,quantity,unitPrice:product.price,total:round2(quantity*product.price),payment,clientId:client?.id||null,type:'product'};
      sales.push(sale);
      kardex.push({id:`k${kardexNo++}`,productId:product.id,productName:product.name,date:sale.date,type:'salida',quantity,previousStock:before,newStock:stock[product.id],reason:'Venta registrada',reference:`Venta ${sale.receiptNumber}`,sourceType:'sale',sourceId:sale.id});
      saleNo++;
    }
    if(daysAgo%3===0 || random()<.22){
      const [description,category]=pick(expenseConcepts); const amount=round2(8+random()*(category==='Compras'?210:95));
      expenses.push({id:`e${expenseNo++}`,date:at(daysAgo,7+Math.floor(random()*11),Math.floor(random()*60)),description,category,amount,payment:pick(paymentMethods)});
    }
    if(daysAgo%29===0){
      products.filter((_,i)=>i%8===Math.floor(random()*8)).slice(0,3).forEach(product=>{
        const qty=1+Math.floor(random()*3), before=stock[product.id]; stock[product.id]=Math.max(0,before-qty);
        kardex.push({id:`k${kardexNo++}`,productId:product.id,productName:product.name,date:at(daysAgo,18,15),type:'salida',quantity:before-stock[product.id],previousStock:before,newStock:stock[product.id],reason:'Merma / producto dañado',reference:`MERMA-${String(daysAgo).padStart(3,'0')}`,sourceType:'waste'});
      });
    }
  }
  // Abonos sobre ventas fiadas, dejando una cartera realista todavía pendiente.
  const creditByClient={};
  sales.filter(s=>s.payment==='Fiado').forEach(s=>(creditByClient[s.clientId]??=[]).push(s));
  Object.entries(creditByClient).forEach(([clientId,credits])=>{
    const total=credits.reduce((sum,s)=>sum+s.total,0); const paid=round2(total*(.45+random()*.45));
    const chunks=1+Math.floor(random()*4); let remaining=paid;
    for(let i=0;i<chunks;i++){const amount=i===chunks-1?remaining:round2(remaining*(.25+random()*.35));remaining=round2(remaining-amount);if(amount>0)payments.push({id:`pay${paymentNo++}`,clientId,date:at(Math.floor(random()*170),9+Math.floor(random()*9),Math.floor(random()*60)),amount,method:pick(['Yape','Efectivo','Plin'])});}
  });
  products.forEach(p=>p.stock=stock[p.id]);
  return {products,clients,sales,expenses,payments,kardex,demoMeta:{version:5,generatedAt:new Date().toISOString(),months:8}};
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
let productCreateContext = null;
let pendingScannedBarcode = '';
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
  const days=[];
  for(let i=13;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);days.push({d,income:state.sales.filter(s=>sameDay(s.date,d)).reduce((n,s)=>n+s.total,0),expense:state.expenses.filter(e=>sameDay(e.date,d)).reduce((n,e)=>n+e.amount,0)});}
  const width=760,height=240,pad=28,max=Math.max(1,...days.flatMap(x=>[x.income,x.expense]));
  const point=(v,i)=>`${pad+i*((width-pad*2)/(days.length-1))},${height-pad-(v/max)*(height-pad*2)}`;
  const incomePts=days.map((x,i)=>point(x.income,i)).join(' '),expensePts=days.map((x,i)=>point(x.expense,i)).join(' ');
  const incomeTotal=days.reduce((n,x)=>n+x.income,0),expenseTotal=days.reduce((n,x)=>n+x.expense,0),margin=incomeTotal?((incomeTotal-expenseTotal)/incomeTotal)*100:0;
  $('#weeklyChart').innerHTML=`<div class="flow-summary"><div><span>Ingresos 14 días</span><strong>${money.format(incomeTotal)}</strong></div><div><span>Egresos 14 días</span><strong>${money.format(expenseTotal)}</strong></div><div><span>Margen operativo</span><strong>${margin.toFixed(1)}%</strong></div></div><div class="flow-chart-wrap"><svg class="flow-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tendencia de ingresos y gastos de los últimos 14 días"><defs><linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".24"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs><g class="grid-lines"><line x1="28" y1="55" x2="732" y2="55"/><line x1="28" y1="120" x2="732" y2="120"/><line x1="28" y1="185" x2="732" y2="185"/></g><polygon class="income-area" points="${pad},${height-pad} ${incomePts} ${width-pad},${height-pad}"/><polyline class="income-line" points="${incomePts}"/><polyline class="expense-line" points="${expensePts}"/></svg><div class="flow-axis">${days.map((x,i)=>i%2===0?`<span>${x.d.toLocaleDateString('es-PE',{day:'2-digit',month:'short'})}</span>`:'<span></span>').join('')}</div></div>`;
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
  let product;
  if (id) {
    product = state.products.find(p => p.id === id);
    Object.assign(product, productData);
  } else {
    product = { id: uid('product'), ...productData };
    state.products.push(product);
    if (product.stock > 0) addKardex(product, { type: 'entrada', quantity: product.stock, previousStock: 0, newStock: product.stock, reason: 'Stock inicial', reference: productCreateContext === 'sale' ? 'Producto creado durante una venta' : 'Alta de producto', sourceType: 'product_create', sourceId: product.id });
  }
  const returnToSale = productCreateContext === 'sale';
  productCreateContext = 'saving';
  saveState();
  renderAll();
  $('#productModal').close();
  event.target.reset();
  if (returnToSale) {
    productCreateContext = null;
    pendingScannedBarcode = '';
    setSaleType('product');
    $('#saleProduct').value = product.id;
    syncProductSale();
    if (!$('#saleModal').open) $('#saleModal').showModal();
    notify(`${product.name} fue creado y seleccionado para la venta.`);
  } else {
    productCreateContext = null;
    notify(id ? 'Producto actualizado.' : 'Producto creado.');
  }
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

function openProductFromSale(barcode = '') {
  productCreateContext = 'sale';
  pendingScannedBarcode = String(barcode || '').trim();
  const form = $('#productForm');
  form.reset();
  $('#productId').value = '';
  $('#productModalTitle').textContent = 'Agregar producto para vender';
  $('#productBarcode').value = pendingScannedBarcode;
  $('#productStock').value = '1';
  $('#productMinStock').value = '5';
  $('#productCost').value = '0';
  if (!$('#productModal').open) $('#productModal').showModal();
  setTimeout(() => $('#productName').focus(), 80);
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
    notify('Producto no registrado. Completa sus datos para agregarlo a esta venta.');
    closeScanner().then(() => setTimeout(() => openProductFromSale(code), 120));
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
  $('#addProductFromSaleBtn').addEventListener('click', () => openProductFromSale(''));
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
  $('#productModal').addEventListener('close', () => { $('#productForm').reset(); $('#productId').value = ''; $('#productModalTitle').textContent = 'Nuevo producto'; if (productCreateContext !== 'saving') { productCreateContext = null; pendingScannedBarcode = ''; } });
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

function handleProductSubmit(event){
  event.preventDefault();
  const id=$('#productId').value;
  const data={name:$('#productName').value.trim(),barcode:$('#productBarcode').value.trim(),price:toNumber($('#productPrice').value),cost:toNumber($('#productCost').value),stock:Math.max(0,Math.floor(toNumber($('#productStock').value))),minStock:Math.max(0,Math.floor(toNumber($('#productMinStock').value)))};
  if(data.barcode&&state.products.some(p=>p.barcode===data.barcode&&p.id!==id))return notify('Ese código ya pertenece a otro producto.','error');
  if(!data.name||data.price<=0)return notify('Ingresa un nombre y precio válidos.','error');
  let product;
  if(id){
    product=state.products.find(x=>x.id===id);const before=product.stock;Object.assign(product,data);
    if(before!==product.stock)addKardex(product,{type:'ajuste',quantity:Math.abs(product.stock-before),previousStock:before,newStock:product.stock,reason:'Stock modificado desde edición de producto',reference:'Edición manual',sourceType:'product_edit',sourceId:product.id});
  }else{
    product={id:uid('product'),...data};state.products.push(product);
    if(product.stock>0)addKardex(product,{type:'entrada',quantity:product.stock,previousStock:0,newStock:product.stock,reason:'Stock inicial del producto',reference:productCreateContext==='sale'?'Creado durante una venta':'Alta de producto',sourceType:'product_create',sourceId:product.id});
  }
  const returnToSale=productCreateContext==='sale';
  productCreateContext='saving';
  saveState();renderAll();$('#productModal').close();event.target.reset();
  if(returnToSale){productCreateContext=null;pendingScannedBarcode='';setSaleType('product');$('#saleProduct').value=product.id;syncProductSale();if(!$('#saleModal').open)$('#saleModal').showModal();notify(`${product.name} fue creado y seleccionado para la venta.`);}
  else{productCreateContext=null;notify(id?'Producto actualizado.':'Producto creado.');}
}

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


/* ===== V4 · Escáner universal, modo nocturno y boleta ===== */
let zxingControls = null;
let activeReceiptSaleId = null;
const BUSINESS_KEY = 'negocioSimpleBusinessV1';
const THEME_KEY = 'negocioSimpleThemeV1';

function getBusiness(){try{return {name:'Mi Negocio',taxId:'',address:'',phone:'',footer:'¡Gracias por su compra!',...JSON.parse(localStorage.getItem(BUSINESS_KEY)||'{}')}}catch{return {name:'Mi Negocio',taxId:'',address:'',phone:'',footer:'¡Gracias por su compra!'}}}
function saveBusiness(data){localStorage.setItem(BUSINESS_KEY,JSON.stringify(data));}
function applyTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem(THEME_KEY,theme);const dark=theme==='dark';document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#0b1110':'#0f766e');if($('#themeToggle'))$('#themeToggle').textContent=dark?'☀️':'🌙';if($('#sidebarThemeBtn'))$('#sidebarThemeBtn').textContent=dark?'☀️ Modo claro':'🌙 Modo nocturno';}
function toggleTheme(){applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');}

function renderSales(){const query=$('#salesSearch').value.trim().toLowerCase(),date=$('#salesDate').value;const rows=state.sales.filter(s=>{const client=state.clients.find(c=>c.id===s.clientId)?.name||'';return `${s.description} ${s.payment} ${client}`.toLowerCase().includes(query)&&(!date||sameDay(s.date,new Date(`${date}T00:00:00`)))}).sort((a,b)=>new Date(b.date)-new Date(a.date));$('#salesTableBody').innerHTML=rows.map(s=>`<tr><td>${dateTimeFormatter.format(new Date(s.date))}</td><td><strong>${escapeHTML(s.description)}</strong>${s.quantity>1?`<br><small>${s.quantity} × ${money.format(s.unitPrice)}</small>`:''}</td><td>${escapeHTML(s.payment)}</td><td><span class="type-badge">${s.type==='product'?'Producto':'Monto libre'}</span></td><td><strong>${money.format(s.total)}</strong></td><td><div class="row-actions"><button class="icon-btn receipt-btn" data-receipt-sale="${s.id}" title="Ver boleta">▤</button><button class="icon-btn" data-edit-sale="${s.id}" title="Editar">✎</button><button class="icon-btn delete-btn" data-delete-sale="${s.id}" title="Eliminar">×</button></div></td></tr>`).join('');$('#salesEmpty').classList.toggle('hidden',rows.length>0);}

async function stopScannerCamera(){if(zxingControls){try{zxingControls.stop()}catch{}zxingControls=null}if(scannerLoopId)cancelAnimationFrame(scannerLoopId);scannerLoopId=null;scannerDetector=null;if(scannerStream)scannerStream.getTracks().forEach(t=>t.stop());scannerStream=null;const video=$('#scannerVideo');if(video){video.pause();video.srcObject=null}torchEnabled=false;}

async function startScannerCamera(){await stopScannerCamera();if(!navigator.mediaDevices?.getUserMedia){setScannerStatus('La cámara no está disponible. Usa el ingreso manual.');return}const constraints={audio:false,video:{facingMode:{ideal:scannerFacingMode},width:{ideal:2560,min:1280},height:{ideal:1440,min:720},frameRate:{ideal:30},focusMode:{ideal:'continuous'}}};try{setScannerStatus('Abriendo cámara trasera…');if(window.ZXingBrowser?.BrowserMultiFormatReader){const reader=new ZXingBrowser.BrowserMultiFormatReader();zxingControls=await reader.decodeFromConstraints(constraints,$('#scannerVideo'),(result,error,controls)=>{if(result){const code=String(result.getText?.()||result.text||'').trim(),now=Date.now();if(code&&(code!==lastDetectedCode||now-lastDetectedAt>1800)){lastDetectedCode=code;lastDetectedAt=now;vibrate(80);setScannerStatus(`Código detectado: ${code}`);applyScannedCode(code)}}});scannerStream=$('#scannerVideo').srcObject;configureAdvancedCamera();setScannerStatus('Acerca el código hasta que ocupe casi todo el recuadro');return}scannerStream=await navigator.mediaDevices.getUserMedia(constraints);const video=$('#scannerVideo');video.srcObject=scannerStream;await video.play();configureAdvancedCamera();if('BarcodeDetector'in window){const formats=await BarcodeDetector.getSupportedFormats().catch(()=>[]);scannerDetector=new BarcodeDetector({formats:formats.length?formats:undefined});setScannerStatus('Apunta el código dentro del recuadro');scanVideoFrame()}else setScannerStatus('No hay lector automático. Usa Chrome/Edge o el ingreso manual.')}catch(error){console.error(error);let message='No se pudo iniciar la cámara.';if(error.name==='NotAllowedError')message='Permiso de cámara denegado. Actívalo en Ajustes del navegador.';else if(error.name==='NotFoundError')message='No se encontró una cámara compatible.';else if(error.name==='OverconstrainedError')message='La cámara no acepta la resolución solicitada. Reintentando…';setScannerStatus(message);if(error.name==='OverconstrainedError'){try{scannerStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});$('#scannerVideo').srcObject=scannerStream;await $('#scannerVideo').play();configureAdvancedCamera()}catch{}}}}
function configureAdvancedCamera(){scannerStream=$('#scannerVideo').srcObject||scannerStream;const track=scannerStream?.getVideoTracks?.()[0];const caps=track?.getCapabilities?.()||{};$('#torchBtn').disabled=!caps.torch;$('#zoomBtn')?.style.setProperty('display',caps.zoom?'block':'none');if(caps.focusMode?.includes?.('continuous'))track.applyConstraints({advanced:[{focusMode:'continuous'}]}).catch(()=>{});if(caps.zoom){const target=Math.min(caps.max||2,Math.max(caps.min||1,1.35));track.applyConstraints({advanced:[{zoom:target}]}).catch(()=>{});}torchEnabled=false;$('#torchBtn').textContent='🔦 Linterna';}
async function cycleZoom(){const track=scannerStream?.getVideoTracks?.()[0],caps=track?.getCapabilities?.()||{};if(!caps.zoom)return;const current=track.getSettings().zoom||caps.min||1;const next=current<(caps.max||3)*.65?Math.min(caps.max,current+0.5):(caps.min||1);await track.applyConstraints({advanced:[{zoom:next}]});notify(`Zoom ${next.toFixed(1)}×`);}

function handleSaleSubmit(event){event.preventDefault();const id=$('#saleId').value,old=id?state.sales.find(s=>s.id===id):null,payment=$('#salePayment').value,date=new Date($('#saleDateTime').value).toISOString();let newSale;if(saleType==='product'){const product=state.products.find(p=>p.id===$('#saleProduct').value),quantity=Math.floor(toNumber($('#saleQuantity').value)),unitPrice=toNumber($('#saleUnitPrice').value);if(!product||quantity<1||unitPrice<=0)return notify('Completa los datos de la venta.','error');const restored=product.stock+(old?.productId===product.id?old.quantity:0);if(quantity>restored)return notify(`Solo hay ${restored} unidades disponibles.`,'error');newSale={id:id||uid('sale'),receiptNumber:old?.receiptNumber||nextReceiptNumber(),date,description:product.name,productId:product.id,quantity,unitPrice,total:quantity*unitPrice,payment,clientId:payment==='Fiado'?$('#saleClient').value:null,type:'product'}}else{const description=$('#saleDescription').value.trim()||'Venta libre',amount=toNumber($('#saleFreeAmount').value);if(amount<=0)return notify('Ingresa un monto válido.','error');newSale={id:id||uid('sale'),receiptNumber:old?.receiptNumber||nextReceiptNumber(),date,description,productId:null,quantity:1,unitPrice:amount,total:amount,payment,clientId:payment==='Fiado'?$('#saleClient').value:null,type:'free'}}if(payment==='Fiado'&&!newSale.clientId)return notify('Selecciona un cliente para el fiado.','error');if(old?.productId){const p=state.products.find(x=>x.id===old.productId);if(p){const before=p.stock;p.stock+=old.quantity;addKardex(p,{type:'entrada',quantity:old.quantity,previousStock:before,newStock:p.stock,reason:'Corrección de venta editada',reference:`Venta ${old.id}`,sourceType:'sale_edit',sourceId:old.id})}}if(newSale.productId){const p=state.products.find(x=>x.id===newSale.productId),before=p.stock;p.stock-=newSale.quantity;addKardex(p,{type:'salida',quantity:newSale.quantity,previousStock:before,newStock:p.stock,reason:old?'Venta corregida':'Venta registrada',reference:`Venta ${newSale.receiptNumber}`,date:newSale.date,sourceType:'sale',sourceId:newSale.id})}if(old)Object.assign(old,newSale);else state.sales.push(newSale);saveState();renderAll();$('#saleModal').close();event.target.reset();$('#saleId').value='';notify(old?'Venta actualizada.':'Venta registrada. Boleta generada.');openReceipt(newSale.id);}
function nextReceiptNumber(){const count=state.sales.length+1;return `B001-${String(count).padStart(6,'0')}`}
function receiptNumberFor(sale){return sale.receiptNumber||(sale.receiptNumber=nextReceiptNumber())}
function drawReceipt(sale){const canvas=$('#receiptCanvas'),ctx=canvas.getContext('2d'),b=getBusiness(),client=state.clients.find(c=>c.id===sale.clientId);canvas.width=720;canvas.height=1080;ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#111';ctx.textAlign='center';ctx.font='700 36px system-ui';ctx.fillText(b.name||'Mi Negocio',360,60);ctx.font='22px system-ui';let y=100;if(b.taxId){ctx.fillText(`RUC/DNI: ${b.taxId}`,360,y);y+=32}if(b.address){ctx.fillText(b.address,360,y);y+=32}if(b.phone){ctx.fillText(`Tel: ${b.phone}`,360,y);y+=32}ctx.strokeStyle='#222';ctx.setLineDash([8,8]);ctx.beginPath();ctx.moveTo(40,y+10);ctx.lineTo(680,y+10);ctx.stroke();ctx.setLineDash([]);y+=60;ctx.font='700 30px system-ui';ctx.fillText('BOLETA DE VENTA',360,y);y+=38;ctx.font='22px ui-monospace,monospace';ctx.fillText(receiptNumberFor(sale),360,y);y+=48;ctx.textAlign='left';ctx.font='21px system-ui';ctx.fillText(`Fecha: ${dateTimeFormatter.format(new Date(sale.date))}`,45,y);y+=34;ctx.fillText(`Pago: ${sale.payment}`,45,y);y+=34;if(client){ctx.fillText(`Cliente: ${client.name}`,45,y);y+=34}ctx.strokeStyle='#aaa';ctx.beginPath();ctx.moveTo(40,y+8);ctx.lineTo(680,y+8);ctx.stroke();y+=48;ctx.font='700 21px system-ui';ctx.fillText('DESCRIPCIÓN',45,y);ctx.textAlign='right';ctx.fillText('TOTAL',675,y);y+=36;ctx.textAlign='left';ctx.font='22px system-ui';const name=sale.description.length>34?sale.description.slice(0,32)+'…':sale.description;ctx.fillText(name,45,y);ctx.textAlign='right';ctx.fillText(money.format(sale.total),675,y);y+=34;ctx.textAlign='left';ctx.font='19px system-ui';ctx.fillStyle='#555';ctx.fillText(`${sale.quantity} x ${money.format(sale.unitPrice)}`,45,y);y+=52;ctx.strokeStyle='#aaa';ctx.beginPath();ctx.moveTo(40,y);ctx.lineTo(680,y);ctx.stroke();y+=55;ctx.fillStyle='#111';ctx.font='700 33px system-ui';ctx.textAlign='right';ctx.fillText(`TOTAL: ${money.format(sale.total)}`,675,y);y+=70;ctx.textAlign='center';ctx.font='22px system-ui';ctx.fillText(b.footer||'¡Gracias por su compra!',360,y);y+=45;ctx.font='18px system-ui';ctx.fillStyle='#666';ctx.fillText('Comprobante interno sin valor tributario',360,y);ctx.fillText('Generado por Negocio Simple',360,y+30);return canvas}
function openReceipt(saleId){const sale=state.sales.find(s=>s.id===saleId);if(!sale)return;activeReceiptSaleId=saleId;drawReceipt(sale);if(!$('#receiptModal').open)$('#receiptModal').showModal();}
function receiptBlob(){return new Promise(resolve=>$('#receiptCanvas').toBlob(resolve,'image/png',1))}
async function downloadReceipt(){const sale=state.sales.find(s=>s.id===activeReceiptSaleId);if(!sale)return;const blob=await receiptBlob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`boleta-${receiptNumberFor(sale)}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
async function shareReceipt(){const sale=state.sales.find(s=>s.id===activeReceiptSaleId);if(!sale)return;const blob=await receiptBlob(),file=new File([blob],`boleta-${receiptNumberFor(sale)}.png`,{type:'image/png'});try{if(navigator.canShare?.({files:[file]})){await navigator.share({title:`Boleta ${receiptNumberFor(sale)}`,text:`Boleta de compra por ${money.format(sale.total)}`,files:[file]});return}await downloadReceipt();window.open(`https://wa.me/?text=${encodeURIComponent(`Boleta ${receiptNumberFor(sale)} por ${money.format(sale.total)}. La imagen fue descargada para adjuntarla.`)}`,'_blank');notify('Imagen descargada. Adjunta el archivo en WhatsApp.')}catch(e){if(e.name!=='AbortError')notify('No se pudo compartir la boleta. Puedes descargarla.','error')}}
function printReceipt(){const data=$('#receiptCanvas').toDataURL('image/png'),w=window.open('','_blank','width=480,height=760');if(!w)return notify('Permite ventanas emergentes para imprimir.','error');w.document.write(`<html><head><title>Boleta</title><style>body{margin:0;text-align:center}img{width:80mm;max-width:100%}@media print{body{margin:0}}</style></head><body><img src="${data}" onload="print();close()"></body></html>`);w.document.close()}
function openSettings(){const b=getBusiness();$('#businessName').value=b.name;$('#businessTaxId').value=b.taxId;$('#businessAddress').value=b.address;$('#businessPhone').value=b.phone;$('#businessFooter').value=b.footer;$('#settingsModal').showModal()}

document.addEventListener('DOMContentLoaded',()=>{applyTheme(localStorage.getItem(THEME_KEY)||'light');const scannerControls=$('.scanner-controls');if(scannerControls&&!$('#zoomBtn'))scannerControls.insertAdjacentHTML('beforeend','<button type="button" id="zoomBtn" class="secondary-btn">⌕ Zoom</button>');$('.scanner-stage')?.insertAdjacentHTML('afterend','<div class="scanner-hint">Limpia la lente, evita reflejos y mantén el código estable durante un segundo.</div>');$('#themeToggle')?.addEventListener('click',toggleTheme);$('#sidebarThemeBtn')?.addEventListener('click',toggleTheme);$('#settingsBtn')?.addEventListener('click',openSettings);$('#sidebarSettingsBtn')?.addEventListener('click',openSettings);$('#zoomBtn')?.addEventListener('click',cycleZoom);$('#downloadReceiptBtn')?.addEventListener('click',downloadReceipt);$('#shareReceiptBtn')?.addEventListener('click',shareReceipt);$('#printReceiptBtn')?.addEventListener('click',printReceipt);$('#settingsForm')?.addEventListener('submit',e=>{e.preventDefault();saveBusiness({name:$('#businessName').value.trim()||'Mi Negocio',taxId:$('#businessTaxId').value.trim(),address:$('#businessAddress').value.trim(),phone:$('#businessPhone').value.trim(),footer:$('#businessFooter').value.trim()||'¡Gracias por su compra!'});$('#settingsModal').close();notify('Datos del negocio guardados.')});document.addEventListener('click',e=>{const b=e.target.closest('[data-receipt-sale]');if(b)openReceipt(b.dataset.receiptSale)});});


/* ===== V5 · Datos masivos, flujo moderno y contraste refinado ===== */
function renderBusinessPulse(){
  let box=$('#businessPulse'); if(!box)return;
  const last30=new Date();last30.setDate(last30.getDate()-30);
  const prev60=new Date();prev60.setDate(prev60.getDate()-60);
  const current=state.sales.filter(s=>new Date(s.date)>=last30).reduce((n,s)=>n+s.total,0);
  const previous=state.sales.filter(s=>new Date(s.date)>=prev60&&new Date(s.date)<last30).reduce((n,s)=>n+s.total,0);
  const trend=previous?((current-previous)/previous)*100:0;
  const best=[...state.products].map(p=>({p,units:state.sales.filter(s=>s.productId===p.id&&new Date(s.date)>=last30).reduce((n,s)=>n+s.quantity,0)})).sort((a,b)=>b.units-a.units)[0];
  const low=state.products.filter(p=>p.stock<=p.minStock).length;
  box.innerHTML=`<article class="pulse-card"><span class="pulse-icon">↗</span><div><small>Tendencia mensual</small><strong class="${trend>=0?'positive':'negative'}">${trend>=0?'+':''}${trend.toFixed(1)}%</strong><p>frente a los 30 días anteriores</p></div></article><article class="pulse-card"><span class="pulse-icon">★</span><div><small>Producto estrella</small><strong>${escapeHTML(best?.p.name||'Sin datos')}</strong><p>${best?.units||0} unidades en 30 días</p></div></article><article class="pulse-card"><span class="pulse-icon">▦</span><div><small>Salud de inventario</small><strong>${low?`${low} alertas`:'Todo saludable'}</strong><p>${state.products.length} productos controlados</p></div></article><article class="pulse-card"><span class="pulse-icon">◎</span><div><small>Base histórica</small><strong>${state.sales.length.toLocaleString('es-PE')} ventas</strong><p>${state.kardex.length.toLocaleString('es-PE')} movimientos de Kardex</p></div></article>`;
}
const originalRenderDashboardV5=renderDashboard;
renderDashboard=function(){originalRenderDashboardV5();renderBusinessPulse();};

