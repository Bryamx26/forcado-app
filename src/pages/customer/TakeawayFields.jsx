import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useBrand } from '../../brand.js';
import { useLanguage, useT } from '../../i18n.jsx';
import { formatTime } from '../../time.js';
import { MAX_CUSTOMER_NAME } from '../../../shared/pickup.js';

function SlotPicker({ value, onChange }) {
  const t = useT();
  const { lang } = useLanguage();
  const { takeaway } = useBrand();
  const [slots, setSlots] = useState(null);

  useEffect(() => {
    api.pickupSlots().then(setSlots).catch(() => setSlots([]));
  }, []);

  if (!slots) return null;
  if (!slots.some((s) => !s.full)) return <p className="small muted">{t('takeaway.noSlots')}</p>;
  return (
    <label className="field">
      {t('takeaway.slot')}
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} required>
        <option value="" disabled>—</option>
        {slots.map((slot) => {
          const time = formatTime(slot.at, takeaway.timeZone, lang);
          return (
            <option key={slot.at} value={slot.at} disabled={slot.full}>
              {slot.full ? t('takeaway.full', { time }) : time}
            </option>
          );
        })}
      </select>
    </label>
  );
}

// Prénom (pour l'appel au comptoir) et heure de retrait : dès que possible, ou un créneau plus tard dans la journée.
// value : { customerName, pickupAt } ; pickupAt à null = dès que possible.
export default function TakeawayFields({ value, total, onChange }) {
  const t = useT();
  const { takeaway } = useBrand();
  const [later, setLater] = useState(Boolean(value.pickupAt));
  // pickupAt : null = dès que possible, undefined = « plus tard » sans créneau encore choisi.
  const chooseLater = (isLater) => {
    setLater(isLater);
    onChange({ ...value, pickupAt: isLater ? undefined : null });
  };

  return (
    <div className="takeaway-fields">
      <label className="field">
        {t('takeaway.name')}
        <input
          value={value.customerName}
          onChange={(e) => onChange({ ...value, customerName: e.target.value })}
          maxLength={MAX_CUSTOMER_NAME}
          autoComplete="given-name"
          required
        />
      </label>
      <fieldset className="opt-group">
        <legend>{t('takeaway.when')}</legend>
        <label className={`opt ${!later ? 'opt-on' : ''}`}>
          <input type="radio" name="pickup" checked={!later} onChange={() => chooseLater(false)} />
          <span>{t('takeaway.asap')}</span>
        </label>
        <label className={`opt ${later ? 'opt-on' : ''}`}>
          <input type="radio" name="pickup" checked={later} onChange={() => chooseLater(true)} />
          <span>{t('takeaway.later')}</span>
        </label>
      </fieldset>
      {later && <SlotPicker value={value.pickupAt} onChange={(pickupAt) => onChange({ ...value, pickupAt })} />}
      {later && total > takeaway.preorderMaxTotal && <p className="small alert-inline">{t('takeaway.preorderMax', { max: takeaway.preorderMaxTotal })}</p>}
    </div>
  );
}
