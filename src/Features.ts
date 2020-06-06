import { removeStopwords } from 'stopword'

/**
 * Tipologia che descrive la funzione di estrazione delle caratteristiche dei
 * documenti
 * @template E Tipologia dei documenti
 * @typedef ClassifierAlgorithms
 */
export type FeaturesFun<E> = (doc: E) => Promise<Map<string, number>>

/**
 * Estrae le singole parole del documento e vanno a fondare le caratteristiche
 *
 * @export
 * @template E Tipologia dei documenti
 * @param {(E | string)} doc Documento da cui estrapolare le caratteristiche
 * @returns {Map<string, number>} Mappa di caratteristiche e numero di occorrenze
 */
export function getWords<E>(doc: E | string): Promise<Map<string, number>> {
  const regex = new RegExp('[^A-Za-z-]', 'gm')
  doc = doc.toString()
  const wordsInDoc: [string, number][] = removeStopwords(doc.split(regex))
    .filter(word => word.length > 2 && word.length < 20)
    .map(word => [word.toLocaleLowerCase(), 1])

  return Promise.resolve(new Map<string, number>(wordsInDoc))
}

/**
 * Estrae le caratteristiche di un documento costituito da metadati e contenuto
 *
 * @export
 * @template E Tipologia del documento
 * @param {E} { metadata, content } Documento con metadati
 * @returns {Map<string, number>} Mappa di caratteristiche e numero di occorrenze
 */
export async function featureWthMetadata<E extends { metadata: { [a: string]: string }, content: string }>(
  { metadata, content }: E
): Promise<Map<string, number>> {
  const words = new Map<string, number>()
  const metadataToParse = Object.values(metadata).filter(met => !met.match(/[0-9-]+/))
  for (const metadataValue of metadataToParse) {
    words.set(metadataValue, 1)
  }
  const wordsOnDesc = await getWords(content)
  for (const wd of Array.from(wordsOnDesc.keys())) {
    words.set(wd, 1)
  }

  return words
}
