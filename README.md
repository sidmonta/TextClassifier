TextClassifier
============

Implementa un classificatore di testo che verrà usato nel progetto **Biblioteca di Babele** per assegnare il giusto codice Dewey (o un’altro tipo di classificazione biblioteconomica).

Un classificatore di testo è uno strumento che assegna ad un documento testuale una categoria presa da un insieme predefinito.

> Le categorie sono soltanto etichette simboliche testuali

Il classificatore utilizza l’apprendimento automatico (Machine Learning) con l’obbiettivo di trovare delle regole per discriminare i documenti passati in base alle classi di appartenenza.

L’apprendimento avviene addestrando precedentemente il classificatore con documenti per cui si conosce già la categoria a cui appartengono; da questo addestramento il classificatore troverà dei pattern o delle regole comuni per discriminare i nuovi documenti.

Formalmente, definiamo:

$${D} = \{{{d}_{1},{d}_{2}, … ,{d}_{|D|}}\}$$ Un insieme di documenti iniziali;

$${C} = \{{{c}_{1},{c}_{2}, … ,{c}_{|C|}}\}$$ Un insieme di categorie predefinite

e definiamo, una funzione:
\\[
    \theta: {D} \times {C}  \to \{ {True}, {False} \}
\\]
che prende un documento \\({d} \in {D}\\) e una categoria \\({c} \in {C}\\) e determina se deve o no appartenere a quella categoria. Questa è la funzione ottima, cioè la funzione ritorna il risultato corretto. Ovviamente una funzione che dia un risultato esatto e sempre corretto non è pensabile considerando la verità di documenti ci si potrebbero incontrare.

L’obbiettivo del classificatore è creare una funzione
\\[
    \theta’: {D} \times {C}  \to \{ {True}, {False} \}
\\]
che approssima il più possibile la funzione \\(\theta\\) in modo da dare il risultato migliore.

Per poter analizzare efficacemente un documento trovando dei pattern comuni, il classificatore esegue una suddivisione del documento in caratteristiche che utilizzerà per classificare. Un esempio di suddivisione è per parole, cioè ogni parola del documento diviene una caratteristica del documento stesso, dal quale si possono togliere i duplicati e o le parole comuni che non identificano o caratterizzano il documento.

    "the quick rabbit jumps fances and jumps a shrubbery"
    ==remove stopwords=> "quick rabbit jumps fances jumps shrubbery"
    ==extract feature=> {"quick", "rabbit", "jumps", "fances", "shrubbery"}

Si possono usare altre tipologie di estrazione delle caratteristiche che più si prestano a caratterizzare la tipologia di documenti su cui il classificatore lavorerà.

## Algoritmi
Per la realizzazione di un classificatore si possono adoperare diverse tipologie di algoritmi che agiscono sul metodo di calcolo della probabilità che una determinata caratteristica di un documento appartenga a una caratteristica.
Esistono molti algoritmi di classificazione, quelli implementati in questo progetto sono:

#### **Naïve Bayes**
È basata sul calcolo della probabilità del numero di occorrenze di una caratteristica in un documento. L’aspetto principale dell’algoritmo è l’uso del teorema di Bayes che viene usato per calcolare la probabilità che una caratteristica appartenga o meno a una categoria, conoscendo la frequenza con cui quella caratteristica si presenta nei documenti (precedentemente allenati) e la percentuale di volte che quella caratteristica sia classificata con quella categoria.

Formalmente, sia \\({x} \in {X}\\) una caratteristica di un documento, con \\({X}\\) l’insieme delle caratteristiche e sia \\({y} \in {C}\\), allora il classificatore calcola:

${p}({y}|{x})$ cioè la probabilità condizionata di ${y}$ conoscendo ${x}$ è data dalla formula:
\\[
{p}({y}|{x}) = \frac{{p}({x}|{y})}{{p}({x})} = \frac{{p}({x}|{y}){p}({y})}{\sum_{y’=1}^{C} {p}({x}|{y’}){p}({y’})}
\\]
( ${p}({x})$ è la probabilità a priori)

#### **Fisher**
Il Metodo Fisher calcola la probabilità di una categoria per ogni caratteristica del documento, quindi combina queste probabilità di funzionalità e confronta quella probabilità combinata con la probabilità di un insieme casuale di caratteristiche.

//TODO: da aggiornare

## Estrattori di caratteristiche
Per poter ricavare delle regole o dei pattern da utilizzare per la classificazione di documenti, il classificatore necessita di un meccanismo per l’estrazione di caratteristiche che rappresentano il documento.
Il progetto prevede che questi meccanismi siano realizzati sotto forma di funzioni che prendono come argomento un documento e ritornino una mappa contenente la lista univoca di caratteristiche associate a un valore che ne assegna il peso che quella caratteristica possiede.

Una qualunque funzione dovrà assomigliare a questa firma

```typescript
declare featureFunctionExtractor(document: E): Map<string, number>
```

