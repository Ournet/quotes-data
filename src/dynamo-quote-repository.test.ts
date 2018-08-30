
import test from 'ava';
import { launch, stop } from 'dynamodb-local';
import DynamoDB = require('aws-sdk/clients/dynamodb');
import { DynamoQuoteRepository } from './dynamo-quote-repository';
import { QuoteRepository, Quote, QuoteHelper } from '@ournet/quotes-domain';

test.before('start dynamo', async t => {
    await t.notThrows(launch(8000, null, ['-inMemory', '-sharedDb']));
})

test.after('top dynamo', async t => {
    t.notThrows(() => stop(8000));
})

const client = new DynamoDB.DocumentClient({
    region: "eu-central-1",
    endpoint: "http://localhost:8000",
    accessKeyId: 'ID',
    secretAccessKey: 'Key',
});

const repository: QuoteRepository = new DynamoQuoteRepository(client, 'test');

test.skip('throw no table', async t => {
    await t.throws(repository.exists('id1'), /non-existent table/);
})

test.beforeEach('createStorage', async t => {
    await t.notThrows(repository.createStorage());
})

test.afterEach('deleteStorage', async t => {
    await t.notThrows(repository.deleteStorage());
})

test.serial('#create', async t => {
    const initialQuote: Quote = QuoteHelper.build({
        author: {
            id: 'qtopic1',
            slug: 'qtopic1',
            name: 'Vlad Filat'
        },
        country: 'md',
        lang: 'ro',
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre Romania, RM si Vlad Filat',
        topics: [
            {
                id: 'qtopic1',
                name: 'Vlad Filat',
                slug: 'vlad-filat',
                type: 'PERSON'
            },
            {
                id: 'qtopic2',
                name: 'Republica Moldova',
                abbr: 'RM',
                type: 'PLACE',
                slug: 'moldova'
            },
            {
                id: 'qtopic3',
                name: 'Romania',
                slug: 'romania'
            }
        ]
    });

    const createdQuote = await repository.create(initialQuote);
    t.is(createdQuote.id, initialQuote.id);
    t.deepEqual(createdQuote, initialQuote);
    t.deepEqual(createdQuote.topics, initialQuote.topics);

    await t.throws(repository.create(initialQuote), /The conditional request failed/);
})

test.serial('#update', async t => {
    const initialQuote: Quote = QuoteHelper.build({
        author: {
            id: 'qtopic1',
            slug: 'qtopic1',
            name: 'Vlad Filat'
        },
        country: 'md',
        lang: 'ro',
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre Romania, RM si Vlad Filat',
        topics: [
            {
                id: 'qtopic1',
                name: 'Vlad Filat',
                slug: 'vlad-filat',
                type: 'PERSON'
            },
            {
                id: 'qtopic2',
                name: 'Republica Moldova',
                abbr: 'RM',
                type: 'PLACE',
                slug: 'moldova'
            },
            {
                id: 'qtopic3',
                name: 'Romania',
                slug: 'romania'
            }
        ]
    });

    const createdQuote = await repository.create(initialQuote);
    t.deepEqual(createdQuote, initialQuote);

    await t.throws(repository.update({ id: initialQuote.id.replace(/[a]/g, 'b'), set: {} }), /The conditional request failed/);
    await t.throws(repository.update({ id: initialQuote.id }), /"value" must contain at least one of \[set, delete\]/);
    await t.throws(repository.update({ id: initialQuote.id, set: { country: 'ru' } }), /"country" is not allowed/);
    await t.throws(repository.update({ id: initialQuote.id, set: { lang: 'ru' } }), /"lang" is not allowed/);
    await t.throws(repository.update({ id: initialQuote.id, set: { text: 'new text' } }), /"text" is not allowed/);
    await t.throws(repository.update({ id: initialQuote.id, set: { author: { id: 'newid',slug: 'qtopic1', name: 'Name' } } }), /"author" is not allowed/);

    const updatedQuote = await repository.update({
        id: initialQuote.id,
        set: {
            countViews: 1,
            lastFoundAt: new Date().toISOString(),
        }
    });

    t.is(updatedQuote.countViews, 1);
    t.not(updatedQuote.lastFoundAt, initialQuote.lastFoundAt);
})

