import https from 'https';
import EventEmitter from 'events';
import Orm from './orm';

export default class Crawler extends EventEmitter{

    //DDOS flag prevention: Implemented concurrency limit of a default of 5 concurrent requests limit.
    constructor(maxConnectionCount = 8) {
        super();
        this._indexUrls = [];
        this._maxConnectionCount = maxConnectionCount;
        this._connectionCount = 0;

        this.spawnDBInstances().then((clients) => {
            this._db = clients;


            this.fetchIndexLinks();
        })
        
    }

    async spawnDBInstances() {
        let instances = []
        for (let i = 0; i < this._maxConnectionCount; i++) {
            // let client = await new Promise((resolve) => resolve(new Orm()));
            let client = await new Orm();
            instances.push({client, isIdle: true});
        }
        return instances;
    }

    fetchIndexData() {
        return new Promise((resolve, reject) => {
            try {

                // checks if there are any remaining urls left and if the active connection count is less that the max allowed
                if(this._indexUrls.length > 0 && this._connectionCount < this._maxConnectionCount) {


                    console.log(`active connections: ${this._connectionCount}, indexes queued: ${this._indexUrls.length}`);
                    let url = this._indexUrls.shift();
                    this._connectionCount++;
                    this.fetchPage(url).then((data) => {
                        this.extractEdgarIndex(data).then( async(indexData) => {
                            for(const companyData of indexData) {
                                for(let i = 0; i < this._db.length; i++) {
                                    if(this._db[i].isIdle) {
                                        this._db[i].isIdle = false;
                                        await this._db[i].client.addCompanyForms(companyData);
                                        this._db[i].isIdle = true;
                                    }
                                }
                            }
                            this._connectionCount--;
                            this.fetchIndexData();
                        }).catch((e) => {
                            reject(e);
                        })
                    });
                } else if(this._indexUrls.length == 0){ // once all urls have been fetched
                    this._callBack(); // initial promise resolver
                }
            } catch(e) {
                reject(e);
            }
            
        });   
    }

    extractEdgarIndex(data) {

        return new Promise((resolve, reject) => {
            try {
                let cikDictionary = {};
                let result = [];
                let rows = data.split('\n');
                let cursor = null;
                let formCount = 0;
                for (let i = 0; i < rows.length; i++) {
                    let row = rows[i];
                    if (!cursor && row.indexOf('-') != -1) {
                        cursor = i + 1;
                    } else if (cursor) {
                        let columns = row.split('|'); // CIK|Company Name|Form Type|Date Filed|Filename;
                        let cik = Number(columns[0]);
                        let companyName = columns[1];
                        let formType = columns[2];
                        let dateFiled = columns[3];
                        let fileName = columns[4];

                        if(formType && dateFiled && fileName) {
                            if(!cikDictionary[cik]) {
                                cikDictionary[cik] = {
                                    cik, companyName, forms:[]
                                }
                            }
                            cikDictionary[cik].forms.push({cik, formType, dateFiled, fileName});
                        }
                        
                    }
                }
                for(let cik of Object.keys(cikDictionary)) {

                    formCount += cikDictionary[cik].forms.length;
                    result.push(cikDictionary[cik]);
                }
                console.log('form count:',formCount);
                resolve(result);
            } catch(e) {
                reject(e);
            }
        });
        
    }

    fetchIndexLinks() {
        this._archieve = {};
        return new Promise((resolve, reject) => {
            this._callBack = resolve;
            let url = 'https://www.sec.gov/Archives/edgar/full-index';
            this.fetchPage(`${url}/index.json`).then(rootData => {
                let rootDirectory = rootData.directory.item;
                rootDirectory.forEach(rootItem => {
                    let { name, type, href } = rootItem;
                    let yearIndexUrl = `${url}/${href}`;
                    if (!isNaN(name) && type == 'dir') {
                        this.fetchPage(yearIndexUrl + 'index.json').then(qrtData => {
                            qrtData.directory.item.forEach(quarterItem => {
                                let { name, type, href } = quarterItem;
                                let indexUrl = `${yearIndexUrl}${href}master.idx`;
                                this._indexUrls.push(indexUrl);
                                this.fetchIndexData()
                            });
                        });
                    }
                });
            });
        });
        
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