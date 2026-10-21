import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// No <StrictMode> on purpose: in development it runs effects twice, which would
// read (and destroy) a burn-after-read paste before the user could see it.
createRoot(document.getElementById('root')).render(<App />);
