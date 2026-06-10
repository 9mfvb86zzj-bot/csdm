import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyDM0iArC8_wt1eLQDIveicRnqclVmhOSPQ",
  authDomain: "csdm-d73a7.firebaseapp.com",
  databaseURL: "https://csdm-d73a7-default-rtdb.firebaseio.com",
  projectId: "csdm-d73a7",
  storageBucket: "csdm-d73a7.firebasestorage.app",
  messagingSenderId: "769952051096",
  appId: "1:769952051096:web:73d39eb4f64330a975c5ed"
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
