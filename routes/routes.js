const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('../database.js')
require("dotenv").config()

const routes = express()

// Gerar Token
function generateToken(userId) {
  return jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: '1h' });
}

//Rota de Login
routes.post('/login', async (req,res) =>{
    const {username, password} = req.body;

    if(!username || !password){
        return res.status(400).json({error: 'Os dados não foram fornecidos.'})
    }


    const client = await db();

    try{
        const {rows} = await client.query(
            'SELECT * FROM users WHERE username = $1 AND password_user = $2', 
            [username, password]
        )

        if(rows.length == 0){
            return res.status(404).json({mensagem: 'Credenciais fornecidas não encontradas.'})
        }

        const token = generateToken(rows[0].id)
        return res.status(200).json({mensagem: 'Login realizado com sucesso', token})
    }catch(error){
        console.error(error)
        return res.status(500).json({error: 'Erro interno no servidor, por favor tente novamente.'})
    }
})


//Rotas de count

routes.get('/count', async (req, res) => {

    const client = await db()

    try{
        const clientes = await client.query('SELECT COUNT(*) FROM clientes')

        res.json({
            clientes: clientes.rows[0].count
        })
    }catch(error){
        console.error(error)
        return res.status(500).json({error: 'Erro interno no servidor, por favor tente novamente.'})
    }
})

module.exports = routes