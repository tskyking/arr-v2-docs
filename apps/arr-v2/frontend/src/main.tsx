import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './styles/global.css';

// The early HTML redirect owns this hostname. Do not flash the financial login
// while its navigation is in flight; all other deployments retain the ARR SPA.
if (window.location.hostname !== 'access.arrweb.com') {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </React.StrictMode>,
  );
}
