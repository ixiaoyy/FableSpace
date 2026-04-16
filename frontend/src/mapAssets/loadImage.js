const imageCache = new Map()

export function loadImage(src) {
  if (!src) {
    return Promise.resolve(null)
  }

  if (imageCache.has(src)) {
    return imageCache.get(src)
  }

  const imagePromise = new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })

  imageCache.set(src, imagePromise)
  return imagePromise
}

export function clearImageCache() {
  imageCache.clear()
}
