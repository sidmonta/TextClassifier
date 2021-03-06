import cluster from 'cluster'
import { resolve } from 'path'
import { cpus } from 'os'

import { ClassifierAlgorithms } from '../ClassifierFactory'

/**
 * Descrive le opzioni da passare alla funzione per la classificazione
 * @typedef ClassifyOpt
 * @property {string} dbPath percorso al database con l'addestramento del classificatore
 * @property {ClassifierAlgorithms} algorithm algoritmo di classificazione da utilizzare
 * @property {string} featureFun nome della funzione da applicare oppure il
 * percorso al file dove tale funzione è definita (come default)
 */
export type ClassifyOpt = {
  dbPath: string
  algorithm: ClassifierAlgorithms
  featureFun: string
}

const numCpus = cpus().length // Numero di CPU disponibili
const workerFile = resolve(__dirname, './worker.js') // Percorso al file di esecuzione del worker
const controlWaitFork = 800 // Tempo di attesa tra un controllo e l'altro per un nuovo fork

/**
 * Esegue la classificazione di un documento.
 * [La funzione viene "curryficata"]
 *
 * @export
 * @template E Tipologia del documento da classificare
 * @param {ClassifyOpt} opt opzioni per l'esecuzione della classificazione
 * @returns {(identify: string, item: E) => Promise<[string, string]>} ritorna uno stream osservabile che dato un
 * documento ritorna il risultato della classificazione
 */
export default function classify<E>(opt: ClassifyOpt): (identify: string, item: E) => Promise<[string, string]> {
  const args: string[] = [] // argomenti da passare al processo fork

  let activeFork = 0 // numero di fork attualmente attivi

  args.push('--dbpath', opt.dbPath)
  args.push('--algorithm', opt.algorithm)
  args.push('--feature', opt.featureFun)

  // Qui avviene la "curryfazione"
  return (identify: string, item: E): Promise<[string, string]> => {
    return new Promise<[string, string]>((resolve, reject) => {
      // Creo un intervallo che aspetta finché una CPU non si sia liberata,
      // prima di lanciare un nuovo fork
      const interval = setInterval(() => {
        if (activeFork < numCpus) { // Controllo se ci sono CPU libere
          // Imposto le impostazioni del processo figlio, con il passaggio degli
          // argomenti
          cluster.setupMaster({
            exec: workerFile,
            args: [...args, '--data', JSON.stringify(item)],
            silent: false
          })
          // Lancio il fork
          const worker = cluster.fork()
          activeFork = activeFork + 1
          // Se dal fork ricevo il messaggio con il risultato lo invio ai
          // subscriber dell'Promise
          worker.on('message', (msg: string) => resolve([identify, msg]))
          worker.on('error', reject)
          // Quando il processo ha finito l'esecuzione
          worker.on('exit', close => {
            activeFork = activeFork - 1
            if (close !== 0) {
              reject(Error('Error number ' + close))
            }
            // Ormai il processo è concluso, posso interrompere l'intervallo
            clearInterval(interval)
          })
        }
      }, controlWaitFork)
    })
  }
}
