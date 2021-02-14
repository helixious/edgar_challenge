// Importing component modules for extracting SEC Edgard data
import Crawler from './Components/crawler';
import Orm from './Components/orm';

// const crawler = new Crawler();
const orm = new Orm();

// sample data for testing ORM company form importer
let newCompanyData = {
    cik:1234532,
    name: 'Test Inc.',
    forms: [{
        cik: 1234532,
        formType: 'Q1',
        dateFiled: '02-21-21',
        fileName: '/Documents/test/zz'
    },
    {
        cik: 1234532,
        formType: 'Q2',
        dateFiled: '04-21-21',
        fileName: '/Documents/test/zz'
    },
    {
        cik: 1234532,
        formType: 'Q3',
        dateFiled: '08-21-21',
        fileName: '/Documents/test/zz'
    },
    {
        cik: 1234532,
        formType: 'Q4',
        dateFiled: '12-21-21',
        fileName: '/Documents/test/zz'
    }]
};


orm.on('ready', ()=> {
    orm.addCompanyForms(newCompanyData);
});