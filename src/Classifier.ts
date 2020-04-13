import { Database } from 'sqlite3'
import { existsSync } from 'fs'
import { FeaturesFun, getWords } from './Features'

export type ClassifierOptions = {
  features?: FeaturesFun
  database?: {
    dbPath: string
  }
}

type categoryList = {
  [key: string]: number
}

export default class Classifier {
  protected getFeatures: FeaturesFun
  // fc
  protected featureXcategory: Map<string, categoryList>
  // cc
  protected categoryCount: Map<string, number>
  protected thresholds: Map<string, number>

  private useDb: boolean
  private databasePath: string
  private database: Database

  constructor(options: ClassifierOptions = {}) {
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
      this.database = new Database(this.databasePath, console.error)
      this.database.serialize(() => {
        this.database.parallelize(() => {
          this.database.exec(`
            CREATE TABLE IF NOT EXISTS features_x_category(feature, category, count)
          `)
          this.database.exec(`
            CREATE TABLE IF NOT EXISTS category_count(category, count)
          `)
        })
      })
    }
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
    if (this.useDb) {
      return new Promise((resolve, reject) => {
        this.database.serialize(async () => {
          const count = await this.timesFeatureInCategory(feature, category)
          const query = count === 0
            ? 'INSERT INTO features_x_category VALUES (?, ?, 1)'
            : 'UPDATE features_x_category SET count = ? WHERE feature = ? AND category = ?'

          this.database.run(query, [feature, category],
            (error: Error) => {
              if (error) {
                reject(error)
              }
              resolve(true)
            })
        })
      })
    } else {
      const hasFeature = this.featureXcategory.has(feature)
      const categories = hasFeature ? this.featureXcategory.get(feature) : {}

      categories[category] = categories[category] ? categories[category] + 1 : 1

      this.featureXcategory.set(feature, categories)
      return Promise.resolve(true)
    }
  }

  // incc
  increaseCount(category: string): Promise<boolean> {
    if (this.useDb) {
      return new Promise((resolve, reject) => {
        this.database.serialize(async () => {
          const count = await this.itemsInCategory(category)
          const query = count === 0
            ? 'INSERT INTO category_count VALUES (?1, ?2)'
            : 'UPDATE category_count SET count = ?2 WHERE category = ?1'

          this.database.run(query, [category, count + 1], (error: Error) => {
            if (error) {
              reject(error)
            }
            resolve(true)
          })
        })
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
    if (this.useDb) {
      return new Promise((resolve, reject) => {
        this.database.serialize(() => {
          this.database.get('SELECT count FROM features_x_category WHERE feature = ? AND category = ?', [feature, category], (err, row) => {
            if (err) {
              reject(err)
            }
            resolve(row?.count || 0)
          })
        })
      })
    } else {
      if (this.featureXcategory.has(feature)) {
        return Promise.resolve(this.featureXcategory.get(feature)[category] || 0)
      }
      return Promise.resolve(0)
    }
  }

  // catcount
  itemsInCategory(category: string): Promise<number> {
    if (this.useDb) {
      return new Promise((resolve, reject) => {
        this.database.serialize(() => {
          this.database.get('SELECT count FROM category_count WHERE category = ?', [category], (err, row) => {
            if (err) {
              reject(err)
            }
            resolve(row?.count || 0)
          })
        })
      })
    } else {
      return Promise.resolve(this.categoryCount.get(category) || 0)
    }
  }

  // totalcount
  totItems(): Promise<number> {
    if (this.useDb) {
      return new Promise((resolve, reject) => {
        this.database.serialize(() => {
          this.database.get('SELECT SUM(count) as c FROM category_count', (err, row) => {
            if (err) {
              reject(err)
            }
            resolve(row?.c || 0)
          })
        })
      })
    } else {
      return Promise.resolve(Array.from(this.categoryCount.values()).reduce((a, b) => a + b))
    }
  }

  get categories(): Promise<string[]> {
    if (this.useDb) {
      return new Promise((resolve, reject) => {
        this.database.serialize(() => {
          this.database.all('SELECT category FROM category_count', (err, all) => {
            if (err) {
              reject(err)
            }

            resolve(all.map(cat => cat?.category || 0))
          })
        })
      })
    } else {
      return Promise.resolve(Array.from(this.categoryCount.keys()))
    }
  }

  async train(item: unknown, category: string): Promise<void> {
    const features = this.getFeatures(item)

    for (let key of features.keys()) {
      await this.increasePair(key, category)
    }

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
    const basicProb = await calcProp(feature, category)

    const allCategoties = await this.categories
    const tmp = await Promise.all(
      allCategoties.map(async cat => await this.timesFeatureInCategory(feature, cat))
    )
    const totals = tmp.reduce((a, b) => a + b)

    return ((weight * ap) + totals * basicProb) / (weight + totals)
  }

  async probability(item: unknown, category: string): Promise<number> {
    return Promise.resolve(0.5)
  }

  async classify(item: unknown, def: string = ''): Promise<string> {
    const probs = {}
    let max = 0
    let bestCategory = null
    const allCategoties = await this.categories
    for (let category of allCategoties) {
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
}
