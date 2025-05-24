"use client";

import * as React from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "next-themes";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const themes = [
    { name: "light", icon: Sun },
    { name: "dark", icon: Moon },
  ];

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-1">
      {themes.map(({ name, icon: Icon }) => (
        <button
          key={name}
          onClick={() => setTheme(name)}
          className={`p-1.5 rounded-full transition-all duration-200 ease-in-out ${
            theme === name
              ? "bg-blue-500 text-white"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
          aria-label={`Switch to ${name} theme`}
        >
          <Icon className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
}