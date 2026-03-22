import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { createRawSnippet } from 'svelte'

import PanelTitle from './panel-title.svelte'

const label = (text: string) =>
  createRawSnippet(() => ({
    render: () => `<span>${text}</span>`,
  }))

const meta = {
  title: 'UI/PanelTitle',
  component: PanelTitle,
  tags: ['autodocs'],
  parameters: {
    controls: { exclude: ['children'] },
  },
  args: {
    children: label('Section'),
  },
} satisfies Meta<typeof PanelTitle>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Muted: Story = {
  args: {
    tone: 'muted',
    children: label('Muted'),
  },
}
