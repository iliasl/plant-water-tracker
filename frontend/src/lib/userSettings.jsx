import React, { createContext, useState, useEffect } from 'react';
import api from './api';

export const UserSettingsContext = createContext({ settings: null, setSettings: () => {} });

export const UserSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({ ema_alpha: 0.35, snooze_factor: 0.2 });

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await api.get('/user');
        if (mounted && res.data?.settings) {
          setSettings(res.data.settings);
        }
      } catch (err) {
        // ignore - keep defaults
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <UserSettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </UserSettingsContext.Provider>
  );
};

export default UserSettingsProvider;
