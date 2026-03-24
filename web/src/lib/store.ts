import { create } from 'zustand';

export interface User {
  id: number;
  telegramId: number;
  username: string | null;
  email: string | null;
  tokenBalance: number;
  createdAt: string;
}

export interface Generation {
  id: number;
  prompt: string;
  result: string | null;
  status: 'pending' | 'completed' | 'failed';
  tokensUsed: number;
  createdAt: string;
  completedAt: string | null;
}

interface Store {
  // Auth
  token: string | null;
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Auth actions
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Generations
  generations: Generation[];
  selectedGeneration: Generation | null;
  setGenerations: (generations: Generation[]) => void;
  setSelectedGeneration: (generation: Generation | null) => void;
  addGeneration: (generation: Generation) => void;
  updateGeneration: (id: number, generation: Partial<Generation>) => void;
}

export const useStore = create<Store>((set) => {
  // Load token from localStorage on startup
  const savedToken = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');

  return {
    // Initial state
    token: savedToken,
    user: savedUser ? JSON.parse(savedUser) : null,
    isLoading: false,
    error: null,
    generations: [],
    selectedGeneration: null,

    // Auth actions
    setToken: (token) => {
      set({ token });
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    },

    setUser: (user) => {
      set({ user });
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    },

    setLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    // Generations actions
    setGenerations: (generations) => set({ generations }),
    setSelectedGeneration: (generation) => set({ selectedGeneration: generation }),
    addGeneration: (generation) => {
      set((state) => ({
        generations: [generation, ...state.generations],
      }));
    },

    updateGeneration: (id, updates) => {
      set((state) => ({
        generations: state.generations.map((g) =>
          g.id === id ? { ...g, ...updates } : g
        ),
        selectedGeneration:
          state.selectedGeneration?.id === id
            ? { ...state.selectedGeneration, ...updates }
            : state.selectedGeneration,
      }));
    },
  };
});
