
export type FeaturesFun = (doc: unknown) => Map<string, number>

export function getWords(doc: string): Map<string, number> {
  const words = new Map<string, number>()
  const regex = new RegExp('[^A-Za-z-]')

  const wordsInDoc = doc
    .split(regex)
    .filter(word => word.length > 2 && word.length < 20)
    .map(word => word.toLocaleLowerCase())

  wordsInDoc.forEach(word => {
    if (!words.has(word)) {
      words.set(word, 1)
    }
  })

  return words
}
