import Link from 'next/link';
import { Sprout } from 'lucide-react';
export default function Brand({ small = false }: { small?: boolean }) { return <Link href="/" className={`brand ${small ? 'brand-small' : ''}`} aria-label="Littleleaf home"><span className="brand-icon"><Sprout size={25}/></span><span>littleleaf<span className="brand-caption">DR. RUCHI LAMYAN</span></span></Link>; }
