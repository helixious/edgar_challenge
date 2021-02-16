# Set up your own SecSecGo API:
SecSecGo provides an alternative way to find quarterly earnings, annual reports and more via a GraphQL API hosted in the cloud or locally.

Easy way to retrieve SEC filings for any US based company
No more filtering through index files, effectively reducing the system
Simplifies EDGAR querying by use of a single API endpoint, eliminating multiple data requests
Has automated SEC EDGAR data to DB import functionality

Things you can do with SecSecGo:
Find a company by trading symbol and list available filings
View specific filing in HTML format

How did I go about solving this challenge?
I started with looking into how the filling data is recorded in EDGAR. I located the full index filings of each quarter for that period along with how they are mapped by year.

I opted for a scan and retrieve approach vs. hard coding known paths in case of an API endpoint change. Once the list of urls are retrieved, the next step is to fetch a total of 112 indexes, ~ 25mb per index. Sec.gov has an API rate limit of 10tps and will ban IP for 10min if you exceed this. I’ve created a concurrent connection  limiter to prevent a ban.

Extracting form data was easy, retaining it wasn’t.  After discovering that each index could have ~ 200,000 records and is run in parallel, writing the output to a dictionary that uses CIK as key that holds an array isn’t ideal. Heap Memory ran out after only extracting 30% of all indexes. 
