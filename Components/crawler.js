import https from 'https';
import EventEmitter from 'events'
import {JSDOM} from 'jsdom';

export default class Crawler extends EventEmitter {

    constructor() {
        super();
    }

    fetchPage(url) {
        return new Promise((resolve, reject) => {
            let isJSON = url.indexOf('.json') != -1;
            const request = https.get(url, (response) => {
                let data = '';
                
                if (response.statusCode < 200 || response.statusCode > 299) {
                    reject(new Error('Failed loading page, status code: ', response.statusCode));
                }

                response.on('data', (chunk) => data +=chunk);
                response.on('end', () => {
                    data = isJSON ? JSON.parse(data) : data;
                    resolve(data);
                });
            });

            request.on('error', (err) => reject(err));
        });
    }

    /*
        DEPRECATE fetchPageContent & fetchFullIndexUrls, using fetchPage & fetchIndexLinks instead
        Found better way to retrieve year and quarter filepaths by using ./index.json
        SSR (server-side rendering) may not be required for extracting paths but is still usefull if text extraction of the documents themselves
    */

    fetchFullIndexUrls() { // DEPRECATED
        return new Promise((resolve) => {
            try {
                this.fetchPageContent('https://www.sec.gov/Archives/edgar/full-index/', 'a').then(results => {
                    let yearIndexLinks = results.filter(url => !isNaN(url.label) && url.label != '');
                    resolve(yearIndexLinks);
                })
            } catch (e) {
                console.log(e);
                resolve(null);
            };
        });
    }

    fetchPageContent(url, selector='body') { // DEPRECATED
        return new Promise(resolve => {
            let error = null;
            JSDOM.fromURL(url).then((dom) => {
                try {
                    let result = null;
                    if(selector == 'body') {
                        result = dom.window.document.querySelector(selector).textContent;
                    } else {
                        result = [...dom.window.document.querySelectorAll(selector)].map(node => {
                            let {textContent, href} = node;
                            return {label:textContent, href};
                        })
                    }
                    resolve(result);
                    
                } catch(e) {
                    error = new TypeError('unable to parse dom');
                    resolve(error);
                }
            }).catch((e) => {
                error = new TypeError('unable to fetch url');
                resolve(error);
            })
        });
    }
};
