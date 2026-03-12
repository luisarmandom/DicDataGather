// --- CONFIGURATION ---
const WP_USER = 'admin';
const WP_APP_PASSWORD = '46Hl j9aB nSiz 8MBg lIZg Mw6I';
const SITE_URL = 'https://rar.luisarmando.mx/wp-json/wp/v2/posts';
const PER_PAGE = 100; // max allowed by WP API per request

// Base64 encode the credentials for Basic Auth
const encodedCredentials = btoa(`${WP_USER}:${WP_APP_PASSWORD}`);

const startBtn = document.getElementById('startBtn');
const logEl = document.getElementById('log');

function log(message, type = '') {
    const span = document.createElement('span');
    if (type) span.className = type;
    span.textContent = message + '\n';
    logEl.appendChild(span);
    logEl.scrollTop = logEl.scrollHeight;
}

startBtn.addEventListener('click', async () => {
    startBtn.disabled = true;
    logEl.innerHTML = ''; // clear log
    log('Gathering dictionary data from WordPress API...\n');

    let allData = [];
    let page = 1;
    let totalPages = 1;

    try {
        do {
            log(`Fetching page ${page} of ${totalPages === 1 ? '?' : totalPages}...`);

            const response = await fetch(`${SITE_URL}?per_page=${PER_PAGE}&page=${page}`, {
                headers: {
                    'Authorization': `Basic ${encodedCredentials}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
            }

            // WordPress returns the total number of pages in the headers
            const totalPagesHeader = response.headers.get('x-wp-totalpages');
            if (totalPagesHeader) {
                totalPages = parseInt(totalPagesHeader, 10);
            }

            const posts = await response.json();

            for (const post of posts) {
                // Parse the rendered HTML content using browser's DOMParser
                const parser = new DOMParser();
                const doc = parser.parseFromString(post.content.rendered, 'text/html');

                // Extract texts by our automatically assigned classes!
                const rarElements = Array.from(doc.querySelectorAll('.lang-rar')).map(el => el.textContent.trim());
                const esElements = Array.from(doc.querySelectorAll('.lang-es')).map(el => el.textContent.trim());

                const rarText = rarElements.join('\n');
                const esText = esElements.join('\n');

                if (rarText || esText) {
                    allData.push({
                        id: post.id,
                        title: post.title.rendered,
                        link: post.link,
                        rar_text: rarText,
                        es_text: esText,
                        audio_url: post.meta?._rar_article_audio || null
                    });
                }
            }

            page++;
        } while (page <= totalPages);

        log(`\nSuccessfully processed ${allData.length} entries with dictionary data.`, 'success');

        // Trigger file download
        downloadJSON(allData, 'dictionary_data.json');
        log('Data saved to "dictionary_data.json". Download should start automatically.', 'success');

    } catch (error) {
        log(`\nAn error occurred during scraping: ${error.message}`, 'error');
    } finally {
        startBtn.disabled = false;
    }
});

function downloadJSON(data, filename) {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
