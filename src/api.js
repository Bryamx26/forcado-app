export class AuthError extends Error {}

// Erreur renvoyée par le serveur : code stable (traduit côté client) et variables éventuelles.
export class ApiError extends Error {
  constructor(message, { code, vars, status } = {}) {
    super(message);
    this.code = code;
    this.vars = vars;
    this.status = status;
  }
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new AuthError(data.error || 'Connexion requise');
  if (!res.ok) throw new ApiError(data.error || 'Erreur réseau', { code: data.code, vars: data.vars, status: res.status });
  return data;
}

export const api = {
  config: () => request('/api/config'),
  menu: (lang = 'fr') => request(`/api/menu?lang=${lang}`),
  adminMenu: () => request('/api/admin/menu'),
  track: (ids) => request(`/api/orders/track?ids=${ids.join(',')}`),
  orders: () => request('/api/orders'),
  board: () => request('/api/orders/board'),
  pickupSlots: () => request('/api/orders/pickup-slots'),
  subscribePush: (id, subscription) => request(`/api/orders/${id}/push`, { method: 'POST', body: { subscription } }),
  createOrder: (order) => request('/api/orders', { method: 'POST', body: order }),
  setStatus: (id, status, from) => request(`/api/orders/${id}`, { method: 'PATCH', body: { status, from } }),
  editOrder: (id, lines, basedOn) => request(`/api/orders/${id}/lines`, { method: 'PUT', body: { lines, basedOn } }),
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
  addOptionSet: (group) => request('/api/admin/option-sets', { method: 'POST', body: group }),
  updateOptionSet: (id, group) => request(`/api/admin/option-sets/${id}`, { method: 'PUT', body: group }),
  deleteOptionSet: (id) => request(`/api/admin/option-sets/${id}`, { method: 'DELETE' }),
  setChoiceAvailable: (key, available) => request('/api/menu/choices/availability', { method: 'PUT', body: { key, available } }),
  uploadImage: (dataUrl) => request('/api/admin/images', { method: 'POST', body: { dataUrl } }),
  stats: (from, to) => request(`/api/stats?from=${from}&to=${to}`),
  me: () => request('/api/auth/me'),
  login: (password) => request('/api/auth/login', { method: 'POST', body: { password } }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
};

let money = new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' });
export function setMoneyFormat(locale, currency) {
  money = new Intl.NumberFormat(locale, { style: 'currency', currency });
}
export const euro = (n) => money.format(n);
