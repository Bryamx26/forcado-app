async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur réseau');
  return data;
}

export const api = {
  menu: () => request('/api/menu'),
  orders: (ids) => request(ids ? `/api/orders?ids=${ids.join(',')}` : '/api/orders'),
  createOrder: (order) => request('/api/orders', { method: 'POST', body: order }),
  setStatus: (id, status) => request(`/api/orders/${id}`, { method: 'PATCH', body: { status } }),
};

export const euro = (n) => n.toLocaleString('fr-BE', { style: 'currency', currency: 'EUR' });

export const STATUS_LABELS = {
  nouvelle: 'Reçue',
  en_cours: 'En préparation',
  prete: 'Prête',
  servie: 'Servie',
  annulee: 'Annulée',
};
