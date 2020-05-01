import cluster from 'cluster'
import { cpus } from 'os'

export function run() {
  const numCpus = cpus().length
  let activeFork = 0
  let resultNumber = 0
  let correctNumber = 0

  cluster.setupMaster({
    exec: 'worker.js',
    args: [
      '--path', '../../tests/prova.db',
      '--data', JSON.stringify({
        "metadata": "mario\nmerula\npippo",
        "description": "klòasdjfòsadkfjòal",
        "name": "fdafda",
        "id": "212111",
        "dewey": "123"
      })
    ],
    silent: false
  })
  console.log('fork master')

  const worker1 = cluster.fork()
  worker1.on('message', console.log)
  worker1.on('exit', console.error)
}
