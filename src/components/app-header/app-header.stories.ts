import type { Meta, StoryObj } from '@storybook/svelte-vite'

import AppHeader from './app-header.svelte'

const meta = {
  title: 'UI/AppHeader',
  component: AppHeader,
  tags: ['autodocs'],
  args: {
    title: 'Lote',
    subtitle: 'Local notes',
  },
} satisfies Meta<typeof AppHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
