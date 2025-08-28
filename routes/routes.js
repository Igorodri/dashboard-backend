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


    const client = await db.connect();

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
    }finally {
        client.release() 
    }

})

//Principal
routes.get('/count', async (req, res) => {

    const client = await db.connect();

    try{
        const clientes = await client.query('SELECT COUNT(*) FROM clientes')
        const vendas = await client.query('SELECT COUNT(*) FROM vendas')
        const vendas_pagas = await client.query('SELECT COUNT(*) FROM vendas WHERE pagA = TRUE')
        const vendas_nao_pagas = await client.query('SELECT COUNT(*) FROM vendas WHERE paga = FALSE')
        const faturamento = await client.query('SELECT SUM(preco) AS total FROM vendas WHERE paga = TRUE');


        res.json({
            clientes: clientes.rows[0].count,
            vendas: vendas.rows[0].count,
            vendas_pagas: vendas_pagas.rows[0].count,
            vendas_nao_pagas: vendas_nao_pagas.rows[0].count,
            faturamento: faturamento.rows[0].total
        })
    }catch(error){
        console.error(error)
        return res.status(500).json({error: 'Erro interno no servidor, por favor tente novamente.'})
    }finally {
        client.release() 
    }
})

//Clientes
routes.get('/select_cliente', async (req,res) => {
    const client = await db.connect();
    try{
        const clientes = await client.query('SELECT nome_cliente, telefone FROM clientes')

        res.json({
            clientes: clientes.rows
        })
    }catch(error){
        console.error(error)
        return res.status(500),json({error: 'Erro interno no servidor, por favor tente novamente.'})
    }finally {
        client.release() 
    }
})

// routes.post('/add_cliente', async(req,res) => {
//     const {nome_cliente, telefone_cliente} = req.body

//     if(!nome_cliente || !telefone_cliente){
//         return res.status(400).json({error: 'Campos obrigatórios não preenchidos'})
//     }

//     const client = await db.connect();

//     try{
//         await client.execute('INSERT INTO clientes (nome_cliente,telefone) VALUES ($1, $2)',
//         [nome_cliente, telefone_cliente])

//         return res.status(200).json({mensagem: 'Cliente registrado com sucesso!'})
//     }catch(error){
//         console.error(error)
//         return res.status(500),json({error: 'Erro interno no servidor, por favor tente novamente.'})
//     }finally {
//         client.release() 
//     }
// })

//Vendas
routes.get('/select_vendas', async (req, res) => {
  const client = await db.connect();
  try {
    const resultado = await client.query(`
      SELECT 
        vendas.id_cliente,
        vendas.preco,
        vendas.descricao,
        clientes.nome_cliente
      FROM 
        vendas
      INNER JOIN 
        clientes ON vendas.id_cliente = clientes.id_cliente
    `);

    res.json({ vendas: resultado.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor, por favor tente novamente.' });
  } finally {
    client.release();
  }
});

module.exports = routes