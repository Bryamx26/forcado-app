import { useRef, useState } from 'react';
import { api, AuthError, euro } from '../../api.js';
import { Alert, Modal } from '../../components/ui.jsx';

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

const emptyGroup = () => ({ name: '', type: 'single', required: true, choices: [{ name: '', price: 0 }] });

export default function ItemEditor({ item, categories, categoryId, onClose, onSaved, onAuthError }) {
  const isNew = !item;
  const [form, setForm] = useState(() => ({
    categoryId: categoryId || categories[0]?.id,
    name: item?.name || '',
    description: item?.description || '',
    price: item ? String(item.price).replace('.', ',') : '',
    emoji: item?.emoji || '🥐',
    image: item?.image || null,
    options: structuredClone(item?.options || []),
  }));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setGroup = (gi, patch) =>
    set({ options: form.options.map((g, i) => (i === gi ? { ...g, ...patch } : g)) });
  const setChoice = (gi, ci, patch) =>
    setGroup(gi, { choices: form.options[gi].choices.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });

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
        options: form.options.map((g) => ({
          ...g,
          choices: g.choices.map((c) => ({ ...c, price: String(c.price ?? 0).replace(',', '.') || 0 })),
        })),
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
      title={isNew ? 'Nouvel article' : `Modifier « ${item.name} »`}
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
            <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={60} required />
          </label>
          <label className="field">
            Prix (€)
            <input value={form.price} onChange={(e) => set({ price: e.target.value })} inputMode="decimal" placeholder="2,50" required />
          </label>
          <label className="field">
            Catégorie
            <select value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} maxLength={200} rows={2} />
        </label>

        <h3 className="editor-title">Options proposées au client</h3>
        {form.options.length === 0 && <p className="muted small">Aucune option : le client ajoute l'article tel quel.</p>}
        {form.options.map((g, gi) => (
          <fieldset key={gi} className="editor-group">
            <div className="editor-group-head">
              <input
                className="editor-input"
                value={g.name}
                onChange={(e) => setGroup(gi, { name: e.target.value })}
                aria-label="Nom du groupe d'options"
                placeholder="Nom du groupe (ex. Lait, Taille)"
                maxLength={40}
                required
              />
              <select className="editor-input" aria-label="Type de choix" value={g.type} onChange={(e) => setGroup(gi, { type: e.target.value })}>
                <option value="single">Un seul choix (obligatoire)</option>
                <option value="multi">Plusieurs choix (facultatif)</option>
              </select>
              <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => set({ options: form.options.filter((_, i) => i !== gi) })}>
                Supprimer
              </button>
            </div>
            {g.choices.map((c, ci) => (
              <div key={ci} className="editor-choice">
                <input
                  className="editor-input"
                  value={c.name}
                  onChange={(e) => setChoice(gi, ci, { name: e.target.value })}
                  aria-label="Nom du choix"
                  placeholder="Choix (ex. Avoine)"
                  maxLength={40}
                  required
                />
                <input
                  className="editor-input editor-price"
                  value={c.price}
                  onChange={(e) => setChoice(gi, ci, { price: e.target.value })}
                  inputMode="decimal"
                  aria-label="Supplément en euros"
                  title="Supplément en euros (0 = gratuit)"
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Retirer ce choix"
                  disabled={g.choices.length === 1}
                  onClick={() => setGroup(gi, { choices: g.choices.filter((_, i) => i !== ci) })}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="link small" onClick={() => setGroup(gi, { choices: [...g.choices, { name: '', price: 0 }] })}>
              + Ajouter un choix
            </button>
          </fieldset>
        ))}
        {form.options.length < 10 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => set({ options: [...form.options, emptyGroup()] })}>
            + Ajouter un groupe d'options
          </button>
        )}
        <p className="muted small">Le supplément s'ajoute au prix de base ({euro(0.5)} par exemple). Laissez 0 si le choix est gratuit.</p>

        {error && <Alert>{error}</Alert>}
      </div>
    </Modal>
  );
}
