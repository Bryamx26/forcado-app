import { useEffect, useState } from 'react';
import { api, AuthError, euro } from '../../api.js';
import { useLiveEvents } from '../../live.js';
import ItemEditor from './ItemEditor.jsx';
import { Alert, ConfirmDialog, Modal, useToast } from '../../components/ui.jsx';
import { TranslationsEditor, frenchText, toLocalized } from './translations.jsx';
import OptionSetEditor from './OptionSetEditor.jsx';
import ChoiceAvailability from './ChoiceAvailability.jsx';
import { expandOptions } from '../../../shared/options.js';

export default function MenuAdmin({ onAuthError }) {
  const [menu, setMenu] = useState(null);
  const [optionSets, setOptionSets] = useState([]);
  const [soldOut, setSoldOut] = useState(() => new Set());
  const [editingSet, setEditingSet] = useState(null); // { optionSet? }
  const [choicesOf, setChoicesOf] = useState(null); // article dont on règle les choix épuisés
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // { item?, categoryId? }
  const [newCategory, setNewCategory] = useState('');
  const [confirming, setConfirming] = useState(null); // { title, text, label, action }
  const [renaming, setRenaming] = useState(null); // { cat, name }
  const toast = useToast();

  const load = () =>
    api
      .adminMenu()
      .then((data) => {
        setMenu(data.categories);
        setOptionSets(data.optionSets);
        setSoldOut(new Set(data.soldOut));
      })
      .catch(() => setError('Impossible de charger la carte.'));
  useEffect(() => {
    load();
  }, []);
  useLiveEvents('/api/events?scope=staff', { menu: load });

  // Lance une action, affiche l'erreur éventuelle, puis recharge la carte.
  const run = async (fn, done) => {
    setError('');
    try {
      await fn();
      if (done) toast(done);
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

  const toggleChoice = (key, available) => {
    setSoldOut((current) => {
      const next = new Set(current);
      if (available) next.delete(key);
      else next.add(key);
      return next;
    });
    run(() => api.setChoiceAvailable(key, available));
  };

  const usersOf = (setId) => (menu || []).flatMap((c) => c.items).filter((i) => i.optionSetIds?.includes(setId)).map((i) => frenchText(i.name));

  const removeOptionSet = (optionSet) =>
    setConfirming({
      title: `Supprimer le groupe « ${frenchText(optionSet.name)} » ?`,
      text: 'Il est retiré de tous les articles qui l\'utilisent. Les commandes déjà passées ne changent pas.',
      label: 'Supprimer le groupe',
      action: () => run(() => api.deleteOptionSet(optionSet.id), 'Groupe supprimé'),
    });

  const removeItem = (item) =>
    setConfirming({
      title: `Supprimer « ${frenchText(item.name)} » ?`,
      text: "L'article disparaît de la carte. Les commandes déjà passées ne changent pas.",
      label: "Supprimer l'article",
      action: () => run(() => api.deleteItem(item.id), `« ${frenchText(item.name)} » supprimé`),
    });

  const renameCategory = (e) => {
    e.preventDefault();
    const { cat, name } = renaming;
    setRenaming(null);
    if (name.fr.trim()) run(() => api.renameCategory(cat.id, name), 'Catégorie renommée');
  };

  const removeCategory = (cat) => {
    if (cat.items.length) return setError(`Videz « ${frenchText(cat.name)} » (déplacez ou supprimez ses articles) avant de la supprimer.`);
    setConfirming({
      title: `Supprimer la catégorie « ${frenchText(cat.name)} » ?`,
      text: 'Elle est vide : aucun article ne sera perdu.',
      label: 'Supprimer la catégorie',
      action: () => run(() => api.deleteCategory(cat.id), 'Catégorie supprimée'),
    });
  };

  const addCategory = (e) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    run(async () => {
      await api.addCategory(newCategory);
      setNewCategory('');
    }, 'Catégorie créée');
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
      {error && <Alert>{error}</Alert>}
      {!menu && !error && <p className="muted">Chargement…</p>}

      {menu?.map((cat, ci) => (
        <div key={cat.id} className="admin-cat">
          <div className="admin-cat-head">
            <h3>{frenchText(cat.name)}</h3>
            <div className="admin-tools">
              <button type="button" className="icon-btn" aria-label={`Monter ${frenchText(cat.name)}`} title="Monter" disabled={ci === 0} onClick={() => run(() => api.moveCategory(cat.id, 'up'))}>↑</button>
              <button type="button" className="icon-btn" aria-label={`Descendre ${frenchText(cat.name)}`} title="Descendre" disabled={ci === menu.length - 1} onClick={() => run(() => api.moveCategory(cat.id, 'down'))}>↓</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRenaming({ cat, name: toLocalized(cat.name) })}>Renommer</button>
              <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => removeCategory(cat)}>Supprimer</button>
            </div>
          </div>
          {cat.items.length === 0 && <p className="muted small">Aucun article dans cette catégorie.</p>}
          {cat.items.map((item, ii) => (
            <div key={item.id} className={`admin-row ${item.soldOut ? 'admin-out' : ''}`}>
              <span className="admin-thumb">{item.image ? <img src={item.image} alt="" /> : item.emoji}</span>
              <span className="admin-name">
                {frenchText(item.name)}
                <span className="muted small">
                  {' '}· {euro(item.price)}
                  {item.options?.length ? ` · ${item.options.length} option${item.options.length > 1 ? 's' : ''}` : ''}
                </span>
                {!Array.isArray(item.allergens) && <span className="product-flag-traces small"> · Allergènes à renseigner</span>}
              </span>
              <label className="switch">
                <input type="checkbox" checked={!item.soldOut} onChange={() => toggle(item)} />
                <span className="switch-track" />
                <span className="switch-label">{item.soldOut ? 'Épuisé' : 'Disponible'}</span>
              </label>
              <div className="admin-tools">
                <button type="button" className="icon-btn" aria-label={`Monter ${frenchText(item.name)}`} title="Monter" disabled={ii === 0} onClick={() => run(() => api.moveItem(item.id, 'up'))}>↑</button>
                <button type="button" className="icon-btn" aria-label={`Descendre ${frenchText(item.name)}`} title="Descendre" disabled={ii === cat.items.length - 1} onClick={() => run(() => api.moveItem(item.id, 'down'))}>↓</button>
                {expandOptions(item, optionSets).length > 0 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setChoicesOf(item)}>Choix</button>
                )}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing({ item, categoryId: cat.id })}>Modifier</button>
                <button type="button" className="icon-btn danger" title="Supprimer" aria-label={`Supprimer ${frenchText(item.name)}`} onClick={() => removeItem(item)}>🗑</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm admin-add" onClick={() => setEditing({ categoryId: cat.id })}>
            + Ajouter un article
          </button>
        </div>
      ))}

      {menu && (
        <form className="admin-new-cat" onSubmit={addCategory}>
          <input
            className="editor-input"
            aria-label="Nom de la nouvelle catégorie"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nouvelle catégorie (ex. Salgados)"
            maxLength={40}
          />
          <button className="btn btn-sm" disabled={!newCategory.trim()}>Créer la catégorie</button>
        </form>
      )}

      {menu && (
        <section className="option-sets" aria-labelledby="option-sets-title">
          <h3 id="option-sets-title">Options partagées</h3>
          <p className="muted small">
            Un groupe d'options commun à plusieurs articles (ex. « Lait » pour tous les cafés). Le modifier ici change
            tous les articles qui l'utilisent.
          </p>
          {optionSets.map((optionSet) => (
            <div key={optionSet.id} className="admin-row">
              <span className="admin-name">
                {frenchText(optionSet.name)}
                <span className="muted small"> · {optionSet.choices.length} choix · {usersOf(optionSet.id).length} article(s)</span>
              </span>
              <div className="admin-tools">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingSet({ optionSet })}>Modifier</button>
                <button type="button" className="icon-btn danger" title="Supprimer" aria-label={`Supprimer ${frenchText(optionSet.name)}`} onClick={() => removeOptionSet(optionSet)}>🗑</button>
              </div>
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm admin-add" onClick={() => setEditingSet({})}>
            + Nouveau groupe partagé
          </button>
        </section>
      )}

      {editingSet && (
        <OptionSetEditor
          optionSet={editingSet.optionSet}
          usedBy={editingSet.optionSet ? usersOf(editingSet.optionSet.id) : []}
          onAuthError={onAuthError}
          onClose={() => setEditingSet(null)}
          onSaved={(saved) => {
            setEditingSet(null);
            toast(`« ${frenchText(saved?.name)} » enregistré`);
            load();
          }}
        />
      )}

      {choicesOf && (
        <ChoiceAvailability item={choicesOf} optionSets={optionSets} soldOut={soldOut} onToggle={toggleChoice} onClose={() => setChoicesOf(null)} />
      )}

      {editing && (
        <ItemEditor
          item={editing.item}
          categoryId={editing.categoryId}
          categories={menu}
          optionSets={optionSets}
          onAuthError={onAuthError}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setEditing(null);
            toast(`« ${frenchText(saved?.name) || 'Article'} » enregistré`);
            load();
          }}
        />
      )}

      {confirming && (
        <ConfirmDialog
          title={confirming.title}
          confirmLabel={confirming.label}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            setConfirming(null);
            confirming.action();
          }}
        >
          <p>{confirming.text}</p>
        </ConfirmDialog>
      )}

      {renaming && (
        <Modal
          as="form"
          title="Renommer la catégorie"
          onClose={() => setRenaming(null)}
          onSubmit={renameCategory}
          footer={
            <>
              <button type="button" className="btn btn-ghost" onClick={() => setRenaming(null)}>Annuler</button>
              <button className="btn" disabled={!renaming.name.fr.trim()}>Renommer</button>
            </>
          }
        >
          <label className="field">
            Nom de la catégorie
            <input value={renaming.name.fr} onChange={(e) => setRenaming({ ...renaming, name: { ...renaming.name, fr: e.target.value } })} maxLength={40} data-autofocus />
          </label>
          <TranslationsEditor rows={[{ id: 'name', value: renaming.name, max: 40, onChange: (name) => setRenaming({ ...renaming, name }) }]} />
        </Modal>
      )}
    </section>
  );
}
