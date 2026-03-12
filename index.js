import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import fs from 'fs';

// --- CONFIGURATION ---
const WP_USER = 'admin';
const WP_APP_PASSWORD = '46Hl j9aB nSiz 8MBg lIZg Mw6I';
const SITE_URL = 'https://rar.luisarmando.mx/wp-json/wp/v2/posts';
const PER_PAGE = 100; // max allowed by WP API per request

// Base64 encode the credentials for Basic Auth
const encodedCredentials = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString('base64');

async function scrapeDictionaryData() {
    console.log('Gathering dictionary data from WordPress API...');
    
    let allData = [];
    let page = 1;
    let totalPages = 1;

    try {
        do {
            console.log(`Fetching page ${page} of ${totalPages === 1 ? '?' : totalPages}...`);
            const response = await fetch(`${SITE_URL}?per_page=${PER_PAGE}&page=${page}`, {
                headers: {
                    'Authorization': `Basic ${encodedCredentials}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // WordPress returns the total number of pages in the headers
            const totalPagesHeader = response.headers.get('x-wp-totalpages');
            if (totalPagesHeader) {
                totalPages = parseInt(totalPagesHeader, 10);
            }

            const posts = await response.json();
            
            for (const post of posts) {
                // Parse the rendered HTML content of the post using Cheerio
                const $ = cheerio.load(post.content.rendered);
                
                // Extract text from paragraphs with the specific classes we discussed
                // If you use other tags (like divs), you can change 'p.lang-rar' to just '.lang-rar'
                const rarText = $('.lang-rar').text().trim();
                const esText = $('.lang-es').text().trim();
                
                // Only save entries that actually have language data
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

        console.log(`\nSuccessfully processed ${allData.length} entries with dictionary data.`);
        
        // Save the results to a JSON file
        fs.writeFileSync('dictionary_data.json', JSON.stringify(allData, null, 2));
        console.log('Data saved to "dictionary_data.json".');

    } catch (error) {
        console.error('An error occurred during scraping:', error.message);
    }
}

scrapeDictionaryData();
