import type { Meta, StoryObj } from '@storybook/svelte-vite'
import { createRawSnippet } from 'svelte'

import ActionButton from './action-button.svelte'

const label = (text: string) =>
  createRawSnippet(() => ({
    render: () => `<span>${text}</span>`,
  }))

const meta = {
  title: 'UI/ActionButton',
  component: ActionButton,
  tags: ['autodocs'],
  parameters: {
    controls: { exclude: ['children'] },
  },
  args: {
    children: label('Action'),
  },
} satisfies Meta<typeof ActionButton>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: label('Save'),
  },
}

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: label('Delete'),
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: label('Disabled'),
  },
}
