import { useEffect, useState } from 'react';
import { api, AuthError, euro } from '../../api.js';
import { useLiveEvents } from '../../live.js';
import ItemEditor from './ItemEditor.jsx';

export default function MenuAdmin({ onAuthError }) {
  const [menu, setMenu] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { item?, categoryId? }
  const [newCategory, setNewCategory] = useState('');

  const load = () => api.menu().then(setMenu).catch(() => setError('Impossible de charger la carte.'));
  useEffect(() => {
    load();
  }, []);
  useLiveEvents('/api/events?scope=staff', { menu: load });

  // Lance une action, affiche l'erreur éventuelle, puis recharge la carte.
  const run = async (fn) => {
    setError('');
    try {
      await fn();
    } catch (e) {
      if (e instanceof AuthError) return onAuthError();
      setError(e.message);
    }
    load();
  };

  const toggle = (item) => {
    const available = item.soldOut;
    setMenu((m) => m.map((c) => ({ ...c, items: c.items.map((i) => (i.id === item.id ? { ...i, soldOut: !available } : i)) })));
    run(() => api.setAvailable(item.id, available));
  };

  const removeItem = (item) => {
    if (!confirm(`Supprimer « ${item.name} » de la carte ? Les commandes déjà passées ne changent pas.`)) return;
    run(() => api.deleteItem(item.id));
  };

  const renameCategory = (cat) => {
    const name = prompt('Nouveau nom de la catégorie', cat.name);
    if (name && name.trim() !== cat.name) run(() => api.renameCategory(cat.id, name));
  };

  const removeCategory = (cat) => {
    if (cat.items.length) return setError(`Videz « ${cat.name} » (déplacez ou supprimez ses articles) avant de la supprimer.`);
    if (confirm(`Supprimer la catégorie « ${cat.name} » ?`)) run(() => api.deleteCategory(cat.id));
  };

  const addCategory = (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    run(async () => {
      await api.addCategory(newCategory);
      setNewCategory('');
    });
  };

  return (
    <section className="panel">
      <div className="admin-head">
        <div>
          <h2>Carte</h2>
          <p className="muted small">
            Ajoutez, modifiez ou retirez des articles. Les changements s'affichent immédiatement chez les clients.
            « Épuisé » masque un article pour la journée sans le supprimer.
          </p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {!menu && !error && <p className="muted">Chargement…</p>}

      {menu?.map((cat, ci) => (
        <div key={cat.id} className="admin-cat">
          <div className="admin-cat-head">
            <h3>{cat.name}</h3>
            <div className="admin-tools">
              <button className="icon-btn" title="Monter" disabled={ci === 0} onClick={() => run(() => api.moveCategory(cat.id, 'up'))}>↑</button>
              <button className="icon-btn" title="Descendre" disabled={ci === menu.length - 1} onClick={() => run(() => api.moveCategory(cat.id, 'down'))}>↓</button>
              <button className="link small" onClick={() => renameCategory(cat)}>Renommer</button>
              <button className="link small danger" onClick={() => removeCategory(cat)}>Supprimer</button>
            </div>
          </div>
          {cat.items.length === 0 && <p className="muted small">Aucun article dans cette catégorie.</p>}
          {cat.items.map((item, ii) => (
            <div key={item.id} className={`admin-row ${item.soldOut ? 'admin-out' : ''}`}>
              <span className="admin-thumb">{item.image ? <img src={item.image} alt="" /> : item.emoji}</span>
              <span className="admin-name">
                {item.name}
                <span className="muted small">
                  {' '}· {euro(item.price)}
                  {item.options?.length ? ` · ${item.options.length} option${item.options.length > 1 ? 's' : ''}` : ''}
                </span>
              </span>
              <label className="switch">
                <input type="checkbox" checked={!item.soldOut} onChange={() => toggle(item)} />
                <span className="switch-track" />
                <span className="switch-label">{item.soldOut ? 'Épuisé' : 'Disponible'}</span>
              </label>
              <div className="admin-tools">
                <button className="icon-btn" title="Monter" disabled={ii === 0} onClick={() => run(() => api.moveItem(item.id, 'up'))}>↑</button>
                <button className="icon-btn" title="Descendre" disabled={ii === cat.items.length - 1} onClick={() => run(() => api.moveItem(item.id, 'down'))}>↓</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ item, categoryId: cat.id })}>Modifier</button>
                <button className="icon-btn danger" title="Supprimer" aria-label={`Supprimer ${item.name}`} onClick={() => removeItem(item)}>🗑</button>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm admin-add" onClick={() => setEditing({ categoryId: cat.id })}>
            + Ajouter un article
          </button>
        </div>
      ))}

      {menu && (
        <form className="admin-new-cat" onSubmit={addCategory}>
          <input
            className="editor-input"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nouvelle catégorie (ex. Salgados)"
            maxLength={40}
          />
          <button className="btn btn-sm" disabled={!newCategory.trim()}>Créer la catégorie</button>
        </form>
      )}

      {editing && (
        <ItemEditor
          item={editing.item}
          categoryId={editing.categoryId}
          categories={menu}
          onAuthError={onAuthError}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </section>
  );
}
