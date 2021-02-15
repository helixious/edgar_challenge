// Importing component modules for extracting SEC Edgard data
import fs from 'fs';
import Orm from './Components/orm';
import Crawler from './Components/crawler';
// const crawler = new Crawler();

const orm = new Orm().then((instance) => {
    console.log('done')
})
