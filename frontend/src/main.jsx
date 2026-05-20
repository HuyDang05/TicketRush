import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import useAuthStore from './store/authStore'
import { logoutRef, refreshSessionRef } from './services/api'

useAuthStore.getState().initAuth()
logoutRef.fn = () => useAuthStore.getState().logout()
refreshSessionRef.fn = (user, token) => {
  const currentUser = user || useAuthStore.getState().user
  if (currentUser && token) {
    useAuthStore.getState().setUser(currentUser, token)
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
