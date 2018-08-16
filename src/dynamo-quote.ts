import { Quote, QuoteHelper } from "@ournet/quotes-domain";
import { Locale } from "./helpers";

export interface DynamoQuote extends Quote {
    /** COUNTRY_LANG */
    locale: string
    /** Author id */
    authorId: string
}

export class DynamoQuoteHelper {
    static createLocaleFromId(quoteId: string) {
        const quote = QuoteHelper.parseLocaleFromId(quoteId);
        const locale = DynamoQuoteHelper.createLocaleKey(quote);

        return locale;
    }

    static createLocaleKey(locale: Locale) {
        return `${locale.country.toUpperCase()}_${locale.lang.toUpperCase()}`;
    }

    static mapFromQuote(quote: Quote) {
        const item: DynamoQuote = {
            ...quote, locale: DynamoQuoteHelper.createLocaleFromId(quote.id),
            authorId: quote.author.id,
        };

        return item;
    }

    static mapToQuote(item: DynamoQuote) {
        delete item.authorId;
        delete item.locale;

        const quote = item as Quote;

        return quote;
    }

    static mapFromPartialQuote(quote: Partial<Quote>) {
        const item: Partial<DynamoQuote> = { ...quote };
        if (quote.author) {
            item.authorId = quote.author.id;
        }
        return item;
    }
}
