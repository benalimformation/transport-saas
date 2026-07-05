import React from 'react';

interface ScreenPlaceholderProps {
  title: string;
  subtitle?: string;
  width?: string;
  height?: string;
  className?: string;
}

const ScreenPlaceholder: React.FC<ScreenPlaceholderProps> = ({
  title,
  subtitle = "(Aperçu disponible prochainement)",
  width = "100%",
  height = "400px",
  className = ""
}) => {
  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  );
};

export default ScreenPlaceholder;