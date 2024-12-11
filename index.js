const express = require("express");
const app = express();
const shortid = require('short-id');
const PORT = 5000;
const mysql = require("mysql");

app.use(express.static(__dirname + "/public"));
app.use(express.urlencoded({ extended: false }));
app.set('view engine', 'ejs');

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: '',
    database: 'bitly'
});

db.connect((err) => {
    if (err) {
        console.log("Error connecting to DB");
        return;
    }
    console.log("Connection to database is successful");
});

function getLinks(req, res = null) {
    db.query("SELECT * FROM url", (err, results) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        res.render('home', { results:results });
    });
}

app.get('/', (req, res) => {
    getLinks(req, res);
});

app.post('/shortUrl', (req, res) => {
    const fullUrl = req.body.fullUrl;

    if (!fullUrl) {
        return res.sendStatus(400);
    }

    db.query("SELECT * FROM `url` WHERE `fullUrl` = ?", [fullUrl], (err, results) => {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }

        if (results.length === 0) {
            const short = shortid.generate();
            const url = { fullUrl, shortUrl: short, counts: 1 };

            db.query('INSERT INTO `url` SET ?', url, (err) => {
                if (err) {
                    console.log("Error creating table:", err);
                    return res.sendStatus(500);
                }

                getLinks(req, res, short);
            });
        } else {
            const _short = results[0].shortUrl;
            const _counts = results[0].counts;

            db.query('UPDATE `url` SET `counts`=? WHERE `shortUrl`=?', [_counts + 1, _short], (err) => {
                if (err) {
                    console.log("Error updating table");
                    return res.sendStatus(500);
                }

                getLinks(req, res);
            });
        }
    });
});

app.get('/:shortUrl', (req, res) => {
    const shortUrl = req.params.shortUrl;

    db.query("SELECT * FROM url WHERE `shortUrl` = ?", [shortUrl], (err, results) => {
        if (err) {
            console.error("Database query error:", err);
            return res.status(500).send("An error occurred while processing your request.");
        }

        if (results.length === 0) {
            return res.status(404).send("Short URL not found.");
        }

        const fullUrl = results[0].fullUrl;
        res.redirect(fullUrl);
    });
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
