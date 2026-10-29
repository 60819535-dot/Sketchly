import { supabase } from './supabase.js';
import { listarTodosLosPedidos, actualizarEstadoPedido, entregarDiseno } from './admin.js';

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
function addActionButton(parent, text, callback) {
  const button = makeElement('button', 'order-action-button', text);
  button.type = 'button';
  button.addEventListener('click', callback);
  parent.append(button);
  return button;
}
function showImagePreview(url, title = 'Vista previa') {
  const modal = $('#adminImageModal');
  const image = $('#adminImagePreview');
  const heading = $('#adminImageTitle');
  if (!modal || !image || !heading) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  image.src = url;
  image.alt = title;
  heading.textContent = title;
  modal.classList.add('show');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}
function closeImagePreview() {
  const modal = $('#adminImageModal');
  if (!modal) return;
  modal.classList.remove('show');
  modal.setAttribute('aria-hidden', 'true');
  $('#adminImagePreview').src = '';
  document.body.style.overflow = '';
}
$('#adminImageModalClose')?.addEventListener('click', closeImagePreview);
$('#adminImageModal')?.addEventListener('click', (event) => {
  if (event.target.id === 'adminImageModal') closeImagePreview();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeImagePreview();
});
function openReference(path, bucket = 'sketchly-files', title = 'Imagen de referencia') {
  if (!path) return;
  if (/^https?:\/\//i.test(path)) {
    showImagePreview(path, title);
    return;
  }
  supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({data, error}) => {
    if (error || !data?.signedUrl) throw error || new Error('No se generó el enlace de la imagen.');
    showImagePreview(data.signedUrl, title);
  }).catch(error => {
    console.error('No se pudo abrir la imagen:', error);
    showMessage('No se pudo abrir la imagen. Comprueba que el archivo exista en el bucket correcto y que las políticas de Storage permitan leerlo.', 'error');
  });
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
  if (order.customer_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customer_email)) {
    const contact = makeElement('a', 'order-contact-link', 'Contactar al cliente ↗');
    contact.href = 'mailto:' + order.customer_email;
    titleText.append(contact);
  }
  titleWrap.append(titleText);
  top.append(titleWrap, statusBadge(order.status));
  card.append(top);

  const meta = makeElement('div', 'order-meta-grid');
  addMeta(meta, 'TIPO DE DISEÑO', safeText(order.design_type));
  addMeta(meta, 'FECHA DE SOLICITUD', formatDate(order.created_at));
  addMeta(meta, 'FECHA DESEADA', formatDate(order.due_date));
  addMeta(meta, 'ESTADO DEL PAGO', safeText(order.payment_status, 'Pendiente / por verificar'));
  const amount = order.amount ?? order.total_amount ?? order.price;
  addMeta(meta, 'MONTO', amount !== null && amount !== undefined && amount !== '' ? 'S/ ' + amount : 'Por cotizar');
  addMeta(meta, 'ID DEL PEDIDO', String(order.id ?? '—'));
  card.append(meta);
  card.append(makeElement('p', 'order-description', safeText(order.description, 'El cliente no agregó una descripción.')));

  // Cotización: guardar el monto y habilitar el panel de pago Yape del cliente.
  const quoteBox = makeElement('div', 'order-actions');
  quoteBox.style.alignItems = 'center';
  quoteBox.style.flexWrap = 'wrap';
  quoteBox.style.margin = '14px 0';
  const priceLabel = makeElement('label', '', 'Precio del diseño (S/)');
  priceLabel.style.display = 'flex';
  priceLabel.style.flexDirection = 'column';
  priceLabel.style.gap = '6px';
  priceLabel.style.fontSize = '12px';
  priceLabel.style.fontWeight = '700';
  const priceInput = makeElement('input');
  priceInput.type = 'number';
  priceInput.min = '0.01';
  priceInput.step = '0.01';
  priceInput.required = true;
  priceInput.inputMode = 'decimal';
  priceInput.placeholder = 'Ej. 25.00';
  priceInput.setAttribute('aria-label', 'Precio del pedido en soles');
  priceInput.value = order.amount ?? order.price ?? order.total_amount ?? '';
  priceInput.style.padding = '10px 12px';
  priceInput.style.border = '1px solid #ded5ef';
  priceInput.style.borderRadius = '10px';
  priceInput.style.minWidth = '150px';
  priceLabel.append(priceInput);
  const savePrice = makeElement('button', 'save-status-button', 'Guardar precio y habilitar Yape');
  savePrice.type = 'button';
  savePrice.addEventListener('click', async () => {
    const amountValue = Number(priceInput.value);
    if (!priceInput.value.trim() || !Number.isFinite(amountValue) || amountValue <= 0) {
      showMessage('Escribe un precio válido mayor que S/ 0.00.', 'error');
      priceInput.focus();
      return;
    }
    if (['cancelled', 'completed', 'in_progress'].includes(order.status)) {
      showMessage('Para cotizar o cambiar el precio, primero verifica que el pedido no esté cancelado, terminado o en proceso.', 'error');
      return;
    }
    savePrice.disabled = true;
    savePrice.textContent = 'Guardando…';
    try {
      const changes = { amount: Math.round(amountValue * 100) / 100 };
      if (['pending', 'reviewing'].includes(order.status)) changes.status = 'quoted';
      const { error } = await supabase
        .from('orders')
        .update(changes)
        .eq('id', order.id);
      if (error) throw error;
      showMessage('Precio guardado. El pedido quedó cotizado y el cliente ya puede ver el QR de Yape en “Mis pedidos”.', 'success');
      await loadOrders(false);
    } catch (error) {
      console.error('No se pudo guardar el precio:', error);
      showMessage(error.message || 'No se pudo guardar el precio. Comprueba que la tabla orders tenga la columna amount y que RLS permita actualizar pedidos como administrador.', 'error');
      savePrice.disabled = false;
      savePrice.textContent = 'Guardar precio y habilitar Yape';
    }
  });
  quoteBox.append(priceLabel, savePrice);
  card.append(quoteBox);

  const actions = makeElement('div', 'order-actions');
  if (order.reference_path) {
    addActionButton(actions, '▧  Ver imagen de referencia', () => openReference(order.reference_path, 'sketchly-files', 'Imagen de referencia del cliente'));
  }
  addActionButton(actions, '▣  Ver QR de Yape', () => showImagePreview('img/qr-yape.png', 'QR de Yape de Sketchly'));
  if (order.payment_proof_path) {
    addActionButton(actions, '✓  Ver captura de pago', () => openReference(order.payment_proof_path, 'payment-proofs', 'Captura del pago enviada por el cliente'));
  } else {
    const proofNote = makeElement('span', 'delivery-help',
      order.payment_status === 'submitted'
        ? 'El cliente figura como enviado, pero no hay ruta de captura guardada.'
        : 'Todavía no hay captura de pago registrada.');
    actions.append(proofNote);
  }
  if (order.customer_email) {
    const email = makeElement('a', 'order-action-button', '✉  Escribir correo');
    email.href = 'mailto:' + order.customer_email + '?subject=' + encodeURIComponent('Tu pedido de Sketchly');
    actions.append(email);
  }
  card.append(actions);

  const deliveryWrap = makeElement('div', 'order-actions');
  const fileInput = makeElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,.pdf,.psd,.ai,.svg,.zip';
  fileInput.setAttribute('aria-label', 'Seleccionar archivo final para entregar');
  fileInput.id = 'delivery-' + String(order.id).replace(/[^a-zA-Z0-9_-]/g, '');
  const uploadLabel = makeElement('label', 'delivery-upload-label', '＋  Elegir archivo final');
  uploadLabel.htmlFor = fileInput.id;
  uploadLabel.append(fileInput);
  const uploadButton = makeElement('button', 'save-status-button', 'Subir entrega');
  uploadButton.type = 'button';
  const deliveryHelp = makeElement('span', 'delivery-help', 'Hasta 20 MB por archivo');
  uploadButton.addEventListener('click', async () => {
    const file = fileInput.files?.[0];
    if (!file) {
      showMessage('Primero elige el archivo final que vas a entregar.', 'error');
      return;
    }
    if (!order.user_id) {
      showMessage('Este pedido no tiene user_id asociado. No se puede vincular la entrega al cliente hasta corregir ese dato.', 'error');
      return;
    }
    uploadButton.disabled = true;
    uploadButton.textContent = 'Subiendo…';
    try {
      await entregarDiseno(order.id, file, order.user_id);
      showMessage('Archivo subido y asociado al pedido. Confirma que las políticas de Storage y order_files permiten la operación.', 'success');
      fileInput.value = '';
    } catch (error) {
      console.error('No se pudo subir la entrega:', error);
      showMessage(error.message || 'No se pudo subir el archivo. Revisa las políticas de Storage y la tabla order_files.', 'error');
    } finally {
      uploadButton.disabled = false;
      uploadButton.textContent = 'Subir entrega';
    }
  });
  deliveryWrap.append(uploadLabel, uploadButton, deliveryHelp);
  card.append(deliveryWrap);

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
    showMessage('Panel conectado. Se muestran primero las solicitudes más recientes.', 'success');
  } catch (error) {
    console.error('No se pudieron cargar los pedidos:', error);
    dashboard.hidden = true;
    showMessage(error.message || 'No se pudieron cargar los pedidos. Comprueba el rol admin y las políticas de Supabase.', 'error');
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
      showMessage('Inicia sesión con la cuenta sketchly.draw@gmail.com después de registrarla en este proyecto de Supabase. Si aún no tiene perfil, primero crea la cuenta desde la web.', 'error');
      return;
    }
    signOutButton.hidden = false;
    await loadOrders();
  } catch (error) {
    showMessage(error.message || 'No se pudo verificar la sesión.', 'error');
  }
}
init();
