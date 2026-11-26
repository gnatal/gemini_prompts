import type { RawImage } from './glue'

/** Browser-only glue between files, canvases and the pure RawImage helpers. */

export async function fileToRaw(file: Blob): Promise<RawImage> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available in this browser.')
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  return { width, height, data }
}

/** Paints the image onto the canvas, resizing the canvas to fit it. */
export function paintRaw(canvas: HTMLCanvasElement, img: RawImage): void {
  canvas.width = Math.max(1, img.width)
  canvas.height = Math.max(1, img.height)
  const ctx = canvas.getContext('2d')
  if (!ctx || !img.width || !img.height) return
  ctx.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0)
}

/** Saves the canvas as a PNG, scaled by `scale`, with smoothing off for pixel art. */
export function downloadCanvasPng(source: HTMLCanvasElement, filename: string, scale = 1, smooth = true): void {
  const out = document.createElement('canvas')
  out.width = Math.max(1, Math.round(source.width * scale))
  out.height = Math.max(1, Math.round(source.height * scale))
  const ctx = out.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = smooth
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, out.width, out.height)
  out.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }, 'image/png')
}
