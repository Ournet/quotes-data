
import DynamoDB = require('aws-sdk/clients/dynamodb');
import { BaseRepository, RepositoryUpdateData, RepositoryAccessOptions } from '@ournet/domain';
import { Quote, QuoteValidator } from '@ournet/quotes-domain';

export interface QuoteRepositoryOptions {

}

export class BaseQuoteRepository extends BaseRepository<Quote> {
    protected tableName() {
        return 'ournet_quotes_v1';
    }
    constructor(protected client: DynamoDB.DocumentClient) {
        super(new QuoteValidator());
    }

    async innerCreate(data: Quote) {
        const input: DynamoDB.DocumentClient.PutItemInput = {
            Item: data,
            TableName: this.tableName(),
            ConditionExpression: 'attribute_not_exists(id)'
        };

        await this.client.put(input).promise();

        return data;
    }
    async delete(id: string) {
        const result = await this.client.delete({
            TableName: this.tableName(),
            Key: {
                id
            },
            ReturnValues: 'ALL_OLD',
        }).promise();

        return !!result.Attributes;
    }
    async exists(id: string) {
        const item = await this.getById(id, { fields: ['id'] });

        return !!item;
    }
    async innerUpdate(data: RepositoryUpdateData<Quote>) {
        const input: DynamoDB.DocumentClient.UpdateItemInput = {
            Key: { id: data.id },
            TableName: this.tableName(),
            ReturnValues: 'ALL_NEW',
        };

        const names: { [key: string]: string } = {};
        const values: { [key: string]: any } = {};

        if (data.set) {
            for (const prop of Object.keys(data.set)) {
                names['#' + prop] = prop;
                values[':' + prop] = (<any>data.set)[prop];
            }
        }

        await this.client.update(input).promise();

        return data;
    }

    async getById(id: string, options?: RepositoryAccessOptions<Quote>)
    async getByIds(ids: string[], options?: RepositoryAccessOptions<Quote>)
}
