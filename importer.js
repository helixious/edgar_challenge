import Crawler from './Components/crawler';

/*
The crawler component is used to retrieve, process and save the SEC EDGAR full index
This process takes around 30minutes to complete and requires a mysql or postgres DB and an allocation of atleast 7 gb of diskspace.
*/

const crawler = new Crawler();

