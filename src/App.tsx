import React from 'react';
import { WordRecallText, type WordItem } from './components/WordRecallText';
import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Demo from './pages/Demo';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/demo" element={<Demo/>}/>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
