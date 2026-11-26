import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { gridFor } from '../config/assetPresets'
import {
  type AnchorX,
  composeSheet,
  contentBox,
  DEFAULT_KEY_OPTIONS,
  DEFAULT_LAYOUT_OPTIONS,
  detectKeyColor,
  type FrameMetrics,
  measure,
  naturalCompare,
  planLayout,
  type RawImage,
  removeBackground,
  resize,
  sliceSheet,
} from '../lib/glue'
import { downloadCanvasPng, fileToRaw, paintRaw } from '../lib/imageIO'
import { newId } from '../lib/storage'
import { buttonClass, inputClass, primaryButtonClass } from './Field'

interface GlueFrame {
  id: string
  name: string
  raw: RawImage
  /** Percent, to fix a frame that came out bigger or smaller than the rest. */
  scale: number
  dx: number
  dy: number
  /** Undefined: detected. */
  airborne?: boolean
}

interface SheetSource {
  name: string
  raw: RawImage
  columns: number
  rows: number
}

interface Processed {
  cutout: RawImage
  metrics: FrameMetrics | null
}

type SheetLayout = 'grid' | 'row'

const MAX_FRAMES = 24
const SHEET_INSET = 3
const compactInput = inputClass.replace('w-full ', '')
const smallInput = `${compactInput} w-16 px-1.5 py-0.5 text-xs`
const smallButton = buttonClass.replace('px-2.5 py-1.5 text-sm', 'px-2 py-0.5 text-xs')

/** A small copy of one cell of the composed sheet. */
function FrameThumb({ source, cell, version }: { source: HTMLCanvasElement | null; cell: { x: number; y: number; w: number; h: number } | null; version: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    if (!source || !cell || !cell.w || !cell.h) return
    const zoom = canvas.height / cell.h
    const w = cell.w * zoom
    ctx.drawImage(source, cell.x, cell.y, cell.w, cell.h, (canvas.width - w) / 2, 0, w, canvas.height)
  }, [source, cell?.x, cell?.y, cell?.w, cell?.h, version])
  return <canvas ref={ref} width={40} height={56} className="shrink-0 rounded bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
}

const newFrame = (name: string, raw: RawImage): GlueFrame => ({ id: newId(), name, raw, scale: 100, dx: 0, dy: 0 })

/** A starting guess for a sheet's grid: 4 columns, rows from the aspect ratio. */
function guessGrid(raw: RawImage): { columns: number; rows: number } {
  const columns = 4
  const rows = Math.min(4, Math.max(1, Math.round((columns * raw.height) / raw.width)))
  return { columns, rows }
}

function framesFromSheet(sheet: SheetSource): GlueFrame[] {
  return sliceSheet(sheet.raw, sheet.columns, sheet.rows, SHEET_INSET).map((raw, i) => newFrame(`${sheet.name} · cell ${i + 1}`, raw))
}

