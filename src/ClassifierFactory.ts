import { ClassifierOptions } from "./Classifier"
import NaiveBayes from "./algorithms/NaiveBayes"
import Fisher from "./algorithms/Fisher"

export type ClassifierAlgorithms = 'NaiveBayes' | 'Fisher'

export default class ClassifierFactory {
  static create<E>(algorithm: ClassifierAlgorithms, options: ClassifierOptions<E>) {
    switch (algorithm) {
      case 'NaiveBayes':
        return new NaiveBayes<E>(options)
      case 'Fisher':
        return new Fisher<E>(options)
      default:
        return new NaiveBayes<E>(options)
    }
  }
}
