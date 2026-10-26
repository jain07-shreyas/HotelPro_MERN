import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosClient from '../api/axiosClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await axiosClient.get('/auth/me');
        setUser(data.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const refreshUser = async () => {
    try {
      const { data } = await axiosClient.get('/auth/me');
      setUser(data.data);
    } catch {
      /* keep the current user if the refresh fails */
    }
  };

  const login = async (email, password) => {
    const { data } = await axiosClient.post('/auth/login', { email, password });
    setUser(data.data);
    return data;
  };

  const register = async (form) => {
    const { data } = await axiosClient.post('/auth/register', form);
    setUser(data.data);
    return data;
  };

  const logout = async () => {
    await axiosClient.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, refreshUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);