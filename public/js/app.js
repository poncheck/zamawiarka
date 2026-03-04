/* ===================================================
   Zamawiarka – frontend
   =================================================== */

const API = {
  items: '/api/items',
  categories: '/api/categories',
  orders: '/api/orders',
};

// Stan aplikacji
const state = {
  items: [],
  categories: [],
  cart: {},        // { item_id: { item, quantity } }
  activeCategory: null,
};

// ===== Helpers =====

function formatPrice(grosz) {
  // GoPOS podaje ceny w groszach (integers)
  if (grosz == null) return '';
  return (grosz / 100).toFixed(2).replace('.', ',') + ' zł';
}

function showMessage(text, type = 'error') {
  const el = document.getElementById('message');
  el.textContent = text;
  el.className = `message ${type}`;
  el.style.display = 'block';
  if (type === 'success') setTimeout(() => (el.style.display = 'none'), 5000);
}

function hideMessage() {
  document.getElementById('message').style.display = 'none';
}

// ===== Widoki =====

function showView(viewId) {
  ['loading', 'items-grid', 'cart-section', 'confirmation-section'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(viewId);
  if (target) target.style.display = '';
}

// ===== Ładowanie danych =====

async function loadItems(categoryId = null) {
  showView('loading');
  hideMessage();
  try {
    let url = API.items;
    if (categoryId) url += `?category_id=${categoryId}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    state.items = Array.isArray(data) ? data : (data.data || []);
    renderItems();
    showView('items-grid');
  } catch (e) {
    showMessage(`Nie udało się załadować produktów: ${e.message}`);
    showView('items-grid'); // pokaż pusty grid z komunikatem błędu
  }
}

// ===== Renderowanie =====

function renderItems() {
  const grid = document.getElementById('items-grid');
  grid.innerHTML = '';

  if (state.items.length === 0) {
    grid.innerHTML = '<p style="color:var(--muted);padding:40px 0;grid-column:1/-1;text-align:center">Brak produktów w tej kategorii.</p>';
    return;
  }

  state.items.forEach((item) => {
    const inCart = state.cart[item.id];
    const qty = inCart ? inCart.quantity : 1;

    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.id = item.id;

    // Zdjęcie lub emoji placeholder
    const imgHtml = item.image_url
      ? `<div class="item-image"><img src="${escHtml(item.image_url)}" alt="${escHtml(item.name)}" loading="lazy"/></div>`
      : `<div class="item-image">🎂</div>`;

    const price = item.price != null ? formatPrice(item.price) : '';
    const desc = item.description ? `<p class="item-description">${escHtml(item.description)}</p>` : '';

    card.innerHTML = `
      ${imgHtml}
      <div class="item-body">
        <p class="item-name">${escHtml(item.name)}</p>
        ${desc}
        ${price ? `<p class="item-price">${price}</p>` : ''}
      </div>
      <div class="item-footer">
        <div class="qty-control">
          <button class="qty-btn btn-minus" data-id="${item.id}">−</button>
          <span class="qty-value" id="qty-${item.id}">${qty}</span>
          <button class="qty-btn btn-plus" data-id="${item.id}">+</button>
        </div>
        <button class="btn-add" data-id="${item.id}">${inCart ? '✓ W koszyku' : 'Dodaj'}</button>
      </div>`;

    card.querySelector('.btn-minus').addEventListener('click', () => changeQty(item.id, -1));
    card.querySelector('.btn-plus').addEventListener('click', () => changeQty(item.id, 1));
    card.querySelector('.btn-add').addEventListener('click', () => addToCart(item));

    grid.appendChild(card);
  });
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== Koszyk =====

function changeQty(itemId, delta) {
  const qtyEl = document.getElementById(`qty-${itemId}`);
  if (!qtyEl) return;
  let val = parseInt(qtyEl.textContent, 10) + delta;
  if (val < 1) val = 1;
  qtyEl.textContent = val;

  // Jeśli item już w koszyku, zaktualizuj od razu
  if (state.cart[itemId]) {
    state.cart[itemId].quantity = val;
    updateCartUI();
  }
}

function addToCart(item) {
  const qtyEl = document.getElementById(`qty-${item.id}`);
  const qty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;

  state.cart[item.id] = { item, quantity: qty };
  updateCartUI();

  // Wizualne potwierdzenie na karcie
  const btn = document.querySelector(`.item-card[data-id="${item.id}"] .btn-add`);
  if (btn) btn.textContent = '✓ W koszyku';
}

function removeFromCart(itemId) {
  delete state.cart[itemId];
  updateCartUI();
  // Przywróć przycisk na karcie jeśli widoczna
  const btn = document.querySelector(`.item-card[data-id="${itemId}"] .btn-add`);
  if (btn) btn.textContent = 'Dodaj';
}

function updateCartUI() {
  const entries = Object.values(state.cart);
  const count = entries.reduce((s, e) => s + e.quantity, 0);
  const total = entries.reduce((s, e) => s + (e.item.price || 0) * e.quantity, 0);

  document.getElementById('cart-count').textContent = count;
  document.getElementById('cart-total').textContent = formatPrice(total);
  document.getElementById('cart-total-big').textContent = formatPrice(total);

  const summaryEl = document.getElementById('cart-summary');
  summaryEl.style.display = count > 0 ? 'block' : 'none';
}

function renderCartList() {
  const list = document.getElementById('cart-list');
  list.innerHTML = '';
  Object.values(state.cart).forEach(({ item, quantity }) => {
    const li = document.createElement('li');
    li.className = 'cart-item';
    const lineTotal = (item.price || 0) * quantity;
    li.innerHTML = `
      <span class="cart-item-name">${escHtml(item.name)}</span>
      <span class="cart-item-qty">× ${quantity}</span>
      <span class="cart-item-price">${formatPrice(lineTotal)}</span>
      <button class="cart-item-remove" title="Usuń" data-id="${item.id}">✕</button>`;
    li.querySelector('.cart-item-remove').addEventListener('click', () => {
      removeFromCart(item.id);
      renderCartList();
      if (Object.keys(state.cart).length === 0) showView('items-grid');
    });
    list.appendChild(li);
  });
}

// ===== Składanie zamówienia =====

document.getElementById('order-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessage();

  const entries = Object.values(state.cart);
  if (entries.length === 0) {
    showMessage('Koszyk jest pusty.');
    return;
  }

  const payload = {
    type: document.getElementById('order-type').value,
    items: entries.map(({ item, quantity }) => ({ item_id: item.id, quantity })),
    customer_name: document.getElementById('customer-name').value.trim() || undefined,
    phone: document.getElementById('phone').value.trim() || undefined,
    notes: document.getElementById('notes').value.trim() || undefined,
  };

  const submitBtn = document.getElementById('btn-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Wysyłanie…';

  try {
    const resp = await fetch(API.orders, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await resp.json();

    if (!resp.ok) {
      throw new Error(
        typeof result.error === 'string'
          ? result.error
          : JSON.stringify(result.error) || `HTTP ${resp.status}`
      );
    }

    // Sukces
    state.cart = {};
    updateCartUI();
    document.getElementById('order-form').reset();

    const orderId = result.id || result.order_id || '';
    document.getElementById('confirmation-details').textContent =
      orderId ? `Numer zamówienia: ${orderId}` : 'Zamówienie trafiło do systemu.';
    showView('confirmation-section');
  } catch (err) {
    showMessage(`Błąd: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Złóż zamówienie';
  }
});

// ===== Nawigacja przyciskami =====

document.getElementById('btn-cart').addEventListener('click', () => {
  if (Object.keys(state.cart).length === 0) return;
  renderCartList();
  updateCartUI();
  showView('cart-section');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('btn-back').addEventListener('click', () => {
  showView('items-grid');
});

document.getElementById('btn-new-order').addEventListener('click', () => {
  showView('items-grid');
});

// ===== Init =====

(async () => {
  await loadItems();
})();
