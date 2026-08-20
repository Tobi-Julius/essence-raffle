import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={`flex items-center gap-2 ${className ?? ""}`}>
      <Image src="/brand/essence-logo.jpg" alt="Essence Store" width={140} height={48} className="h-9 w-auto" priority />
      <span className="sr-only">Essence Store Raffles</span>
    </Link>
  );
}
