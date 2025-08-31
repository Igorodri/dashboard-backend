const express = require('express')
const jwt = require('jsonwebtoken')
const db = require('../database.js')
const { parse } = require('dotenv')
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
        const faturamento = await client.query('SELECT COALESCE(SUM(preco::numeric), 0) AS total FROM vendas WHERE paga = TRUE;');

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
        const clientes = await client.query('SELECT id_cliente,nome_cliente,telefone FROM clientes')

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

routes.post('/add_cliente', async(req,res) => {
    const {nome_cliente, telefone_cliente} = req.body

    if(!nome_cliente || !telefone_cliente){
        return res.status(400).json({error: 'Campos obrigatórios não preenchidos'})
    }

    const client = await db.connect();

    try{
        await client.query('INSERT INTO clientes (nome_cliente,telefone,inserted_at) VALUES ($1, $2,NOW())',
        [nome_cliente, telefone_cliente])

        return res.status(200).json({mensagem: 'Cliente registrado com sucesso!'})
    }catch(error){
        console.error(error)
        return res.status(500).json({error: 'Erro interno no servidor, por favor tente novamente.'})
    }finally {
        client.release() 
    }
})

routes.delete('/delete_cliente/:id_cliente', async (req,res) => {
    const { id_cliente } = req.params;

    if(!id_cliente){
        return res.status(400).json({error: 'Id de cliente não encontrado'});
    }

    const client = await db.connect();

    try {
        await client.query('DELETE FROM clientes WHERE id_cliente = $1', [id_cliente]);
        return res.status(200).json({mensagem:'Cliente deletado com sucesso!'});
    } catch(error) {
        console.error(error);
        return res.status(500).json({error: 'Erro interno no servidor, por favor tente novamente.'});
    } finally {
        client.release();
    }
});

routes.put('/edit_cliente/:id_cliente', async (req,res) => {
    const {id_cliente} = req.params;
    const {nome_cliente, telefone_cliente} = req.body;

    if(!id_cliente, !nome_cliente, !telefone_cliente){
        return res.status(400).json({error: 'Id de cliente não encontrado'});
    }

    console.log(id_cliente, nome_cliente, telefone_cliente)

    const client = await db.connect();

    try {
        await client.query('UPDATE clientes SET nome_cliente = $1, telefone = $2 WHERE id_cliente = $3', [nome_cliente, telefone_cliente, id_cliente]);
        return res.status(200).json({mensagem:'Cliente editado com sucesso!'});
    } catch(error) {
        console.error(error);
        return res.status(500).json({error: 'Erro interno no servidor, por favor tente novamente.'});
    } finally {
        client.release();
    }
})


//Vendas
routes.get('/select_vendas', async (req, res) => {
  const client = await db.connect();
  try {
    const resultado = await client.query(`
        SELECT 
            vendas.id_venda,
            vendas.id_cliente,
            vendas.preco,
            vendas.descricao,
            CASE 
                WHEN vendas.paga = TRUE THEN 'Sim'
                ELSE 'Não'
            END AS paga,
            clientes.nome_cliente
        FROM 
            vendas
        INNER JOIN 
            clientes ON vendas.id_cliente = clientes.id_cliente
        ORDER BY vendas.preco DESC;
    `);

    res.json({ vendas: resultado.rows });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor, por favor tente novamente.' });
  } finally {
    client.release();
  }
});

routes.post('/add_venda', async(req,res) => {
    const{id_cliente,descricao,preco} = req.body

    if(!id_cliente || !descricao ||preco){
        return res.status(400).json({error: 'Campos não preenchidos'})
    }

    const client = await db.connect()

    try{
        await client.query('INSERT INTO vendas(id_cliente,preco,created_at,descricao,paga) VALUES ($1,$2,NOW(),$3,FALSE)', [id_cliente,preco,descricao ])

        return res.status(200).json({mensagem: 'Venda inserida com sucesso'})
    }catch(error){
        console.error(error);
        return res.status(500).json({ error: 'Erro interno no servidor, por favor tente novamente.' });
    }finally{
        client.release()
    }
})

//Pagar
routes.post('/pagar/:id_venda', async(req,res) => {
    const {id_venda} = req.params;
    if(!id_venda){
        return res.status(400).json({error:'Id de venda não preenchido'})
    }
     const client = await db.connect()

    try{
       await client.query('UPDATE vendas SET paga = TRUE WHERE id_venda = $1', [id_venda])
       return res.status(200).json({mensagem:'Venda paga com sucesso!'})
    }catch(error){
        console.error(error);
        return res.status(500).json({error: 'Erro interno no servidor, por favor tente novamente.'});
    }finally{
        client.release()
    }
})

//Cancelar Pagamento
routes.post('/cancelarpagamento/:id_venda', async(req,res) => {
    const {id_venda} = req.params;
    if(!id_venda){
        return res.status(400).json({error:'Id de venda não preenchido'})
    }
     const client = await db.connect()

    try{
       await client.query('UPDATE vendas SET paga = FALSE WHERE id_venda = $1', [id_venda])
       return res.status(200).json({mensagem:'Venda cancelada com sucesso!'})
    }catch(error){
        console.error(error);
        return res.status(500).json({error: 'Erro interno no servidor, por favor tente novamente.'});
    }finally{
        client.release()
    }
})


module.exports = routes