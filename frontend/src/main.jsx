import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import useAuthStore from './store/authStore'
import { logoutRef } from './services/api'

useAuthStore.getState().initAuth()
logoutRef.fn = () => useAuthStore.getState().logout()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
