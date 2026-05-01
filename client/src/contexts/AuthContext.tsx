/**
 * Auth Context — Global authentication state
 */

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi } from "../services/authApi";
import type { User, LoginPayload, RegisterPayload } from "../types";

// ─── State ────────────────────────────────────────────

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "SET_LOADING" }
  | { type: "SET_USER"; payload: User }
  | { type: "SET_ERROR"; payload: string }
  | { type: "LOGOUT" }
  | { type: "CLEAR_ERROR" };

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: true, error: null };
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case "SET_ERROR":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };
    case "LOGOUT":
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────

interface AuthContextType extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await authApi.getSession();
        if (res.data?.user) {
          dispatch({ type: "SET_USER", payload: res.data.user });
        } else {
          dispatch({ type: "LOGOUT" });
        }
      } catch {
        dispatch({ type: "LOGOUT" });
      }
    };
    checkSession();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    dispatch({ type: "SET_LOADING" });
    try {
      const res = await authApi.login(payload);
      if (res.data?.token) {
        localStorage.setItem("auth_token", res.data.token);
      }
      if (res.data?.user) {
        dispatch({ type: "SET_USER", payload: res.data.user });
      } else {
        dispatch({ type: "SET_ERROR", payload: "Đăng nhập thất bại" });
      }
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "Đăng nhập thất bại",
      });
      throw err;
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    dispatch({ type: "SET_LOADING" });
    try {
      const res = await authApi.register(payload);
      if (res.data?.token) {
        localStorage.setItem("auth_token", res.data.token);
      }
      if (res.data?.user) {
        dispatch({ type: "SET_USER", payload: res.data.user });
      } else {
        dispatch({ type: "SET_ERROR", payload: "Đăng ký thất bại" });
      }
    } catch (err) {
      dispatch({
        type: "SET_ERROR",
        payload: err instanceof Error ? err.message : "Đăng ký thất bại",
      });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem("auth_token");
    dispatch({ type: "LOGOUT" });
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, login, register, logout, clearError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
