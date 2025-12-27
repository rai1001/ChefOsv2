import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
    Skeleton,
    SkeletonText,
    SkeletonCard,
    SkeletonStatCard,
    SkeletonListItem
} from './Skeleton';

const meta: Meta<typeof Skeleton> = {
    title: 'UI/Skeleton',
    component: Skeleton,
    parameters: {
        layout: 'centered',
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        width: 200,
        height: 20,
        rounded: 'md',
    },
};

export const Text: StoryObj = {
    render: () => <SkeletonText lines={3} className="w-64" />,
};

export const Card: StoryObj = {
    render: () => <SkeletonCard className="w-80" />,
};

export const StatCard: StoryObj = {
    render: () => <SkeletonStatCard />,
};

export const ListItem: StoryObj = {
    render: () => (
        <div className="w-80 bg-surface rounded-xl overflow-hidden">
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
        </div>
    ),
};
