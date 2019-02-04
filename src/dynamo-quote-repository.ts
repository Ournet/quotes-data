
const debug = require('debug')('ournet:quotes-data');

import DynamoDB = require('aws-sdk/clients/dynamodb');
import {
    BaseRepository,
    RepositoryUpdateData,
    RepositoryAccessOptions,
    Dictionary,
    uniq,
} from '@ournet/domain';

import {
    Quote,
    QuoteValidator,
    QuoteRepository,
    ListQuotesQueryParams,
    ListQuotesByTopicQueryParams,
    ListQuotesByAuthorQueryParams,
    QuoteTopic,
    CountQuotesQueryParams,
    CountQuotesByTopicQueryParams,
    CountQuotesByAuthorQueryParams,
    TopItem,
} from '@ournet/quotes-domain';

import { QuoteModel } from './quote-model';
import { DynamoQuoteHelper } from './dynamo-quote';
import { TopicQuoteModel, TopicQuoteHelper } from './topic-quote-model';
import { sortEntitiesByIds, buildDateRangeKey } from './helpers';

export class DynamoQuoteRepository extends BaseRepository<Quote> implements QuoteRepository {
    protected model: QuoteModel
    protected topicQuoteModel: TopicQuoteModel

    constructor(client: DynamoDB.DocumentClient, tableSuffix: string) {
        super(new QuoteValidator());
        this.model = new QuoteModel(client, tableSuffix);
        this.topicQuoteModel = new TopicQuoteModel(client, tableSuffix);
    }

    async innerCreate(data: Quote) {
        const createdItem = await this.model.create(DynamoQuoteHelper.mapFromQuote(data));

        const item = DynamoQuoteHelper.mapToQuote(createdItem);

        if (item.topics) {
            await this.putTopicQuotes(item.id, item.lastFoundAt, item.topics);
        }

        return item;
    }

    async innerUpdate(data: RepositoryUpdateData<Quote>) {
        const updatedItem = await this.model.update({
            remove: data.delete,
            key: { id: data.id },
            set: data.set && DynamoQuoteHelper.mapFromPartialQuote(data.set)
        });

        const item = DynamoQuoteHelper.mapToQuote(updatedItem);

        if (item.topics && item.topics.length && data.set && data.set.lastFoundAt) {
            await this.putTopicQuotes(item.id, item.lastFoundAt, item.topics);
        }

        return item;
    }

    async delete(id: string) {
        const oldItem = await this.model.delete({ id });
        return !!oldItem;
    }

    async exists(id: string) {
        const item = await this.getById(id, { fields: ['id'] });

        return !!item;
    }

    async getById(id: string, options?: RepositoryAccessOptions<Quote>) {
        const item = await this.model.get({ id }, options && { attributes: options.fields });

        if (!item) {
            return item;
        }

        return DynamoQuoteHelper.mapToQuote(item);
    }

    async getByIds(ids: string[], options?: RepositoryAccessOptions<Quote>) {
        const items = await this.model.getItems(ids.map(id => ({ id })), options && { attributes: options.fields });

        const list = items.map(item => DynamoQuoteHelper.mapToQuote(item));

        return sortEntitiesByIds(ids, list);
    }

    async popularQuotes(_params: ListQuotesQueryParams, _options?: RepositoryAccessOptions<Quote> | undefined): Promise<Quote[]> {
        throw new Error("Method not implemented.");
    }
    async popularQuotesByTopic(_params: ListQuotesByTopicQueryParams, _options?: RepositoryAccessOptions<Quote> | undefined): Promise<Quote[]> {
        throw new Error("Method not implemented.");
    }
    async popularQuotesByAuthor(params: ListQuotesByAuthorQueryParams, options?: RepositoryAccessOptions<Quote> | undefined): Promise<Quote[]> {

        const result = await this.model.query({
            index: this.model.authorPopularityIndexName(),
            hashKey: params.authorId,
            limit: params.limit,
            order: 'DESC',
        });

        if (!result.items || result.items.length === 0) {
            return [];
        }

        const ids = uniq(result.items.map(item => item.id));

        return this.getByIds(ids, options);
    }
    countPopularQuotes(_params: CountQuotesQueryParams): Promise<number> {
        throw new Error("Method not implemented.");
    }
    countPopularQuotesByTopic(_params: CountQuotesByTopicQueryParams): Promise<number> {
        throw new Error("Method not implemented.");
    }
    async countPopularQuotesByAuthor(params: CountQuotesByAuthorQueryParams): Promise<number> {
        const result = await this.model.query({
            index: this.model.authorPopularityIndexName(),
            hashKey: params.authorId,
            select: 'COUNT',
        });

        return result.count;
    }

