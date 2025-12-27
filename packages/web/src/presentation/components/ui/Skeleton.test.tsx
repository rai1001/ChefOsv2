import { render } from '@testing-library/react';
import { Skeleton, SkeletonText } from './Skeleton';
import { describe, it, expect } from 'vitest';

describe('Skeleton', () => {
    it('renders with default classes', () => {
        const { container } = render(<Skeleton />);
        const element = container.firstChild;
        expect(element).toHaveClass('animate-pulse');
        expect(element).toHaveClass('bg-white/5');
        expect(element).toHaveClass('rounded-md');
    });

    it('renders with custom dimensions', () => {
        const { container } = render(<Skeleton width={100} height={50} />);
        const element = container.firstChild;
        expect(element).toHaveStyle({ width: '100px', height: '50px' });
    });

    it('disables animation when animate prop is false', () => {
        const { container } = render(<Skeleton animate={false} />);
        const element = container.firstChild;
        expect(element).not.toHaveClass('animate-pulse');
    });
});

describe('SkeletonText', () => {
    it('renders correct number of lines', () => {
        const { container } = render(<SkeletonText lines={3} />);
        const lines = container.querySelectorAll('.animate-pulse');
        expect(lines).toHaveLength(3);
    });
});
