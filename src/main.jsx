import { createRoot } from 'react-dom/client';
// Polices servies par le site lui-même : aucune requête vers Google, donc aucune adresse IP de visiteur transmise.
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/playfair-display/latin-600-italic.css';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<App />);
