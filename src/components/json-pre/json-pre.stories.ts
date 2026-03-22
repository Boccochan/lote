import type { Meta, StoryObj } from '@storybook/svelte-vite'

import JsonPre from './json-pre.svelte'

const meta = {
  title: 'UI/JsonPre',
  component: JsonPre,
  tags: ['autodocs'],
  args: {
    text: '{"ok":true}',
  },
} satisfies Meta<typeof JsonPre>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const EmptyShowsDash: Story = {
  args: {
    text: '',
  },
}
