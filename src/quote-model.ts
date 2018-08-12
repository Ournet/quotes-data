import DynamoDB = require('aws-sdk/clients/dynamodb');
import {
    DynamoModel,
} from 'dynamo-model';

import { DynamoQuote } from './dynamo-quote';

export type QuoteKey = {
    id: string
}

export class QuoteModel extends DynamoModel<QuoteKey, DynamoQuote> {
    authorIndexName() {
        return 'author-index';
    }
    localeIndexName() {
        return 'locale-index';
    }
    constructor(client: DynamoDB.DocumentClient) {
        super({
            hashKey: {
                name: 'id',
                type: 'S'
            },
            name: 'quotes',
            tableName: 'ournet_quotes_v0',
            indexes: [
                {
                    name: 'author-index',
                    hashKey: {
                        name: 'authorId',
                        type: 'S'
                    },
                    rangeKey: {
                        name: 'lastFoundAt',
                        type: 'S'
                    },
                    type: 'GLOBAL',
                    projection: {
                        type: 'KEYS_ONLY',
                    }
                },
                {
                    name: 'locale-index',
                    hashKey: {
                        name: 'locale',
                        type: 'S'
                    },
                    rangeKey: {
                        name: 'lastFoundAt',
                        type: 'S'
                    },
                    type: 'GLOBAL',
                    projection: {
                        type: 'KEYS_ONLY',
                    }
                }
            ]
        }, client);
    }
}
