import dotenv from 'dotenv';
dotenv.config();

import Express from 'express';
import { ApolloServer } from 'apollo-server-express';
import bodyParser from 'body-parser';
import Orm from './Components/orm';

const { PORT } = process.env;

const app = Express();

const orm = new Orm();
const {typeDefs, resolvers} = orm;


const server = new ApolloServer({typeDefs, resolvers});
app.use(bodyParser.json());
server.applyMiddleware({ app });

app.listen({port:PORT}, () => {
    console.log(`🚀 GraphQL Server ready at localhost:${PORT}/graphql`);
});