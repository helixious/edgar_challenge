export default `
    input UserInput {
        name: String!,
        email: String!,
        vendor: String!
    }

    input CompanyInput {
        id: Int!,
        formType: String!,
        name: String!
    }

    input CompanyFormInput {
        cik: Int!
        form_id: Int!
    }
`;