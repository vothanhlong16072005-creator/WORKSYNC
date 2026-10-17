/**
 * WorkSync Bauhaus Logo Component
 *
 * Biểu tượng chữ "W" xanh Bauhaus đặc trưng với chấm vàng góc trên bên phải.
 */
interface WorkSyncLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export function WorkSyncLogo({ className = '', size = 'md', showText = false }: WorkSyncLogoProps) {
  const sizeMap = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
    xl: 'w-14 h-14',
  };

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={`relative ${sizeMap[size]} shrink-0 transition-transform hover:scale-105`}>
        <img
          src="/logo.svg"
          alt="WorkSync Logo"
          className="w-full h-full object-contain drop-shadow-xs"
        />
      </div>
      {showText && (
        <span className="font-black text-xl tracking-tight text-slate-900 uppercase">
          Work<span className="text-blue-600">Sync</span>
        </span>
      )}
    </div>
  );
}
