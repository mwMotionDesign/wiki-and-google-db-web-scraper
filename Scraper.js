const puppeteer = require("puppeteer");
const fs = require("fs");
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

    await console.log("searchFor: ", searchFor, "\n\n");
    await fs.writeFileSync("./data/FoodList.json", JSON.stringify(searchFor, null, 2));
    await browser.close();
}


let isValid = false;

async function formatKcal(cal) {
    const last4digits = await cal.slice(-4);

    if (last4digits == "kcal") {
        cal = await cal.slice(0, -5);
    }

    const onlyDigits = await /^\d+$/.test(cal.toString());

    if (onlyDigits == true) {
        isValid = await true;
        return cal
    }
    else {
        isValid = await false;
        return cal = "not Valid"
    }
}

async function scrapeGoogleCals() {
    const baseURL = "https://www.google.de/";
    const browser = await puppeteer.launch({ userDataDir: "./cache", headless: true });
    const page = await browser.newPage();
    const FoodList = await JSON.parse(fs.readFileSync("./data/FoodList.json"));
    let dbList = [];
    const dimensions = {
        width: 1200,
        height: 800
    };
    let errorMsgs = 0;

    await page.setViewport({ width: dimensions.width, height: dimensions.height })

    let scrapedEntries = 0;
    let invalidEntries = 0;
    let invalidValues = 0;
    let validEntries = 0;

    let cals = "";
    let errorCascade = 0;

    await console.log(
        "\n\nDimensions: ", dimensions.width, "x", dimensions.height,
        "\n");

    for (var i = 0; i < FoodList.length; i++) {
        await page.goto(baseURL, { waitUntil: "networkidle2" });

        //Schreibe in Textfeld
        await page.waitForSelector(".gsfi");
        await page.type(".gsfi", FoodList[i] + " Nährwert");
        await page.keyboard.press("Enter")

        try {
            scrapedEntries++;

            await page.waitForSelector(".webanswers-webanswers_table__webanswers-table", { timeout: 2000 });

            await page.waitForTimeout(2000);

            cals = await page.evaluate(async () => {
                return document.querySelectorAll(".webanswers-webanswers_table__webanswers-table table tbody tr")[1].querySelectorAll("td")[1].innerHTML
            })

            cals = await formatKcal(cals);
            errorCascade = 0;

            if (isValid) {
                await dbList.push({ name: FoodList[i], kcal: cals });
                await fs.writeFileSync("./data/foodDB.json", JSON.stringify(dbList, null, 2));
                validEntries++;
                await console.log(FoodList[i] + ": " + cals + " kcal");
            }
            else {
                invalidValues++;
                await console.log("Werte-Fehler:", invalidEntries, "- " + FoodList[i]);
            }
        }
        catch (error) {
            await page.screenshot({ path: "./screenshots/" + i + " - " + FoodList[i] + ".png", fullPage: false });
            await errorMsgs++;
            await console.log("Eintrag-Fehler:", errorMsgs, "- " + FoodList[i]);
            errorCascade++;
            invalidEntries++;
            if (errorCascade == 2) {
                await console.log(errorCascade, "Fehler nacheinander - Warte für 15 Sekunden und versuche nochmal");
                await page.waitForTimeout(15000);
                invalidEntries = invalidEntries - 2;
                scrapedEntries = scrapedEntries - 2;
                i = i - 2;
            }
            else if (errorCascade > 2 && errorCascade <= 4) {
                await console.log(errorCascade - 2, "/ 2 Neuversuche - Immer noch Fehler - Warte für 2 Sekunden und mache trotzdem weiter");
                await page.waitForTimeout(2000);
            }
            else if (errorCascade > 4 && errorCascade <= 7) {
                await console.log(errorCascade - 4, "/ 4 weitere Fehler - Warte für 5 Sekunden und mache trotzdem weiter");
                await page.waitForTimeout(5000);
            }
            else if (errorCascade > 7) {
                await console.log(errorCascade - 4, "/ 4 weitere Fehler");
                await console.log("\nEvtl. Bot Schutz aktiv - Beende Programm!");
                break
            }
        }
    }

    validEntries = (scrapedEntries - (invalidEntries + invalidValues));

    await console.log("\nDurchsuchte Einträge:", scrapedEntries, "\nNicht gefundene Einträge:", invalidEntries, "\nUnklare Werte:", invalidValues, "\n\nGefundene Einträge:", validEntries, "von", scrapedEntries, "= " + (validEntries / (scrapedEntries / 100)) + " %\n\n");

    await browser.close();
}

async function WikiThenGoogle() {
    await scrapeFoodList();
    await scrapeGoogleCals();
}

WikiThenGoogle();