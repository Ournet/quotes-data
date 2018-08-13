import DynamoDB = require('aws-sdk/clients/dynamodb');
import {
    DynamoModel,
} from 'dynamo-model';
import { QuoteTopic, QuoteTopicRelation } from '@ournet/quotes-domain';

export type TopicQuoteKey = {
    topicId: string
    lastFoundAt: string
}

export interface TopicQuote {
    topicId: string
    quoteId: string
    rel?: QuoteTopicRelation
    topicRel?: string
    lastFoundAt: string
    expiresAt: number
}

export class TopicQuoteHelper {
    static create(quoteId: string, lastFoundAt: string, expiresAt: number, topics: QuoteTopic[]): TopicQuote[] {
        return topics.map(topic => {
            const item: TopicQuote = { quoteId, lastFoundAt, expiresAt, topicId: topic.id };
            if (topic.rel) {
                item.rel = topic.rel;
                item.topicRel = TopicQuoteHelper.formatTopicRel(topic.id, topic.rel);
            }
            return item;
        });
    }
    static formatTopicRel(topicId: string, relation: QuoteTopicRelation) {
        return `${topicId.trim()}_${relation.trim()}`;
    }
}

export class TopicQuoteModel extends DynamoModel<TopicQuoteKey, TopicQuote> {
    topicLastQuotesIndexName() {
        return 'topic-last-quotes-index';
    }
    topicRelLastQuotesIndexName() {
        return 'topic-rel-last-quotes-index';
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
                        type: 'KEYS_ONLY'
                    }
                },
                {
                    name: 'topic-rel-last-quotes-index',
                    hashKey: {
                        name: 'topicRel',
                        type: 'S'
                    },
                    rangeKey: {
                        name: 'lastFoundAt',
                        type: 'S'
                    },
                    type: 'GLOBAL',
                    projection: {
                        type: 'KEYS_ONLY'
                    }
                }
            ]
        }, client);
    }
}
