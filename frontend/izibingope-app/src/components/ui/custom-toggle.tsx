import React from "react";
import { Grid, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

export const CustomToggle: React.FC<CustomToggleProps> = ({
  checked,
  onCheckedChange,
  className,
  disabled = false,
}) => {
  return (
    <button
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2",
        checked 
          ? "bg-gray-500 hover:bg-gray-600" 
          : "bg-gray-200 hover:bg-gray-300",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={checked ? "Vista mini activada" : "Vista normal activada"}
    >
      {/* Thumb con animación suave */}
      <span 
        className={cn(
          "inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-all duration-300 ease-in-out",
          checked ? "translate-x-8" : "translate-x-1"
        )} 
      />
      
      {/* Iconos superpuestos con transiciones */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        {/* Icono Normal (Grid3X3) */}
        <div className={cn(
          "transition-all duration-300",
          checked 
            ? "opacity-0 scale-75 text-gray-400" 
            : "opacity-100 scale-100 text-gray-600"
        )}>
          <Grid3X3 className="w-3 h-3" />
        </div>
        
        {/* Icono Mini (Grid) */}
        <div className={cn(
          "transition-all duration-300",
          checked 
            ? "opacity-100 scale-100 text-white" 
            : "opacity-0 scale-75 text-gray-400"
        )}>
          <Grid className="w-3 h-3" />
        </div>
      </div>
    </button>
  );
}; 