import NaiveBayes from '../algoritms/NaiveBayes'
import { featureWthMetadata } from '../Features'

const args = process.argv.slice(2)

const dbPath = args[1]
const data = JSON.parse(args[3])


const classifier = new NaiveBayes({
  features: featureWthMetadata,
  database: {
    dbPath
  }
})

async function classify(data) {
  let { metadata, description, name, id, dewey } = data
  metadata = metadata.split('\n')
  metadata.push(name)
  const result = await classifier.classify({ metadata, content: description })
  process.send({ id, result, dewey })
  process.exit()
}

classify(data)