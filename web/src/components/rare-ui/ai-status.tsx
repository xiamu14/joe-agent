// Rare UI · Copyright (c) 2026 Swami Malode. See /THIRD_PARTY_NOTICES.md.
'use client'

import {
    AnimatePresence,
    motion,
    useReducedMotion,
    type Transition,
    type Variants,
} from 'motion/react'
import React, { useEffect, useState } from 'react'
import useMeasure from 'react-use-measure'

import { cn } from './classes'
import { AiStatusIcon } from './ai-status-icon'

export type AiStatusState = 'thinking' | 'researching' | 'analyzing' | 'writing' | 'done' | 'error'

export type AiStatusStateConfig = {
    label?: string | ((elapsed: string | undefined) => string)
    icon?: React.ReactNode
    active?: boolean
}

const DEFAULT_STATES: Record<AiStatusState, AiStatusStateConfig> = {
    thinking: { label: 'Thinking', active: true },
    researching: { label: 'Researching', active: true },
    analyzing: { label: 'Analyzing', active: true },
    writing: { label: 'Writing', active: true },
    done: { label: (elapsed) => (elapsed ? `Worked for ${elapsed}` : 'Done'), active: false },
    error: { label: (elapsed) => (elapsed ? `Failed after ${elapsed}` : 'Failed'), active: false },
}

const SWAP: Transition = { type: 'spring', duration: 0.5, bounce: 0.15 }
const ICON: Transition = { type: 'spring', duration: 0.55, bounce: 0.35 }
const INSTANT: Transition = { duration: 0 }

const swapVariants: Variants = {
    enter: { y: 8, opacity: 0, filter: 'blur(4px)' },
    center: { y: 0, opacity: 1, filter: 'blur(0px)' },
    exit: { y: -8, opacity: 0, filter: 'blur(4px)' },
}

const iconVariants: Variants = {
    enter: { scale: 0.5, opacity: 0, rotate: -30, filter: 'blur(4px)' },
    center: { scale: 1, opacity: 1, rotate: 0, filter: 'blur(0px)' },
    exit: { scale: 0.5, opacity: 0, rotate: 30, filter: 'blur(4px)' },
}

// the highlight sits mid gradient and the size leaves room either side, so each sweep starts off screen
const SHIMMER = 'linear-gradient(90deg, var(--ai-status-ink) 40%, var(--ai-status-shine) 50%, var(--ai-status-ink) 60%)'

const isBuiltIn = (state: string): state is AiStatusState => Object.hasOwn(DEFAULT_STATES, state)

const titleCase = (state: string) => state.charAt(0).toUpperCase() + state.slice(1)

