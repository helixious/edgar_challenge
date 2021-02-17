import dotenv from 'dotenv';
dotenv.config();

import Express from 'express';
import { ApolloServer } from 'apollo-server-express';
import bodyParser from 'body-parser';


const { PORT } = process.env;

const server = new ApolloServer({typeDefs, resolvers});
const app = Express();

app.use(bodyParser.json());
server.applyMiddleware({ app });

app.listen({port}, () => {
    console.log(`🚀 Server ready at localhost:${PORT}/graphql`);
});