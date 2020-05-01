import { Observable } from 'rxjs'
import cluster from 'cluster'
import { resolve } from 'path'
import { cpus } from 'os'

import { ClassifierAlgorithms } from '../ClassifierFactory'

export type ClassifyOpt = {
  dbPath: string,
  algorithm: ClassifierAlgorithms,
  featureFun: string
}

export default function classify<E>(opt: ClassifyOpt): (identify: string, item: E) => Observable<[string, string]> {
  const flat = (arr: string[][]) => [].concat(...arr)
  const args: string[][] = []

  const numCpus = cpus().length
  let activeFork = 0

  args.push(['--dbpath', opt.dbPath])
  args.push(['--algorithm', opt.algorithm])
  args.push(['--feature', opt.featureFun])

  return (identify: string, item: E) => {
    return new Observable<[string, string]>(subscriber => {
      const interval = setInterval(() => {
        if (activeFork < numCpus) {
          cluster.setupMaster({
            exec: resolve(__dirname, '../worker/worker.js'),
            args: [...flat(args), '--data', JSON.stringify(item)],
            silent: false
          })
          const worker = cluster.fork()
          activeFork = activeFork + 1
          worker.on('message', (msg: string) => subscriber.next([identify, msg]))
          worker.on('error', subscriber.error)
          worker.on('exit', close => {
            activeFork = activeFork - 1
            if (close !== 0) {
              subscriber.error()
            }
            clearInterval(interval)
          })
        }
      }, 600)
    })
  }
}