export function GluePanel() {
  const [frames, setFrames] = useState<GlueFrame[]>([])
  const [sheet, setSheet] = useState<SheetSource | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [tolerance, setTolerance] = useState(DEFAULT_KEY_OPTIONS.tolerance)
  const [anchor, setAnchor] = useState<AnchorX>(DEFAULT_LAYOUT_OPTIONS.anchor)
  const [snap, setSnap] = useState(DEFAULT_LAYOUT_OPTIONS.snapToGround)
  const [padding, setPadding] = useState(DEFAULT_LAYOUT_OPTIONS.padding)
  const [sheetLayout, setSheetLayout] = useState<SheetLayout>('grid')
  const [fps, setFps] = useState(10)
  const [outputScale, setOutputScale] = useState(100)
  const [pixelArt, setPixelArt] = useState(false)

  const sheetCanvas = useRef<HTMLCanvasElement>(null)
  const previewCanvas = useRef<HTMLCanvasElement>(null)
  const cache = useRef(new Map<string, Processed>())
  const [paintVersion, setPaintVersion] = useState(0)

  // Cut every frame out of its background. Cached, so nudging a frame doesn't redo the work.
  const processed = useMemo(() => {
    const keys = new Set<string>()
    const result = frames.map((f) => {
      const key = `${f.id}|${f.scale}|${tolerance}`
      keys.add(key)
      let hit = cache.current.get(key)
      if (!hit) {
        const scaled = resize(f.raw, f.scale / 100)
        const cutout = removeBackground(scaled, detectKeyColor(scaled), { ...DEFAULT_KEY_OPTIONS, tolerance })
        const box = contentBox(cutout)
        hit = { cutout, metrics: box ? measure(cutout, box) : null }
        cache.current.set(key, hit)
      }
      return hit
    })
    for (const key of cache.current.keys()) if (!keys.has(key)) cache.current.delete(key)
    return result
  }, [frames, tolerance])

  const usable = useMemo(
    () =>
      frames
        .map((frame, i) => ({ frame, ...processed[i] }))
        .filter((p): p is { frame: GlueFrame; cutout: RawImage; metrics: FrameMetrics } => p.metrics !== null),
    [frames, processed],
  )
  const count = usable.length
  const columns = sheetLayout === 'row' ? count : gridFor(count).columns
  const rows = count ? Math.ceil(count / Math.max(1, columns)) : 0

  const layout = useMemo(
    () =>
      planLayout(
        usable.map((u) => u.metrics),
        { ...DEFAULT_LAYOUT_OPTIONS, anchor, snapToGround: snap, padding },
        usable.map((u) => ({ dx: u.frame.dx, dy: u.frame.dy, airborne: u.frame.airborne })),
      ),
    [usable, anchor, snap, padding],
  )

  const composed = useMemo(
    () => (usable.length ? composeSheet(usable.map((u) => u.cutout), layout, columns) : null),
    [usable, layout, columns],
  )

  useEffect(() => {
    if (!sheetCanvas.current || !composed) return
    paintRaw(sheetCanvas.current, composed)
    setPaintVersion((v) => v + 1)
  }, [composed])

  // Preview loop: draws one cell after another from the sheet canvas.
  useEffect(() => {
    const preview = previewCanvas.current
    const source = sheetCanvas.current
    if (!preview || !source || !count || !layout.cellWidth) return
    const zoom = Math.min(1, 280 / layout.cellHeight)
    preview.width = Math.round(layout.cellWidth * zoom)
    preview.height = Math.round(layout.cellHeight * zoom)
    const ctx = preview.getContext('2d')
    if (!ctx) return
    ctx.imageSmoothingEnabled = !pixelArt
    let frame = 0
    const draw = () => {
      const sx = (frame % columns) * layout.cellWidth
      const sy = Math.floor(frame / columns) * layout.cellHeight
      ctx.clearRect(0, 0, preview.width, preview.height)
      ctx.drawImage(source, sx, sy, layout.cellWidth, layout.cellHeight, 0, 0, preview.width, preview.height)
      frame = (frame + 1) % count
    }
    draw()
    const timer = setInterval(draw, 1000 / Math.max(1, fps))
    return () => clearInterval(timer)
  }, [paintVersion, count, columns, layout.cellWidth, layout.cellHeight, fps, pixelArt])

  const load = async (fileList: FileList | File[]) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/')).sort((a, b) => naturalCompare(a.name, b.name))
    if (!files.length) {
      setError('Drop PNG or JPEG images.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      if (files.length === 1) {
        const raw = await fileToRaw(files[0])
        const next = { name: files[0].name, raw, ...guessGrid(raw) }
        setSheet(next)
        setFrames(framesFromSheet(next))
      } else {
        const loaded = await Promise.all(files.slice(0, MAX_FRAMES).map(async (f) => newFrame(f.name, await fileToRaw(f))))
        setSheet(null)
        setFrames(loaded)
        if (files.length > MAX_FRAMES) setError(`Only the first ${MAX_FRAMES} images were used.`)
      }
    } catch {
      setError('Could not read one of the images.')
    } finally {
      setLoading(false)
    }
  }

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) void load(e.target.files)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    setDragging(false)
    void load(e.dataTransfer.files)
  }

  const reslice = (patch: Partial<Pick<SheetSource, 'columns' | 'rows'>>) => {
    if (!sheet) return
    const next = { ...sheet, ...patch }
    if (!(next.columns >= 1 && next.rows >= 1 && next.columns * next.rows <= MAX_FRAMES)) return
    setSheet(next)
    setFrames(framesFromSheet(next))
  }

  const update = (id: string, patch: Partial<GlueFrame>) =>
    setFrames((list) => list.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  const move = (index: number, by: number) =>
    setFrames((list) => {
      const target = index + by
      if (target < 0 || target >= list.length) return list
      const next = [...list]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

  const usableIndex = new Map(usable.map((u, i) => [u.frame.id, i]))

  return (
    <section aria-label="Glue frames" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Glue frames into a sheet</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Drop the frames you generated (one image per frame, named in order) or one sprite sheet. The background is
          removed, the feet go on one ground line, the heads line up, and everything is packed into a transparent sheet.
          Nothing leaves your browser.
        </p>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={
          'flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed px-3 py-5 text-center text-sm ' +
          (dragging
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
            : 'border-slate-300 hover:border-slate-400 dark:border-slate-600')
        }
      >
        <span className="font-medium text-slate-800 dark:text-slate-200">
          {loading ? 'Reading images…' : 'Drop images here, or click to choose'}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">Several images: one per frame. One image: a sheet to cut.</span>
        <input type="file" accept="image/*" multiple className="sr-only" onChange={onFiles} aria-label="Frame images" />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      {sheet && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span>Cut “{sheet.name}” into</span>
          <label className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={12}
              className={smallInput}
              value={sheet.columns}
              onChange={(e) => reslice({ columns: Number(e.target.value) })}
              aria-label="Sheet columns"
            />
            columns
          </label>
          <label className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={6}
              className={smallInput}
              value={sheet.rows}
              onChange={(e) => reslice({ rows: Number(e.target.value) })}
              aria-label="Sheet rows"
            />
            rows
          </label>
        </div>
      )}

      {frames.length > 0 && (
        <>
          <fieldset className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-3 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-300">
            <legend className="px-1 text-sm font-medium">Alignment</legend>
            <label className="flex flex-col gap-1">
              Line up by
              <select className={inputClass} value={anchor} onChange={(e) => setAnchor(e.target.value as AnchorX)} aria-label="Line up by">
                <option value="head">Head (walk, run, jump)</option>
                <option value="center">Body center (lying, rolling)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              Sheet layout
              <select
                className={inputClass}
                value={sheetLayout}
                onChange={(e) => setSheetLayout(e.target.value as SheetLayout)}
                aria-label="Output layout"
              >
                <option value="grid">Grid ({count ? `${gridFor(count).columns}×${gridFor(count).rows}` : 'auto'})</option>
                <option value="row">One row</option>
              </select>
            </label>
            <label className="col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
              Put the feet on one ground line, except frames in the air
            </label>
            <label className="flex flex-col gap-1">
              Background removal: {tolerance}
              <input
                type="range"
                min={40}
                max={160}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
                aria-label="Background removal strength"
              />
            </label>
            <label className="flex flex-col gap-1">
              Padding: {padding} px
              <input
                type="range"
                min={0}
                max={40}
                value={padding}
                onChange={(e) => setPadding(Number(e.target.value))}
                aria-label="Padding"
              />
            </label>
          </fieldset>

          <ol className="flex flex-col divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white text-xs dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-900">
            {frames.map((f, i) => {
              const slot = usableIndex.get(f.id)
              const placement = slot !== undefined ? layout.placements[slot] : undefined
              return (
                <li key={f.id} data-testid="glue-frame" className="flex gap-3 px-3 py-2">
                  <FrameThumb
                    source={sheetCanvas.current}
                    version={paintVersion}
                    cell={
                      slot === undefined
                        ? null
                        : {
                            x: (slot % Math.max(1, columns)) * layout.cellWidth,
                            y: Math.floor(slot / Math.max(1, columns)) * layout.cellHeight,
                            w: layout.cellWidth,
                            h: layout.cellHeight,
                          }
                    }
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200">Frame {i + 1}</span>
                      <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400" title={f.name}>
                        {f.name}
                      </span>
                      <button type="button" className={smallButton} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move frame ${i + 1} up`}>
                        ↑
                      </button>
                      <button
                        type="button"
                        className={smallButton}
                        onClick={() => move(i, 1)}
                        disabled={i === frames.length - 1}
                        aria-label={`Move frame ${i + 1} down`}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={smallButton}
                        onClick={() => setFrames((list) => list.filter((x) => x.id !== f.id))}
                        aria-label={`Remove frame ${i + 1}`}
                      >
                        ✕
                      </button>
                    </div>
                    {slot === undefined ? (
                      <span className="text-red-600 dark:text-red-400">Nothing found on the background. Try a lower background removal.</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-600 dark:text-slate-400">
                        <label className="flex items-center gap-1" title="Scale this frame, if it came out bigger or smaller">
                          Size %
                          <input
                            type="number"
                            min={25}
                            max={400}
                            className={smallInput}
                            value={f.scale}
                            onChange={(e) => {
                              const scale = Number(e.target.value)
                              if (scale >= 25 && scale <= 400) update(f.id, { scale })
                            }}
                            aria-label={`Frame ${i + 1} scale`}
                          />
                        </label>
                        <label className="flex items-center gap-1" title="Move right (+) or left (-), in pixels">
                          x
                          <input
                            type="number"
                            className={smallInput}
                            value={f.dx}
                            onChange={(e) => update(f.id, { dx: Number(e.target.value) || 0 })}
                            aria-label={`Frame ${i + 1} x offset`}
                          />
                        </label>
                        <label className="flex items-center gap-1" title="Move down (+) or up (-), in pixels">
                          y
                          <input
                            type="number"
                            className={smallInput}
                            value={f.dy}
                            onChange={(e) => update(f.id, { dy: Number(e.target.value) || 0 })}
                            aria-label={`Frame ${i + 1} y offset`}
                          />
                        </label>
                        {snap && (
                          <select
                            className={`${compactInput} px-1.5 py-0.5 text-xs`}
                            value={f.airborne === undefined ? 'auto' : f.airborne ? 'air' : 'ground'}
                            onChange={(e) =>
                              update(f.id, { airborne: e.target.value === 'auto' ? undefined : e.target.value === 'air' })
                            }
                            aria-label={`Frame ${i + 1} ground or air`}
                          >
                            <option value="auto">Auto ({placement?.airborne ? 'in the air' : 'on the ground'})</option>
                            <option value="ground">On the ground</option>
                            <option value="air">In the air</option>
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </>
      )}

      <div className={count ? 'flex flex-col gap-3' : 'hidden'}>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Preview</span>
            <canvas
              ref={previewCanvas}
              data-testid="glue-preview"
              className="rounded-lg border border-slate-200 bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:16px_16px] dark:border-slate-700"
            />
          </div>
          <label className="flex flex-col gap-1 text-xs text-slate-700 dark:text-slate-300">
            Speed: {fps} fps
            <input type="range" min={2} max={24} value={fps} onChange={(e) => setFps(Number(e.target.value))} aria-label="Preview speed" />
          </label>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Sheet: {count} frames, {columns}×{rows}, cell {layout.cellWidth}×{layout.cellHeight} px
            {outputScale !== 100 &&
              ` (saved at ${Math.round((layout.cellWidth * outputScale) / 100)}×${Math.round((layout.cellHeight * outputScale) / 100)})`}
          </span>
          <canvas
            ref={sheetCanvas}
            data-testid="glue-sheet"
            className="h-auto max-w-full rounded-lg border border-slate-200 bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:16px_16px] dark:border-slate-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-1">
            Save at
            <select className={`${compactInput} py-1`} value={outputScale} onChange={(e) => setOutputScale(Number(e.target.value))} aria-label="Output size">
              {[100, 50, 25, 12.5].map((s) => (
                <option key={s} value={s}>
                  {s}%
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={pixelArt} onChange={(e) => setPixelArt(e.target.checked)} />
            Pixel art (sharp scaling)
          </label>
          <button
            type="button"
            className={primaryButtonClass}
            onClick={() => sheetCanvas.current && downloadCanvasPng(sheetCanvas.current, 'sprite-sheet.png', outputScale / 100, !pixelArt)}
          >
            Download sheet PNG
          </button>
        </div>
      </div>
    </section>
  )
}
