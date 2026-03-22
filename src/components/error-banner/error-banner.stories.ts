import type { Meta, StoryObj } from '@storybook/svelte-vite'

import ErrorBanner from './error-banner.svelte'

const meta = {
  title: 'UI/ErrorBanner',
  component: ErrorBanner,
  tags: ['autodocs'],
  args: {
    message: 'Something went wrong.',
  },
} satisfies Meta<typeof ErrorBanner>

export default meta
type Story = StoryObj<typeof meta>

export const WithMessage: Story = {}

export const Empty: Story = {
  args: {
    message: '',
  },
}
