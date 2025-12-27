import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';
import { Mail, Lock, Search } from 'lucide-react';

const meta: Meta<typeof Input> = {
    title: 'Atoms/Input',
    component: Input,
    parameters: {
        layout: 'centered',
    },
    argTypes: {
        disabled: { control: 'boolean' },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
    args: {
        label: 'Email Address',
        placeholder: 'Enter your email',
    },
};

export const WithIcon: Story = {
    args: {
        label: 'Email Address',
        placeholder: 'Enter your email',
        leftIcon: <Mail size={18} />,
    },
};

export const Password: Story = {
    args: {
        label: 'Password',
        type: 'password',
        leftIcon: <Lock size={18} />,
        placeholder: '••••••••',
    },
};

export const ErrorState: Story = {
    args: {
        label: 'Email Address',
        placeholder: 'Enter your email',
        leftIcon: <Mail size={18} />,
        error: 'Please enter a valid email address',
        value: 'invalid-email',
    },
};

export const SearchInput: Story = {
    args: {
        placeholder: 'Search ingredients...',
        leftIcon: <Search size={18} />,
        containerClassName: 'w-[400px]',
    },
};

export const Disabled: Story = {
    args: {
        label: 'Readonly Input',
        value: 'This is disabled',
        disabled: true,
    },
};
