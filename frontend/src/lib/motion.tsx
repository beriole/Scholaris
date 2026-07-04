// Primitives d'animation réutilisables (framer-motion) — design vivant et cohérent.
import { motion, type Variants, type Transition } from 'framer-motion';
import type { ReactNode } from 'react';

// Courbe d'accélération douce (ease-out expressif), partagée par toute l'app.
export const EASE = [0.22, 1, 0.36, 1] as const;
export const springSoft: Transition = { type: 'spring', stiffness: 260, damping: 26 };

export const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export const scaleIn: Variants = {
    hidden: { opacity: 0, scale: 0.96 },
    show: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: EASE } },
};

// Conteneur qui décale l'apparition de ses enfants (effet cascade).
export const stagger = (stagger = 0.06, delay = 0.04): Variants => ({
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

// Transition d'entrée/sortie de page — à utiliser sous <AnimatePresence mode="wait">.
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: EASE }}
        >
            {children}
        </motion.div>
    );
}

// Révèle un bloc quand il entre dans le viewport (une seule fois).
export function Reveal({ children, delay = 0, y = 16, className }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: EASE, delay }}
        >
            {children}
        </motion.div>
    );
}

// Carte animée : apparition en cascade + survol/press vivants.
export function MotionCard({ children, className, onClick, lift = true }: {
    children: ReactNode; className?: string; onClick?: () => void; lift?: boolean;
}) {
    return (
        <motion.div
            variants={fadeUp}
            onClick={onClick}
            whileHover={lift ? { y: -4, transition: { duration: 0.2, ease: EASE } } : undefined}
            whileTap={onClick ? { scale: 0.98 } : undefined}
            className={className}
        >
            {children}
        </motion.div>
    );
}
