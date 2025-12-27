import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Mail, ArrowRight, Play } from 'lucide-react';

const meta: Meta<typeof Button> = {
    title: 'Atoms/Button',
    component: Button,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg', 'icon'],
        },
        loading: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
    args: {
        variant: 'primary',
        children: 'Primary Button',
    },
};

export const Secondary: Story = {
    args: {
        variant: 'secondary',
        children: 'Secondary Button',
    },
};

export const Outline: Story = {
    args: {
        variant: 'outline',
        children: 'Outline Button',
    },
};

export const Ghost: Story = {
    args: {
        variant: 'ghost',
        children: 'Ghost Button',
    },
};

export const Danger: Story = {
    args: {
        variant: 'danger',
        children: 'Danger Button',
    },
};

export const WithIcon: Story = {
    args: {
        variant: 'primary',
        children: 'Send Message',
        leftIcon: <Mail size={16} />,
    },
};

export const Loading: Story = {
    args: {
        variant: 'primary',
        loading: true,
        children: 'Loading...',
    },
};

export const IconButton: Story = {
    args: {
        variant: 'primary',
        size: 'icon',
        icon: <Play size={20} />,
    },
};
