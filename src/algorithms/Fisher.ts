import Classifier, { ClassifierOptions } from '../Classifier'

/**
 * Implementa l'algoritmo di classificazione di R. A. Fisher.
 * Questo algoritmo usa le probabilità delle caratteristiche del documento per
 * calcolare la probabilità dell'intero documento
 * @export
 * @class Fisher
 * @extends {Classifier<E>}
 * @template E Tipologia del documento da classificare
 */
export default class Fisher<E> extends Classifier<E> {
  /**
   * Limite inforiore di ogni categoria del classificatore
   *
   * @protected
   * @type {Map<string, number>}
   * @memberof Fisher
   */
  protected minimums: Map<string, number>

  /**
   * Crea un'istanza della classe.
   * Inizializza le proprietà della classe
   * @param {ClassifierOptions<E>} [options={}]
   * @memberof Fisher
   */
  constructor(options: ClassifierOptions<E> = {}) {
    super(options)

    this.minimums = new Map<string, number>()
  }

  /**
   * Assegna il limite inferiore ad una categoria
   *
   * @param {string} category categoria a cui assegnare il limite inferiore
   * @param {number} min il valore del limite inferiore da assegnare alla categoria
   * @memberof Fisher
   */
  setMinimum(category: string, min: number): void {
    this.minimums.set(category, min)
  }

  /**
   * Ritorna la soglia minima assegnata alla categoria
   *
   * @param {string} category categoria di cui sapere la soglia
   * @returns {number} ritorna il valore della soglia minima, se non è stata
   * assegnata nessuna soglia ritorna 0
   * @memberof Fisher
   */
  getMinimum(category: string): number {
    return this.minimums.get(category) || 0
  }

  /**
   * Calcola la probabilità di una categoria assegnata alla caratteristica usando
   * la frequenzz di quella caratteristica nelle categorie.
   *
   * @private
   * @param {string} feature caratteristica
   * @param {string} category categoria
   * @returns {Promise<number>} la probabilità di quella categoria assegnata alla
   * caratteristica
   * @memberof Fisher
   */
  private async categoryProbs(feature: string, category: string): Promise<number> {
    // La frequenza della caratteristica presente nella categoria
    const frequency = await this.featureProbability(feature, category)
    if (frequency === 0) {
      return 0
    }

    // La ferquenza della caratteristica presente in tutte le categorie
    const allCategories = await this.categories
    const tmp = await Promise.all(allCategories.map(cat => this.featureProbability(feature, cat)))
    const frequencySum = tmp.reduce((a, b) => a + b)

    // La probabilità è data dalla frequenza nell'attuale categoria divisa per
    // la frequenza in tutte le categorie
    return frequency / frequencySum
  }

  /**
   * Distribuzione inversa di chi quadrato.
   * Ricava la probabilità dalla distribuzione chi quadrato
   *
   * @private
   * @param {number} chi distribuzione chi quadrato
   * @param {number} df numbero di caratteristiche
   * @returns {number} probabilità dal chi quadrato
   * @memberof Fisher
   */
  private inverseChi2(chi: number, df: number): number {
    const m = chi / 2
    let sum = Math.exp(-m)
    let term = sum
    for (let i = 1; i <= Math.trunc(df / 2); i++) {
      term = term * m / i
      sum = sum + term
    }

    return Math.min(sum, 1)
  }

  /**
   * Calcolo la probabilità di un documento di essere di una specifica categoria
   *
   * @param {Map<string, number>} features caratteristiche del documento
   * @param {string} category categoria su cui calcolare la probabilità
   * @returns {Promise<number>} la probabilità del documento per la categoria
   * @memberof Fisher
   */
  async fisherProp(features: Map<string, number>, category: string): Promise<number> {
    // Moltiplico tutte le probabilità insieme
    const featureKey = Array.from(features)
    const tmp = await Promise.all(featureKey.map(([feature, weigth]) => this.weigthedProbability(feature, category, this.categoryProbs, weigth || 1)))
    const probs = tmp
      .reduce((a, b) => a * b, 1)

    // Calcolo il logaritmo naturale moltiplicato per -2
    const featureScore = -2 * Math.log(probs)

    // Uso l'inverso chi2 per recuperare la probabilità
    return this.inverseChi2(featureScore, features.size * 2)
  }

  /**
   * Determina la categoria più probabile per descrivere un documento
   *
   * @param {E} item documento da analizzare
   * @param {string} [def='unknown'] categoria di default se non si riesce a trovare nulla
   * @returns {Promise<string>} la categoria più probabile per descrivere il documento
   * @memberof Fisher
   */
  async classify(item: E, def = 'unknown'): Promise<string> {
    let best = def
    let max = 0
    const allCategories = await this.categories
    const features = this.getFeatures(item)
    // Cicla per cercare il risultato migliore
    for (const category of allCategories) {
      const prob = await this.fisherProp(features, category)
      // Mi assicuro che la probabilità superi la soglia minima assegnata alla categoria
      if (prob > this.getMinimum(category) && prob > max) {
        best = category
        max = prob
      }
    }

    return best
  }
}
