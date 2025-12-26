import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">This is the card content area.</p>
        </CardContent>
      </>
    ),
  },
};

export const Simple: Story = {
  args: {
    children: <p>A simple card without header</p>,
  },
};

export const NoPadding: Story = {
  args: {
    padding: 'none',
    children: (
      <div className="p-6">
        <p>Custom padding applied manually</p>
      </div>
    ),
  },
};

export const Hoverable: Story = {
  args: {
    hover: true,
    children: (
      <>
        <CardHeader>
          <CardTitle>Hoverable Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Hover over this card to see the effect</p>
        </CardContent>
      </>
    ),
  },
};

export const LargePadding: Story = {
  args: {
    padding: 'lg',
    children: (
      <>
        <CardTitle>Large Padding</CardTitle>
        <p className="text-gray-600 mt-4">This card has larger padding</p>
      </>
    ),
  },
};
