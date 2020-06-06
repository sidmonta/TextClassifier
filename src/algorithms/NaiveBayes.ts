import Classifier from '../Classifier'

/**
 * Implementa l'algoritmo di Naïve Bayesian.
 * La probabilità di una caratteristica del documento appartenga ad
 * a una specifica categoria è slegata alla probabilità delle altre
 * caratteristiche del documento di appartenere a quella stessa categoria
 *
 * @export
 * @class NaiveBayes
 * @extends {Classifier<E>}
 * @template E Tipologia del documento da classificare
 */
export default class NaiveBayes<E> extends Classifier<E> {
  /**
   * Calcola la probabilità dell'intero documento di appartenere a quella
   * categoria
   *
   * @param {E} item documento su cui calcolare la probabilità
   * @param {string} category categoria per cui calcolare la probabilitò
   * @returns {Promise<number>} probabilità dell'intero documento di appartenere
   * a quella categoria
   * @memberof NaiveBayes
   */
  async documentProbability(item: E, category: string): Promise<number> {
    const features = await this.getFeatures(item)

    // Moltiplica la probabilità di tutte le caratteristiche insieme
    const featureKeys = Array.from(features)
    const tmp = await Promise.all(
      featureKeys.map(
        ([feature, weigth]) => this.weigthedProbability(feature, category, this.featureProbability, weigth || 1)
      )
    )

    return tmp.reduce((prob, feature) => {
      return prob * feature
    }, 1)
  }

  /**
   * Esegue le operazioni per ricavare la probabilità di un documento di appartenere
   * alla categoria passata come parametro.
   * @param {E} item documento
   * @param {string} category categoria per cui calcolare la probabilità
   * @returns {Promise<number>} probabilità dell'intero documento di appartenere
   * a quella categoria
   * @memberof NaiveBayes
   */
  async probability(item: E, category: string): Promise<number> {
    const categoryProb = await this.itemsInCategory(category) / await this.totItems()
    const docProp = await this.documentProbability(item, category)
    return categoryProb * docProp
  }
}
