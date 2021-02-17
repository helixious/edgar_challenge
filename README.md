# Set up your own SecSecGo API:
**SecSecGo provides an alternative way to find quarterly earnings, annual reports and more via a GraphQL API hosted in the cloud or locally.**

Easy way to retrieve SEC filings for any US based company
No more filtering through index files, effectively reducing the system
Simplifies EDGAR querying by use of a single API endpoint, eliminating multiple data requests
Has automated SEC EDGAR data to DB import functionality

#### Things you can do with SecSecGo:
- [x] Find a company by trading symbol and list available filings
- [x] View specific filing in HTML format

#### How did I go about solving this challenge?
I started with looking into how the filling data is recorded in EDGAR. I located the full index filings of each quarter for that period along with how they are mapped by year and quarter.

I opted for a scan and retrieve approach vs. hard coding known paths in case of an API endpoint change. Once the list of urls are retrieved, the next step is to fetch a total of 112 indexes, ~ 25mb per index. Sec.gov has an API rate limit of 10tps and will ban IP for 10min if you exceed this. I’ve created a concurrent connection limiter to prevent a ban.

Extracting form data was easy, retaining it wasn’t.  After discovering that each index could exceed +300,000 records, writing the output to a dictionary that uses CIK as the key that holds an array isn’t ideal. Heap Memory ran out after only extracting 30% of all indexes. Allocating memory within the main execution thread for storing until all fillings isn't an option.

I resolved the issue by extending the ETL pipeline with an async function that commits the data to DB. Running 10 ETL pipelines concurrently speeds up the process and only takes 12 minutes to populate a locally hosted PostgreSQL DB.

#### Environment Variables Required
```
POSTGRES_USERNAME
POSTGRES_PASSWORD
POSTGRES_DB
POSTGRES_HOST
PORT
```

#### Step 1 install dependency & run import feature
```git
$ npm install
$ npm run import
```

#### Step 2 run server
```git
$ npm run start
```

## Technical Documentation
#### UML Class Diagram
![uml_class_diagram](https://github.com/helixious/edgar_challenge/blob/main/src/SecSecGo%20-%20Class%20Diagram.png?raw=true)

#### Sequence Diagram
![uml_sequence_diagram](https://github.com/helixious/edgar_challenge/blob/main/src/SecSecGo%20Import%20Sequence%20Diagram.png?raw=true)

#### UML Activity Diagram
![uml_activity_diagram](https://github.com/helixious/edgar_challenge/blob/main/src/SecSecGo%20Import%20Activity%20Diagram.png?raw=true)

## API Screenshots
![screenshot_1](https://github.com/helixious/edgar_challenge/blob/orm/src/screenshot_1.png?raw=true)
![screenshot_2](https://github.com/helixious/edgar_challenge/blob/orm/src/screenshot_2.png?raw=true)
![screenshot_3](https://github.com/helixious/edgar_challenge/blob/orm/src/screenshot_3.png?raw=true)