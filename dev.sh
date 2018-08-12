#!/bin/bash

yarn remove @ournet/domain
yarn remove @ournet/quotes-domain
yarn remove dynamo-model

yarn link @ournet/domain
yarn link @ournet/quotes-domain
yarn link dynamo-model

yarn test
