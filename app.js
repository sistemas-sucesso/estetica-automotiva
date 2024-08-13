const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
    host: 'b9lsqlxrc1wrcggnqosi-mysql.services.clever-cloud.com',
    user: 'ugcnyroeqou4hr6n',
    password: 'fmIducXVC9LOVxi6KgPB',
    database: 'b9lsqlxrc1wrcggnqosi'
});

db.connect(err => {
    if (err) throw err;
    console.log('Conectado ao banco de dados.');
});

function getTransacaoComIcone(transacao) {
    let icon;
    if (transacao.tipo === 'entrada') {
        icon = '<i class="fas fa-arrow-up"></i>';
    } else {
        icon = '<i class="fas fa-arrow-down"></i>';
    }
    return `${transacao.tipo} ${transacao.valor} ${transacao.data} ${icon} ${transacao.nome_do_item}`;
}

app.get('/', (req, res) => {
    const query = `
        SELECT
            id,
            tipo,
            forma_pagamento,
            valor,
            NOME_DO_ITEM,
            DATE_FORMAT(data, '%Y-%m-%d') AS data,
            SUM(CASE WHEN tipo = 'entrada' AND fechado = FALSE THEN valor ELSE 0 END) AS total_entrada,
            SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor ELSE 0 END) AS total_saida,
            (SUM(CASE WHEN tipo = 'entrada' AND fechado = FALSE THEN valor ELSE 0 END) - SUM(CASE WHEN tipo = 'saida' AND fechado = FALSE THEN valor ELSE 0 END)) AS saldo,
            SUM(CASE WHEN tipo = 'entrada' AND DATE(data) = CURDATE() AND fechado = FALSE THEN valor ELSE 0 END) AS total_entrada_dia,
            SUM(CASE WHEN tipo = 'saida' AND DATE(data) = CURDATE() AND fechado = FALSE THEN valor ELSE 0 END) AS total_saida_dia,
            SUM(CASE WHEN tipo = 'entrada' AND WEEK(data) = WEEK(CURDATE()) AND fechado = FALSE THEN valor ELSE 0 END) AS total_entrada_semana,
            SUM(CASE WHEN tipo = 'saida' AND WEEK(data) = WEEK(CURDATE()) AND fechado = FALSE THEN valor ELSE 0 END) AS total_saida_semana,
            SUM(CASE WHEN tipo = 'entrada' AND MONTH(data) = MONTH(CURDATE()) AND fechado = FALSE THEN valor ELSE 0 END) AS total_entrada_mes,
            SUM(CASE WHEN tipo = 'saida' AND MONTH(data) = MONTH(CURDATE()) AND fechado = FALSE THEN valor ELSE 0 END) AS total_saida_mes
        FROM transacoes;
    `;

    db.query(query, (err, result) => {
        if (err) throw err;

        const saldo = parseFloat(result[0].saldo) || 0;
        const total_entrada = parseFloat(result[0].total_entrada) || 0;
        const total_saida = parseFloat(result[0].total_saida) || 0;

        const total_entrada_dia = parseFloat(result[0].total_entrada_dia) || 0;
        const total_saida_dia = parseFloat(result[0].total_saida_dia) || 0;

        const total_entrada_semana = parseFloat(result[0].total_entrada_semana) || 0;
        const total_saida_semana = parseFloat(result[0].total_saida_semana) || 0;

        const total_entrada_mes = parseFloat(result[0].total_entrada_mes) || 0;
        const total_saida_mes = parseFloat(result[0].total_saida_mes) || 0;

        const queryTransacoes = `
            SELECT
                id, tipo, forma_pagamento, valor, NOME_DO_ITEM,
                DATE_FORMAT(data, '%Y-%m-%d') AS data
            FROM transacoes;
        `;

        db.query(queryTransacoes, (err, transacoes) => {
            if (err) throw err;
            res.render('index', {
                saldo: saldo,
                total_entrada: total_entrada,
                total_saida: total_saida,
                total_entrada_dia: total_entrada_dia,
                total_saida_dia: total_saida_dia,
                total_entrada_semana: total_entrada_semana,
                total_saida_semana: total_saida_semana,
                total_entrada_mes: total_entrada_mes,
                total_saida_mes: total_saida_mes,
                transacoes: transacoes,
                getTransacaoComIcone: getTransacaoComIcone
            });
        });
    });
});

app.get('/edit-transacao/:id', (req, res) => {
    const { id } = req.params;
    const query = 'SELECT * FROM transacoes WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            res.render('edit', { transacao: result[0] });
        } else {
            res.redirect('/');
        }
    });
});

app.post('/add-transacao', (req, res) => {
    const { tipo, valor, data, forma_pagamento, nome_do_item } = req.body;
    const query = 'INSERT INTO transacoes (tipo, valor, data, forma_pagamento, NOME_DO_ITEM, fechado) VALUES (?, ?, ?, ?, ?, FALSE)';
    db.query(query, [tipo, valor, data, forma_pagamento, nome_do_item], (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.post('/update-transacao', (req, res) => {
    const { id, nome_do_item, tipo, valor, data, forma_pagamento } = req.body;
    const query = 'UPDATE transacoes SET tipo = ?, valor = ?, data = ?, forma_pagamento = ?, NOME_DO_ITEM = ? WHERE id = ?';
    db.query(query, [tipo, valor, data, forma_pagamento, nome_do_item, id], (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.post('/delete-transacao', (req, res) => {
    const { id } = req.body;
    const query = 'DELETE FROM transacoes WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});
// Backend (Express.js) - Exemplo de rota para pesquisa
app.get('/', async (req, res) => {
    const nomeDoItem = req.query.NOME_DO_ITEM || '';

    try {
        // Filtre as transações com base na pesquisa
        const transacoes = await buscarTransacoes(nomeDoItem);

        // Renderize a página com os resultados da pesquisa
        res.render('index', {
            transacoes: transacoes,
            saldo: calcularSaldo(transacoes),
            total_entrada: calcularTotalEntrada(transacoes),
            total_saida: calcularTotalSaida(transacoes),
            total_entrada_dia: calcularTotalEntradaDia(transacoes),
            total_saida_dia: calcularTotalSaidaDia(transacoes),
            nome_do_item: nomeDoItem
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao buscar transações.');
    }
});


app.post('/fechar-caixa', (req, res) => {
    const query = 'UPDATE transacoes SET fechado = TRUE WHERE fechado = FALSE';
    db.query(query, (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});

app.get('/search', (req, res) => {
    const { nome_do_item } = req.query;
    const query = `
        SELECT
            id,
            tipo,
            forma_pagamento,
            valor,
            NOME_DO_ITEM,
            DATE_FORMAT(data, '%Y-%m-%d') AS data
        FROM transacoes
        WHERE NOME_DO_ITEM LIKE ?;
    `;

    db.query(query, [`%${nome_do_item}%`], (err, transacoes) => {
        if (err) {
            console.error(err);
            res.status(500).send('Erro ao buscar transações.');
            return;
        }
        res.render('index', {
            transacoes: transacoes,
            NOME_DO_ITEM: nome_do_item, // Passa o valor de pesquisa para a view
            getTransacaoComIcone: getTransacaoComIcone
        });
    });
});


app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});



