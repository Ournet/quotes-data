import DynamoDB = require('aws-sdk/clients/dynamodb');
import {
    DynamoModel,
} from 'dynamo-model';
import { Topic } from '@ournet/quotes-domain';

export type TopicQuoteKey = {
    topicId: string
    lastFoundAt: string
}

export interface TopicQuote {
    topicId: string
    quoteId: string
    lastFoundAt: string
    expiresAt: number
}

export class TopicQuoteHelper {
    static create(quoteId: string, lastFoundAt: string, expiresAt: number, topics: Topic[]): TopicQuote[] {
        return topics.map(topic => ({ quoteId, lastFoundAt, expiresAt, topicId: topic.id }));
    }
}

export class TopicQuoteModel extends DynamoModel<TopicQuoteKey, TopicQuote> {
    topicLastQuotesIndexName() {
        return 'topic-last-quotes-index';
    }

    constructor(client: DynamoDB.DocumentClient) {
        super({
            hashKey: {
                name: 'topicId',
                type: 'S'
            },
            rangeKey: {
                name: 'quoteId',
                type: 'S'
            },
            name: 'topic_quotes',
            tableName: 'ournet_topic_quotes_v0',
            indexes: [
                {
                    name: 'topic-last-quotes-index',
                    hashKey: {
                        name: 'topicId',
                        type: 'S'
                    },
                    rangeKey: {
                        name: 'lastFoundAt',
                        type: 'S'
                    },
                    type: 'LOCAL',
                    projection: {
                        type: 'ALL'
                    }
                }
            ]
        }, client);
    }
}
