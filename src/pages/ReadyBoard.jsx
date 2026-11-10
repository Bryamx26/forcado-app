import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { useBrand } from '../brand.js';
import { useLiveEvents } from '../live.js';
import { chime } from '../sound.js';
import { Logo } from '../components/ui.jsx';
import { translate } from '../../shared/i18n/index.js';

const POLL_MS = 15000;

// Titre dans toutes les langues proposées : l'écran est lu par toute la salle.
const multilingual = (languages, key) => [...new Set(languages.map((lang) => translate(lang, key)))].join(' · ');

function useBoard() {
  const [board, setBoard] = useState({ preparing: [], ready: [] });
  const [fresh, setFresh] = useState([]);
  const known = useRef(null);

  const refresh = async () => {
    try {
      const next = await api.board();
      const added = known.current ? next.ready.filter((n) => !known.current.has(n)) : [];
      known.current = new Set(next.ready);
      setBoard(next);
      setFresh(added);
    } catch {}
  };

  useLiveEvents('/api/events', { orders: refresh });
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, []);

  return { board, fresh };
}

function NumberColumn({ title, numbers, highlighted = [], className }) {
  return (
    <section className={`board-column ${className}`}>
      <h2>{title}</h2>
      <ul aria-live="polite">
        {numbers.map((n) => (
          <li key={n} className={highlighted.includes(n) ? 'board-fresh' : ''}>{n}</li>
        ))}
      </ul>
    </section>
  );
}

// Écran public de la salle (télé) : seulement des numéros de commande, jamais de table ni de contenu.
export default function ReadyBoard() {
  const brand = useBrand();
  const { board, fresh } = useBoard();
  const [sound, setSound] = useState(false);

  useEffect(() => {
    if (sound && fresh.length) chime();
  }, [fresh, sound]);

  return (
    <div className="ready-board">
      <header className="board-header">
        <Logo />
        {/* Le navigateur n'autorise le son qu'après un geste sur la page. */}
        {!sound && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSound(true)}>
            Activer le son
          </button>
        )}
      </header>
      <div className="board-columns">
        <NumberColumn title={multilingual(brand.languages, 'board.preparing')} numbers={board.preparing} className="board-preparing" />
        <NumberColumn title={multilingual(brand.languages, 'board.ready')} numbers={board.ready} highlighted={fresh} className="board-ready" />
      </div>
    </div>
  );
}
