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

  it('fills the style from a genre and asks before overwriting', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.selectOptions(screen.getByLabelText('Genre'), 'old-west')
    expect(screen.getByLabelText('Style profile name')).toHaveValue('Old West')
    expect((screen.getByLabelText('Setting') as HTMLTextAreaElement).value).toContain('American frontier')
    expect(screen.getByLabelText('Color 1 name')).toHaveValue('Saddle brown')
    expect(screen.getByLabelText('Color 5 name')).toHaveValue('Brass')
    expect(screen.getByLabelText('Art style')).toHaveValue('pixel-art')
    expect(preview()).toHaveTextContent('Setting: 1880s American frontier')
    expect(screen.getByText(/Applied “Old West”/)).toBeInTheDocument()

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await user.selectOptions(screen.getByLabelText('Genre'), 'cyberpunk')
    expect(confirm).toHaveBeenCalledOnce()
    expect(screen.getByLabelText('Color 1 name')).toHaveValue('Saddle brown')

    confirm.mockReturnValue(true)
    await user.selectOptions(screen.getByLabelText('Genre'), 'cyberpunk')
    expect(screen.getByLabelText('Color 1 name')).toHaveValue('Midnight navy')
    expect(screen.getByLabelText('Style profile name')).toHaveValue('Old West')
  })

  it('explains a field with examples behind its (i) icon', async () => {
    const user = userEvent.setup()
    render(<App />)
    const button = screen.getByRole('button', { name: 'About Held items' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('note', { name: 'About Held items' })
    expect(within(panel).getByText('revolver in the right hand')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
    expect(button).toHaveFocus()

    await user.click(button)
    await user.click(document.body)
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('has an (i) icon on every field', () => {
    render(<App />)
    for (const name of ['Genre', 'Art style', 'Setting', 'Palette', 'Name', 'Head', 'Signature details', 'Action', 'View', 'Exclude']) {
      expect(screen.getByRole('button', { name: `About ${name}` })).toBeInTheDocument()
    }
  })

  it('fills the batch from a one-click action list', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Batch' }))
    await user.click(screen.getByRole('button', { name: 'Platformer basics' }))
    expect(screen.getAllByTestId('batch-prompt')).toHaveLength(7)
  })

  it('generates one sprite sheet prompt per animation with its own frame count', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.type(screen.getByLabelText('Name'), 'Rex Ranger')
    await user.type(screen.getByLabelText('Proportions'), '4 heads tall')
    await user.click(screen.getByRole('tab', { name: 'Animations' }))

    const panel = screen.getByRole('region', { name: 'Animations' })
    await user.click(within(panel).getByRole('button', { name: 'All off' }))
    for (const name of ['Idle', 'Walk', 'Dash', 'Run', 'Jump']) {
      await user.click(within(panel).getByLabelText(`Include ${name}`))
    }

    const prompts = screen.getAllByTestId('animation-prompt').map((el) => el.textContent ?? '')
    expect(prompts.map((p) => /Frames: (\d+)/.exec(p)?.[1])).toEqual(['4', '8', '8', '12', '6'])
    expect(prompts[3]).toContain('Aspect ratio: 4:3')
    expect(prompts[3]).toContain('Frame 12 (row 3, column 4): ')
    expect(new Set(prompts.map((p) => p.slice(0, p.indexOf('[ASSET]')))).size).toBe(1)

    await user.click(within(panel).getByRole('button', { name: 'Copy all' }))
    expect(await navigator.clipboard.readText()).toBe(prompts.join('\n\n---\n\n'))
  })

  it('blocks copying an animation with an invalid frame count and keeps edits after a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    await user.type(screen.getByLabelText('Name'), 'Rex Ranger')
    await user.type(screen.getByLabelText('Proportions'), '4 heads tall')
    await user.click(screen.getByRole('tab', { name: 'Animations' }))
    const panel = screen.getByRole('region', { name: 'Animations' })

    await user.clear(within(panel).getByLabelText('Walk frames'))
    await user.type(within(panel).getByLabelText('Walk frames'), '20')
    expect(within(panel).getByText(/Frame count must be a whole number/)).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Copy all' })).toBeDisabled()

    await user.clear(within(panel).getByLabelText('Walk frames'))
    await user.type(within(panel).getByLabelText('Walk frames'), '6')
    expect(within(panel).getByRole('button', { name: 'Copy all' })).toBeEnabled()

    await user.type(within(panel).getByLabelText('New animation name'), 'wall slide{Enter}')
    expect(within(panel).getByLabelText('Include wall slide')).toBeChecked()

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.animations) ?? '{}').animations
    expect(stored.find((a: { id: string }) => a.id === 'walk').frames).toBe(6)
    unmount()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Animations' }))
    expect(screen.getByLabelText('Walk frames')).toHaveValue(6)
    expect(screen.getByLabelText('Include wall slide')).toBeInTheDocument()
  })

  it('switches the animation sheets between a grid and one row, and warns about non-side views', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('tab', { name: 'Animations' }))
    const panel = screen.getByRole('region', { name: 'Animations' })
    const first = () => screen.getAllByTestId('animation-prompt')[0].textContent ?? ''

    expect(first()).toContain('Frames: 4, in a grid of 2 columns and 2 rows')
    await user.click(within(panel).getByLabelText('One row'))
    expect(first()).toContain('Frames: 4, in one horizontal row')
    expect(first()).toContain('Aspect ratio: 4:1')

    expect(within(panel).queryByText(/read best from the side/)).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('View'), 'front')
    expect(within(panel).getByText(/read best from the side/)).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'Use side view, facing right' }))
    expect(screen.getByLabelText('View')).toHaveValue('side-right')
    expect(within(panel).queryByText(/read best from the side/)).not.toBeInTheDocument()
  })

  it('fills the form from a pasted prompt', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Fill from prompt' }))
    const panel = screen.getByRole('region', { name: 'Fill from prompt' })
    expect(within(panel).getByRole('button', { name: 'Fill form' })).toBeDisabled()

    await user.click(within(panel).getByLabelText('Prompt to read'))
    await user.paste('nothing useful here')
    await user.click(within(panel).getByRole('button', { name: 'Fill form' }))
    expect(within(panel).getByRole('alert')).toHaveTextContent('No fields found')

    await user.clear(within(panel).getByLabelText('Prompt to read'))
    await user.paste(
      [
        '[STYLE]',
        'Art style: 2D cel-shaded',
        'Palette: Ocean teal #1F6F78 (sea, sashes); Coat red #A3262A (coats)',
        '',
        '[CHARACTER]',
        'Name: Dread pirate Robert',
        'Proportions: 6 heads tall',
        'Signature details: a pearl collar; a red waistband',
        '',
        '[ASSET]',
        'Type: Sprite sheet',
        'Frames: 8, in a grid of 4 columns and 2 rows, read left to right, top to bottom',
        'Action: running',
        'View: Side view, facing right',
        'Aspect ratio: 2:1',
        'Exclude: no text, no logos',
      ].join('\n'),
    )
    await user.click(within(panel).getByRole('button', { name: 'Fill form' }))

    expect(screen.queryByRole('region', { name: 'Fill from prompt' })).not.toBeInTheDocument()
    expect(screen.getByText(/Filled Style, Character and Asset from the prompt/)).toBeInTheDocument()
    expect(screen.getByLabelText('Art style')).toHaveValue('cel-shaded-2d')
    expect(screen.getByLabelText('Color 2 name')).toHaveValue('Coat red')
    expect(screen.getByLabelText('Name')).toHaveValue('Dread pirate Robert')
    expect(screen.getByLabelText('Asset type')).toHaveValue('sprite-strip')
    expect(screen.getByLabelText('Layout')).toHaveValue('grid')
    expect(screen.getByLabelText('Action')).toHaveValue('running')
    expect(preview()).toHaveTextContent('Frames: 8, in a grid of 4 columns and 2 rows')
    expect(preview()).toHaveTextContent('Signature details: a pearl collar; a red waistband')
  })
})
