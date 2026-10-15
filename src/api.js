export class AuthError extends Error {}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthError(data.error || 'Connexion requise');
  if (!res.ok) throw new Error(data.error || 'Erreur réseau');
  return data;
}

export const api = {
  config: () => request('/api/config'),
  menu: () => request('/api/menu'),
  track: (ids) => request(`/api/orders/track?ids=${ids.join(',')}`),
  orders: () => request('/api/orders'),
  createOrder: (order) => request('/api/orders', { method: 'POST', body: order }),
  setStatus: (id, status) => request(`/api/orders/${id}`, { method: 'PATCH', body: { status } }),
  editOrder: (id, lines) => request(`/api/orders/${id}/lines`, { method: 'PUT', body: { lines } }),
  setAvailable: (itemId, available) =>
    request(`/api/menu/${itemId}/availability`, { method: 'PUT', body: { available } }),
  addCategory: (name) => request('/api/admin/categories', { method: 'POST', body: { name } }),
  renameCategory: (id, name) => request(`/api/admin/categories/${id}`, { method: 'PATCH', body: { name } }),
  deleteCategory: (id) => request(`/api/admin/categories/${id}`, { method: 'DELETE' }),
  moveCategory: (id, dir) => request(`/api/admin/categories/${id}/move`, { method: 'POST', body: { dir } }),
  addItem: (item) => request('/api/admin/items', { method: 'POST', body: item }),
  updateItem: (id, item) => request(`/api/admin/items/${id}`, { method: 'PUT', body: item }),
  deleteItem: (id) => request(`/api/admin/items/${id}`, { method: 'DELETE' }),
  moveItem: (id, dir) => request(`/api/admin/items/${id}/move`, { method: 'POST', body: { dir } }),
  uploadImage: (dataUrl) => request('/api/admin/images', { method: 'POST', body: { dataUrl } }),
  me: () => request('/api/auth/me'),
  login: (name, password) => request('/api/auth/login', { method: 'POST', body: { name, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
};

let money = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' });
export function setMoneyFormat(locale, currency) {
  money = new Intl.NumberFormat(locale, { style: 'currency', currency });
}
export const euro = (n) => money.format(n);

export const STATUS_LABELS = {
  nouvelle: 'Reçue',
  en_cours: 'En préparation',
  prete: 'Prête',
  servie: 'Servie',
  annulee: 'Annulée',
};
