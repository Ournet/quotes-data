import DynamoDB = require('aws-sdk/clients/dynamodb');
import {
    DynamoItem,
} from 'dynamo-item';

import { DynamoQuote } from './dynamo-quote';

export type QuoteKey = {
    id: string
}

export class QuoteModel extends DynamoItem<QuoteKey, DynamoQuote> {
    authorIndexName() {
        return 'author-index';
    }
    localeIndexName() {
        return 'locale-index';
    }
    constructor(client: DynamoDB.DocumentClient, tableSuffix: string) {
        super({
            hashKey: {
                name: 'id',
                type: 'S'
            },
            name: 'quotes',
            tableName: `ournet_quotes_${tableSuffix}`,
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
        }, client as any);
    }
}
