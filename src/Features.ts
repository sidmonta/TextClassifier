import { removeStopwords, en, de, it, es, fr, ru, pt } from 'stopword'

const flatten = (arr: string[][]): string[] => arr
  .reduce((flat, toFlatten) => flat.concat(toFlatten), [])

const removeStopWords = (value: string[]): string[] => removeStopwords(value, [
  ...flatten([en, de, it, es, fr, ru, pt]), // Rimuovi le stopwords di diverse lingue
  ...['http', 'https', 'www', 'skos', 'vocab', 'com', 'org', 'info'] // Rimuovi stopwords custom per URL
])

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
  const wordsInDoc: [string, number][] = removeStopWords(doc.split(regex))
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

  const componentToParse: string[] = Object.values(metadata).filter(met => !met.match(/[0-9-]+/))
  componentToParse.push(content)
  for (const wordsValue of componentToParse) {
    const wordsOnDesc = await getWords(wordsValue)
    for (const wd of wordsOnDesc.keys()) {
      words.set(wd, 1)
    }
  }

  return words
}
