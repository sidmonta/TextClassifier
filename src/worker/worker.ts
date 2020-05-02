import ClassifierFactory, { ClassifierAlgorithms } from '../ClassifierFactory'
import * as featuresF from '../Features'

// Reset name file in process argument
const args = process.argv.slice(2)

const dbPath = args[1]
const algorithm: ClassifierAlgorithms = args[3] as ClassifierAlgorithms
const featureFun = args[5]
const data = JSON.parse(args[7])

const classifier = ClassifierFactory.create(algorithm, {
  database: {
    dbPath
  }
})

async function classify(data) {
  if (featuresF[featureFun]) {
    classifier.features = featuresF[featureFun]
  } else {
    classifier.features = (await import(featureFun)).default()
  }


  const result = await classifier.classify(data)
  process.send(result)
  process.exit()
}

classify(data)