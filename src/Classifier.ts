import BetterSqlite3 from 'better-sqlite3'
import { existsSync } from 'fs'
import { FeaturesFun, getWords } from './Features'

export type ClassifierOptions<E> = {
  features?: FeaturesFun<E>
  database?: {
    dbPath: string
  }
}

type categoryList = {
  [key: string]: number
}

type Row = any

/**
 *
 */
export default class Classifier<E> {
  protected getFeatures: FeaturesFun<E>
  // fc
  protected featureXcategory: Map<string, categoryList>
  // cc
  protected categoryCount: Map<string, number>
  protected thresholds: Map<string, number>

  private useDb: boolean
  private databasePath: string
  private database: BetterSqlite3.Database

  constructor(options: ClassifierOptions<E> = {}) {
    this.getFeatures = options.features || getWords

    this.featureXcategory = new Map<string, categoryList>()
    this.categoryCount = new Map<string, number>()
    this.thresholds = new Map<string, number>()
    this.useDb = false

    if (
      options?.database?.dbPath &&
      existsSync(options.database.dbPath)
    ) {
      this.useDb = true
      this.databasePath = options.database.dbPath
      this.database = new BetterSqlite3(this.databasePath)
      this.database.exec(`CREATE TABLE IF NOT EXISTS features_x_category(feature, category, count)`)
      this.database.exec(`CREATE TABLE IF NOT EXISTS category_count(category, count)`)

      this.preloadFeatXCat()
    }
  }

  set features(feature: FeaturesFun<E>) {
    this.getFeatures = feature
  }

  close() {
    this.database.close()
  }

  setThreshold(category: string, threshold: number): void {
    this.thresholds.set(category, threshold)
  }

  getThreshold(category: string) {
    return this.thresholds.get(category) || 1
  }

  // incf
  increasePair(feature: string, category: string): Promise<boolean> {
    const setFeature = (feature: string, category: string): void => {
      const hasFeature = this.featureXcategory.has(feature)
      const categories = hasFeature ? this.featureXcategory.get(feature) : {}
      categories[category] = categories[category] ? categories[category] + 1 : 1
      this.featureXcategory.set(feature, categories)
    }

    if (this.useDb) {
      return new Promise(async (resolve, reject) => {
        const count = await this.timesFeatureInCategory(feature, category)
        const query = count === 0
          ? 'INSERT INTO features_x_category VALUES (:feature, :category, :count)'
          : 'UPDATE features_x_category SET count = :count WHERE feature = :feature AND category = :category'
        try {
          this.database.prepare(query).run({
            feature,
            category,
            count: count + 1
          })
          setFeature(feature, category)
          resolve(true)
        } catch (error) {
          reject(error)
        }
      })
    } else {
      setFeature(feature, category)
    }
  }

  // incc
  increaseCount(category: string): Promise<boolean> {
    if (this.useDb) {
      return new Promise(async (resolve, reject) => {
        const count = await this.itemsInCategory(category)
        const query = count === 0
          ? 'INSERT INTO category_count VALUES (:category, :count)'
          : 'UPDATE category_count SET count = :count WHERE category = :category'
        try {
          this.database.prepare(query).run({
            category,
            count: count + 1
          })
          resolve(true)
        } catch (error) {
          reject(error)
        }
      })
    } else {
      const hasCategory = this.categoryCount.has(category)
      const count = hasCategory ? this.categoryCount.get(category) + 1 : 1
      this.categoryCount.set(category, count)
      return Promise.resolve(true)
    }
  }

  // fcount
  timesFeatureInCategory(feature: string, category: string): Promise<number> {
    if (this.featureXcategory.has(feature)) {
      return Promise.resolve(this.featureXcategory.get(feature)[category] || 0)
    } else {
      return Promise.resolve(0)
    }
  }

  // catcount
  itemsInCategory(category: string): Promise<number> {
    if (!this.useDb) {
      return Promise.resolve(this.categoryCount.get(category) || 0)
    }

    return this.dbWrap(
      'SELECT count FROM category_count WHERE category = ?',
      row => row?.count || 0,
      'get',
      [category]
    ) as Promise<number>
  }

  // totalcount
  totItems(): Promise<number> {
    if (!this.useDb) {
      return Promise.resolve(Array.from(this.categoryCount.values()).reduce((a, b) => a + b))
    }

    return this.dbWrap(
      'SELECT SUM(count) as c FROM category_count',
      row => row?.c || 0,
    ) as Promise<number>
  }

  get categories(): Promise<string[]> {
    if (!this.useDb) {
      return Promise.resolve(Array.from(this.categoryCount.keys()))
    }

    return this.dbWrap(
      'SELECT category FROM category_count',
      all => { return all.map(cat => cat?.category || 0) },
      'all'
    ) as Promise<string[]>
  }

  async train(item: E, category: string): Promise<void> {
    const features = this.getFeatures(item)

    await Promise.all(Array.from(features.keys()).map(key => this.increasePair(key, category)))
    await this.increaseCount(category)
  }

  async featureProbability(feature: string, category: string): Promise<number> {
    const itemsForCategory = await this.itemsInCategory(category)
    if (itemsForCategory === 0) {
      return 0
    }

    return (await this.timesFeatureInCategory(feature, category)) / itemsForCategory
  }

  async weigthedProbability(
    feature: string,
    category: string,
    calcProp: (feature: string, category: string) => Promise<number>,
    weight: number = 1,
    ap: number = 0.5
  ): Promise<number> {
    calcProp = calcProp.bind(this)
    const basicProb = calcProp(feature, category)
    const allCategories = await this.categories
    const tmp = await Promise.all(
      allCategories.map(cat => this.timesFeatureInCategory(feature, cat))
    )
    const totals = tmp.reduce((a, b) => a + b)

    return ((weight * ap) + totals * (await basicProb)) / (weight + totals)
  }

  async probability(item: unknown, category: string): Promise<number> {
    return Promise.resolve(0.5)
  }

  async classify(item: unknown, def: string = ''): Promise<string> {
    const probs = {}
    let max = 0
    let bestCategory = null
    const allCategories = await this.categories

    for (let category of allCategories) {
      probs[category] = await this.probability(item, category)
      if (probs[category] > max) {
        max = probs[category]
        bestCategory = category
      }
    }

    for (let category in probs) {
      if (category === bestCategory) { continue }
      if (probs[category] * this.getThreshold(bestCategory) > probs[bestCategory]) {
        return def
      }
    }
    return bestCategory
  }

  private preloadFeatXCat() {
    return this.dbWrap(
      'SELECT count, feature, category FROM features_x_category',
      (rows: Row[]): number => {
        rows.forEach(({ count, feature, category }) => {
          this.featureXcategory.set(feature, {
            [category]: count || 0
          })
        })
        return 0
      },
      'all'
    )
  }

  private dbWrap(
    query: string,
    funRow: (row: Row | Row[]) => number | string,
    type: 'all' | 'get' = 'get',
    params: (string | number)[] = [],
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const row = this.database.prepare(query)[type](...params)
        resolve(
          funRow.call(this, row)
        )
      } catch (error) {
        reject(error)
      }
    })
  }
}
