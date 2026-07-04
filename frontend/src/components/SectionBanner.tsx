import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

// Bannière de section — charte « émeraude raffiné », réutilisable sur toutes les pages.
export default function SectionBanner({ icon, title, subtitle, right }: {
    icon: ReactNode; title: string; subtitle?: string; right?: ReactNode;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 p-6 shadow-lg shadow-emerald-900/20">
            <div className="absolute -right-8 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute right-0 top-0 h-full w-1 bg-gradient-to-b from-amber-300 to-amber-500" />
            <div className="relative z-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 backdrop-blur flex items-center justify-center shrink-0 text-white">
                    {icon}
                </div>
                <div className="min-w-0">
                    <h1 className="text-xl font-extrabold text-white tracking-tight">{title}</h1>
                    {subtitle && <p className="text-emerald-50/80 text-sm mt-0.5">{subtitle}</p>}
                </div>
                {right && <div className="ml-auto shrink-0">{right}</div>}
            </div>
        </motion.div>
    );
}
