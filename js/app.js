let db;
const articlesTable = document.querySelector("#articles-table")
const articles = [
    { name: 'Almdudler 0,35', id: 5163 },
    { name: 'Cola 0,33', id: 4659 },
    { name: 'Fritz Cola', id: 5194 },
    { name: 'Fritz Limo', id: 5195 },
    { name: 'Fruchtsaft 0,2', id: 4665 },
    { name: 'MakaVa 0,33', id: 4663 },
    { name: 'Mineralwasser 0,33', id: 4658 },
    { name: 'RB Cola', id: 5150 },
    { name: 'Red Bull 0,25', id: 4664 },
    { name: 'Schweppes 0,2', id: 5061 },
    { name: 'Hirter Maerzen 0,33', id: 5100 },
    { name: 'Murauer Maerzen 0,33', id: 4675 },
    { name: 'Radler 0,33', id: 4677 },
];


const fieldsOfWork = [
    { 'key': 'buero', 'name': 'Büro' },
    { 'key': 'club', 'name': 'Club' },
    { 'key': 'guido', 'name': 'Guido' },
    { 'key': 'guenter', 'name': 'Günter' },
];


const askForConfirmation = () => {
    let fow = document.getElementById('fow-select').value;
    let articleCountInputs = document.querySelectorAll('input.article-count');
    let text = `Folgende Artikel werden auf ${fow} gebucht: \n`;
    articleCountInputs.forEach(inp => {
        if (parseInt(inp.value) !== 0) {
            text += `${inp.value} x ${getArtikelNameById(inp.dataset.articleId)}\n`;
        }
    });
    return confirm(text.replaceAll('free-text-', ''));
}


const getArtikelNameById = (id) => {
    let article = articles.find(article => article.id == id);
    return article ? article.name : id;
}


const saveConsumption = () => {
    if (!askForConfirmation()) {
        console.log("Saving canceled");
        return;
    }
    let fow = document.getElementById('fow-select').value;
    let articleCountInputs = document.querySelectorAll('input.article-count');
    let consumedArticles = [];
    let date = new Date();
    articleCountInputs.forEach(inp => {
        let articleId = inp.dataset.articleId;
        console.log('ID: ' + articleId);
        let articleCount = parseInt(inp.value);
        if (articleCount > 0) {
            consumedArticles.push([Math.floor(date.getTime() / 1000), `${date.getFullYear()}-${date.getMonth()}`, fow, articleId, getArtikelNameById(articleId), articleCount]);
        }
    });

    const transaction = db.transaction(["consumed-articles"], 'readwrite');
    const objectStore = transaction.objectStore("consumed-articles");
    for (row of consumedArticles) {
        objectStore.put(row);
    }

    transaction.oncomplete = function (event) {
        console.log("Data saved successfully!");
        location.reload();
    };

    transaction.onerror = function (event) {
        console.error("Error saving data:", event.target.error);
        alert("Ein Fehler ist aufgetreten. Die Daten konnten nicht gespeichert werden. Bitte wende dich an den Administrator!");
    };
}

const updateFreeTextArticleId = () => {
    console.log('updateFreeTextArticleId');
    let countInput = document.getElementById('article-count-free-text-article');
    let textInput = document.getElementById('free-text-article-input');
    let text = textInput.value;
    countInput.dataset.articleId = 'free-text-' + text;
    if (text.trim() == '') {
        countInput.value = 0;
    }
}


