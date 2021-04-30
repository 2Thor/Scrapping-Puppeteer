const puppeteer = require("puppeteer");
const { exit } = require('process');
const fs = require("fs");

(async ()=>{
    //Constantes
    const search = "frères codeurs";
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
    console.log(resultsUrl);
    await page.close();
    await browser.close();
    exit(0);

    async function getResultsUrl(){
        // création d'une page et chargement de Bing
        const page = await browser.newPage();
        await page.goto("https://www.bing.com", { waitUntil: "networkidle2"});

        //entrée le texte de recherche
        await page.type("input#sb_form_q", search, { delay: 20 });

        await page.click("label[for=sb_form_go]");

        // attendre le chargement

        await page.waitForNavigation({ waitUntil: "networkidle2" })

        // getter 
        await page.exposeFunction("getLimitesResults", () => limitResults);

        var results = await page.evaluate(
            async() => {
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
    
})();