    async latest(params: ListQuotesQueryParams, options?: RepositoryAccessOptions<Quote>) {
        const hashKey = DynamoQuoteHelper.createLocaleKey(params);
        const rangeKey = buildDateRangeKey(params);

        const result = await this.model.query({
            index: this.model.localeIndexName(),
            attributes: options && options.fields as string[] | undefined,
            hashKey,
            limit: params.limit,
            rangeKey,
            order: 'DESC',
        });

        if (!result.items || result.items.length === 0) {
            return [];
        }

        const ids = result.items.map(item => item.id);

        return this.getByIds(ids, options);
    }

    async latestByTopic(params: ListQuotesByTopicQueryParams, options?: RepositoryAccessOptions<Quote>) {
        let index = this.topicQuoteModel.topicLastQuotesIndexName();
        const rangeKey = buildDateRangeKey(params);
        let hashKey = params.topicId;
        if (params.relation) {
            index = this.topicQuoteModel.topicRelLastQuotesIndexName();
            hashKey = TopicQuoteHelper.formatTopicRel(params.topicId, params.relation);
        }
        const result = await this.topicQuoteModel.query({
            index,
            hashKey,
            limit: params.limit,
            rangeKey,
            order: 'DESC',
        });

        if (!result.items || result.items.length === 0) {
            return [];
        }

        const ids = result.items.map(item => item.quoteId);

        return this.getByIds(ids, options);
    }

    async latestByAuthor(params: ListQuotesByAuthorQueryParams, options?: RepositoryAccessOptions<Quote>) {
        const rangeKey = buildDateRangeKey(params);

        const result = await this.model.query({
            index: this.model.authorIndexName(),
            hashKey: params.authorId,
            limit: params.limit,
            rangeKey,
            order: 'DESC',
        });

        if (!result.items || result.items.length === 0) {
            return [];
        }

        const ids = result.items.map(item => item.id);

        return this.getByIds(ids, options);
    }

    async count(params: CountQuotesQueryParams) {
        const hashKey = DynamoQuoteHelper.createLocaleKey(params);
        const rangeKey = buildDateRangeKey(params);

        const result = await this.model.query({
            index: this.model.localeIndexName(),
            select: 'COUNT',
            hashKey,
            rangeKey,
        });

        return result.count;
    }

    async countByTopic(params: CountQuotesByTopicQueryParams) {
        let index = this.topicQuoteModel.topicLastQuotesIndexName();
        const rangeKey = buildDateRangeKey(params);
        let hashKey = params.topicId;
        if (params.relation) {
            index = this.topicQuoteModel.topicRelLastQuotesIndexName();
            hashKey = TopicQuoteHelper.formatTopicRel(params.topicId, params.relation);
        }
        const result = await this.topicQuoteModel.query({
            index,
            select: 'COUNT',
            hashKey,
            rangeKey,
        });

        return result.count;
    }

    async countByAuthor(params: CountQuotesByAuthorQueryParams) {
        const rangeKey = buildDateRangeKey(params);

        const result = await this.model.query({
            index: this.model.authorIndexName(),
            select: 'COUNT',
            hashKey: params.authorId,
            rangeKey,
        });

        return result.count;
    }

