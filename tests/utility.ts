export function describe(title: string, fun: () => void) {
  console.log('\x1b[36m' + title + '\x1b[0m')
  try {
    fun()
    console.log('\x1b[32mEvery is fine\x1b[0m')
  } catch (err) {
    console.log('\x1b[31m' + err.message + '\x1b[0m')
    console.error(err)
  } finally {
    console.log('\x1b[36m' + title + ' -- End --\x1b[0m')
  }
}

export async function sampleTrain(cl): Promise<void> {
  try {
    await cl.train('Nobody owns the water.', 'good')
    await cl.train('the quick rabbit jumps fances', 'good')
    await cl.train('buy pharmaceuticals now', 'bad')
    await cl.train('make quick money at the online casino', 'bad')
    await cl.train('the quick brown fox jumps', 'good')
  } catch (err) {
    console.log('\x1b[31m' + err.message + '\x1b[0m')
    console.error(err)
  }
}