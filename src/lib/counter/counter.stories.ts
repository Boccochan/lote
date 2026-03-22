import type { Meta, StoryObj } from '@storybook/svelte-vite'

import Counter from './counter.svelte'

const meta = {
  title: 'Lib/Counter',
  component: Counter,
  tags: ['autodocs'],
} satisfies Meta<typeof Counter>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