Dove ```E``` è la generica tipologia di un documento; mentre ```‌Map<string, number>``` sta a indicare ce la mappa delle caratteristiche sarà della forma

```
caratteristica: string
pesoCaratteristica: number
```

In questo momento si mette a disposizione le seguenti funzioni di estrazione delle caratteristiche:

* **getWords**:

```ts
declare getWords<E>(doc: E | string): Map<string, number>
```

Che prende un documento testuale, cioè formato da solo testo, lo spezza in singole parole, toglie le parole che non servono a caratterizzare un documento (come gli articoli, le preposizioni, ecc.) e genera, ritornandola, la lista in cui ogni parola diviene una caratteristica il cui peso è uguale per tutte.

Un esempio è il seguente:

```js
const features = getWords<string>("the quick rabbit jumps fances and jumps a shrubbery")

console.log(features)

// Result
// Map(5) { "quick" => 1, "rabbit" => 1, "jumps" => 1, "fances" => 1, "shrubbery" => 1 }
```

* **featureWthMetadata**

```ts
declare featureWthMetadata<E extends { metadata: { [a: string]: string }, content: string }>({ metadata, content }: E): Map<string, number>
```

Questa funzione prende un documento che deve avere obbligatoriamente almeno la proprietà ```metadata```, che contiene i metadati del documento nel formato ```{"metadato": "valore", …}``` e la proprietà ```content``` che contiene il contenuto testuale del documento. Dal documento così passato le caratteristiche che lo compongono saranno i valori dei metadati del documento a cui si uniscono le caratteristiche estratte dal contenuto procedendo come nel metodo **getWords**

Un esempio è il seguente:

```js
const document: Document = {
    metadata: {
        author: "William Shakespeare",
        date: "23/03/1616",
        title: "The Tragedy of Macbeth"
    },
    content: "the quick rabbit jumps fances and jumps a shrubbery",
    updateDate: "11/04/2019",
    link: "https://it.wikipedia.org/wiki/Macbeth"
}

const features = featureWthMetadata<Document>(document)

console.log(features)

// Result
// Map(5) { "william shakespeare" => 1, "23/03/1616" => 1, "the tragedy of macbeth" => 1, "quick" => 1, "rabbit" => 1, "jumps" => 1, "fances" => 1, "shrubbery" => 1 }
```


## Utilizzo del Classificatore
#### Creazione
Per poter utilizzare il classificatore bisogna creare una nuova istanza del classificatore scegliendo l’algoritmo che utilizzerà per fare la classificazione, per fare ciò si possano seguire due strade:

1. Creare direttamente l’istanza

```typescript
import NaiveBayes from '../src/algorithms/NaiveBayes'
import Fisher from '../src/algorithms/Fisher'

const classifier = new NaiveBayes<Document>(opt)

// oppure

const classifier = new Fisher<Document>(opt)
```

2. Creare tramite Factory

```typescript
import ClassifierFactory from '../src/ClassifierFactory'

const algoritm = 'NaiveBayes' // or 'Fisher'

const classifier = ClassifierFactory.create<Document>(algoritm, opt)
```

Per entrambi i metodi ogni classificatore prende opzionalmente come opzioni:

```js
{
  features?: "Funzione per l'estrazione delle caratteristiche"
  database?: {
    dbPath: "percorso al database"
  }
}

// ? sta a indicare l'opzionalità dell'opzione
```


> Nota: Il classificatore utilizza un database SQLite

#### Addestramento
Per poter funzionare il classificatore ha bisogno di un addestramento.
> Qualora si stesse usando un database, ogni addestramento viene conservato e utilizzato per ogni nuova istanza o esecuzione.

Per addestrare il classificatore basta eseguire il codice:

```js
    // …
    await classifier.train(doc, tag)

    // Ad esempio

    await cl.train('the quick rabbit jumps fances', 'good')
    await cl.train('buy pharmaceuticals now', 'bad')
    await cl.train('make quick money at the online casino', 'bad')
```

che permette di assegnare a quel documento il tag.
La funzione ritorna una ```Promise``` vuota

#### Classificazione
Una volta addestrato il proprio classificatore lo si può usare per ipotizzare il tag più probabile per un nuovo documento

```javascript
const tag = classifier.classify(newdoc)

// Esempio
const tag = classifier.classify('the quick brown fox jumps')
console.log(tag) // good

const tag = classifier.classify('get money with trading online')
console.log(tag) // bad
```


#### Un esempio completo

```js
import ClassifierFactory from '../src/ClassifierFactory'

(async function main() {
    // Create
    const classifier = ClassifierFactory.create<Document>('Fisher')
    // Train
    await cl.train('the quick rabbit jumps fances', 'good')
    await cl.train('buy pharmaceuticals now', 'bad')
    await cl.train('make quick money at the online casino', 'bad')

    // Classify
    const tag = classifier.classify('get money with trading online')

    console.log(tag) // Print: bad
})()
```

