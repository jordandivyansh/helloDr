import { Suspense } from 'react';
import Portal from '@/components/Portal';
export default function PortalPage() { return <Suspense fallback={<div className="loading-screen">Opening your care space…</div>}><Portal/></Suspense>; }