    async topAuthorTopics(params: ListQuotesByAuthorQueryParams): Promise<TopItem[]> {
        const rangeKey = buildDateRangeKey(params);

        const result = await this.model.query({
            index: this.model.authorIndexName(),
            hashKey: params.authorId,
            limit: 100,
            rangeKey,
            order: 'DESC',
            attributes: ['id'],
        });

        if (!result.items || result.items.length === 0) {
            return [];
        }

        const ids = result.items.map(item => item.id);

        const quotes = await this.model.getItems(ids.map(id => ({ id })), { attributes: ['topics'] });

        if (!quotes.length) {
            debug(`Top author's topics by ids is empty`, ids);
            return [];
        }

        const topMap: Dictionary<number> = {};

        for (const quote of quotes) {
            if (quote.topics && quote.topics.length) {
                for (const topic of quote.topics) {
                    const id = topic.id;
                    if (!topMap[id]) {
                        topMap[id] = 1;
                    } else {
                        topMap[id]++;
                    }
                }
            }
        }

        const topList: TopItem[] = Object.keys(topMap)
            .map(id => ({ id, count: topMap[id] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, params.limit);

        return topList;
    }

    async topAuthors(params: ListQuotesQueryParams): Promise<TopItem[]> {
        const hashKey = DynamoQuoteHelper.createLocaleKey(params);
        const rangeKey = buildDateRangeKey(params);

        const resultIds = await this.model.query({
            index: this.model.localeIndexName(),
            hashKey,
            rangeKey,
            limit: 100,
            attributes: ['id'],
        });

        if (!resultIds.items || !resultIds.items.length) {
            debug(`Top authors result ids is empty`, params);
            return [];
        }
        const ids = resultIds.items.map(item => item.id);
        const quotes = await this.model.getItems(ids.map(id => ({ id })), { attributes: ['authorId'] });

        if (!quotes.length) {
            debug(`Top authors quotes by ids is empty`, ids);
            return [];
        }

        const topMap: Dictionary<number> = {};

        for (const quote of quotes) {
            const id = quote.authorId;
            if (!topMap[id]) {
                topMap[id] = 1;
            } else {
                topMap[id]++;
            }
        }

        const topList: TopItem[] = Object.keys(topMap)
            .map(id => ({ id, count: topMap[id] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, params.limit);

        return topList;
    }

    async topTopics(params: ListQuotesQueryParams): Promise<TopItem[]> {
        const hashKey = DynamoQuoteHelper.createLocaleKey(params);
        const rangeKey = buildDateRangeKey(params);

        const resultIds = await this.topicQuoteModel.query({
            index: this.topicQuoteModel.localeLastTopicsIndexName(),
            hashKey,
            rangeKey,
            limit: 100,
            attributes: ['topicId'],
        });

        if (!resultIds.items || !resultIds.items.length) {
            debug(`Top topics result ids is empty`, params);
            return [];
        }

        const topMap: Dictionary<number> = {};

        for (const item of resultIds.items) {
            const id = item.topicId;
            if (!topMap[id]) {
                topMap[id] = 1;
            } else {
                topMap[id]++;
            }
        }

        const topList: TopItem[] = Object.keys(topMap)
            .map(id => ({ id, count: topMap[id] }))
            .sort((a, b) => b.count - a.count)
            .slice(0, params.limit);

        return topList;
    }

    protected async putTopicQuotes(quoteId: string, lastFoundAt: string, topics: QuoteTopic[]) {
        const items = TopicQuoteHelper.create(quoteId, lastFoundAt, topics);

        for (const item of items) {
            await this.topicQuoteModel.put(item);
        }
    }

    async deleteStorage(): Promise<void> {
        await Promise.all([
            this.topicQuoteModel.deleteTable(),
            this.model.deleteTable(),
        ]);
    }
    async createStorage(): Promise<void> {
        await Promise.all([
            this.topicQuoteModel.createTable(),
            this.model.createTable(),
        ]);
    }
}
