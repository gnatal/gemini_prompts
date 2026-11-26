import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { STORAGE_KEYS } from './lib/storage'

const preview = () => screen.getByTestId('prompt-preview')

async function fillMinimalCharacter(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Rex Ranger')
  await user.type(screen.getByLabelText('Proportions'), '4 heads tall')
  await user.type(screen.getByLabelText('Action'), 'running')
}

afterEach(() => vi.restoreAllMocks())

describe('App', () => {
  it('updates the preview live as the form is filled in', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(preview()).not.toHaveTextContent('Rex Ranger')
    await fillMinimalCharacter(user)
    expect(preview()).toHaveTextContent('Name: Rex Ranger')
    expect(preview()).toHaveTextContent('Action: running')
  })

  it('copies the exact preview text and shows a toast', async () => {
    const user = userEvent.setup()
    render(<App />)
    await fillMinimalCharacter(user)
    const [copyButton] = screen.getAllByRole('button', { name: 'Copy prompt' })
    expect(copyButton).toBeEnabled()
    await user.click(copyButton)
    expect(await navigator.clipboard.readText()).toBe(preview().textContent)
    expect(screen.getByText('Copied')).toBeInTheDocument()
  })

  it('blocks copying until required fields are filled', async () => {
    const user = userEvent.setup()
    render(<App />)
    for (const button of screen.getAllByRole('button', { name: 'Copy prompt' })) expect(button).toBeDisabled()
    expect(screen.getByText(/Fix these to copy/)).toBeInTheDocument()
    await fillMinimalCharacter(user)
    expect(screen.queryByText(/Fix these? to copy/)).not.toBeInTheDocument()
  })

  it('applies asset type presets without wiping the action', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Action'), 'waving')
    await user.selectOptions(screen.getByLabelText('Asset type'), 'portrait')
    expect(screen.getByLabelText('Action')).toHaveValue('waving')
    expect(screen.getByLabelText('View')).toHaveValue('three-quarter-front')
    expect(screen.getByLabelText('Framing')).toHaveValue('head and shoulders, centered')

    await user.selectOptions(screen.getByLabelText('Asset type'), 'sprite-strip')
    expect(preview()).toHaveTextContent('Frames: 6, in one horizontal row')
    expect(preview()).toHaveTextContent('Aspect ratio: 6:1')
    await user.clear(screen.getByLabelText('Frames'))
    await user.type(screen.getByLabelText('Frames'), '8')
    expect(preview()).toHaveTextContent('Aspect ratio: 8:1')

    await user.selectOptions(screen.getByLabelText('Asset type'), 'background')
    expect(screen.getByLabelText('Include character')).not.toBeChecked()
    expect(screen.queryByLabelText('Background color')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Scene')).toBeInTheDocument()
    expect(screen.getByLabelText('Action')).toHaveValue('waving')
    expect(preview()).not.toHaveTextContent('[CHARACTER]')
  })

  it('keeps saved profiles and selections across a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.type(screen.getByLabelText('Style profile name'), 'Main style')
    await user.click(screen.getAllByRole('button', { name: 'Save as new' })[0])
    await fillMinimalCharacter(user)
    await user.click(screen.getAllByRole('button', { name: 'Save as new' })[1])
    unmount()

    render(<App />)
    expect(screen.getByLabelText('Saved style profile')).toHaveDisplayValue('Main style')
    expect(screen.getByLabelText('Saved character profile')).toHaveDisplayValue('Rex Ranger')
    expect(screen.getByLabelText('Name')).toHaveValue('Rex Ranger')
    expect(screen.getByLabelText('Action')).toHaveValue('running')
  })

  it('exports profiles and imports them into a fresh browser', async () => {
    const user = userEvent.setup()
    let exported: Blob | undefined
    URL.createObjectURL = vi.fn((blob: Blob) => {
      exported = blob
      return 'blob:test'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const { unmount } = render(<App />)
    await user.type(screen.getByLabelText('Style profile name'), 'Main style')
    await user.click(screen.getAllByRole('button', { name: 'Save as new' })[0])
    await fillMinimalCharacter(user)
    await user.click(screen.getAllByRole('button', { name: 'Save as new' })[1])
    await user.click(screen.getByRole('button', { name: 'Export profiles' }))
    expect(exported).toBeDefined()
    const json = await exported!.text()
    unmount()

    localStorage.clear() // fresh browser
    render(<App />)
    expect(screen.getByLabelText('Name')).toHaveValue('')
    await user.upload(screen.getByTestId('import-input'), new File([json], 'profiles.json', { type: 'application/json' }))
    expect(await screen.findByText('Imported 1 style and 1 character.')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Rex Ranger')
    expect(screen.getByLabelText('Style profile name')).toHaveValue('Main style')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.characters)!)).toHaveLength(1)
  })

  it('rejects an invalid import file with a readable error', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.upload(screen.getByTestId('import-input'), new File(['{"nope": true}'], 'bad.json'))
    expect(await screen.findByRole('alert')).toHaveTextContent('not an Asset Prompt Builder export')
  })

  it('still works when localStorage holds corrupted data', () => {
    localStorage.setItem(STORAGE_KEYS.styles, '{broken')
    localStorage.setItem(STORAGE_KEYS.asset, 'nope')
    render(<App />)
    expect(preview()).toHaveTextContent('[STYLE]')
  })

  it('shows lint warnings inline and in the summary', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Head'), 'helmet like a fishbowl')
    await user.type(screen.getByLabelText('Held items'), 'a revolver')

    const head = screen.getByLabelText('Head').closest('[data-field]') as HTMLElement
    expect(within(head).getByText(/Describe the shape in plain geometry/)).toBeInTheDocument()
    const held = screen.getByLabelText('Held items').closest('[data-field]') as HTMLElement
    expect(within(held).getByText(/Say which hand/)).toBeInTheDocument()

    const summary = screen.getByRole('region', { name: 'Prompt warnings' })
    expect(within(summary).getByRole('button', { name: 'Head' })).toBeInTheDocument()
    expect(within(summary).getByRole('button', { name: 'Held items' })).toBeInTheDocument()
  })

  it('batch mode with 5 actions produces 5 prompts with identical Style and Character blocks', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Name'), 'Rex Ranger')
    await user.type(screen.getByLabelText('Proportions'), '4 heads tall')
    await user.click(screen.getByRole('tab', { name: 'Batch' }))
    await user.type(screen.getByLabelText('Actions, one per line'), 'idle\nrun\njump\nshoot\nhurt')

    const prompts = screen.getAllByTestId('batch-prompt').map((el) => el.textContent ?? '')
    expect(prompts).toHaveLength(5)
    const shared = prompts.map((p) => p.slice(0, p.indexOf('[ASSET]')))
    expect(new Set(shared).size).toBe(1)

    await user.click(screen.getAllByRole('button', { name: 'Copy all' })[0])
    expect(await navigator.clipboard.readText()).toBe(prompts.join('\n\n---\n\n'))
  })

  it('fills the batch from a one-click action list', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Batch' }))
    await user.click(screen.getByRole('button', { name: 'Platformer basics' }))
    expect(screen.getAllByTestId('batch-prompt')).toHaveLength(7)
  })
})
