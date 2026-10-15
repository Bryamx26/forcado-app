import { createRoot } from 'react-dom/client';
// Polices servies par le site lui-même : aucune requête vers Google, donc aucune adresse IP de visiteur transmise.
import '@fontsource/figtree/latin-400.css';
import '@fontsource/figtree/latin-600.css';
import '@fontsource/figtree/latin-700.css';
import '@fontsource/fraunces/latin-600.css';
import App from './App.jsx';
import './theme.css';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
