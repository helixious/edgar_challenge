import https from 'https';
import EventEmitter from 'events';
import Orm from './orm';

export default class Crawler extends EventEmitter{

    //DDOS flag prevention: Implemented concurrency limit of a default of 10 concurrent requests limit.
    constructor(maxConnectionCount = 10) {
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
            let orm = await new Orm({purge:i == 0}); // first connection is responsible for purging and recreating tables
            instances.push({orm, isIdle: true}); // isIdle param is toggled to set place a lock on the ORM object while it comits new data to database
        }
        return instances;
    }

    fetchIndexData() {
        return new Promise((resolve, reject) => {
            try {

                // checks if there are any remaining urls left and if the active connection count is less that the max allowed
                if(this._indexUrls.length > 0 && this._connectionCount < this._maxConnectionCount) {
                    this._connectionCount++;
                    let url = this._indexUrls.shift(); // the indexUrls are stored in no specific order, but are selected FiFo
                    
                    this.fetchPage(url).then((data) => {

                        // the extracted data gets splitted into two data objects that are independently commited 
                        this.extractEdgarIndex(data).then( async({shardKey, shardData, companyData}) => {
                            for(let i = 0; i < this._db.length; i++) {
                                if(this._db[i].isIdle) { // this prevents race condition
                                    this._db[i].isIdle = false;
                                    await this._db[i].orm.bulkInsertCompany(companyData);
                                    await this._db[i].orm.bulkInsertIntoShard(shardData, shardKey); // storing form data into different table shards
                                    this._db[i].isIdle = true;
                                }
                            }
                            this._connectionCount--;
                            this.fetchIndexData();
                        }).catch((e) => {
                            reject(e);
                        })
                    });

                    console.log(`active connections: ${this._connectionCount}, indexes queued: ${this._indexUrls.length}, total fillings: ${this._formCount}`);

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
                let companyDictionary = {};
                let companyData = [];
                let shardData = [];
                let shardKey = null;
                let quarter = null;
                let cursor = null;

                let rows = data.split('\n');
                for (let i = 0; i < rows.length; i++) {
                    let row = rows[i];
                    if (!cursor && row.indexOf('-') != -1) {
                        cursor = i + 1;
                    } else if (cursor) {
                        let columns = row.split('|'); // CIK|Company Name|Form Type|Date Filed|Filename
                        let cik = Number(columns[0]);
                        let companyName = columns[1];
                        let formType = columns[2];
                        let dateFiled = columns[3];
                        let fileName = columns[4];
                        let ticker = this._tickers[cik];

                        if(formType && dateFiled && fileName) {
                            if(!shardKey) {
                                let dateComponents = dateFiled.split('-');
                                shardKey = dateComponents.shift();
                                let month = Number(dateComponents.shift());
                                if(month < 4) {
                                    quarter = 'Q1'
                                } else if(month >= 4 && month < 7) {
                                    quarter = 'Q2'
                                } else if(month >= 7 && month < 10) {
                                    quarter = 'Q3'
                                } else {
                                    quarter = 'Q4'
                                }
                            } 
                            if(!companyDictionary[cik]) {
                                companyDictionary[cik] = true;
                                companyData.push({id:cik, name:companyName, ticker})
                            }
                            shardData.push({cik, formType, dateFiled, fileName});
                        }
                        
                    }
                }

                let formCount = shardData.length;
                this._formCount += formCount;
                console.log(`\n${shardKey} ${quarter} index - company count: ${companyData.length} form count: ${formCount}`);
                resolve({shardKey, shardData, companyData});
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