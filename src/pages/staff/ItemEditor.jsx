import { useRef, useState } from 'react';
import { api, AuthError, euro } from '../../api.js';
import { Alert, Modal } from '../../components/ui.jsx';
import AllergenEditor, { allergenFormState, allergenPayload } from './AllergenEditor.jsx';
import { TranslationsEditor, frenchText, toLocalized } from './translations.jsx';
import OptionGroupEditor, { emptyGroup, groupFormState, groupPayload, groupTranslationRows } from './OptionGroupEditor.jsx';

// Réduit la photo dans le navigateur (800 px max, JPEG) avant l'envoi : rapide et léger pour la base.
function resizeImage(file, max = 800) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image illisible'));
    };
    img.src = url;
  });
}

const MAX_GROUPS = 10;

// Tous les textes de l'article, dans l'ordre du formulaire, pour la section Traductions.
function translationRows(form, set, setGroup) {
  return [
    { id: 'name', value: form.name, max: 60, onChange: (name) => set({ name }) },
    { id: 'description', value: form.description, max: 200, onChange: (description) => set({ description }) },
    ...form.options.flatMap((group, gi) => groupTranslationRows(group, (next) => setGroup(gi, next), `g${gi}`)),
  ];
}

export default function ItemEditor({ item, categories, optionSets = [], categoryId, onClose, onSaved, onAuthError }) {
  const isNew = !item;
  const [form, setForm] = useState(() => ({
    categoryId: categoryId || categories[0]?.id,
    name: toLocalized(item?.name),
    description: toLocalized(item?.description),
    price: item ? String(item.price).replace('.', ',') : '',
    emoji: item?.emoji || '🥐',
    image: item?.image || null,
    options: (item?.options || []).map(groupFormState),
    optionSetIds: item?.optionSetIds || [],
    allergens: allergenFormState(item),
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setGroup = (gi, group) => set({ options: form.options.map((g, i) => (i === gi ? group : g)) });
  const toggleOptionSet = (id) =>
    set({ optionSetIds: form.optionSetIds.includes(id) ? form.optionSetIds.filter((x) => x !== id) : [...form.optionSetIds, id] });

  const fail = (e) => {
    if (e instanceof AuthError) return onAuthError();
    setError(e.message);
  };

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const { url } = await api.uploadImage(await resizeImage(file));
      set({ image: url });
    } catch (err) {
      fail(err);
    } finally {
      setUploading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = {
        ...form,
        ...allergenPayload(form.allergens),
        options: form.options.map(groupPayload),
      };
      const saved = isNew ? await api.addItem(body) : await api.updateItem(item.id, body);
      onSaved(saved);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      as="form"
      wide
      title={isNew ? 'Nouvel article' : `Modifier « ${frenchText(item.name)} »`}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn" disabled={busy || uploading} aria-busy={busy || undefined}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      }
    >
      <div className="editor">
        <div className="editor-photo">
          <div className="editor-photo-preview">
            {form.image ? <img src={form.image} alt="" /> : <span>{form.emoji}</span>}
          </div>
          <div className="editor-photo-actions">
            <button type="button" className="btn btn-ghost btn-sm" disabled={uploading} onClick={() => fileInput.current.click()}>
              {uploading ? 'Envoi…' : form.image ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
            {form.image && (
              <button type="button" className="link small" onClick={() => set({ image: null })}>Retirer la photo</button>
            )}
            <span className="muted small">Sans photo, l'emoji s'affiche.</span>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickPhoto} />
          </div>
        </div>

        <div className="editor-grid">
          <label className="field">
            Nom
            <input value={form.name.fr || ''} onChange={(e) => set({ name: { ...form.name, fr: e.target.value } })} maxLength={60} required />
          </label>
          <label className="field">
            Prix (€)
            <input value={form.price} onChange={(e) => set({ price: e.target.value })} inputMode="decimal" placeholder="2,50" required />
          </label>
          <label className="field">
            Catégorie
            <select value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{frenchText(c.name)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Emoji
            <input value={form.emoji} onChange={(e) => set({ emoji: e.target.value })} maxLength={8} />
          </label>
        </div>
        <label className="field">
          Description
          <textarea value={form.description.fr || ''} onChange={(e) => set({ description: { ...form.description, fr: e.target.value } })} maxLength={200} rows={2} />
        </label>

        <AllergenEditor value={form.allergens} onChange={(allergens) => set({ allergens })} />

        <h3 className="editor-title">Options proposées au client</h3>
        {optionSets.length > 0 && (
          <div className="shared-sets" role="group" aria-label="Options partagées">
            {optionSets.map((optionSet) => (
              <label key={optionSet.id} className="limits-check">
                <input type="checkbox" checked={form.optionSetIds.includes(optionSet.id)} onChange={() => toggleOptionSet(optionSet.id)} />
                {frenchText(optionSet.name)} <span className="muted">(partagé)</span>
              </label>
            ))}
          </div>
        )}
        {form.options.length === 0 && !form.optionSetIds.length && <p className="muted small">Aucune option : le client ajoute l'article tel quel.</p>}
        {form.options.map((group, gi) => (
          <OptionGroupEditor
            key={gi}
            group={group}
            onChange={(next) => setGroup(gi, next)}
            onRemove={() => set({ options: form.options.filter((_, i) => i !== gi) })}
          />
        ))}
        {form.options.length < MAX_GROUPS && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ options: [...form.options, emptyGroup()] })}>
            + Ajouter un groupe d'options
          </button>
        )}
        <p className="muted small">Le supplément s'ajoute au prix de base ({euro(0.5)} par exemple). Laissez 0 si le choix est gratuit.</p>

        <TranslationsEditor rows={translationRows(form, set, setGroup)} />

        {error && <Alert>{error}</Alert>}
      </div>
    </Modal>
  );
}
