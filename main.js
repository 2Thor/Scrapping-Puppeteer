const puppeteer = require("puppeteer");
const { exit } = require('process');
const fs = require("fs");
const numeral = require('numeral');
const { parse } = require('json2csv');

(async ()=>{
    //Constantes
    const search = "chiens";
    const limitResults = 2;

    //options du navigateur
    const browserOptions = {
        headless: false,
        defaultViewport : {
            width: 1000,
            height: 1000
        }

    };

    //initialise le navigateur
    const browser = await puppeteer.launch(browserOptions);

    // PARTIE 1 : faire les screenshots des résultats de recherche 
    var resultsUrl = await getResultsUrl();
    const page = await browser.newPage();
    for (var i=0;i<resultsUrl.length;i++){
        await page.goto(resultsUrl[i], {waitUntil: 'load' });
        await page.screenshot({path : `./results/capture_${i}.png` })
    }

    await page.close();

    // PARTIE 2 : extraire les données des vidéos et les exporter en CSV
    var resultsVideo = await getVideosData();
    fs.writeFileSync('./results/data.csv', parse(resultsVideo));

    await browser.close();
    exit(0);

    async function getResultsUrl(){ // fonction pour récupérer les url des résultats de la recherche sur Bing
        // création d'une page et chargement de Bing
        const page = await browser.newPage();
        await page.goto("https://www.bing.com", { waitUntil: "networkidle2"});

        //entrée le texte de recherche
        await page.type("input#sb_form_q", search, { delay: 20 });

        // clique sur l'élément correspondant au bouton
        await page.click("label[for=sb_form_go]");

        // attendre le chargement des résultats
        await page.waitForNavigation({ waitUntil: "networkidle2" })

        // création de la fonction de 'getter' pour le evaluate
        await page.exposeFunction("getLimitesResults", () => limitResults);

        var results = await page.evaluate(
            async() => { // toutes les commandes dans l'evaluate sont exécutées dans le navigateur                
            // on parcourt les éléments pour extraire les données
                var data = [];
                var elements = document.querySelectorAll('.b_algo h2 a[href]');
                for (var elem of elements){
                    if (data.length >= await getLimitesResults()) break;
                    data.push(elem.getAttribute("href"));
                }
                return data;
            });
        
        await page.close();
        return results;                                                                                                          
    }

    async function getVideosData() {// fonction pour extraire les données des vidéos de la recherche sur Bing
        // création d'une page et ouverture de Bing
        const page = await browser.newPage();
        await page.goto('https://www.bing.com/videos/search?qft=+filterui:msite-youtube.com&q=' + encodeURI(search), { waitUntil: 'networkidle2' });

        
        // listener sur l'évènement 'console' du navigateur pour afficher dans le terminal
        page.on('console', consoleObj => console.log(consoleObj.text()));

        var results = await page.evaluate(
            async () => {// toutes les commandes dans l'evaluate sont exécutées dans le navigateur 
                // on parcourt les éléments pour extraire les données
                var data = [];
                var videoDivs = document.getElementsByClassName("dg_u");
                for (var div of videoDivs) {
                    var title = div.getElementsByClassName("mc_vtvc_title")[0].textContent;
                    var meta = div.getElementsByClassName("mc_vtvc_meta_row")[0].textContent;
                    var url = div.getElementsByClassName("mc_vtvc_link")[0].getAttribute("href");
                    console.log(meta);
                    data.push({
                        title: title,
                        url: url,
                        meta: meta
                    });
                }
                return data;
            });

        await page.close();

        // organisation et tri des données avant le retour de la fonction
        var cleanResults = [];
        for (var res of results) {
            var viewsPart = res.meta.split("vues")[0];
            var datePart = res.meta.split("vues")[1];
            cleanResults.push({
                title: res.title,
                url: "https://www.bing.com" + res.url,
                views: numeral(viewsPart.toLowerCase().replace(/\s|de/g, "").replace(",", ".")).value(),
                date: datePart.replace("Il y a ", "")
            });
        }
        return cleanResults;
    }

})();