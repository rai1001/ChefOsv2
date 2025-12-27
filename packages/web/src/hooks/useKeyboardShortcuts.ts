import React, { useEffect, useCallback } from 'react';

type KeyCombo = string; // e.g., 'ctrl+n', 'escape', 'ctrl+shift+s'

interface KeyboardShortcut {
    key: KeyCombo;
    callback: () => void;
    description?: string;
    preventDefault?: boolean;
}

/**
 * Parse a key combo string into its components
 */
const parseKeyCombo = (combo: string) => {
    const parts = combo.toLowerCase().split('+');
    return {
        ctrl: parts.includes('ctrl') || parts.includes('control'),
        alt: parts.includes('alt'),
        shift: parts.includes('shift'),
        meta: parts.includes('meta') || parts.includes('cmd'),
        key: parts.filter(p => !['ctrl', 'control', 'alt', 'shift', 'meta', 'cmd'].includes(p))[0] || ''
    };
};

/**
 * Check if a keyboard event matches a key combo
 */
const matchesCombo = (event: KeyboardEvent, combo: string): boolean => {
    const parsed = parseKeyCombo(combo);

    const keyMatches = event.key.toLowerCase() === parsed.key ||
        event.code.toLowerCase() === parsed.key ||
        event.code.toLowerCase() === `key${parsed.key}`;

    return (
        keyMatches &&
        event.ctrlKey === parsed.ctrl &&
        event.altKey === parsed.alt &&
        event.shiftKey === parsed.shift &&
        event.metaKey === parsed.meta
    );
};

/**
 * Hook to register keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts([
 *   { key: 'ctrl+n', callback: () => setShowModal(true), description: 'New item' },
 *   { key: 'escape', callback: () => setShowModal(false), description: 'Close modal' },
 * ]);
 */
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
    const shortcutsRef = React.useRef(shortcuts);

    React.useEffect(() => {
        shortcutsRef.current = shortcuts;
    }, [shortcuts]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in inputs
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            // Allow Escape to work even in inputs
            if (event.key !== 'Escape') {
                return;
            }
        }

        for (const shortcut of shortcutsRef.current) {
            if (matchesCombo(event, shortcut.key)) {
                if (shortcut.preventDefault !== false) {
                    event.preventDefault();
                }
                shortcut.callback();
                break;
            }
        }
    }, []);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

/**
 * Common keyboard shortcut presets
 */
export const SHORTCUTS = {
    NEW: 'ctrl+n',
    SAVE: 'ctrl+s',
    CLOSE: 'escape',
    SEARCH: 'ctrl+k',
    DELETE: 'delete',
    REFRESH: 'ctrl+r',
    UNDO: 'ctrl+z',
    REDO: 'ctrl+shift+z',
} as const;
