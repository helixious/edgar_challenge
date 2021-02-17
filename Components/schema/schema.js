export default `

    type Company {
        id: Int
        name: String
    }

    type Filling {
        cik: Int
        formType: String
        dateFiled: String
        fileName: String
    }

    type Query {
        getCompanyByTicker(ticker: String): Company
        getListingByCik(cik: Int!): [Filling]
    }

    schema {
        query: Query
    }
`