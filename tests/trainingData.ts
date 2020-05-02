import NaiveBayes from '../src/algorithms/NaiveBayes'
import { featureWthMetadata } from '../src/Features'
import BetterSqlite3 from 'better-sqlite3'

const db = new BetterSqlite3('../../Training/database.db')

// Constant
const dataForTrain = 10640
const dataForTest = 1181

console.log(__dirname + '/prova.db')

const classifier = new NaiveBayes({
  features: featureWthMetadata,
  database: {
    dbPath: __dirname + '/prova.db'
  }
})

async function train() {
  const all = db.prepare(`
    SELECT td.metadata , td.description, dewey.name , dewey.id
    FROM
      TrainingData td
      INNER JOIN data_x_dewey x ON (td.id = x.data_id )
      INNER JOIN dewey  ON (x.dewey_id = dewey.id )
    ORDER BY td.id
    LIMIT ?`).all(dataForTrain)

  console.log(`Training on ${all.length} data`)

  for (let row of all) {
    let { metadata, description, name, id } = row
    metadata = metadata.split('\n')
    metadata.push(name)

    description = description || ''

    await classifier.train({ metadata, content: description }, id)
    console.log('train on ' + id)
  }

  console.log('Finish training')
}

train()