## Versione funzionale
Per questa versione si da per scontato che il classificatore utilizzi un database e che sia già stato addestrato.

Il repository mette a disposizione una funzione che classifica i documenti evitando l'utilizzo di classi e istanze. Per utilizzarla basta importare la funzione.

Questa funzione è "currificata". Questo comporta la possibilità di passare gli argomenti uno alla volta. Per precisazioni, si veda [qui](https://stackoverflow.com/questions/36314/what-is-currying)

```js
import classify from './src/fp'
// ...
const classifyFisher = classify({
  algorithm: 'Fisher'
  dbPath: 'path/to/db'
})
// ...
const doc = 'get money with trading online'
// ...
const classResult = await classifyFisher(doc)
console.log(classResult) // 'bad'
```


## Utilizzo con i Node Cluster Workers
**Per usare questa funzionalità occorre NodeJs >10**

Il classificatore, se allenato con molti documenti (necessario per avere classificazioni il più attendibili possibili) potrebbe richiedere tempo e risorse macchina onerose; per risolvere questo inconveniente si è messo a disposizione una versione del classificatore che fa uso di processi figli per poter eseguire in parallelo più classificazioni senza impattare sulle risorse del singolo thread in cui il programma gira.

Questa versione funziona nella falsa riga della versione funzionale. Occorre però fare una precisazione: siccome non è possibile garantire che più classificazioni in parallelo concludano in ordine, occorre passare un identificativo insieme al documento da classificare, così da avere nella risposta un riscontro di quale documento, la risposta del classificatore, si riferisce. Cioè invece che ritornare il risultato della classificazione, ma ritorna una coppia ```[identificativo del documento, risultato della classificazione]```.

Per usare questa versione si può procedere come segue:

```js
import classify from './src/worker'
// ...
const classifyFisher = classify({
  algorithm: 'Fisher'
  dbPath: 'path/to/db'
})
// ...
// Create a list of documents
const documents = [
    { id: 1, doc: doc1 },
    { id: 2, doc: doc2 },
    { id: 3, doc: doc3 },
    { id: 4, doc: doc4 },
]
// ...
// For every documents run the classification and return the promise
const runClassify = documents.map(([id, doc]) => {
    return classify(id, doc)
})
// Wait that all classification ends
const results = await Promise.all(runClassify)
console.log(results)
/* example of results
[
    [2, 'bad'],
    [3, 'good'],
    [1, 'good'],
    [4, 'bad']
]
*/
```

Dove ```doc*``` identifica un qualsiasi documento da classificare.

## Classificatore con RxJs e i Node Cluster Workers
Un’ulteriore modalità di classificazione messa a disposizione combina l’utilizzo dei Node Cluster Workers e gli stream di dati gestiti con la libreria RxJs.

Questa versione permette di utilizzare il classificatore come operatore di RxJs nel restante progetto **Biblioteca di Babele** che fa molto uso degli stream e RxJs.

Questa versione non fa altro che trasformare le promise della versione con i Node Cluster Workers in uno stream di dati. Cioè permette, dato uno stream di documenti (con il loro identificativo) di trasformare ogni evento dello stream nella versione classificata.

<center>
<img src="data:image/jpeg;base64,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" style="max-width:100%;" />
</center>

L’utilizzo è semplice, definito lo stream dei documenti, si definisce lo stream di classificazione, impostando l’algoritmo e le altre impostazioni (si ricorda che per funzionare il classificatore deve usare il database per registrare gli addestramenti e deve essere precedentemente addestrato); infine lo si mette in pipe i due stream e ci si può registrare per recuperare il risultato della classificazione per ogni documento dello stream.

Esempio:

```ts
import classify from '../src/stream' // classifier stream

import { of } from 'rxjs'
import { mergeMap } from 'rxjs/operators'

// Define the document stream
const document$ = of(
    ['id', doc1],
    ['id2', doc2],
    ['id3', doc3],
    ['id4', doc4],
    ['id5', doc5]
)
    
// import classifier stream
const classify$ = classify<Document>({
    dbPath: 'path/to/db',
    algorithm: 'Fisher'
})

// new piped stream
const piped$ = document$.pipe(
    mergeMap(([id, item]) => {
      return classify$(id, item)
    })
)

// now you can subscribe on that stream
piped$.subscribe(resultOfClassifier => {
    const [id, result] = resultOfClassifier
    console.log(id, result)
})
/* print
$> id2, 'bad'
$> id5, 'bad'
$> id1, 'good'
$> id4, 'bad'
$> id3, 'good'
*/
```

> ```$``` sta a indicare che quella variabile contiene uno stream di dati

Si è messo anche a disposizione di un operatore che aggrega e snellisce la precedente procedura di pipe.

```ts
import { mergeClassify } from '../src/stream' // classifier stream

// …
const piped$ = document$.pipe(mergeClassify<Document>({
    dbPath: 'path/to/db',
    algorithm: 'Fisher'
}))
// …
```


Grazie 🙏
