const puppeteer = require("puppeteer");
let searchFor = [];

async function scrapeFoodList() {
    const baseURL = "https://de.wiktionary.org/wiki/Verzeichnis:Deutsch/Essen_und_Trinken/Lebensmittel";
    const endWord = "Zwiebelsuppe";
    const browser = await puppeteer.launch({ userDataDir: "./cache", headless: true });
    const page = await browser.newPage();
    const dimensions = {
        width: 1200,
        height: 2000
    };
    let iLi = 0;

    await page.setViewport({ width: dimensions.width, height: dimensions.height })

    await console.log(
        "\n\nDimensions: ", dimensions.width, "x", dimensions.height,
        "\n");

    await page.goto(baseURL, { waitUntil: "networkidle2" });
    await page.waitForSelector(".jsAdd");

    // await page.screenshot({ path: "./screenshots/_List.png", fullPage: false });

    while (searchFor[searchFor.length - 1] != endWord) {
        searchFor.push(
            await page.evaluate((nOfI) => {
                return document.querySelectorAll(".jsAdd table tbody tr td ul li a")[nOfI].innerHTML;
            }, iLi)
        );
        iLi++;
    }
    // }

    await console.log("searchFor: ", searchFor, "\n\n");
    await browser.close();
}


function removeKcal(cal) {
    const last4digits = cal.slice(-4);

    if (last4digits == "kcal") {
        return cal.slice(0, -5)
    }
    else {
        return cal
    }
}

async function scrapeGoogleCals() {
    // searchFor = ['Aalsuppe', 'Ananas', 'Anona', 'Apfel', 'Apfelkompott', 'Apfelkraut', 'Apfelsine', 'Aprikose',];
    const baseURL = "https://www.google.de/";
    const browser = await puppeteer.launch({ userDataDir: "./cache", headless: true });
    const page = await browser.newPage();
    const dimensions = {
        width: 1200,
        height: 800
    };
    let errorMsgs = 0;

    await page.setViewport({ width: dimensions.width, height: dimensions.height })


    let cals = "";
    let errorCascade = 0;

    await console.log(
        "\n\nDimensions: ", dimensions.width, "x", dimensions.height,
        "\n");

    for (var i = 0; i < searchFor.length; i++) {
        await page.goto(baseURL, { waitUntil: "networkidle2" });

        //Schreibe in Textfeld
        await page.waitForSelector(".gsfi");
        await page.type(".gsfi", searchFor[i] + " Nährwert");
        await page.keyboard.press("Enter")

        try {
            await page.waitForSelector(".webanswers-webanswers_table__webanswers-table", { timeout: 2000 });

            await page.waitForTimeout(2000);

            cals = await page.evaluate(async () => {
                return document.querySelectorAll(".webanswers-webanswers_table__webanswers-table table tbody tr")[1].querySelectorAll("td")[1].innerHTML
            })

            cals = await removeKcal(cals);
            errorCascade = 0;

            await console.log(searchFor[i] + ": ", cals, "kcal");
        }
        catch (error) {
            await page.screenshot({ path: "./screenshots/" + i + " - " + searchFor[i] + ".png", fullPage: false });
            await errorMsgs++;
            await console.log("Error", errorMsgs, "from", searchFor[i]);
            errorCascade++;
            if (errorCascade == 2 && errorCascade < 5) {
                await console.log(errorCascade, "Fehler nacheinander - Warte für 5 Sek und versuche nochmal");
                await page.waitForTimeout(5000);
                i = i - 2;
            }
            else if (errorCascade > 2 && errorCascade <= 5) {
                await console.log(errorCascade, "- Immer noch Fehler - Warte für 15 Sekunden und mache trotzdem weiter");
                await page.waitForTimeout(15000);
            }
            else {
                await console.log("\n", errorCascade, "Fehler nacheinander - Bot Protection enabled - Exiting ...");
                break
            }
        }
    }

    await console.log("\n");

    await browser.close();
}

async function WikiThenGoogle() {
    await scrapeFoodList();
    await scrapeGoogleCals();
}

WikiThenGoogle();