import { useEffect, useCallback } from 'react';

export const useCommandPalette = (onToggle: () => void) => {
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Cmd+K on Mac, Ctrl+K on Windows/Linux
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                onToggle();
            }

            // Also support Cmd+Shift+P / Ctrl+Shift+P (VS Code style)
            if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key === 'P') {
                event.preventDefault();
                onToggle();
            }
        },
        [onToggle]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);
};
