import type { Meta, StoryObj } from '@storybook/svelte-vite'

import TypingDots from './typing-dots.svelte'

const meta = {
  title: 'UI/TypingDots',
  component: TypingDots,
  tags: ['autodocs'],
} satisfies Meta<typeof TypingDots>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const CustomLabel: Story = {
  args: {
    label: 'Model is thinking…',
  },
}
