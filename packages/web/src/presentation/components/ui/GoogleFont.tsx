import React, { useEffect } from 'react';

interface GoogleFontProps {
    family: string;
}

export const GoogleFont: React.FC<GoogleFontProps> = ({ family }) => {
    useEffect(() => {
        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@300;400;500;600;700;800&display=swap`;
        link.rel = 'stylesheet';
        document.head.appendChild(link);

        // Also inject font-family globally since we are using 'font-sans' in Tailwind
        const style = document.createElement('style');
        style.innerHTML = `
      :root {
        --font-sans: "${family}", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      }
      body {
        font-family: var(--font-sans);
      }
    `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(link);
            document.head.removeChild(style);
        };
    }, [family]);

    return null;
};
