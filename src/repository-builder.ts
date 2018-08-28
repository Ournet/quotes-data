import DynamoDB = require('aws-sdk/clients/dynamodb');
import { QuoteRepository } from '@ournet/quotes-domain';
import { DynamoQuoteRepository } from './dynamo-quote-repository';


export class QuoteRepositoryBuilder {
    static build(client: DynamoDB.DocumentClient, tableSuffix: string = 'v0'): QuoteRepository {
        return new DynamoQuoteRepository(client, tableSuffix);
    }
}
