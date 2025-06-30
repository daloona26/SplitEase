import React from "react";

const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="relative">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200"></div>
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
      </div>
    </div>
  );
};

export default Spinner;
