import DynamoDB = require('aws-sdk/clients/dynamodb');
import {
    DynamoModel,
} from 'dynamo-model';
import { QuoteTopic, QuoteTopicRelation } from '@ournet/quotes-domain';
import { DynamoQuoteHelper } from './dynamo-quote';
import { TOPIC_QUOTE_EXPIRE_DAYS } from './config';

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
    locale: string
}

export class TopicQuoteHelper {
    static create(quoteId: string, lastFoundAt: string, topics: QuoteTopic[]): TopicQuote[] {
        const expiresAt = TopicQuoteHelper.expiresAt(new Date(lastFoundAt));
        return topics.map(topic => {
            const item: TopicQuote = {
                quoteId,
                lastFoundAt,
                expiresAt,
                topicId: topic.id,
                locale: DynamoQuoteHelper.createLocaleFromId(quoteId),
            };
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

    static expiresAt(date: Date) {
        date = new Date(date);
        date.setDate(date.getDate() + TOPIC_QUOTE_EXPIRE_DAYS);

        return Math.floor(date.getTime() / 1000);
    }
}

export class TopicQuoteModel extends DynamoModel<TopicQuoteKey, TopicQuote> {
    localeLastTopicsIndexName() {
        return 'locale-last-topics-index';
    }
    topicLastQuotesIndexName() {
        return 'topic-last-quotes-index';
    }
    topicRelLastQuotesIndexName() {
        return 'topic-rel-last-quotes-index';
    }

    constructor(client: DynamoDB.DocumentClient, tableSuffix: string) {
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
            tableName: `ournet_topic_quotes_${tableSuffix}`,
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
                },
                {
                    name: 'locale-last-topics-index',
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
                        type: 'KEYS_ONLY'
                    }
                }
            ]
        }, client);
    }
}
