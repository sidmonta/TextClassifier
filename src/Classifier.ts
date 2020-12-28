import BetterSqlite3 from 'better-sqlite3'
import { existsSync } from 'fs'
import { FeaturesFun, getWords } from './Features'

/**
 * Descrive le opzioni da passare al classificatore
 * Permette di definire la funzione per estrapolare le caratteristiche da un
 * documento; oltre a definire il percorso al database per registrare gli
 * allenamenti
 * @typedef ClassifierOptions
 */
export type ClassifierOptions<E> = {
  features?: FeaturesFun<E>
  database?: {
    dbPath: string
  }
}

/**
 * Mappa un oggetto in cui le chiavi sono stringhe e i valori numeri
 * @typedef categoryList
 */
type categoryList = {
  [key: string]: number
}

type Row = unknown

/**
 * Classe che implementa le basi per classificare documenti sulla base di categorie
 *
 * @export
 * @class Classifier
 * @template E Tipologia del documento
 */
export default class Classifier<E> {
  /**
   * Proprietà che registra la funzione che estrapola le caratteristiche da un
   * documento
   *
   * @protected
   * @type {FeaturesFun<E>}
   * @memberof Classifier
   */
  protected getFeatures: FeaturesFun<E>
  /**
   * Mantiene per ogni coppia <caratteristica, categoria> il numero di volte che
   * questa coppia viene trovata
   *
   * @protected
   * @type {Map<string, categoryList>}
   * @memberof Classifier
   * fc
   */
  protected featureXcategory: Map<string, categoryList>
  /**
   * Per ogni categoria setta il numero di caratteristiche che appartengono
   * a quella categoria
   *
   * @protected
   * @type {Map<string, number>}
   * @memberof Classifier
   * cc
   */
  protected categoryCount: Map<string, number>
  /**
   * Registra una soglia minima per probabilità per quella categoria deve
   *
   * @protected
   * @type {Map<string, number>}
   * @memberof Classifier
   */
  protected thresholds: Map<string, number>
  /**
   * Determina se utilizzare o no un database
   *
   * @private
   * @type {boolean}
   * @memberof Classifier
   */
  private readonly useDb: boolean
  /**
   * Percorso al file con il database
   *
   * @private
   * @type {string}
   * @memberof Classifier
   */
  private readonly databasePath: string
  /**
   * Istanza del database sqlite
   *
   * @private
   * @type {BetterSqlite3.Database}
   * @memberof Classifier
   */
  private database: BetterSqlite3.Database

  /**
   * Registra le probabilità assunte per una determinata categoria.
   * L'idea principale sarebbe quella che sapendo che sto classificando documenti
   * che parlano di medicina, ad esempio, per la categoria "medicina" si assegna
   * una probabilità maggiore rispetto alle altre
   *
   * @private
   * @type {Map<string, number>}
   * @memberof Classifier
   */
  private assumedProbability: Map<string, number>

  constructor(options: ClassifierOptions<E> = {}) {
    this.getFeatures = options.features || getWords

    this.featureXcategory = new Map<string, categoryList>()
    this.categoryCount = new Map<string, number>()
    this.thresholds = new Map<string, number>()
    this.assumedProbability = new Map<string, number>()
    this.useDb = false

    if (
      options?.database?.dbPath &&
      existsSync(options.database.dbPath)
    ) {
      this.useDb = true
      this.databasePath = options.database.dbPath
      this.database = new BetterSqlite3(this.databasePath)
      // Creo, se non esistono già le tabelle per registrare gli addestramenti
      // del classificatores
      this.database.exec('CREATE TABLE IF NOT EXISTS features_x_category(feature, category, count)')
      this.database.exec('CREATE TABLE IF NOT EXISTS category_count(category, count)')

      this.preloadFeatXCat()
    }
  }

  /**
   * Assegna la funzione da eseguire per ricavare le caratteristiche da un
   * documento
   *
   * @memberof Classifier
   */
  set features(feature: FeaturesFun<E>) {
    this.getFeatures = feature
  }

  /**
   * Chiude la connessione con il database
   *
   * @memberof Classifier
   */
  close(): void {
    if (this.database) {
      this.database.close()
    }
  }

  /**
   * Aggiunge una soglia minima di probabilità che una determinata categoria deve
   * avere per poter essere considerata valida
   *
   * @param {string} category
   * @param {number} threshold
   * @memberof Classifier
   */
  setThreshold(category: string, threshold: number): void {
    this.thresholds.set(category, threshold)
  }

