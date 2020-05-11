import ClassifierFactory, { ClassifierAlgorithms } from '../ClassifierFactory'
import { FeaturesFun } from '../Features'
import { ClassifierOptions } from '../Classifier'

/**
 * Descrive le opzioni da passare alla funzione per la classificazione
 * @typedef ClassifyOpt
 * @property {string} dbPath percorso al database con l'addestramento del classificatore
 * @property {ClassifierAlgorithms} algorithm algoritmo di classificazione da utilizzare
 * @property {string} featureFun nome della funzione da applicare oppure il
 * percorso al file dove tale funzione è definita (come default)
 */
export type ClassifyOpt<E> = {
  algorithm: ClassifierAlgorithms
  dbPath: string
  featureFun?: FeaturesFun<E>
}

/**
 * Esegue la classificazione di un documento.
 * [La funzione viene "curryficata"]
 *
 * @export
 * @template E Tipologia del documento da classificare
 * @param {ClassifyOpt} opt opzioni per l'esecuzione della classificazione
 * @returns {(item: E) => Promise<string>} ritorna uno stream osservabile che dato un
 * documento ritorna il risultato della classificazione
 */
export default function classify<E>(opt: ClassifyOpt<E>): (item: E) => Promise<string> {
  const algorithm = opt.algorithm
  const option: ClassifierOptions<E> = {}
  option.database = { dbPath: opt.dbPath }
  if (opt.featureFun) {
    option.features = opt.featureFun
  }

  const classifier = ClassifierFactory.create(algorithm, option)
  // Qui avviene la "curryfazione"
  return async (item: E): Promise<string> => await classifier.classify(item)
}
