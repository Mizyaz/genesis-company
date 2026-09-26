import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicApp } from './PublicApp';
import { LanguageProvider } from './shared/Language';

createRoot(document.getElementById('root')!).render(<StrictMode><LanguageProvider><PublicApp /></LanguageProvider></StrictMode>);
