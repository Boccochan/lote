import type { Meta, StoryObj } from '@storybook/svelte-vite'

import TextArea from './text-area.svelte'

const meta = {
  title: 'UI/TextArea',
  component: TextArea,
  tags: ['autodocs'],
  args: {
    value: 'Line one\nLine two',
    placeholder: 'Type…',
    plain: false,
  },
} satisfies Meta<typeof TextArea>

export default meta
type Story = StoryObj<typeof meta>

export const Bordered: Story = {}

export const Plain: Story = {
  args: {
    plain: true,
  },
}
