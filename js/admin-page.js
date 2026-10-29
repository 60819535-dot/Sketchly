import { supabase } from './supabase.js';
import { listarTodosLosPedidos, actualizarEstadoPedido } from './admin.js';

const $ = (selector) => document.querySelector(selector);
const message = $('#adminMessage');
const dashboard = $('#adminDashboard');
const list = $('#ordersList');
const empty = $('#emptyOrders');
const searchInput = $('#orderSearch');
const statusFilter = $('#statusFilter');
const refreshButton = $('#refreshOrders');
const signOutButton = $('#adminSignOut');

let allOrders = [];
const statusLabels = {
  pending: 'Por revisar',
  reviewing: 'En revisión',
  quoted: 'Cotizado',
  in_progress: 'En proceso',
  completed: 'Completado',
  cancelled: 'Cancelado'
};

function showMessage(text, type = '') {
  message.textContent = text;
  message.className = 'admin-message' + (type ? ' ' + type : '');
  message.hidden = false;
}
function formatDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(value + (String(value).length === 10 ? 'T12:00:00' : ''));
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('es-PE', {day:'2-digit',month:'short',year:'numeric'}).format(date);
}
function safeText(value, fallback = 'No especificado') {
  return value === null || value === undefined || String(value).trim() === '' ? fallback : String(value);
}
function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}
function statusBadge(status) {
  return makeElement('span', 'order-status-badge ' + status, statusLabels[status] || safeText(status, 'Sin estado'));
}
function addMeta(parent, label, value) {
  const wrapper = makeElement('div', 'order-meta');
  wrapper.append(makeElement('span', '', label), makeElement('strong', '', value));
  parent.append(wrapper);
}
function renderOrder(order) {
  const card = makeElement('article', 'order-admin-card');
  const top = makeElement('div', 'order-card-top');
  const titleWrap = makeElement('div', 'order-card-title');
  titleWrap.append(makeElement('span', 'order-card-icon', '✦'));
  const titleText = makeElement('div');
  titleText.append(
    makeElement('h3', '', safeText(order.title, 'Solicitud de diseño')),
    makeElement('p', '', safeText(order.customer_name, 'Cliente') + ' · ' + safeText(order.customer_email, 'Sin correo'))
  );
  titleWrap.append(titleText);
  top.append(titleWrap, statusBadge(order.status));
  card.append(top);

  const meta = makeElement('div', 'order-meta-grid');
  addMeta(meta, 'TIPO DE DISEÑO', safeText(order.design_type));
  addMeta(meta, 'FECHA DE SOLICITUD', formatDate(order.created_at));
  addMeta(meta, 'FECHA DESEADA', formatDate(order.due_date));
  addMeta(meta, 'PAGO', safeText(order.payment_status, 'Pendiente'));
  addMeta(meta, 'MONTO', order.amount ?? order.total_amount ?? order.price ? 'S/ ' + (order.amount ?? order.total_amount ?? order.price) : 'Por cotizar');
  addMeta(meta, 'ID DEL PEDIDO', String(order.id ?? '—'));
  card.append(meta);
  card.append(makeElement('p', 'order-description', safeText(order.description, 'El cliente no agregó una descripción.')));

  if (order.reference_path) {
    const reference = makeElement('p', 'order-inline-message', 'Este pedido incluye una imagen de referencia. Ruta: ' + order.reference_path);
    card.append(reference);
  }

  const bottom = makeElement('div', 'order-card-bottom');
  const label = makeElement('label', '', 'Actualizar estado');
  const select = makeElement('select', 'order-status-select');
  select.setAttribute('aria-label', 'Nuevo estado del pedido ' + order.id);
  for (const [value, text] of Object.entries(statusLabels)) {
    const option = makeElement('option', '', text);
    option.value = value;
    select.append(option);
  }
  select.value = statusLabels[order.status] ? order.status : 'pending';
  label.append(select);
  const save = makeElement('button', 'save-status-button', 'Guardar estado');
  save.type = 'button';
  save.addEventListener('click', async () => {
    if (select.value === order.status) {
      showMessage('El pedido ya tiene ese estado.', '');
      return;
    }
    save.disabled = true;
    save.textContent = 'Guardando…';
    try {
      await actualizarEstadoPedido(order.id, select.value);
      showMessage('Estado actualizado correctamente.', 'success');
      await loadOrders(false);
    } catch (error) {
      console.error('No se pudo actualizar el pedido:', error);
      showMessage(error.message || 'No se pudo actualizar el estado. Revisa los permisos de Supabase.', 'error');
      save.disabled = false;
      save.textContent = 'Guardar estado';
    }
  });
  bottom.append(label, save);
  card.append(bottom);
  return card;
}
function renderList() {
  const query = searchInput.value.trim().toLocaleLowerCase('es-PE');
  const selectedStatus = statusFilter.value;
  const filtered = allOrders.filter(order => {
    const haystack = [order.title, order.customer_name, order.customer_email, order.design_type, order.description, order.id]
      .map(value => String(value ?? '').toLocaleLowerCase('es-PE')).join(' ');
    return (!query || haystack.includes(query)) && (selectedStatus === 'all' || order.status === selectedStatus);
  });
  list.replaceChildren(...filtered.map(renderOrder));
  empty.hidden = filtered.length > 0;
  $('#resultsCount').textContent = filtered.length + (filtered.length === 1 ? ' pedido' : ' pedidos');
}
function renderStats() {
  $('#totalOrders').textContent = allOrders.length;
  $('#pendingOrders').textContent = allOrders.filter(order => ['pending','reviewing'].includes(order.status)).length;
  $('#progressOrders').textContent = allOrders.filter(order => ['quoted','in_progress'].includes(order.status)).length;
  $('#completedOrders').textContent = allOrders.filter(order => order.status === 'completed').length;
}
async function loadOrders(showLoading = true) {
  if (showLoading) showMessage('Cargando pedidos recibidos…');
  refreshButton.disabled = true;
  try {
    allOrders = await listarTodosLosPedidos();
    renderStats();
    renderList();
    dashboard.hidden = false;
    showMessage('Pedidos actualizados. Se muestran primero las solicitudes más recientes.', 'success');
  } catch (error) {
    console.error('No se pudieron cargar los pedidos:', error);
    dashboard.hidden = true;
    showMessage(error.message || 'No se pudieron cargar los pedidos. Comprueba que tu perfil tenga rol de administrador y que las políticas de Supabase permitan consultar orders.', 'error');
  } finally {
    refreshButton.disabled = false;
  }
}
searchInput.addEventListener('input', renderList);
statusFilter.addEventListener('change', renderList);
refreshButton.addEventListener('click', () => loadOrders());
signOutButton.addEventListener('click', async () => {
  signOutButton.disabled = true;
  const { error } = await supabase.auth.signOut();
  if (error) {
    showMessage(error.message, 'error');
    signOutButton.disabled = false;
    return;
  }
  window.location.href = 'login.html';
});

async function init() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      showMessage('Inicia sesión con tu cuenta de administrador para acceder a este panel.', 'error');
      return;
    }
    signOutButton.hidden = false;
    await loadOrders();
  } catch (error) {
    showMessage(error.message || 'No se pudo verificar la sesión.', 'error');
  }
}
init();
