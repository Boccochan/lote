import type { Meta, StoryObj } from '@storybook/svelte-vite'

import TextField from './text-field.svelte'

const meta = {
  title: 'UI/TextField',
  component: TextField,
  tags: ['autodocs'],
  args: {
    value: 'Text',
    placeholder: 'Placeholder',
  },
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
