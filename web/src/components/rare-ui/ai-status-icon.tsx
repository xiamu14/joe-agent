// Rare UI · Copyright (c) 2026 Swami Malode. See /THIRD_PARTY_NOTICES.md.
import { motion, useReducedMotion, type Transition } from 'motion/react'
import { CloudAlert } from 'lucide-react'
import type { AiStatusIconProps } from './ai-status'
const INSTANT: Transition = { duration: 0 }
const PEN_PATH = 'M3.78181 16.3092L3 21L7.69086 20.2182C8.50544 20.0825 9.25725 19.6956 9.84119 19.1116L20.4198 8.53288C21.1934 7.75922 21.1934 6.5049 20.4197 5.73126L18.2687 3.58024C17.495 2.80658 16.2406 2.80659 15.4669 3.58027L4.88841 14.159C4.30447 14.7429 3.91757 15.4947 3.78181 16.3092Z'
const SPARKLE_PATH = 'M11 5Q12 12 19 13Q12 14 11 21Q10 14 3 13Q10 12 11 5Z'
const WAVE_PATH = 'M3 19C4.11 16.3 5.06 16.3 6.17 19C7.27 21.7 8.22 21.7 9.33 19C10.44 16.3 11.39 16.3 12.5 19'
// points along the wave at eased arc length, so the pen tip stays on the ink as it draws
const WAVE_X = [3, 3.05, 3.18, 3.42, 3.78, 4.42, 5.26, 5.83, 6.29, 6.84, 7.76, 8.67, 9.22, 9.68, 10.25, 11.09, 11.72, 12.09, 12.33, 12.46, 12.5]
const WAVE_Y = [19, 18.88, 18.58, 18.1, 17.51, 17, 17.36, 18.25, 19.29, 20.33, 21.02, 20.32, 19.27, 18.24, 17.35, 17, 17.52, 18.11, 18.6, 18.9, 19]
const WAVE_PROGRESS = [0, 0.007, 0.028, 0.061, 0.104, 0.156, 0.216, 0.282, 0.352, 0.425, 0.5, 0.575, 0.648, 0.718, 0.784, 0.844, 0.896, 0.939, 0.972, 0.993, 1]
const DRAW_END = 0.7
const HOLD_END = 0.85
const SCRIBBLE: Transition = {
    duration: 2.4,
    ease: 'linear',
    repeat: Infinity,
    times: [...WAVE_PROGRESS.map((_, i) => (i / (WAVE_PROGRESS.length - 1)) * DRAW_END), HOLD_END, 1],
}
const TWINKLE_PATH = 'M18 2Q18.4 4.6 21 5Q18.4 5.4 18 8Q17.6 5.4 15 5Q17.6 4.6 18 2Z'

const STROKE = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
} as const

const LOOP = { repeat: Infinity, ease: 'easeInOut' } as const

export function AiStatusIcon({ state }: AiStatusIconProps) {
    const reduced = !!useReducedMotion()
    const loop = (transition: Transition) => (reduced ? INSTANT : transition)

    switch (state) {
        case 'thinking':
            return (
                <svg viewBox="0 0 24 24" width={18} height={18} className="text-[#868593]">
                    <motion.path
                        d={SPARKLE_PATH}
                        fill="currentColor"
                        animate={reduced ? undefined : { rotate: [0, 90], scale: [1, 0.8, 1] }}
                        transition={loop({ duration: 2.4, ...LOOP })}
                    />
                    <motion.path
                        d={TWINKLE_PATH}
                        fill="currentColor"
                        animate={reduced ? undefined : { scale: [0.4, 1, 0.4], opacity: [0.3, 1, 0.3] }}
                        transition={loop({ duration: 1.2, ...LOOP })}
                    />
                </svg>
            )
        case 'researching':
            return (
                <svg viewBox="0 0 24 24" width={18} height={18} className="text-[#868593]">
                    <motion.g
                        animate={reduced ? undefined : { x: [0, 2, 0, -2, 0], y: [-2, 0, 2, 0, -2] }}
                        transition={loop({ duration: 2, repeat: Infinity, ease: 'linear' })}
                    >
                        <circle {...STROKE} cx={10.5} cy={10.5} r={5.5} strokeWidth={2.25} />
                        <path {...STROKE} d="M14.75 14.75L19 19" strokeWidth={2.5} />
                    </motion.g>
                </svg>
            )
        case 'analyzing':
            return (
                <svg viewBox="0 0 24 24" width={18} height={18} className="text-[#868593]">
                    {[6, 12, 18].map((x, i) => (
                        <motion.line
                            key={x}
                            {...STROKE}
                            x1={x}
                            x2={x}
                            y1={10}
                            y2={19}
                            strokeWidth={3}
                            animate={reduced ? undefined : { y1: [15, 5, 15] }}
                            transition={loop({ duration: 0.9, delay: i * 0.15, ...LOOP })}
                        />
                    ))}
                </svg>
            )
        case 'writing':
            return (
                <svg viewBox="0 0 24 24" width={18} height={18} className="text-[#868593]">
                    <g transform="translate(-1.2 -2)">
                        <motion.path
                            {...STROKE}
                            d={WAVE_PATH}
                            strokeWidth={2.25}
                            // spacing past the path's end stops the dash pattern repeating as a dot at the far end
                            style={{ pathSpacing: 2 }}
                            initial={false}
                            animate={reduced ? { pathLength: 1 } : { pathLength: [...WAVE_PROGRESS, 1, 1], opacity: [...WAVE_PROGRESS.map(() => 1), 1, 0] }}
                            transition={loop(SCRIBBLE)}
                        />
                        <motion.g
                            initial={false}
                            animate={
                                reduced
                                    ? { x: WAVE_X.at(-1), y: WAVE_Y.at(-1) }
                                    : { x: [...WAVE_X, WAVE_X.at(-1)!, WAVE_X[0]], y: [...WAVE_Y, WAVE_Y.at(-1)!, WAVE_Y[0]] }
                            }
                            transition={loop(SCRIBBLE)}
                        >
                            {/* puts the pen tip, not its corner, on the point being drawn */}
                            <path d={PEN_PATH} fill="currentColor" transform="scale(0.66) translate(-3 -21)" />
                        </motion.g>
                    </g>
                </svg>
            )
        case 'done':
            return (
                <svg viewBox="0 0 24 24" width={18} height={18} className="text-[#868593]">
                    <motion.path
                        {...STROKE}
                        d="M5 12.5L10 17.5L19 7"
                        strokeWidth={2.5}
                        initial={{ pathLength: reduced ? 1 : 0 }}
                        animate={{ pathLength: 1 }}
                        transition={reduced ? INSTANT : { type: 'spring', duration: 0.6, bounce: 0, delay: 0.1 }}
                    />
                </svg>
            )
        case 'error':
            return (
                <motion.span animate={reduced ? undefined : { x: [0, -3, 3, -2, 2, 0] }} transition={{ duration: 0.45, delay: 0.1 }} className="text-[#868593]">
                    <CloudAlert size={16} strokeWidth={2} />
                </motion.span>
            )
        default:
            return (
                <motion.span
                    className="size-2.5 rounded-full bg-[#868593]"
                    animate={reduced ? undefined : { scale: [1, 0.7, 1], opacity: [1, 0.5, 1] }}
                    transition={loop({ duration: 1.2, ...LOOP })}
                />
            )
    }
}

