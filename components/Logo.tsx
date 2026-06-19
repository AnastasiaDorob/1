// Мінімалістичний значок HireIQ: літера "H" з вузлами-точками та
// тонкими "нейронними" зв'язками. Колір керується через currentColor.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Каркас літери H */}
      <line x1="8" y1="6" x2="8" y2="26" />
      <line x1="24" y1="6" x2="24" y2="26" />
      <line x1="8" y1="16" x2="24" y2="16" />
      {/* Нейронні зв'язки до центрального вузла */}
      <line x1="16" y1="16" x2="8" y2="6" opacity="0.45" />
      <line x1="16" y1="16" x2="24" y2="6" opacity="0.45" />
      {/* Вузли */}
      <circle cx="8" cy="6" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="24" cy="6" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="26" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="24" cy="26" r="2.1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="2.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Логотип + назва. "IQ" виділено фірмовим жовтим.
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className ?? ""}`}>
      <BrandMark className="h-6 w-6 text-amber-400" />
      <span className="text-lg font-bold tracking-tight text-white">
        Hire<span className="text-amber-400">IQ</span>
      </span>
    </span>
  );
}
