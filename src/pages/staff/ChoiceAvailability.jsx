import { Modal } from '../../components/ui.jsx';
import { choiceKey, expandOptions } from '../../../shared/options.js';
import { frenchText } from './translations.jsx';

// Ruptures sur les choix d'un article (ex. plus de lait d'avoine). Un choix d'un groupe partagé est épuisé partout.
export default function ChoiceAvailability({ item, optionSets, soldOut, onToggle, onClose }) {
  const groups = expandOptions(item, optionSets);
  return (
    <Modal title={`Choix disponibles · ${frenchText(item.name)}`} onClose={onClose}>
      {groups.map((group) => (
        <fieldset key={group.id} className="editor-group">
          <legend className="editor-title">
            {frenchText(group.name)}
            {group.setId && <span className="muted small"> (partagé : vaut pour tous les articles)</span>}
          </legend>
          {group.choices.map((choice) => {
            const key = choiceKey(item.id, group, choice.id);
            const out = soldOut.has(key);
            return (
              <label key={choice.id} className="switch switch-row">
                <input type="checkbox" checked={!out} onChange={() => onToggle(key, out)} />
                <span className="switch-track" />
                <span className="switch-label">
                  {frenchText(choice.name)} · {out ? 'Épuisé' : 'Disponible'}
                </span>
              </label>
            );
          })}
        </fieldset>
      ))}
    </Modal>
  );
}
