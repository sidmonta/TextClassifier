import NaiveBayes from '../src/algorithms/NaiveBayes'
import { featureWthMetadata } from '../src/Features'
import BetterSqlite3 from 'better-sqlite3'
import { resolve } from 'path'
const db = new BetterSqlite3('../../Training/database.db')

// Constant
const dataForTrain = 10640

const classifier = new NaiveBayes({
  features: featureWthMetadata,
  database: {
    dbPath: resolve(__dirname, '../../Training/database.db')
  }
})

async function train(): Promise<void> {
  const all = db.prepare(`
    SELECT td.metadata , td.description, dewey.name , dewey.id
    FROM
      TrainingData td
      INNER JOIN data_x_dewey x ON (td.id = x.data_id )
      INNER JOIN dewey  ON (x.dewey_id = dewey.id )
    ORDER BY td.id`).all()

  console.log(`Training on ${all.length} data`)

  for (const row of all) {
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