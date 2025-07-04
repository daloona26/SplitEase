import React from "react";
import { useTheme } from "../contexts/ThemeContext";

const Spinner: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className="flex justify-center items-center py-12">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700"></div>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 dark:border-blue-400 border-t-transparent absolute top-0 left-0"></div>
      </div>
    </div>
  );
};

export default Spinner;
