import Classifier, { ClassifierOptions } from "./Classifier"
import NaiveBayes from "./algoritms/NaiveBayes"
import Fisher from "./algoritms/Fisher"

export type ClassifierAlgorithms = 'NaiveBayes' | 'Fisher'

export default class ClassifierFactory {
  static create(algorithm: ClassifierAlgorithms, options: ClassifierOptions) {
    switch (algorithm) {
      case 'NaiveBayes':
        return new NaiveBayes(options)
      case 'Fisher':
        return new Fisher(options)
      default:
        return new NaiveBayes(options)
    }
  }
}
