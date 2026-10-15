// Composants partagés du design system (DESIGN.md, section 7, et design/components/).
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import { STATUS_LABELS } from '../api.js';
import { useBrand } from '../brand.js';

// Nom de l'établissement, ou son logo si BRAND_LOGO est défini.
export function Logo({ size = 'md', as: Tag = 'div', ...props }) {
  const brand = useBrand();
  return (
    <Tag className={`logo logo-${size}`} {...props}>
      {brand.logo ? <img src={brand.logo} alt={brand.name} /> : brand.name}
    </Tag>
  );
}

// Statut d'une commande : toujours une couleur, une icône et un libellé.
const STATUS_ICONS = { nouvelle: '●', en_cours: '◐', prete: '✓', servie: '✓', annulee: '×' };

export function StatusBadge({ status, comptoir = false }) {
  return (
    <span className={`status status-${status} ${comptoir ? 'status-comptoir' : ''}`}>
      <span aria-hidden="true">{STATUS_ICONS[status]}</span> {STATUS_LABELS[status]}
    </span>
  );
}

// Message d'erreur annoncé aux lecteurs d'écran.
export function Alert({ children }) {
  return (
    <div className="alert" role="alert">
      <span aria-hidden="true">⚠</span>
      <span>{children}</span>
    </div>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Fenêtre modale : feuille basse sur mobile, dialogue centré à partir de 768 px.
// Échap ferme, le focus reste dans la fenêtre et revient au déclencheur à la fermeture.
export function Modal({ title, onClose, children, footer, media, wide = false, as: Tag = 'div', ...props }) {
  const ref = useRef(null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    const node = ref.current;
    (node.querySelector('[data-autofocus]') || node.querySelector(FOCUSABLE))?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close.current();
      } else if (e.key === 'Tab') {
        const items = [...node.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    node.addEventListener('keydown', onKey);
    document.body.classList.add('modal-open');
    return () => {
      node.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <Tag
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal ${wide ? 'modal-wide' : ''} ${media ? 'modal-has-media' : ''}`}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        {media && <div className="modal-media">{media}</div>}
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </Tag>
    </div>
  );
}

// Confirmation d'une action destructive : le focus démarre sur « Annuler », jamais sur la confirmation.
export function ConfirmDialog({ title, children, confirmLabel, cancelLabel = 'Annuler', onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onCancel} data-autofocus>{cancelLabel}</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      {children}
    </Modal>
  );
}

// Toasts : confirmation brève, sans voler le focus. Trois au plus, les plus anciens partent d'abord.
const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);
const TOAST_ICONS = { success: '✓', info: 'i', error: '⚠' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const show = useCallback(
    (message, tone = 'success') => {
      const id = crypto.randomUUID();
      setToasts((t) => [...t.slice(-2), { id, message, tone }]);
      if (tone !== 'error') setTimeout(() => remove(id), 4000);
    },
    [remove],
  );
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} role={t.tone === 'error' ? 'alert' : 'status'}>
            <span className="toast-icon" aria-hidden="true">{TOAST_ICONS[t.tone]}</span>
            <p>{t.message}</p>
            <button type="button" className="toast-close" onClick={() => remove(t.id)} aria-label="Fermer la notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
