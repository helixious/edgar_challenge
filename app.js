import Crawler from './Components/crawler';

const crawler = new Crawler();

crawler.fetchPageContent('https://www.sec.gov/Archives/edgar/data/1084869/000143774921001992/xslF345X03/rdgdoc.xml').then(str => {
    console.log(str);
}).catch((e) => {
    console.log(e);
})
