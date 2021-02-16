import https from 'https';
import EventEmitter from 'events';
import Orm from './orm';

export default class Crawler extends EventEmitter{

    //DDOS flag prevention: Implemented concurrency limit of a default of 5 concurrent requests limit.
    constructor(maxConnectionCount = 8) {
        super();
        this._tickers = {};
        this._indexUrls = [];
        this._formCount = 0;
        this._maxConnectionCount = maxConnectionCount;
        this._connectionCount = 0;

        this.spawnDBInstances().then( async (clients) => {
            this._db = clients;
            const tickers = await this.fetchPage('https://www.sec.gov/files/company_tickers.json');
            Object.keys(tickers).forEach(index => {
                let {cik_str, ticker} = tickers[index];
                this._tickers[cik_str]= ticker;
            })

            this.fetchIndexLinks();
        })
        
    }

    async spawnDBInstances() {
        let instances = []
        for (let i = 0; i < this._maxConnectionCount; i++) {
            // let client = await new Promise((resolve) => resolve(new Orm()));
            let orm = await new Orm();
            instances.push({orm, isIdle: true});
        }
        return instances;
    }

    fetchIndexData() {
        return new Promise((resolve, reject) => {
            try {

                // checks if there are any remaining urls left and if the active connection count is less that the max allowed
                if(this._indexUrls.length > 0 && this._connectionCount < this._maxConnectionCount) {


                    let url = this._indexUrls.shift();
                    this._connectionCount++;
                    console.log(`active connections: ${this._connectionCount}, indexes queued: ${this._indexUrls.length}`);
                    this.fetchPage(url).then((data) => {
                        this.extractEdgarIndex(data).then( async({shardData, companyData}) => {
                            let shardKeys = Object.keys(shardData);
                            for(const shardKey of shardKeys) {
                                for(let i = 0; i < this._db.length; i++) {
                                    // this prevents race condition
                                    let shard = shardData[shardKey];
                                    if(this._db[i].isIdle) {
                                        this._db[i].isIdle = false;

                                        // storing form data into different table shards
                                        await this._db[i].orm.bulkInsertCompany(companyData);
                                        await this._db[i].orm.bulkInsertIntoShard(shard, shardKey);
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
                let shardDictionary = {};
                let companyDictionary = {};
                let companyData = [];
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
                        let ticker = this._tickers[cik];

                        

                        if(formType && dateFiled && fileName) {
                            if(!companyDictionary[cik]) {
                                companyDictionary[cik] = true;
                                companyData.push({id:cik, name:companyName, ticker})
                            }
                            let shardKey = dateFiled.split('-').shift();
                            if(!shardDictionary[shardKey]) shardDictionary[shardKey] = [];
                            shardDictionary[shardKey].push({cik, formType, dateFiled, fileName});
                        }
                        
                    }
                }
                for(let shardKey of Object.keys(shardDictionary)) {
                    formCount += shardDictionary[shardKey].length;
                    this._formCount += shardDictionary[shardKey].length;
                }
                console.log(`company count: ${companyData.length} form count: ${formCount}, total form count: ${this._formCount}`);
                resolve({companyData, shardData: shardDictionary});
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