test.serial('#query', async t => {
    const country = 'md';
    const lang = 'ro';
    const initialQuote1: Quote = QuoteHelper.build({
        author: {
            id: 'qtopic1',
            slug: 'qtopic1',
            name: 'Vlad Filat'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre Romania, RM si Vlad Filat',
        topics: [
            {
                id: 'qtopic1',
                name: 'Vlad Filat',
                slug: 'vlad-filat',
                type: 'PERSON'
            },
            {
                id: 'qtopic2',
                name: 'Republica Moldova',
                abbr: 'RM',
                type: 'PLACE',
                slug: 'moldova'
            },
            {
                id: 'qtopic3',
                name: 'Romania',
                slug: 'romania'
            }
        ]
    });
    await new Promise(resolve => setTimeout(resolve, 100));
    const initialQuote2: Quote = QuoteHelper.build({
        author: {
            id: 'qtopic4',
            slug: 'qtopic1',
            name: 'Vlad Plahotniuc'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre Romania si RM',
        topics: [
            {
                id: 'qtopic2',
                name: 'Republica Moldova',
                abbr: 'RM',
                type: 'PLACE',
                slug: 'moldova'
            },
            {
                id: 'qtopic3',
                name: 'Romania',
                slug: 'romania',
                rel: 'MENTION'
            }
        ]
    });

    const createdQuote1 = await repository.create(initialQuote1);
    t.deepEqual(createdQuote1, initialQuote1);
    const createdQuote2 = await repository.create(initialQuote2);
    t.deepEqual(createdQuote2, createdQuote2);

    const totalCount = await repository.count({ country, lang });
    t.is(totalCount, 2, '2 quotes in db');

    const countAuthor1 = await repository.countByAuthor({ country, lang, authorId: initialQuote1.author.id });
    t.is(countAuthor1, 1, '1 quotes by author 1');
    const countAuthor2 = await repository.countByAuthor({ country, lang, authorId: initialQuote2.author.id });
    t.is(countAuthor2, 1, '1 quotes by author 2');

    const countTopicFilat = await repository.countByTopic({ country, lang, topicId: 'qtopic1' });
    t.is(countTopicFilat, 1, '1 quotes by topic filat');

    const countTopicRomania = await repository.countByTopic({ country, lang, topicId: 'qtopic3' });
    t.is(countTopicRomania, 2, '2 quotes by topic Romania');

    const totalQuotes = await repository.latest({ country, lang, limit: 10 }, { fields: ['id', 'author', 'lastFoundAt'] });
    t.log(JSON.stringify(totalQuotes))
    t.is(totalQuotes.length, 2, '2 quotes in db');
    t.is(totalQuotes[0].id, initialQuote2.id, 'quotes order DESC by lastFoundAt');
    t.deepEqual(Object.keys(totalQuotes[0]).length, 3, 'filter fields');

    const quotesAuthor1 = await repository.latestByAuthor({ country, lang, authorId: initialQuote1.author.id, limit: 10 });
    t.is(quotesAuthor1.length, 1, '1 quotes by author 1');
    t.is(quotesAuthor1[0].id, initialQuote1.id, '1 quotes by author 1');

    const quotesAuthor2 = await repository.latestByAuthor({ country, lang, authorId: initialQuote2.author.id, limit: 10 });
    t.is(quotesAuthor2.length, 1, '1 quotes by author 2');
    t.is(quotesAuthor2[0].id, initialQuote2.id, '1 quotes by author 2');

    const quotesTopicFilat = await repository.latestByTopic({ country, lang, topicId: 'qtopic1', limit: 10 });
    t.is(quotesTopicFilat.length, 1, '1 quotes by topic filat');

    const quotesTopicRomania = await repository.latestByTopic({ country, lang, topicId: 'qtopic3', limit: 10 });
    t.is(quotesTopicRomania.length, 2, '2 quotes by topic Romania');

    const quotesTopicMentionRomania = await repository.latestByTopic({ country, lang, topicId: 'qtopic3', relation: 'MENTION', limit: 10 });
    t.is(quotesTopicMentionRomania.length, 1, '1 quotes by topic Romania MENTION');
})

test.serial('#topAuthors', async t => {
    const country = 'md';
    const lang = 'ro';
    const quotes = [QuoteHelper.build({
        author: {
            id: 'qtopic1',
            slug: 'qtopic1',
            name: 'Vlad Filat'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta 1'
    }), QuoteHelper.build({
        author: {
            id: 'qtopic4',
            slug: 'qtopic1',
            name: 'Vlad Plahotniuc'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta 2'
    }), QuoteHelper.build({
        author: {
            id: 'qtopic4',
            slug: 'qtopic1',
            name: 'Vlad Plahotniuc'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta 3'
    }), QuoteHelper.build({
        author: {
            id: 'qtopic5',
            slug: 'qtopic1',
            name: 'Ion Cioalacu'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre 4'
    }), QuoteHelper.build({
        author: {
            id: 'qtopic5',
            slug: 'qtopic1',
            name: 'Ion Cioalacu'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre 5'
    }), QuoteHelper.build({
        author: {
            id: 'qtopic5',
            slug: 'qtopic1',
            name: 'Ion Cioalacu'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre 6'
    })];

    for (const qoute of quotes) {
        await repository.create(qoute);
    }

    const topAuthors = await repository.topAuthors({ country, lang, limit: 10 });

    t.is(topAuthors.length, 3);
    t.deepEqual(topAuthors[0], { id: 'qtopic5', count: 3 });
    t.deepEqual(topAuthors[1], { id: 'qtopic4', count: 2 });
    t.deepEqual(topAuthors[2], { id: 'qtopic1', count: 1 });
})

test.serial('#topTopics', async t => {
    const country = 'md';
    const lang = 'ro';
    const quotes = [QuoteHelper.build({
        author: {
            id: 'qtopic1',
            slug: 'qtopic1',
            name: 'Vlad Filat'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre Romania, RM si Vlad Filat',
        topics: [
            {
                id: 'qtopic1',
                name: 'Vlad Filat',
                slug: 'vlad-filat',
                type: 'PERSON'
            },
            {
                id: 'qtopic2',
                name: 'Republica Moldova',
                abbr: 'RM',
                type: 'PLACE',
                slug: 'moldova'
            },
            {
                id: 'qtopic3',
                name: 'Romania',
                slug: 'romania'
            }
        ]
    }),
    QuoteHelper.build({
        author: {
            id: 'qtopic4',
            slug: 'qtopic1',
            name: 'Vlad Plahotniuc'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre Romania si RM',
        topics: [
            {
                id: 'qtopic2',
                name: 'Republica Moldova',
                abbr: 'RM',
                type: 'PLACE',
                slug: 'moldova'
            },
            {
                id: 'qtopic3',
                name: 'Romania',
                slug: 'romania',
                rel: 'MENTION'
            }
        ]
    })];

    for (const qoute of quotes) {
        await repository.create(qoute);
    }

    const topTopics = await repository.topTopics({ country, lang, limit: 10 });

    t.is(topTopics.length, 3);
    t.deepEqual(topTopics[0], { id: 'qtopic2', count: 2 });
    t.deepEqual(topTopics[1], { id: 'qtopic3', count: 2 });
    t.deepEqual(topTopics[2], { id: 'qtopic1', count: 1 });
})

test.serial('#topAuthorTopics', async t => {
    const country = 'md';
    const lang = 'ro';
    const quotes = [QuoteHelper.build({
        author: {
            id: 'qtopic1',
            slug: 'qtopic1',
            name: 'Vlad Filat'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre Romania, RM si Vlad Filat',
        topics: [
            {
                id: 'qtopic1',
                name: 'Vlad Filat',
                slug: 'vlad-filat',
                type: 'PERSON'
            },
            {
                id: 'qtopic2',
                name: 'Republica Moldova',
                abbr: 'RM',
                type: 'PLACE',
                slug: 'moldova'
            },
            {
                id: 'qtopic3',
                name: 'Romania',
                slug: 'romania'
            }
        ]
    }),
    QuoteHelper.build({
        author: {
            id: 'qtopic1',
            slug: 'qtopic1',
            name: 'Vlad Filat'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre Romania, RM si Vlad Filat 2',
        topics: [
            {
                id: 'qtopic6',
                name: 'Iurie Leanca',
                slug: 'iurie-leanca',
                type: 'PERSON'
            },
            {
                id: 'qtopic2',
                name: 'Republica Moldova',
                abbr: 'RM',
                type: 'PLACE',
                slug: 'moldova'
            },
            {
                id: 'qtopic3',
                name: 'Romania',
                slug: 'romania'
            }
        ]
    }),
    QuoteHelper.build({
        author: {
            id: 'qtopic4',
            slug: 'qtopic1',
            name: 'Vlad Plahotniuc'
        },
        country,
        lang,
        source: {
            host: 'protv.md',
            path: '/',
            id: 'mdro3523523525f45yf34f5fy435fu',
            title: 'Titlu stire'
        },
        text: 'Stire importanta despre Romania si RM',
        topics: [
            {
                id: 'qtopic2',
                name: 'Republica Moldova',
                abbr: 'RM',
                type: 'PLACE',
                slug: 'moldova'
            },
            {
                id: 'qtopic3',
                name: 'Romania',
                slug: 'romania',
                rel: 'MENTION'
            }
        ]
    })];

    for (const qoute of quotes) {
        await repository.create(qoute);
    }

    const topTopics = await repository.topAuthorTopics({ country, lang, limit: 10, authorId: 'qtopic1' });

    t.is(topTopics.length, 4);
    t.deepEqual(topTopics[0], { id: 'qtopic2', count: 2 });
    t.deepEqual(topTopics[1], { id: 'qtopic3', count: 2 });
    t.deepEqual(topTopics[3], { id: 'qtopic1', count: 1 });
    t.deepEqual(topTopics[2], { id: 'qtopic6', count: 1 });
})
