import { createContext, useContext, useEffect, useState } from "react";
import { TOKEN_KEY } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";
import { get, post } from "@/utils/request";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    get(API_ENDPOINTS.AUTH.PROFILE, null, { silent: true })
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const login = async (form) => {
    const r = await post(API_ENDPOINTS.AUTH.LOGIN, form);
    localStorage.setItem(TOKEN_KEY, r.data.token);
    setUser(r.data.user);
  };
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, logout, isAdmin: user?.role === "admin" }}>{children}</AuthContext.Provider>;
}
