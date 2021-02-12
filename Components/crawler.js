import https from 'https';
import EventEmitter from 'events'
import {JSDOM} from 'jsdom';


export default class Crawler extends EventEmitter {
    constructor() {
        super();

    }

    fetchPageContent(url) {
        return new Promise(resolve => {
            JSDOM.fromURL(url).then((dom) => {
                try {
                    let text = dom.window.document.querySelector("body").textContent;
                    resolve(text);
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
