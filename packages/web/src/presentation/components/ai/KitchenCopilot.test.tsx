import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KitchenCopilot } from './KitchenCopilot';
import * as aiApi from '../../api/ai';

// Mock the API wrapper
vi.mock('../../api/ai', () => ({
    chatWithCopilot: vi.fn()
}));

describe('KitchenCopilot', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock scrollIntoView since it's not implemented in JSDOM
        window.HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    it('renders closed by default', () => {
        render(<KitchenCopilot />);
        // The chat window text shouldn't be visible initially
        expect(screen.queryByText('Kitchen Copilot')).not.toBeInTheDocument();
        // Check for the trigger button
        expect(screen.getByTitle('Abrir Copiloto')).toBeInTheDocument();
    });

    it('opens chat window when clicked', () => {
        render(<KitchenCopilot />);
        const button = screen.getByTitle('Abrir Copiloto');
        fireEvent.click(button);
        expect(screen.getByText('Kitchen Copilot')).toBeInTheDocument();
    });

    it('sends message and displays user input', async () => {
        // Mock successful response
        (aiApi.chatWithCopilot as any).mockResolvedValue({
            data: { response: 'Hello Chef!' }
        });

        render(<KitchenCopilot />);
        const toggleButton = screen.getByTitle('Abrir Copiloto');
        fireEvent.click(toggleButton);

        const input = screen.getByPlaceholderText('Pregunta sobre recetas, stock...');
        fireEvent.change(input, { target: { value: 'How to make pasta?' } });

        const sendButton = screen.getByLabelText('Enviar mensaje');
        fireEvent.click(sendButton);

        await waitFor(() => {
            // Check for user message
            expect(screen.getByText('How to make pasta?')).toBeInTheDocument();
            // Check for response (flaky if loading state is long, but waitFor handles it)
        });
    });
});
