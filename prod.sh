#!/bin/bash

yarn unlink @ournet/domain
yarn unlink @ournet/quotes-domain
yarn unlink dynamo-model

yarn add @ournet/domain
yarn add @ournet/quotes-domain
yarn add dynamo-model

yarn test
