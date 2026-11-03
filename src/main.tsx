import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../minimal_wheel_random_picker';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
