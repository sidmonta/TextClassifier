import ClassifierFactory, { ClassifierAlgorithms } from '../ClassifierFactory'
import * as featuresF from '../Features'

// Tolgo dalla lista degli argomenti il nome del file e l'esecutore
const args = process.argv.slice(2)

/**  Vedi: {@type: ClassifyOpt } */
// Gli argomenti pari sono i nomi, i dispari i valori
const dbPath = args[1]
const algorithm: ClassifierAlgorithms = args[3] as ClassifierAlgorithms
const featureFun = args[5]
const data = JSON.parse(args[7])

// Istanzio il classificatore con le informazioni passate come argomento
const classifier = ClassifierFactory.create(algorithm, {
  database: {
    dbPath
  }
})

/**
 * Serve per poter usare async/await
 *
 * @param {unknown} data Documento da classificare
 * @returns {Promise<void>} Nulla
 */
async function classify(data: unknown): Promise<void> {
  // Se la funzione per estrarre le caratteristiche non è definita, la cerco in
  // un file definito in featureFun
  if (featuresF[featureFun]) {
    classifier.features = featuresF[featureFun]
  } else {
    classifier.features = (await import(featureFun)).default()
  }
  // Lancio la classificazione
  const result = await classifier.classify(data)
  classifier.close() // Chiudo il database

  process.send(result) // Comunico al processo padre il risultato
  process.exit()
}

// Lancio la classificazione
classify(data)
