export interface Theme {
  id: string;
  name: string;
  group: 'light' | 'dark';
}

export interface ThemeColors {
  bg: string;
  primary: string;
  secondary: string;
  text: string;
  accent: string;
  border: string;
  card: string;
  cardHover: string;
}

export const themes: Theme[] = [
  // Light themes
  { id: "light", name: "Arctic Sky", group: "light" },
  { id: "blue", name: "Ocean Blue", group: "light" },
  { id: "purple", name: "Ascendara Purple", group: "light" },
  { id: "emerald", name: "Emerald", group: "light" },
  { id: "rose", name: "Rose", group: "light" },
  { id: "amber", name: "Amber Sand", group: "light" },

  // Dark themes
  { id: "dark", name: "Dark Blue", group: "dark" },
  { id: "midnight", name: "Midnight", group: "dark" },
  { id: "cyberpunk", name: "Cyberpunk", group: "dark" },
  { id: "sunset", name: "Sunset", group: "dark" },
  { id: "forest", name: "Forest", group: "dark" },
  { id: "ocean", name: "Deep Ocean", group: "dark" },
];

// Actual --background hex values from app/globals.css, used to keep the
// mobile browser chrome (e.g. Safari's top bar) in sync with the active theme.
export const themeBackgroundColors: Record<string, string> = {
  light: "#fafafa",
  blue: "#eff6ff",
  purple: "#faf5ff",
  emerald: "#ecfdf5",
  rose: "#fff1f2",
  amber: "#fffbeb",
  dark: "#0f172a",
  midnight: "#020617",
  cyberpunk: "#111827",
  sunset: "#1e293b",
  forest: "#141e1b",
  ocean: "#0f172a",
};

export const getThemeColors = (themeId: string): ThemeColors => {
  const themeMap: Record<string, ThemeColors> = {
    light: {
      bg: "from-zinc-50 to-zinc-100",
      primary: "bg-blue-500 hover:bg-blue-600",
      secondary: "bg-slate-100",
      text: "text-slate-900",
      accent: "text-blue-600",
      border: "border-slate-200",
      card: "bg-white border-slate-200",
      cardHover: "hover:border-blue-300 hover:shadow-blue-100",
    },
    dark: {
      bg: "from-slate-900 to-slate-950",
      primary: "bg-blue-500 hover:bg-blue-600",
      secondary: "bg-slate-800",
      text: "text-slate-100",
      accent: "text-blue-400",
      border: "border-slate-700",
      card: "bg-slate-900 border-slate-800",
      cardHover: "hover:border-blue-600 hover:shadow-blue-900/20",
    },
    blue: {
      bg: "from-blue-50 to-blue-100",
      primary: "bg-blue-600 hover:bg-blue-700",
      secondary: "bg-blue-100",
      text: "text-blue-900",
      accent: "text-blue-700",
      border: "border-blue-200",
      card: "bg-white border-blue-200",
      cardHover: "hover:border-blue-400 hover:shadow-blue-100",
    },
    purple: {
      bg: "from-purple-50 to-purple-100",
      primary: "bg-purple-500 hover:bg-purple-600",
      secondary: "bg-purple-100",
      text: "text-purple-900",
      accent: "text-purple-700",
      border: "border-purple-200",
      card: "bg-white border-purple-200",
      cardHover: "hover:border-purple-400 hover:shadow-purple-100",
    },
    emerald: {
      bg: "from-emerald-50 to-emerald-100",
      primary: "bg-emerald-500 hover:bg-emerald-600",
      secondary: "bg-emerald-100",
      text: "text-emerald-900",
      accent: "text-emerald-700",
      border: "border-emerald-200",
      card: "bg-white border-emerald-200",
      cardHover: "hover:border-emerald-400 hover:shadow-emerald-100",
    },
    rose: {
      bg: "from-rose-50 to-rose-100",
      primary: "bg-rose-500 hover:bg-rose-600",
      secondary: "bg-rose-100",
      text: "text-rose-900",
      accent: "text-rose-700",
      border: "border-rose-200",
      card: "bg-white border-rose-200",
      cardHover: "hover:border-rose-400 hover:shadow-rose-100",
    },
    cyberpunk: {
      bg: "from-gray-900 to-black",
      primary: "bg-pink-500 hover:bg-pink-600",
      secondary: "bg-gray-800",
      text: "text-pink-100",
      accent: "text-pink-400",
      border: "border-pink-900",
      card: "bg-gray-900 border-pink-900",
      cardHover: "hover:border-pink-500 hover:shadow-pink-900/30",
    },
    sunset: {
      bg: "from-slate-800 to-slate-900",
      primary: "bg-orange-500 hover:bg-orange-600",
      secondary: "bg-slate-700",
      text: "text-orange-100",
      accent: "text-orange-400",
      border: "border-orange-900",
      card: "bg-slate-800 border-orange-900",
      cardHover: "hover:border-orange-500 hover:shadow-orange-900/30",
    },
    forest: {
      bg: "from-[#141E1B] to-[#0A1210]",
      primary: "bg-green-500 hover:bg-green-600",
      secondary: "bg-[#1C2623]",
      text: "text-green-100",
      accent: "text-green-300",
      border: "border-green-900",
      card: "bg-[#1C2623] border-green-900",
      cardHover: "hover:border-green-500 hover:shadow-green-900/30",
    },
    midnight: {
      bg: "from-[#020617] to-black",
      primary: "bg-indigo-400 hover:bg-indigo-500",
      secondary: "bg-slate-800",
      text: "text-indigo-100",
      accent: "text-indigo-200",
      border: "border-indigo-900",
      card: "bg-slate-900 border-indigo-900",
      cardHover: "hover:border-indigo-400 hover:shadow-indigo-900/30",
    },
    amber: {
      bg: "from-amber-50 to-amber-100",
      primary: "bg-amber-600 hover:bg-amber-700",
      secondary: "bg-amber-100",
      text: "text-amber-900",
      accent: "text-amber-700",
      border: "border-amber-200",
      card: "bg-white border-amber-200",
      cardHover: "hover:border-amber-400 hover:shadow-amber-100",
    },
    ocean: {
      bg: "from-slate-900 to-slate-950",
      primary: "bg-cyan-400 hover:bg-cyan-500",
      secondary: "bg-slate-800",
      text: "text-cyan-100",
      accent: "text-cyan-300",
      border: "border-cyan-900",
      card: "bg-slate-900 border-cyan-900",
      cardHover: "hover:border-cyan-400 hover:shadow-cyan-900/30",
    },
  };

  return themeMap[themeId] || themeMap.light;
};

export const getThemePreview = (themeId: string): string => {
  const previewMap: Record<string, string> = {
    light: "bg-gradient-to-br from-zinc-50 to-blue-100",
    dark: "bg-gradient-to-br from-slate-900 to-blue-900",
    blue: "bg-gradient-to-br from-blue-400 to-blue-600",
    purple: "bg-gradient-to-br from-purple-400 to-purple-600",
    emerald: "bg-gradient-to-br from-emerald-400 to-emerald-600",
    rose: "bg-gradient-to-br from-rose-400 to-rose-600",
    cyberpunk: "bg-gradient-to-br from-pink-500 to-purple-900",
    sunset: "bg-gradient-to-br from-orange-500 to-red-600",
    forest: "bg-gradient-to-br from-green-600 to-emerald-900",
    midnight: "bg-gradient-to-br from-indigo-500 to-slate-900",
    amber: "bg-gradient-to-br from-amber-400 to-amber-600",
    ocean: "bg-gradient-to-br from-cyan-400 to-blue-900",
  };

  return previewMap[themeId] || previewMap.light;
};
