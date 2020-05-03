import assert from 'assert'
import { describe, sampleTrain } from './utility'
import { unlinkSync, writeFileSync } from 'fs'
import Classifier from '../src/Classifier'
import NaiveBayes from '../src/algorithms/NaiveBayes'
import Fisher from '../src/algorithms/Fisher'
import { join } from 'path'

const dbPath = join(__dirname, './test.db')

const resetDb = (): void => {
  unlinkSync(dbPath)
  writeFileSync(dbPath, '')
}

describe('Check count of feature for category', async () => {
  const classy = new Classifier()

  await classy.train('the quick brown fox jumps over the lazy dog', 'good')
  await classy.train('make quick money in the online casino', 'bad')

  assert.equal(await classy.timesFeatureInCategory('quick', 'good'), 1)
  assert.equal(await classy.timesFeatureInCategory('quick', 'bad'), 1)
})

describe('Check probability function', async () => {
  const classy = new Classifier()
  await sampleTrain(classy)

  assert.equal(await classy.featureProbability('quick', 'good'), 0.6666666666666666)
})

describe('Check weight probability', async () => {
  const classy = new Classifier()
  await sampleTrain(classy)

  assert.equal(await classy.weigthedProbability('money', 'good', classy.featureProbability), 0.25)
  await sampleTrain(classy)
  assert.equal(await classy.weigthedProbability('money', 'good', classy.featureProbability), 0.16666666666666666)
})

describe('Naive Bayes probability', async () => {
  const cl = new NaiveBayes()
  await sampleTrain(cl)

  assert.equal(await cl.probability('quick rabbit', 'good'), 0.15624999999999997)
  assert.equal(await cl.probability('quick rabbit', 'bad'), 0.05)
})

describe('Classify Naive test', async () => {
  const cl = new NaiveBayes()
  await sampleTrain(cl)

  assert.equal(await cl.classify('quick rabbit', 'undefined'), 'good')
  assert.equal(await cl.classify('quick money', 'unknown'), 'bad')

  cl.setThreshold('bad', 3)
  assert.equal(await cl.classify('quick money', 'unknown'), 'unknown')

  for (let i = 0; i < 10; i++) {
    await sampleTrain(cl)
  }

  assert.equal(await cl.classify('quick money', 'unknown'), 'bad')
})

describe('Classify Fisher test', async () => {
  const cl = new Fisher()
  for (let i = 0; i < 10; i++) {
    await sampleTrain(cl)
  }

  assert.equal(await cl.classify('quick rabbit'), 'good')
  assert.equal(await cl.classify('quick money'), 'bad')

  cl.setMinimum('bad', 0.99)
  assert.equal(await cl.classify('quick money'), 'good')

  cl.setMinimum('good', 0.4)
  assert.equal(await cl.classify('quick money'), 'unknown')
})

describe('Fisher with db', async () => {
  resetDb()

  const cl = new Fisher({
    database: {
      dbPath: dbPath
    }
  })

  for (let i = 0; i < 10; i++) {
    await sampleTrain(cl)
  }

  assert.equal(await cl.classify('quick rabbit'), 'good')
  assert.equal(await cl.classify('quick money'), 'bad')

  cl.setMinimum('bad', 0.99)
  assert.equal(await cl.classify('quick money'), 'good')

  cl.setMinimum('good', 0.7)
  assert.equal(await cl.classify('quick money'), 'unknown')
})
