import { ClassifierOptions } from './Classifier'
import NaiveBayes from './algorithms/NaiveBayes'
import Fisher from './algorithms/Fisher'

/**
 * Tipologia che descrive le possibili tipologie di algoritmi per la
 * classificazione
 * @typedef ClassifierAlgorithms
 */
export type ClassifierAlgorithms = 'NaiveBayes' | 'Fisher'

/**
 * Factory statico che crea l'istanza del classificatore secondo la tipologia
 * di classificatore passata come parametro.
 *
 * @export
 * @class ClassifierFactory
 */
export default class ClassifierFactory {
  /**
   * Crea l'istanza del classificatore con l'algoritmo definito nell'algoritmo
   *
   * @static
   * @template E Tipologia dei documenti
   * @param {ClassifierAlgorithms} algorithm algoritmo di classificazione da
   * applicare
   * @param {ClassifierOptions<E>} options opzioni da passare alla crezione dell'
   * istanza di classificazione
   * @returns {(NaiveBayes<E> | Fisher<E>)} Istanza del classificatore secondo l'
   * algoritmo scelto
   * @memberof ClassifierFactory
   */
  static create<E>(algorithm: ClassifierAlgorithms, options: ClassifierOptions<E>): NaiveBayes<E> | Fisher<E> {
    switch (algorithm) {
      case 'NaiveBayes':
        return new NaiveBayes<E>(options)
      case 'Fisher':
        return new Fisher<E>(options)
      default:
        return new NaiveBayes<E>(options)
    }
  }
}
