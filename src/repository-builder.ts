import DynamoDB = require('aws-sdk/clients/dynamodb');
import { QuoteRepository } from '@ournet/quotes-domain';
import { DynamoQuoteRepository } from './dynamo-quote-repository';


export class RepositoryBuilder {
    static buildQuoteRepository(client: DynamoDB.DocumentClient): QuoteRepository {
        return new DynamoQuoteRepository(client);
    }
}
