// Saisie d'un groupe d'options (ex. Lait, Taille, Suppléments), utilisée pour un article et pour un groupe partagé.
import { groupLimits } from '../../../shared/options.js';
import { toLocalized } from './translations.jsx';

const MAX_CHOICES = 20;

const emptyChoice = () => ({ name: { fr: '' }, price: '0', default: false });
export const emptyGroup = () => ({ name: { fr: '' }, min: 1, max: 1, choices: [emptyChoice()] });

// Groupe tel que le formulaire le manipule : textes { fr, nl, … }, limites explicites, prix en texte (virgule).
export function groupFormState(group) {
  return {
    ...group,
    ...groupLimits(group),
    name: toLocalized(group.name),
    choices: group.choices.map((c) => ({ ...c, name: toLocalized(c.name), price: String(c.price ?? 0).replace('.', ','), default: !!c.default })),
  };
}

export function groupPayload({ id, name, min, max, choices }) {
  return {
    id,
    name,
    min,
    max,
    choices: choices.map((c) => ({ id: c.id, name: c.name, price: String(c.price || 0).replace(',', '.'), default: c.default })),
  };
}

export function groupTranslationRows(group, onChange, prefix) {
  const setChoice = (ci, name) => onChange({ ...group, choices: group.choices.map((c, i) => (i === ci ? { ...c, name } : c)) });
  return [
    { id: `${prefix}-name`, value: group.name, max: 40, onChange: (name) => onChange({ ...group, name }) },
    ...group.choices.map((c, ci) => ({ id: `${prefix}-c${ci}`, value: c.name, max: 40, onChange: (name) => setChoice(ci, name) })),
  ];
}

// Un seul choix (obligatoire ou non) ou plusieurs choix entre un minimum et un maximum.
function LimitsEditor({ group, onChange }) {
  const single = group.max === 1;
  const count = group.choices.length;
  const setKind = (kind) => onChange(kind === 'single' ? { min: 1, max: 1 } : { min: 0, max: count });
  const setNumber = (field, value) => {
    const n = Math.max(0, Math.min(count, parseInt(value, 10) || 0));
    const next = { min: group.min, max: group.max, [field]: n };
    if (next.min > next.max) next[field === 'min' ? 'max' : 'min'] = n;
    onChange({ ...next, max: Math.max(1, next.max) });
  };
  return (
    <div className="limits-editor">
      <select className="editor-input" aria-label="Type de choix" value={single ? 'single' : 'multi'} onChange={(e) => setKind(e.target.value)}>
        <option value="single">Un seul choix</option>
        <option value="multi">Plusieurs choix</option>
      </select>
      {single ? (
        <label className="limits-check">
          <input type="checkbox" checked={group.min === 1} onChange={(e) => onChange({ min: e.target.checked ? 1 : 0, max: 1 })} />
          Obligatoire
        </label>
      ) : (
        <>
          <label className="limits-number">
            Min.
            <input className="editor-input" type="number" min="0" max={count} value={group.min} onChange={(e) => setNumber('min', e.target.value)} />
          </label>
          <label className="limits-number">
            Max.
            <input className="editor-input" type="number" min="1" max={count} value={group.max} onChange={(e) => setNumber('max', e.target.value)} />
          </label>
        </>
      )}
    </div>
  );
}

function ChoiceRow({ choice, canRemove, onChange, onRemove }) {
  return (
    <div className="editor-choice">
      <input
        className="editor-input"
        value={choice.name.fr || ''}
        onChange={(e) => onChange({ name: { ...choice.name, fr: e.target.value } })}
        aria-label="Nom du choix"
        placeholder="Choix (ex. Avoine)"
        maxLength={40}
        required
      />
      <input
        className="editor-input editor-price"
        value={choice.price}
        onChange={(e) => onChange({ price: e.target.value })}
        inputMode="decimal"
        aria-label="Supplément en euros"
        title="Supplément en euros (0 = gratuit)"
      />
      <label className="limits-check" title="Coché d'office quand le client ouvre l'article">
        <input type="checkbox" checked={choice.default} onChange={(e) => onChange({ default: e.target.checked })} />
        Par défaut
      </label>
      <button type="button" className="icon-btn" aria-label="Retirer ce choix" disabled={!canRemove} onClick={onRemove}>
        ×
      </button>
    </div>
  );
}

export default function OptionGroupEditor({ group, onChange, onRemove }) {
  const patch = (changes) => onChange({ ...group, ...changes });
  const setChoices = (choices) => {
    const max = Math.min(group.max, choices.length);
    patch({ choices, max: Math.max(1, max), min: Math.min(group.min, max) });
  };
  const setChoice = (ci, changes) => setChoices(group.choices.map((c, i) => (i === ci ? { ...c, ...changes } : c)));

  return (
    <fieldset className="editor-group">
      <div className="editor-group-head">
        <input
          className="editor-input"
          value={group.name.fr || ''}
          onChange={(e) => patch({ name: { ...group.name, fr: e.target.value } })}
          aria-label="Nom du groupe d'options"
          placeholder="Nom du groupe (ex. Lait, Taille)"
          maxLength={40}
          required
        />
        {onRemove && (
          <button type="button" className="btn btn-ghost btn-sm danger" onClick={onRemove}>
            Supprimer
          </button>
        )}
      </div>
      <LimitsEditor group={group} onChange={patch} />
      {group.choices.map((choice, ci) => (
        <ChoiceRow
          key={ci}
          choice={choice}
          canRemove={group.choices.length > 1}
          onChange={(changes) => setChoice(ci, changes)}
          onRemove={() => setChoices(group.choices.filter((_, i) => i !== ci))}
        />
      ))}
      {group.choices.length < MAX_CHOICES && (
        <button type="button" className="link small" onClick={() => setChoices([...group.choices, emptyChoice()])}>
          + Ajouter un choix
        </button>
      )}
    </fieldset>
  );
}
