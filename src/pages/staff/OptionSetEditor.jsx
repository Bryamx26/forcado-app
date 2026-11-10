import { useState } from 'react';
import { api, AuthError } from '../../api.js';
import { Alert, Modal } from '../../components/ui.jsx';
import OptionGroupEditor, { emptyGroup, groupFormState, groupPayload, groupTranslationRows } from './OptionGroupEditor.jsx';
import { TranslationsEditor, frenchText } from './translations.jsx';

// Groupe d'options partagé (ex. « Lait » pour tous les cafés) : une modification vaut pour tous les articles qui l'utilisent.
export default function OptionSetEditor({ optionSet, usedBy, onClose, onSaved, onAuthError }) {
  const isNew = !optionSet;
  const [group, setGroup] = useState(() => (optionSet ? groupFormState(optionSet) : emptyGroup()));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = groupPayload(group);
      onSaved(isNew ? await api.addOptionSet(body) : await api.updateOptionSet(optionSet.id, body));
    } catch (err) {
      if (err instanceof AuthError) return onAuthError();
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      as="form"
      wide
      title={isNew ? 'Nouveau groupe partagé' : `Modifier « ${frenchText(optionSet.name)} »`}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn" disabled={busy} aria-busy={busy || undefined}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>
        </>
      }
    >
      <p className="muted small">
        {usedBy.length ? `Utilisé par : ${usedBy.join(', ')}.` : "Cochez-le ensuite dans la fiche des articles qui l'utilisent."}
      </p>
      <OptionGroupEditor group={group} onChange={setGroup} />
      <TranslationsEditor rows={groupTranslationRows(group, setGroup, 'set')} />
      {error && <Alert>{error}</Alert>}
    </Modal>
  );
}
