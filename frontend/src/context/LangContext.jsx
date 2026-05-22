import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from './locales/en';
import { vi } from './locales/vi';

const LangContext = createContext();

const dict = { en, vi };

export function LangProvider({ children }) {
  const [lang, setLang] = useState('vi');

  useEffect(() => {
    const saved = localStorage.getItem('lang');
    if (saved) setLang(saved);
  }, []);

  const changeLang = (l) => {
    setLang(l);
    localStorage.setItem('lang', l);
  };

  const t = (key) => {
    return dict[lang]?.[key] || dict['vi']?.[key] || key;
  };

  return (
    <LangContext.Provider value={{ lang, changeLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}