const showArticles = () => {
    let output = ""
    articles.forEach(
        ({ name, id }) =>
        (output += `
              <tr>
                <td>${name}</td>
                <td><input type="number" value="0" min="0" class="article-count" id="article-count-${id}" data-article-id="${id}" readonly></td>
                <td><button onclick="(()=>{document.getElementById('article-count-${id}').stepUp(1);})()">+</button></td>
                <td><button onclick="(()=>{document.getElementById('article-count-${id}').stepDown(1);})()">-</button></td>
                <td><button onclick="saveConsumption()">Verbrauch übernehmen</button></td>
              </tr>
              `)
    );
    output += `
            <tr>
                <td><input type="text" id="free-text-article-input" onchange="updateFreeTextArticleId()" placeholder="Freie Eingabe"></td>
                <td><input type="number" value="0" min="0" class="article-count" id="article-count-free-text-article" data-article-id="free-text-article" readonly></td>
                <td><button onclick="(()=>{document.getElementById('article-count-free-text-article').stepUp(1);})()">+</button></td>
                <td><button onclick="(()=>{document.getElementById('article-count-free-text-article').stepDown(1);})()">-</button></td>
                <td><button onclick="saveConsumption()">Verbrauch übernehmen</button></td>
              </tr>
            `;
    articlesTable.innerHTML = output
}


const setupFoWSelect = () => {
    let select = document.getElementById('fow-select');
    for (i = 0; i < fieldsOfWork.length; i++) {
        let opt = document.createElement('option');
        opt.value = fieldsOfWork[i].key;
        opt.innerHTML = fieldsOfWork[i].name;
        select.appendChild(opt);
    }
    select.selectedIndex = 0;
}


const setupDB = () => {
    const request = indexedDB.open("consumption-db", 3);
    request.onerror = (event) => {
        console.error("Why didn't you allow my web app to use IndexedDB?!");
    };

    request.onsuccess = (event) => {
        db = event.target.result;
    };

    request.onupgradeneeded = (event) => {
        // Save the IDBDatabase interface
        db = event.target.result;
        // Create an objectStore for this database
        objectStore = db.createObjectStore("consumed-articles", { autoIncrement: true });
    };

}


const downloadData = () => {
    const transaction = db.transaction(["consumed-articles"]);
    const objectStore = transaction.objectStore("consumed-articles");

    let result = objectStore.getAll();
    result.onsuccess = (e) => {
        // Function to convert object to CSV
        let consumedArticles = e.target.result;
        let csvContent = '';
        for (row of consumedArticles) {
            csvContent += row.join(";") + "\n";
        };

        // Create a Blob from the CSV string
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Create a temporary anchor element to trigger the download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'data.csv';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}


const deleteOldData = () => {
    if (!confirm('Alle daten älter als zwei Monate werden gelöscht. Bist du sicher?')) {
        alert('Es wurde nichts gelöscht');
        return;
    }

    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    twoMonthsAgo.setDate(1)
    const twoMonthsAgoTimestamp = Math.floor(twoMonthsAgo.getTime() / 1000);

    // Open a transaction on the database
    const transaction = db.transaction(['consumed-articles'], 'readwrite');
    const objectStore = transaction.objectStore('consumed-articles');
    const request = objectStore.openCursor();

    // Iterate over the objects in the object store
    request.onsuccess = function (event) {
        const cursor = event.target.result;
        if (cursor) {
            const timestamp = cursor.value[0];
            // Check if the timestamp is older than 2 months ago
            if (timestamp < twoMonthsAgoTimestamp) {
                // Delete the object
                objectStore.delete(cursor.primaryKey);
            }
            cursor.continue();
        }
    };

    // Complete the transaction
    transaction.oncomplete = function () {
        alert('Objects older than 2 months ago deleted successfully.');
    };

    transaction.onerror = function (event) {
        alert('Error deleting objects:', event.target.error);
    };

}


const ready = () => {
    setupDB();
    setupFoWSelect()
    showArticles();
    document.getElementById('fow-select').addEventListener('change', (e) => {
        document.getElementById('articles-table').classList.remove('hidden');
    });
    document.getElementById('export-btn').addEventListener('click', (e) => {
        document.getElementById('export-actions').classList.remove('hidden');
    });
    document.getElementById('download-btn').addEventListener('click', (e) => {
        downloadData();
    });
    document.getElementById('delete-btn').addEventListener('click', (e) => {
        deleteOldData();
    });
}

navigator.serviceWorker.register('sw.js');
document.addEventListener("DOMContentLoaded", ready);
