function loadScaledCanvas(file: File, maxDim: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not read image'))
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const width = Math.round(img.width * scale)
        const height = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas not supported'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas)
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Compress an image client-side before storing it as base64 (spec §9: max 1280px long edge, JPEG q≈0.8). */
export async function compressImage(file: File, maxDim = 1280, quality = 0.8): Promise<string> {
  const canvas = await loadScaledCanvas(file, maxDim)
  return canvas.toDataURL('image/jpeg', quality)
}

/** Same compression, but as a Blob — used for per-goal progress photos (spec §9), stored more compactly than base64. */
export async function compressImageToBlob(file: File, maxDim = 1280, quality = 0.8): Promise<Blob> {
  const canvas = await loadScaledCanvas(file, maxDim)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not compress image'))),
      'image/jpeg',
      quality,
    )
  })
}
