require('dotenv').config();  

const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios'); 

const app = express();
const port = process.env.PORT || 8080; 


app.use(express.json());