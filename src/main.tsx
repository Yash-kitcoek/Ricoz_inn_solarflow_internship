import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { I18nProvider } from './i18n'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js') })
createRoot(document.getElementById('root')!).render(<React.StrictMode><ErrorBoundary><I18nProvider><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></I18nProvider></ErrorBoundary></React.StrictMode>)
