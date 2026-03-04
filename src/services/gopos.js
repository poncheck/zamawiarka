const axios = require('axios');

const GOPOS_BASE_URL = 'https://app.gopos.io';

let tokenCache = {
  accessToken: null,
  expiresAt: null,
};

/**
 * Pobiera token OAuth2 z GoPOS (grant_type=organization).
 * Token jest cachowany i automatycznie odświeżany przed wygaśnięciem.
 */
async function getAccessToken() {
  const now = Date.now();
  const bufferMs = 60 * 1000; // odśwież 60s przed wygaśnięciem

  if (tokenCache.accessToken && tokenCache.expiresAt && now < tokenCache.expiresAt - bufferMs) {
    return tokenCache.accessToken;
  }

  const { GOPOS_CLIENT_ID, GOPOS_CLIENT_SECRET, GOPOS_ORGANIZATION_ID } = process.env;

  if (!GOPOS_CLIENT_ID || !GOPOS_CLIENT_SECRET || !GOPOS_ORGANIZATION_ID) {
    throw new Error('Brak wymaganych zmiennych środowiskowych: GOPOS_CLIENT_ID, GOPOS_CLIENT_SECRET, GOPOS_ORGANIZATION_ID');
  }

  const params = new URLSearchParams({
    grant_type: 'organization',
    client_id: GOPOS_CLIENT_ID,
    client_secret: GOPOS_CLIENT_SECRET,
    organization_id: GOPOS_ORGANIZATION_ID,
  });

  const response = await axios.post(`${GOPOS_BASE_URL}/oauth/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  const { access_token, expires_in } = response.data;
  tokenCache = {
    accessToken: access_token,
    expiresAt: now + expires_in * 1000,
  };

  return access_token;
}

/**
 * Tworzy gotowego klienta axios z aktualnym tokenem Bearer.
 */
async function getApiClient() {
  const token = await getAccessToken();
  const orgId = process.env.GOPOS_ORGANIZATION_ID;

  return axios.create({
    baseURL: `${GOPOS_BASE_URL}/api/v3/${orgId}`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Pobiera listę produktów (items) z GoPOS.
 * Jeśli ustawiono GOPOS_ITEM_GROUP, zwraca tylko produkty z tej grupy
 * (filtrowanie po item_group.name lub category.name).
 * Przy aktywnym filtrze pobiera wszystkie strony automatycznie.
 */
async function getItems(params = {}) {
  const client = await getApiClient();
  const groupFilter = (process.env.GOPOS_ITEM_GROUP || '').trim().toLowerCase();

  if (!groupFilter) {
    // Bez filtru – zwykłe zapytanie, pierwsza strona
    const response = await client.get('/items', { params });
    return response.data;
  }

  // Z filtrem: pobierz wszystkie strony, potem odfiltruj
  let allItems = [];
  let page = 1;

  while (true) {
    const response = await client.get('/items', { params: { ...params, page, per_page: 100 } });
    const body = response.data;
    const pageItems = Array.isArray(body) ? body : (body.data || []);
    allItems = allItems.concat(pageItems);

    const meta = body.meta || body.pagination;
    const lastPage = meta?.last_page || meta?.total_pages || 1;
    if (page >= lastPage || pageItems.length < 100) break;
    page++;
  }

  return allItems.filter((item) => {
    const groupName  = (item.item_group?.name || item.group?.name || '').toLowerCase();
    const catName    = (item.category?.name || '').toLowerCase();
    return groupName === groupFilter || catName === groupFilter;
  });
}

/**
 * Pobiera listę kategorii z GoPOS.
 */
async function getCategories() {
  const client = await getApiClient();
  const response = await client.get('/categories');
  return response.data;
}

/**
 * Tworzy zamówienie w GoPOS.
 * @param {Object} orderData
 * @param {string} orderData.type - DINE_IN | DELIVERY | ROOM_SERVICE | PICK_UP
 * @param {Array}  orderData.items - [{ item_id, quantity }]
 * @param {string} [orderData.customer_name]
 * @param {string} [orderData.phone]
 * @param {string} [orderData.notes]
 */
async function createOrder(orderData) {
  const client = await getApiClient();
  const response = await client.post('/orders', orderData);
  return response.data;
}

/**
 * Pobiera dostępne metody płatności.
 */
async function getPaymentMethods() {
  const client = await getApiClient();
  const response = await client.get('/payment_methods');
  return response.data;
}

module.exports = { getItems, getCategories, createOrder, getPaymentMethods };
