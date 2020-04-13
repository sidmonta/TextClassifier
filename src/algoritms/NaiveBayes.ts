import Classifier from '../Classifier'

export default class NaiveBayes extends Classifier {

  async documentProbability(item: unknown, category: string): Promise<number> {
    const features = this.getFeatures(item)

    const featureKeys = Array.from(features.keys())
    const tmp = await Promise.all(
      featureKeys.map(
        feature => this.weigthedProbability(feature, category, this.featureProbability)
      )
    )

    return tmp.reduce((prob, feature) => {
      return prob * feature
    }, 1)
  }

  async probability(item: unknown, category: string): Promise<number> {
    const categoryProb = await this.itemsInCategory(category) / await this.totItems()
    const docProp = await this.documentProbability(item, category)
    return categoryProb * docProp
  }
}