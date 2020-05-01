import { of } from 'rxjs'
import { mergeMap } from 'rxjs/operators'
import assert from 'assert'
import { describe, sampleTrain } from './utility'
import Classifier from '../src/Classifier'
import classify from '../src/stream'

(async function () {
  const classy = new Classifier({
    database: {
      dbPath: __dirname + '/test.db'
    }
  })

  for (let i = 0; i < 20; i++) {
    await sampleTrain(classy)
  }
})()

// describe('Check stream good', async () => {
//   const classify$ = classify<string>({
//     dbPath: __dirname + '/test.db',
//     algorithm: 'Fisher',
//     featureFun: 'getWords'
//   })

//   classify$('id', 'quick rabbit').subscribe(data => {
//     assert.deepEqual(data, ['id', 'good'])
//   }).unsubscribe()
// })

// describe('Check stream bad', async () => {
//   const classify$ = classify<string>({
//     dbPath: __dirname + '/test.db',
//     algorithm: 'Fisher',
//     featureFun: 'getWords'
//   })

//   classify$('idrrrr', 'quick money').subscribe(data => {
//     assert.deepEqual(data, ['idrrrr', 'bad'])
//   }).unsubscribe()
// })


describe('Check stream from stream', async () => {
  console.log(__dirname + '/test.db')

  const classify$ = classify<string>({
    dbPath: __dirname + '/test.db',
    algorithm: 'Fisher',
    featureFun: 'getWords'
  })

  of(
    ['id', 'quick rabbit'],
    ['id2', 'quick money'],
    ['id3', 'rabbit rabbit'],
    ['id4', 'money money'],
    ['id5', 'money money'],
    ['id6', 'money money']
  ).pipe(
    mergeMap(([id, item]) => {
      console.log(id, item)
      return classify$(id, item)
    })
  ).subscribe(console.log)
})