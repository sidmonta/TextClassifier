import { removeStopwords } from 'stopword'

export type FeaturesFun<E> = (doc: E) => Map<string, number>

export function getWords<E>(doc: E | string): Map<string, number> {
  const regex = new RegExp('[^A-Za-z-]')
  doc = doc.toString()
  const wordsInDoc: [string, number][] = removeStopwords(doc.split(regex))
    .filter(word => word.length > 2 && word.length < 20)
    .map(word => [word.toLocaleLowerCase(), 1])

  const words = new Map<string, number>(wordsInDoc)
  return words
}

export function featureWthMetadata<E extends { metadata: { [a: string]: string }, content: string }>(
  { metadata, content }: E
): Map<string, number> {
  const words = new Map<string, number>()
  const metadataToParse = Object.values(metadata).filter(met => !met.match(/[0-9-]+/))
  for (const metadataValue of metadataToParse) {
    words.set(metadataValue, 1)
  }
  const wordsOnDesc = getWords(content)
  for (const wd of Array.from(wordsOnDesc.keys())) {
    words.set(wd, 1)
  }

  return words
}
