import hphLogo from "@/assets/hph-logo.svg";

export function HphLogo({ className = "h-11 w-11" }: { className?: string }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white p-1.5 shadow-lg ${className}`}
      aria-hidden="true"
    >
      <img src={hphLogo} alt="" className="h-full w-full object-contain" />
    </span>
  );
}
