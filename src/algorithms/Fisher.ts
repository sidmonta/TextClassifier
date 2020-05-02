import Classifier, { ClassifierOptions } from '../Classifier'

export default class Fisher<E> extends Classifier<E> {
  protected minimums: Map<string, number>
  protected frequencySum: Map<string, number>

  constructor(options: ClassifierOptions<E> = {}) {
    super(options)

    this.minimums = new Map<string, number>()
    this.frequencySum = new Map<string, number>()
  }

  setMinimum(category: string, min: number): void {
    this.minimums.set(category, min)
  }

  getMinimum(category: string): number {
    return this.minimums.get(category) || 0
  }

  async categoryProbs(feature: string, category: string): Promise<number> {
    const frequency = await this.featureProbability(feature, category)
    if (frequency === 0) {
      return 0
    }

    const allCategories = await this.categories
    const tmp = await Promise.all(allCategories.map(cat => this.featureProbability(feature, cat)))
    const frequencySum = tmp.reduce((a, b) => a + b)

    return frequency / frequencySum
  }

  inverseChi2(chi: number, df: number): number {
    let m = chi / 2
    let sum = Math.exp(-m)
    let term = sum
    for (let i = 1; i <= Math.trunc(df / 2); i++) {
      term = term * m / i
      sum = sum + term
    }

    return Math.min(sum, 1)
  }

  async fisherProp(features: Map<string, number>, category: string): Promise<number> {
    const featureKey = Array.from(features.keys())
    const tmp = await Promise.all(featureKey.map(feature => this.weigthedProbability(feature, category, this.categoryProbs)))
    const probs = tmp
      .reduce((a, b) => a * b, 1)

    const featureScore = -2 * Math.log(probs)

    return this.inverseChi2(featureScore, features.size * 2)
  }

  async classify(item: E, def: string = 'unknown'): Promise<string> {
    let best = def
    let max = 0
    const allCategories = await this.categories
    const features = this.getFeatures(item)
    for (let category of allCategories) {
      let prob = await this.fisherProp(features, category)
      if (prob > this.getMinimum(category) && prob > max) {
        best = category
        max = prob
      }
    }

    return best
  }
}
