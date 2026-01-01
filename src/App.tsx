import React from 'react';
import { WordRecallText, type WordItem } from './components/WordRecallText';
import './App.css';

const sampleWords: WordItem[] = [
  { word: 'El', translation: 'The', pronounciation: 'el' },
  { word: 'gato', translation: 'cat', pronounciation: 'gah-toh' },
  { word: 'negro', translation: 'black', pronounciation: 'neh-groh' },
  { word: 'está', translation: 'is', pronounciation: 'es-tah' },
  { word: 'durmiendo', translation: 'sleeping', pronounciation: 'door-mee-en-doh' },
  { word: 'en', translation: 'on', pronounciation: 'en' },
  { word: 'el', translation: 'the', pronounciation: 'el' },
  { word: 'sofá', translation: 'sofa', pronounciation: 'soh-fah' },
  { word: 'mientras', translation: 'while', pronounciation: 'mee-en-tras' },
  { word: 'la', translation: 'the', pronounciation: 'lah' },
  { word: 'lluvia', translation: 'rain', pronounciation: 'yoo-vee-ah' },
  { word: 'cae', translation: 'falls', pronounciation: 'kah-eh' },
  { word: 'afuera', translation: 'outside', pronounciation: 'ah-fweh-rah' },
  { word: 'de', translation: 'of', pronounciation: 'deh' },
  { word: 'la', translation: 'the', pronounciation: 'lah' },
  { word: 'ventana', translation: 'window', pronounciation: 'ven-tah-nah' },
  { word: 'con', translation: 'with', pronounciation: 'kon' },
  { word: 'mucha', translation: 'much', pronounciation: 'moo-chah' },
  { word: 'fuerza', translation: 'force', pronounciation: 'fwer-sah' },
  { word: 'hoy', translation: 'today', pronounciation: 'oy' },
  { word: 'El', translation: 'The', pronounciation: 'el' },
  { word: 'gato', translation: 'cat', pronounciation: 'gah-toh' },
  { word: 'negro', translation: 'black', pronounciation: 'neh-groh' },
  { word: 'está', translation: 'is', pronounciation: 'es-tah' },
  { word: 'durmiendo', translation: 'sleeping', pronounciation: 'door-mee-en-doh' },
  { word: 'en', translation: 'on', pronounciation: 'en' },
  { word: 'el', translation: 'the', pronounciation: 'el' },
  { word: 'sofá', translation: 'sofa', pronounciation: 'soh-fah' },
  { word: 'mientras', translation: 'while', pronounciation: 'mee-en-tras' },
  { word: 'la', translation: 'the', pronounciation: 'lah' },
  { word: 'lluvia', translation: 'rain', pronounciation: 'yoo-vee-ah' },
  { word: 'cae', translation: 'falls', pronounciation: 'kah-eh' },
  { word: 'afuera', translation: 'outside', pronounciation: 'ah-fweh-rah' },
  { word: 'de', translation: 'of', pronounciation: 'deh' },
  { word: 'la', translation: 'the', pronounciation: 'lah' },
  { word: 'ventana', translation: 'window', pronounciation: 'ven-tah-nah' },
  { word: 'con', translation: 'with', pronounciation: 'kon' },
  { word: 'mucha', translation: 'much', pronounciation: 'moo-chah' },
  { word: 'fuerza', translation: 'force', pronounciation: 'fwer-sah' },
  { word: 'hoy', translation: 'today', pronounciation: 'oy' },
];

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>WordRecallText</h1>
      </header>
      <main className="app-main">
        <WordRecallText items={sampleWords} />
      </main>
    </div>
  );
}

export default App;