  /**
   * Ritorna la soglia minima per quella categoria
   *
   * @param {string} category
   * @returns {number}
   * @memberof Classifier
   */
  getThreshold(category: string): number {
    return this.thresholds.get(category) || 1
  }

  /**
   * Assegna la probabilità assunta per quella categoria
   *
   * @param {string} category categoria
   * @param {number} assumed probabilità assunta
   * @memberof Classifier
   */
  setAssumedProbability(category: string, assumed: number): void {
    this.assumedProbability.set(category, assumed)
  }

  /**
   * Ritorna la probabilità assunta per una determinata categoria.
   *
   * @param {string} category categoria
   * @returns {number} probabilità assunta per quella categoria, se non è stata
   * settata una probabilità assunta ritorna la probabilità base di 0.5
   * @memberof Classifier
   */
  getAssumedProbability(category: string): number {
    return this.assumedProbability.get(category) || 0.5
  }

  /**
   * Incrementa il conteggio della coppia <caratteristica, categoria>
   *
   * @param {string} feature caratteristica della coppia
   * @param {string} category categoria della coppia
   * @returns {Promise<boolean>}
   * @memberof Classifier
   * incf
   */
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
      return Promise.resolve(true)
    }
  }

  /**
   * Incrementa il conteggio dei documenti appartenenti a una categoria
   *
   * @param {string} category categoria da incrementarne il conteggio
   * @returns {Promise<boolean>}
   * @memberof Classifier
   * incc
   */
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

  /**
   * Ritorna il numero di volte che una caratteristica appartiene a una
   * determinata categoria
   *
   * @param {string} feature caratteristica di cui si vuole sapere il numero di
   * occorrenze
   * @param {string} category la categoria per cui quella caratteristica viene
   * descritta
   * @returns {Promise<number>} numero di volte che una caratteristica appartiene
   * a una determinata categoria
   * @memberof Classifier
   * fcount
   */
  timesFeatureInCategory(feature: string, category: string): Promise<number> {
    if (this.featureXcategory.has(feature)) {
      return Promise.resolve(this.featureXcategory.get(feature)[category] || 0)
    } else {
      return Promise.resolve(0)
    }
  }

  /**
   * Ritorna il numero di documenti in una categoria
   *
   * @param {string} category categoria di cui sapere il numero di documenti
   * @returns {Promise<number>}
   * @memberof Classifier
   * catcount
   */
  itemsInCategory(category: string): Promise<number> {
    if (!this.useDb) {
      return Promise.resolve(this.categoryCount.get(category) || 0)
    }

    return this.dbWrap(
      'SELECT count FROM category_count WHERE category = ?',
      (row: { count?: string }) => row?.count || 0,
      'get',
      [category]
    ) as Promise<number>
  }

  /**
   * Ritorna il numero totale di caratteristiche
   *
   * @returns {Promise<number>} il numero totale di caratteristiche
   * @memberof Classifier
   * totalcount
   */
  totItems(): Promise<number> {
    if (!this.useDb) {
      return Promise.resolve(Array.from(this.categoryCount.values()).reduce((a, b) => a + b))
    }

    return this.dbWrap(
      'SELECT SUM(count) as c FROM category_count',
      (row: { c?: string }) => row?.c || 0
    ) as Promise<number>
  }

  /**
   * L'elengo delle categorie
   *
   * @readonly
   * @type {Promise<string[]>}
   * @memberof Classifier
   */
  get categories(): Promise<string[]> {
    if (!this.useDb) {
      return Promise.resolve(Array.from(this.categoryCount.keys()))
    }

    return this.dbWrap(
      'SELECT category FROM category_count',
      (all: { category?: number }[]) => {
        return all.map((cat: { category?: number }) => cat?.category || 0)
      },
      'all'
    ) as Promise<string[]>
  }

  /**
   * Esegue l'addestramento del classificatore per un documento
   *
   * @param {E} item documento con cui allenare il classificatore
   * @param {string} category categoria da assegnare a quel documento
   * @returns {Promise<void>}
   * @memberof Classifier
   */
  async train(item: E, category: string): Promise<void> {
    const features = await this.getFeatures(item)

    await Promise.all(Array.from(features.keys()).map(key => this.increasePair(key, category)))
    await this.increaseCount(category)
  }

  /**
   * Ritorna la probabilità che una determinata caratteristica appartenga a una
   * particolare categoria.
   *
   * La probabilità viene calcolata dividendo il numero di volte che una
   * determinata caratteristica appartiene a un documento in quella categoria per
   * il numero totale di documenti in quella categoria:
   *
   *        Pr(feature | category)
   * @example
   * Pr(quick | good) = 0.6666
   *
   * @param {string} feature caratteristica
   * @param {string} category categoria
   * @returns {Promise<number>} la probabilità che la caratteristica appartenga
   * a una particolare categoria
   * @memberof Classifier
   * fprob
   */
  async featureProbability(feature: string, category: string): Promise<number> {
    const itemsForCategory = await this.itemsInCategory(category)
    if (itemsForCategory === 0) {
      return 0
    }

    return (await this.timesFeatureInCategory(feature, category)) / itemsForCategory
  }

  /**
   * Ritorna una probabilità pesata che una determinata caratteristica appartenga
   * a una particolare categoria.
   * Per pesata si intende che la probabilità viene determinata non esclusivamente
   * dal numero di occorrenze allenate, ma anche da un peso che quella
   * caratteristica può avere nella scelta
   *
   * @param {string} feature caratteristica
   * @param {string} category categoria
   * @param {(feature: string, category: string) => Promise<number>} calcProp funzione
   * che calcola la probabilità di base per la classificazione e la categoria
   * @param {number} [weight=1] peso da attribuire alla probabilità assunta
   * @returns {Promise<number>} la probabilità pesata che quella caratteristica
   * appartenga a quella categoria
   * @memberof Classifier
   */
  async weigthedProbability(
    feature: string,
    category: string,
    calcProp: (feature: string, category: string) => Promise<number>,
    weight = 1
  ): Promise<number> {
    // Calcola la probabilità corrente
    calcProp = calcProp.bind(this)
    const basicProb = calcProp(feature, category)

    // Calcola il numero totale di volte che la categoria appare in tutte le
    // categorie
    const allCategories = await this.categories
    const tmp = await Promise.all(
      allCategories.map(cat => this.timesFeatureInCategory(feature, cat))
    )
    const totals = tmp.reduce((a, b) => a + b)

    // Recupero la probabilità assunta
    const ap = this.getAssumedProbability(category)

    // Calcola la media pesata
    return ((weight * ap) + totals * (await basicProb)) / (weight + totals)
  }

  /**
   * Determina la probabilità di un documento di appartenere a quella categoria
   *
   * @param item documento da determinare la probabilità
   * @param {string} category categoria su cui determinare la probabilità
   * @returns {Promise<number>} Probabilità di un documento di appartenere a
   * quella categoria
   * @memberof Classifier
   */
  async probability(item: unknown, category: string): Promise<number> {
    return Promise.resolve(0.5)
  }

  /**
   * Determina la categoria più probabile che classifica il documento
   *
   * @param {E} item Documento da classificare
   * @param {string} [def=''] valore di default qualora non si riuscisse a trovare
   * una classificazione adeguata
   * @returns {Promise<string>} la categoria che più si appresta a classificare
   * il documento
   * @memberof Classifier
   */
  async classify(item: E, def = ''): Promise<string> {
    const probs = {}
    let max = 0
    let bestCategory = null
    const allCategories = await this.categories

    for (const category of allCategories) {
      probs[category] = await this.probability(item, category)
      if (probs[category] > max) {
        max = probs[category]
        bestCategory = category
      }
    }

    for (const category in probs) {
      if (category === bestCategory) { continue }
      if (probs[category] * this.getThreshold(bestCategory) > probs[bestCategory]) {
        return def
      }
    }
    return bestCategory
  }

  /**
   * Precarica in memoria la lista di caratteristiche associate alle categorie
   * per velocizzare il reperimento delle informazioni, senza dover fare la query
   * al database per ogni richiesta
   *
   * @private
   * @memberof Classifier
   */
  private preloadFeatXCat(): void {
    this.dbWrap(
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
    ).then().catch()
  }

  /**
   * Wrapper per eseguire query al database
   *
   * @private
   * @param {string} query query da eseguire
   * @param {((row: Row | Row[]) => string | number | string[] | number[])} funRow funzione di callback con i risultati della query
   * @param {('all' | 'get')} [type='get'] definisce se si vogliono tutte le righe del database oppure solo la prima
   * @param {((string | number)[])} [params=[]] lista di parametri da passare alla query
   * @returns {(Promise<string | number | string[] | number[]>)} ritorna il risultato della funzione di callback
   * eseguita sul risultato della query
   * @memberof Classifier
   */
  private dbWrap(
    query: string,
    funRow: (row: Row | Row[]) => string | number | string[] | number[],
    type: 'all' | 'get' = 'get',
    params: (string | number)[] = []
  ): Promise<string | number | string[] | number[]> {
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