const formatElapsed = (seconds: number) =>
    seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`

export type AiStatusProps = Omit<React.ComponentProps<'div'>, 'children'> & {
    state?: AiStatusState | (string & {})
    states?: Record<string, AiStatusStateConfig>
    label?: string
    icon?: React.ReactNode
    detail?: string
    favicon?: string | React.ReactNode
    timer?: boolean
    elapsed?: number
    shimmer?: boolean
}

function AiStatus({
    state = 'thinking',
    states,
    label,
    icon,
    detail,
    favicon,
    timer = true,
    elapsed,
    shimmer,
    className,
    ...props
}: AiStatusProps) {
    const reduced = !!useReducedMotion()
    const config: AiStatusStateConfig = { ...(isBuiltIn(state) ? DEFAULT_STATES[state] : undefined), ...states?.[state] }
    const active = config.active ?? true
    const [counted, setCounted] = useState(0)
    const [wasActive, setWasActive] = useState(active)
    // a status that mounts already finished, like a message from history, has no run to report a time for
    const [hasRun, setHasRun] = useState(active)
    const counting = timer && elapsed === undefined

    // a new run starts from zero; switching between working states keeps counting
    if (active !== wasActive) {
        setWasActive(active)
        if (active) {
            setCounted(0)
            setHasRun(true)
        }
    }

    useEffect(() => {
        if (!active || !counting) {
            return
        }
        const start = Date.now()
        const id = window.setInterval(() => setCounted(Math.floor((Date.now() - start) / 1000)), 1000)
        return () => window.clearInterval(id)
    }, [active, counting])

    const [measureRef, bounds] = useMeasure()
    const swap = reduced ? INSTANT : SWAP
    const seconds = elapsed ?? (hasRun ? counted : undefined)
    const time = timer && seconds !== undefined ? formatElapsed(Math.max(0, Math.floor(seconds))) : undefined
    const text = label ?? (typeof config.label === 'function' ? config.label(time) : (config.label ?? titleCase(state)))
    const shimmering = shimmer ?? active

    return (
        <div
            data-slot="ai-status"
            data-state={state}
            data-active={active || undefined}
            role="status"
            className={cn('flex h-8 w-fit items-center gap-2 font-runde text-[12px] text-black dark:text-white', className)}
            {...props}
        >
            <span data-slot="ai-status-icon" className="relative flex size-5 shrink-0 items-center justify-center">
                <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                        key={state}
                        aria-hidden
                        variants={iconVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={reduced ? INSTANT : ICON}
                        className="flex items-center justify-center"
                    >
                        {icon ?? config.icon ?? <AiStatusIcon state={state} />}
                    </motion.span>
                </AnimatePresence>
            </span>

            {/* the row springs between widths, so the detail and timer glide instead of jumping */}
            <motion.div
                className="relative overflow-x-clip"
                initial={false}
                animate={{ width: bounds.width || 'auto' }}
                transition={swap}
            >
                <div ref={measureRef} className="flex w-max items-center gap-1.5 whitespace-nowrap">
                    <span className="relative grid">
                        <AnimatePresence initial={false} mode="popLayout">
                            <motion.span
                                key={text}
                                variants={swapVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={swap}
                                data-slot="ai-status-label"
                                className={cn('font-semibold', !shimmering && 'text-[#868593]')}
                            >
                                {shimmering ? <Shimmer reduced={reduced}>{text}</Shimmer> : text}
                            </motion.span>
                        </AnimatePresence>
                    </span>
                    <AnimatePresence initial={false} mode="popLayout">
                        {detail && (
                            <motion.span
                                key={detail}
                                data-slot="ai-status-detail"
                                variants={swapVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={swap}
                                className="flex min-w-0 items-center gap-1.5 font-medium text-[#868593]/70"
                            >
                                {typeof favicon === 'string' ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={favicon}
                                        alt=""
                                        draggable={false}
                                        onError={(event) => {
                                            event.currentTarget.style.display = 'none'
                                        }}
                                        className="size-3.5 shrink-0 rounded-[3px] object-contain"
                                    />
                                ) : (
                                    favicon && <span className="flex size-3.5 shrink-0 items-center justify-center">{favicon}</span>
                                )}
                                <span className="max-w-56 truncate">{detail}</span>
                            </motion.span>
                        )}
                    </AnimatePresence>
                    {time && active && (
                        <span data-slot="ai-status-timer" aria-hidden className="font-medium tabular-nums text-[#868593]/70">
                            {time}
                        </span>
                    )}
                </div>
            </motion.div>
        </div>
    )
}

export type AiStatusIconProps = {
    state: AiStatusState | (string & {})
}

function Shimmer({ reduced, children }: { reduced: boolean; children: React.ReactNode }) {
    if (reduced) {
        return <span className="text-[#868593]">{children}</span>
    }
    return (
        <motion.span
            className="bg-clip-text text-transparent [--ai-status-ink:#868593] [--ai-status-shine:#000] dark:[--ai-status-shine:#fff]"
            style={{ backgroundImage: SHIMMER, backgroundSize: '250% 100%' }}
            initial={{ backgroundPosition: '100% 0' }}
            animate={{ backgroundPosition: '0% 0' }}
            transition={{ duration: 1.6, ease: 'linear', repeat: Infinity }}
        >
            {children}
        </motion.span>
    )
}

export { AiStatus, AiStatusIcon }
export default AiStatus
